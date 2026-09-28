/**
 * O lado do respondente no inventario MC-INV 2.2: consentir, salvar tela a
 * tela e retomar de onde parou.
 *
 * Irma de actions/avaliacao.ts, que continua servindo os mapas LEGADO — o
 * corte entre os dois fluxos e a versao do mapa (ADR-0007, D3). Mesmas
 * regras de la: o token E a credencial (nada aqui pede sessao), a linha do
 * mapa e travada com `for update` antes de qualquer decisao, e estado
 * invalido volta como Recusa em objeto, nao como throw — Server Action que
 * lanca em producao entrega so um digest opaco, e a tela nao distinguiria
 * "etapa travada" de "caiu a rede". Throw fica para entrada adulterada (zod).
 *
 * Sem "use server" de proposito: quem expoe isto ao navegador (Server Action
 * ou rota) e a camada de cima, e um modulo "use server" nao pode exportar os
 * tipos e constantes que ela vai precisar.
 *
 * A finalizacao (conferir as 69 telas, rodar o motor, gravar
 * assessments_resultados) mora ao lado, em finalizar.ts.
 */
import { randomInt } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsTelas, type Assessment, type NovaAssessmentTela } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { VERSAO_INSTRUMENTO } from "@/data/inventario-mc";
import { TELAS_POR_ETAPA, paraPoloA, telaSchema, type Etapa } from "@/lib/validators/inventario-mc";
import { montarRoteiro, telaDoRoteiro } from "./roteiro";

/**
 * Sentinela de `modified_by` para o que o respondente grava. Mesmo valor e
 * mesmo motivo de actions/avaliacao.ts (o respondente nao e usuario da
 * plataforma); repetida porque um modulo "use server" so exporta funcao async.
 */
export const RESPONDENTE = "00000000-0000-0000-0000-000000000000";

const ETAPAS = [1, 2, 3, 4] as const satisfies readonly Etapa[];

/** Salto do relogio do navegador tolerado dentro de uma tela (ajuste de hora, maquina que dormiu). */
const FOLGA_RELOGIO_MS = 60 * 60_000;

export type FalhaInventario =
  | "invalido"
  | "legado"
  | "concluido"
  | "expirado"
  | "sem_consentimento"
  /** Etapa 1 depois que a 2 comecou (secao 3: o natural nao se ajusta depois). */
  | "etapa_travada"
  /** Etapa N antes de a N-1 estar completa. */
  | "fora_de_ordem";

export type RecusaInventario = { ok: false; erro: FalhaInventario };

export type EstadoAplicacao = {
  ok: true;
  consentiu: boolean;
  /** Sorteada no primeiro acesso; a mesma para sempre. */
  semente: number;
  /** Telas ja salvas, por etapa. */
  feitas: Record<Etapa, string[]>;
  /** A primeira etapa incompleta. Nulo = 69 telas salvas, falta finalizar. */
  etapaAtual: Etapa | null;
  /**
   * O que ja foi respondido, por `"<etapa>:<tela>"` ("2:G07"): a ordem final
   * (etapas 1, 2, 4) ou o botao exibido (etapa 3). Serve para o "Voltar"
   * mostrar a resposta dada antes de a pessoa fechar o link.
   */
  respostas: Record<string, readonly string[] | number>;
};

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Trava a linha do mapa e aplica as recusas comuns as tres funcoes.
 *
 * Concluido antes de expirado, como em avaliacao.ts: dizer "seu link
 * expirou" a quem ja respondeu seria errado e assustador. Legado antes de
 * tudo: um mapa LEGADO nao tem o que fazer aqui em estado nenhum.
 */
export async function travarMapa(tx: Tx, token: string): Promise<Assessment | RecusaInventario> {
  const [mapa] = await tx
    .select()
    .from(assessments)
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1)
    .for("update");

  if (!mapa) return { ok: false, erro: "invalido" };
  if (mapa.versao_instrumento !== VERSAO_INSTRUMENTO) return { ok: false, erro: "legado" };
  if (mapa.situacao === "concluido") return { ok: false, erro: "concluido" };
  // Mesma regra de `expirou` em actions/avaliacao.ts (derivada, nunca gravada).
  if (mapa.situacao === "expirado" || mapa.expira_em.getTime() < Date.now()) {
    return { ok: false, erro: "expirado" };
  }
  return mapa;
}

export function recusou(x: Assessment | RecusaInventario): x is RecusaInventario {
  return "ok" in x;
}

/**
 * A semente sai de `crypto`, e nao de Math.random: e ela que decide a ordem
 * inicial dos itens, e uma ordem previsivel deixaria alguem montar a resposta
 * "sem mexer" que V3 existe para pegar.
 */
async function garantirSemente(tx: Tx, mapa: Assessment): Promise<number> {
  if (mapa.semente_ordem !== null) return mapa.semente_ordem;
  const semente = randomInt(1, 2 ** 31 - 1);
  await tx
    .update(assessments)
    .set({ semente_ordem: semente, updated_at: new Date(), modified_by: RESPONDENTE })
    .where(eq(assessments.id, mapa.id));
  return semente;
}

async function telasFeitas(
  tx: Tx,
  assessmentId: string,
): Promise<Pick<EstadoAplicacao, "feitas" | "respostas">> {
  const linhas = await tx
    .select({
      etapa: assessmentsTelas.etapa,
      tela: assessmentsTelas.tela,
      ordem_final: assessmentsTelas.ordem_final,
      resposta_exibida: assessmentsTelas.resposta_exibida,
    })
    .from(assessmentsTelas)
    .where(and(eq(assessmentsTelas.assessment_id, assessmentId), eq(assessmentsTelas.is_deleted, false)))
    .orderBy(assessmentsTelas.etapa, assessmentsTelas.tela);

  const feitas: Record<Etapa, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  const respostas: EstadoAplicacao["respostas"] = {};
  for (const linha of linhas) {
    feitas[linha.etapa as Etapa].push(linha.tela);
    const resposta = linha.ordem_final ?? linha.resposta_exibida;
    if (resposta !== null) respostas[`${linha.etapa}:${linha.tela}`] = resposta;
  }
  return { feitas, respostas };
}

/**
 * R6 LGPD: o aceite explicito, antes da primeira tela. Grava tambem o inicio
 * do inventario e a semente.
 *
 * Idempotente: o segundo clique (duas abas, rede lenta) nao move a data do
 * aceite — a primeira e a que vale como prova — nem duplica a trilha.
 */
export async function registrarConsentimento(
  token: string,
): Promise<{ ok: true; consentimentoEm: Date } | RecusaInventario> {
  return db.transaction(async (tx) => {
    const mapa = await travarMapa(tx, token);
    if (recusou(mapa)) return mapa;
    if (mapa.consentimento_em) return { ok: true, consentimentoEm: mapa.consentimento_em };

    const agora = new Date();
    const semente = await garantirSemente(tx, mapa);
    await tx
      .update(assessments)
      .set({
        consentimento_em: agora,
        iniciado_em: mapa.iniciado_em ?? agora,
        updated_at: agora,
        modified_by: RESPONDENTE,
      })
      .where(eq(assessments.id, mapa.id));

    // Na trilha porque e prova juridica. Sem nome: so o id do mapa (R6).
    await registrarAuditoria(
      {
        userId: RESPONDENTE,
        acao: "atualizar",
        tabela: "assessments",
        registroId: mapa.id,
        detalhes: `Respondente consentiu (LGPD) e iniciou o inventario ${VERSAO_INSTRUMENTO}`,
        dadosNovos: { consentimento_em: agora, semente_ordem: semente },
      },
      tx,
    );

    return { ok: true, consentimentoEm: agora };
  });
}

/**
 * Grava uma tela. Reenvio da mesma (etapa, tela) sobrescreve (secao 9).
 *
 * `payload` e `unknown` de proposito: vem da rede, e o tipo so passa a
 * existir depois do zod. Entrada adulterada lanca antes de abrir transacao.
 *
 * O SERVIDOR NAO CONFIA NO CLIENTE para o que decide a conta: o lado do polo A
 * (inverte a resposta de Jung) e o `moveu_item` (alimenta V3) saem do roteiro
 * da semente gravada, e o que o navegador mandar nesses campos e ignorado.
 * Quem edita o payload na mao conseguiria, do contrario, virar um eixo inteiro
 * ou apagar o alerta de "nao mexeu em nada". O cliente manda so a escolha
 * (`ordem_final` ou `resposta_exibida`) e os carimbos de tempo.
 */
export async function salvarTela(token: string, payload: unknown): Promise<{ ok: true } | RecusaInventario> {
  // Os dois campos derivados entram com valor provisorio so para o zod
  // validar o resto; sao substituidos abaixo, com o mapa travado. Espalhar o
  // payload ANTES garante que o valor do cliente nunca sobrevive.
  const tela = telaSchema.parse(
    typeof payload === "object" && payload !== null
      ? { ...payload, lado_polo_a: "esquerda", moveu_item: false }
      : payload,
  );

  return db.transaction(async (tx) => {
    const mapa = await travarMapa(tx, token);
    if (recusou(mapa)) return mapa;
    if (!mapa.consentimento_em) return { ok: false, erro: "sem_consentimento" };

    // Os carimbos sao do relogio do navegador, e so a DURACAO (saida menos
    // entrada, mesmo relogio) independe do acerto dele. Uma tela nao dura mais
    // do que o tempo real desde o aceite, medido no servidor: isso barra o
    // "1970 a 2999" sem trancar quem tem o relogio do PC adiantado ou atrasado,
    // o que um limite absoluto (saiu_em <= agora) faria. O tempo de recebimento
    // pelo servidor ja fica em created_at/updated_at, para auditoria.
    // ponytail: nao impede duracoes plausiveis forjadas (V1/V2); para isso, o
    // motor teria de ler o tempo do servidor em vez do carimbo do cliente.
    const duracaoMs = tela.saiu_em.getTime() - tela.entrou_em.getTime();
    if (duracaoMs > Date.now() - mapa.consentimento_em.getTime() + FOLGA_RELOGIO_MS) {
      throw new RangeError(`tela ${tela.tela}: duracao maior que o tempo desde o consentimento`);
    }

    // A ordem e decidida aqui, com a linha do mapa travada: duas abas nao
    // conseguem gravar etapa 1 e etapa 2 cruzadas.
    const porEtapa = await tx
      .select({ etapa: assessmentsTelas.etapa, total: count() })
      .from(assessmentsTelas)
      .where(and(eq(assessmentsTelas.assessment_id, mapa.id), eq(assessmentsTelas.is_deleted, false)))
      .groupBy(assessmentsTelas.etapa);
    const total = (etapa: number) => porEtapa.find((l) => l.etapa === etapa)?.total ?? 0;

    if (tela.etapa === 1 && total(2) > 0) return { ok: false, erro: "etapa_travada" };
    if (tela.etapa > 1) {
      const anterior = (tela.etapa - 1) as Etapa;
      if (total(anterior) < TELAS_POR_ETAPA[anterior]) return { ok: false, erro: "fora_de_ordem" };
    }

    const roteiro = montarRoteiro(await garantirSemente(tx, mapa));
    let resposta: Pick<
      NovaAssessmentTela,
      "ordem_final" | "lado_polo_a" | "resposta_exibida" | "resposta_polo_a" | "moveu_item"
    >;
    if (tela.etapa === 3) {
      const exibida = telaDoRoteiro(roteiro, 3, tela.tela)!;
      const lado = exibida.poloAEsquerda ? "esquerda" : "direita";
      resposta = {
        ordem_final: null,
        lado_polo_a: lado,
        resposta_exibida: tela.resposta_exibida,
        resposta_polo_a: paraPoloA(lado, tela.resposta_exibida),
        // Par nao tem ordem inicial para "nao mexer": responder ja e tocar.
        // V3 nem le a etapa 3.
        moveu_item: true,
      };
    } else {
      // O zod ja garantiu que a tela e desta etapa e que os ids sao dela.
      const { inicial } = telaDoRoteiro(roteiro, tela.etapa, tela.tela)!;
      resposta = {
        ordem_final: tela.ordem_final,
        lado_polo_a: null,
        resposta_exibida: null,
        resposta_polo_a: null,
        moveu_item: tela.ordem_final.some((id, i) => id !== inicial[i]),
      };
    }

    const campos = {
      ...resposta,
      entrou_em: tela.entrou_em,
      saiu_em: tela.saiu_em,
      modified_by: RESPONDENTE,
    };

    // O indice unico e parcial em `is_deleted = false`, entao uma tela
    // anulada nao conflita: a nova entra como linha viva e a anulada fica de
    // historico. Por isso nao ha "ressurreicao" aqui, ao contrario de
    // assessments_respostas, cujo indice e cheio.
    await tx
      .insert(assessmentsTelas)
      .values({
        assessment_id: mapa.id,
        etapa: tela.etapa,
        tela: tela.tela,
        versao_instrumento: mapa.versao_instrumento,
        ...campos,
      })
      .onConflictDoUpdate({
        target: [assessmentsTelas.assessment_id, assessmentsTelas.etapa, assessmentsTelas.tela],
        targetWhere: sql`${assessmentsTelas.is_deleted} = false`,
        set: { ...campos, updated_at: new Date() },
      });

    // Condicional e idempotente, como em salvarResposta.
    await tx
      .update(assessments)
      .set({ situacao: "em_andamento", updated_at: new Date(), modified_by: RESPONDENTE })
      .where(and(eq(assessments.id, mapa.id), eq(assessments.situacao, "pendente")));

    return { ok: true };
  });
}

/**
 * O que a tela precisa para retomar pelo mesmo link: se ja consentiu, o que
 * ja foi salvo, onde parou e a semente da ordem.
 *
 * Escreve numa leitura, de proposito: a semente e sorteada no PRIMEIRO acesso
 * (secao 3), e o primeiro acesso e esta chamada. Depois disso, so le.
 */
export async function estadoDaAplicacao(token: string): Promise<EstadoAplicacao | RecusaInventario> {
  return db.transaction(async (tx) => {
    const mapa = await travarMapa(tx, token);
    if (recusou(mapa)) return mapa;

    const semente = await garantirSemente(tx, mapa);
    const { feitas, respostas } = await telasFeitas(tx, mapa.id);
    const etapaAtual = ETAPAS.find((e) => feitas[e].length < TELAS_POR_ETAPA[e]) ?? null;

    return { ok: true, consentiu: mapa.consentimento_em !== null, semente, feitas, etapaAtual, respostas };
  });
}
