/**
 * Grava a narrativa do relatorio, versionada.
 *
 * NAO e "use server" de proposito. Uma Server Action vira endpoint POST
 * publico, e `gerarESalvar` gasta dinheiro a cada chamada: exposta assim, um
 * script de terceiro esvaziaria a conta da API repetindo a mesma requisicao.
 * Sao TRES os chamadores, e cada um traz a sua propria autorizacao:
 *
 * - `concluir`, em lib/actions/avaliacao.ts, logo depois de fechar o mapa. E o
 *   caminho normal, e o unico sem sessao: a autorizacao ali e o token do
 *   respondente, que acabou de responder aquele assessment.
 * - `gerarRelatorio`, em lib/actions/relatorio.ts, o botao da lista de mapas.
 *   Confere sessao, permissao e dono ANTES de chegar aqui.
 * - o CLI (`npm run relatorio:gerar`), que roda fora do servidor.
 *
 * Este arquivo continua sem sessao de proposito, e a regra vale para o proximo
 * chamador tambem.
 *
 * TETO CONHECIDO: a checagem de "ja existe narrativa?" acontece fora de lock,
 * entao dois chamadores simultaneos passam os dois e disparam duas chamadas
 * pagas, gravando duas versoes. Pelo caminho normal isso nao acontece, porque
 * `concluir` agenda uma vez so (recusa o segundo fecho com a linha travada).
 * Sobra a janela em que o parceiro clica em "Gerar relatorio" durante os
 * minutos da geracao automatica. O conserto e um lock na linha do assessment
 * antes da chamada; nao foi feito porque o custo e uma geracao repetida e nao
 * dado errado — a leitura pega a ultima versao.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsRelatorios } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { resultadoDeContadores } from "@/lib/disc";
import { gerarNarrativa } from "./gerar";
import type { NarrativaRelatorio } from "./tipos";
import type { FatorDisc } from "@/data/dna";

/** Assina as linhas escritas pelo gerador; nao ha pessoa por tras delas. */
const GERADOR = "00000000-0000-0000-0000-000000000000";

/**
 * `em_geracao` NAO e erro: e outro processo escrevendo o mesmo texto agora.
 * Entra na mesma uniao porque quem chama precisa tratar os dois do mesmo jeito
 * — nao ha narrativa para mostrar —, e separar em outro tipo faria cada
 * chamador lembrar de um terceiro caminho. Ver `arrendarGeracao`.
 */
export type FalhaPersistencia =
  | "invalido"
  | "nao_concluido"
  | "sem_contadores"
  | "em_geracao";

type Recusa = { ok: false; erro: FalhaPersistencia };

export type NarrativaGravada = {
  ok: true;
  versao: number;
  /** Verdadeiro quando ja havia narrativa e a geracao foi dispensada. */
  reaproveitada: boolean;
  narrativa: NarrativaRelatorio;
};

type Alvo = {
  id: string;
  nome: string;
  contadores: Record<FatorDisc, number>;
};

/** O assessment so rende relatorio concluido e com os quatro contadores. */
async function alvoDoToken(token: string): Promise<Alvo | Recusa> {
  const [linha] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1);

  if (!linha) return { ok: false, erro: "invalido" };
  if (linha.situacao !== "concluido") return { ok: false, erro: "nao_concluido" };

  const { contador_d, contador_i, contador_s, contador_c } = linha;
  if (contador_d === null || contador_i === null || contador_s === null || contador_c === null) {
    return { ok: false, erro: "sem_contadores" };
  }

  return {
    id: linha.id,
    nome: linha.avaliado_nome,
    contadores: { D: contador_d, I: contador_i, S: contador_s, C: contador_c },
  };
}

/**
 * Grava a narrativa como versao nova, sem apagar as anteriores.
 *
 * A versao sai de dentro da transacao, com a linha do assessment travada: duas
 * gravacoes simultaneas leriam o mesmo maximo e a segunda bateria no indice
 * unico (assessment_id, versao). O historico e exigencia de auditoria, entao
 * regravar por cima da mesma versao nao e opcao.
 */
export async function salvarNarrativa(
  token: string,
  narrativa: NarrativaRelatorio,
): Promise<NarrativaGravada | Recusa> {
  const alvo = await alvoDoToken(token);
  if ("ok" in alvo) return alvo;

  const versao = await db.transaction(async (tx) => {
    await tx.select().from(assessments).where(eq(assessments.id, alvo.id)).limit(1).for("update");

    const [ultima] = await tx
      .select({ versao: assessmentsRelatorios.versao })
      .from(assessmentsRelatorios)
      .where(eq(assessmentsRelatorios.assessment_id, alvo.id))
      .orderBy(desc(assessmentsRelatorios.versao))
      .limit(1);

    // Conta as apagadas tambem: reaproveitar o numero de uma versao soft-deletada
    // faria duas linhas diferentes responderem por "a v2 deste relatorio".
    const proxima = (ultima?.versao ?? 0) + 1;

    await tx.insert(assessmentsRelatorios).values({
      assessment_id: alvo.id,
      versao: proxima,
      narrativa,
      modified_by: GERADOR,
    });

    await registrarAuditoria(
      {
        userId: GERADOR,
        acao: "criar",
        tabela: "assessments_relatorios",
        registroId: alvo.id,
        detalhes: `Gravou a narrativa v${proxima} do relatorio de ${alvo.nome}`,
      },
      tx,
    );

    return proxima;
  });

  return { ok: true, versao, reaproveitada: false, narrativa };
}

/**
 * Por quanto tempo um arrendamento de geracao vale.
 *
 * Generoso de proposito: o teto e o tempo de UMA chamada da API, e vencer cedo
 * demais deixaria dois processos gerando ao mesmo tempo — que e exatamente o
 * que o arrendamento existe para impedir. Vencer tarde custa esperar por um
 * mapa que nao esta sendo gerado, e isso o botao de gerar resolve na segunda
 * tentativa.
 */
export const PRAZO_DA_GERACAO_MS = 10 * 60 * 1000;

/**
 * Tenta arrendar a geracao deste mapa.
 *
 * Transacao CURTA, com a linha travada: ler o carimbo e regrava-lo em passos
 * separados deixaria dois processos lerem "livre" antes de qualquer um
 * escrever, que e a corrida que estamos fechando.
 *
 * Devolve `false` quando outro processo pegou o arrendamento ha menos de
 * `PRAZO_DA_GERACAO_MS`.
 */
async function arrendarGeracao(assessmentId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [linha] = await tx
      .select({ desde: assessments.narrativa_gerando_em })
      .from(assessments)
      .where(eq(assessments.id, assessmentId))
      .limit(1)
      .for("update");

    if (!linha) return false;

    const agora = new Date();
    const vivo =
      linha.desde !== null && agora.getTime() - linha.desde.getTime() < PRAZO_DA_GERACAO_MS;
    if (vivo) return false;

    // `updated_at` NAO entra: o arrendamento e controle interno, e move-lo
    // faria a trava otimista de qualquer tela recusar a proxima gravacao
    // legitima do mapa sem que nada visivel tivesse mudado.
    await tx
      .update(assessments)
      .set({ narrativa_gerando_em: agora })
      .where(eq(assessments.id, assessmentId));

    return true;
  });
}

/** Devolve o arrendamento, tenha a geracao dado certo ou nao. */
async function devolverGeracao(assessmentId: string): Promise<void> {
  await db
    .update(assessments)
    .set({ narrativa_gerando_em: null })
    .where(eq(assessments.id, assessmentId));
}

/**
 * Escreve a narrativa pela API e grava.
 *
 * `forcar` existe porque cada chamada custa dinheiro: sem ele, rodar o comando
 * duas vezes no mesmo token devolve o que ja esta gravado em vez de pagar de
 * novo pelo mesmo texto.
 *
 * A chamada da API fica FORA da transacao: ela leva minutos, e uma transacao
 * aberta esse tempo todo segura a linha do assessment e a conexao do pool. E
 * por ficar fora que existe o ARRENDAMENTO acima: sem ele, dois gatilhos
 * simultaneos leem "sem narrativa" e a plataforma paga duas vezes.
 */
export async function gerarESalvar(
  token: string,
  { forcar = false }: { forcar?: boolean } = {},
): Promise<NarrativaGravada | Recusa> {
  const alvo = await alvoDoToken(token);
  if ("ok" in alvo) return alvo;

  if (!forcar) {
    const [existente] = await db
      .select({
        versao: assessmentsRelatorios.versao,
        narrativa: assessmentsRelatorios.narrativa,
      })
      .from(assessmentsRelatorios)
      .where(
        and(
          eq(assessmentsRelatorios.assessment_id, alvo.id),
          eq(assessmentsRelatorios.is_deleted, false),
        ),
      )
      .orderBy(desc(assessmentsRelatorios.versao))
      .limit(1);

    if (existente) {
      return {
        ok: true,
        versao: existente.versao,
        reaproveitada: true,
        narrativa: existente.narrativa as NarrativaRelatorio,
      };
    }
  }

  // `forcar` PULA o arrendamento de proposito: quem forca esta pagando de novo
  // por escolha, do CLI, e nao pode ser barrado por um carimbo que outro
  // processo esqueceu para tras.
  if (forcar) {
    const narrativa = await gerarNarrativa({
      nome: alvo.nome,
      resultado: resultadoDeContadores(alvo.contadores),
    });
    return salvarNarrativa(token, narrativa);
  }

  if (!(await arrendarGeracao(alvo.id))) {
    return { ok: false, erro: "em_geracao" };
  }

  try {
    const narrativa = await gerarNarrativa({
      nome: alvo.nome,
      resultado: resultadoDeContadores(alvo.contadores),
    });

    return await salvarNarrativa(token, narrativa);
  } finally {
    // No `finally`: falha da API tem de liberar o mapa na hora, senao um erro
    // passageiro travaria a geracao por dez minutos.
    await devolverGeracao(alvo.id);
  }
}
