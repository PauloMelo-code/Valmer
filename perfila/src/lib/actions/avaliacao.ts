/**
 * O que o respondente faz: abrir o link, responder e concluir.
 *
 * Esta e a unica tela sem login da plataforma, entao nada aqui chama
 * getSession: o token E a credencial, e exigir sessao trancaria o respondente
 * para fora do proprio assessment. As demais regras de assessment (credito,
 * escopo do dono, edicao) continuam em actions/assessments.ts — aqui so mora o
 * que acontece do lado de quem responde.
 */
"use server";

import { after } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsRespostas, usuarios } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { respostaSchema } from "@/lib/validators/assessment";
import { gerarESalvar } from "@/lib/relatorio/persistir";
import { VERSAO_LEGADO } from "@/lib/perfil-do-mapa";
import { questoes } from "@/data/assessment";
import type { Respostas } from "@/lib/disc";
import type { FatorDisc } from "@/data/dna";

const TABELA = "assessments";

/**
 * Quem assina as linhas que o respondente grava.
 *
 * `modified_by` responde "quem alterou esta linha". Gravar o facilitador ali
 * afirmaria na trilha que ele proprio respondeu o assessment — e falso, e e
 * exatamente a mentira que uma coluna de auditoria nao pode contar. O
 * respondente nao e usuario da plataforma; a sentinela diz isso. Nao ha FK em
 * `modified_by`, entao o valor nao precisa existir em `usuarios`.
 */
const RESPONDENTE = "00000000-0000-0000-0000-000000000000";

export type FalhaAvaliacao =
  | "invalido"
  | "expirado"
  | "concluido"
  | "incompleto"
  /** So o cliente produz: a Server Action nao respondeu. Nunca vem do servidor. */
  | "rede"
  /** Idem, no envio final: a mensagem fala do envio, nao de uma resposta solta. */
  | "rede_envio";

type Recusa = { ok: false; erro: FalhaAvaliacao };

type Carregado =
  | { estado: "responder"; nome: string; respostas: Respostas }
  /** `versao`: o MC-INV 2.2 concluido reabre na tela final, onde o relatorio fica para abrir. */
  | { estado: "concluido"; nome: string; versao: string }
  | { estado: "expirado"; facilitador: string; expiraEm: Date };

/**
 * Expiracao e derivada, nunca gravada.
 *
 * Persistir a transicao para "expirado" exigiria escrever durante uma leitura
 * ou manter um job de fundo, e criaria uma segunda fonte de verdade capaz de
 * divergir de `expira_em`. Mesmo raciocinio dos contadores: nao materializar o
 * que da para derivar. O valor "expirado" do enum continua respeitado, entao
 * um admin ainda pode encerrar um link na mao.
 */
function expirou(situacao: string, expiraEm: Date): boolean {
  return situacao === "expirado" || expiraEm.getTime() < Date.now();
}

/**
 * Estado do link para a tela decidir o que mostrar.
 *
 * Devolve null quando o token nao existe — a page transforma isso em 404, para
 * nao confirmar nem negar a existencia de um convite a quem nao tem o link.
 *
 * Fica exportada daqui mesmo, apesar de "use server" a transformar num POST
 * publico que devolve PII: quem tem o token obtem a mesma PII abrindo a pagina,
 * e um token de 12 hex inviabiliza forca bruta. Server Actions ainda checam
 * Origin/Host, o que a rota GET nao faz — ou seja, mover para um modulo sem
 * "use server" custaria um arquivo e dois imports por zero diferenca.
 */
export async function carregarAvaliacao(token: string): Promise<Carregado | null> {
  const [linha] = await db
    .select({
      id: assessments.id,
      nome: assessments.avaliado_nome,
      situacao: assessments.situacao,
      expira_em: assessments.expira_em,
      versao: assessments.versao_instrumento,
      facilitador: usuarios.nome,
    })
    .from(assessments)
    .innerJoin(usuarios, eq(usuarios.id, assessments.facilitador_id))
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1);

  if (!linha) return null;

  // Concluido e verificado ANTES de expirado de proposito: um assessment pode
  // estar concluido e com a data ja vencida, e dizer "seu link expirou" a quem
  // ja respondeu seria errado e assustador.
  if (linha.situacao === "concluido") return { estado: "concluido", nome: linha.nome, versao: linha.versao };

  if (expirou(linha.situacao, linha.expira_em)) {
    return { estado: "expirado", facilitador: linha.facilitador, expiraEm: linha.expira_em };
  }

  const gravadas = await db
    .select({
      codigo: assessmentsRespostas.questao_codigo,
      fator: assessmentsRespostas.fator,
    })
    .from(assessmentsRespostas)
    .where(
      and(
        eq(assessmentsRespostas.assessment_id, linha.id),
        eq(assessmentsRespostas.is_deleted, false),
      ),
    );

  const respostas: Respostas = {};
  for (const gravada of gravadas) respostas[gravada.codigo] = gravada.fator;

  return { estado: "responder", nome: linha.nome, respostas };
}

/**
 * Grava uma resposta e tira o assessment de "pendente".
 *
 * Recusa em objeto, e nao com throw: uma Server Action que lanca em producao
 * entrega ao cliente so um digest opaco, e a tela nao conseguiria distinguir
 * "o link expirou" de "caiu a rede". Estado invalido e resultado esperado, nao
 * excecao — throw fica para entrada adulterada, que e o zod abaixo.
 */
export async function salvarResposta(
  token: string,
  questaoCodigo: string,
  fator: FatorDisc,
): Promise<{ ok: true } | Recusa> {
  const validado = respostaSchema.parse({ questao_codigo: questaoCodigo, fator });

  return db.transaction(async (tx) => {
    const [linha] = await tx
      .select()
      .from(assessments)
      .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
      .limit(1)
      .for("update");

    if (!linha) return { ok: false, erro: "invalido" };
    // So o questionario antigo passa por aqui (ADR-0007, D3). Um mapa MC-INV
    // 2.2 concluido por este caminho ficaria sem consentimento, sem as 69 telas
    // e sem resultado — e o link morreria. Espelha o "legado" de travarMapa.
    if (linha.versao_instrumento !== VERSAO_LEGADO) return { ok: false, erro: "invalido" };
    if (linha.situacao === "concluido") return { ok: false, erro: "concluido" };
    if (expirou(linha.situacao, linha.expira_em)) return { ok: false, erro: "expirado" };

    await tx
      .insert(assessmentsRespostas)
      .values({
        assessment_id: linha.id,
        questao_codigo: validado.questao_codigo,
        fator: validado.fator,
        modified_by: RESPONDENTE,
      })
      .onConflictDoUpdate({
        target: [assessmentsRespostas.assessment_id, assessmentsRespostas.questao_codigo],
        // Ressuscita a linha em vez de criar outra. O indice unico continua
        // ocupado por uma resposta soft-deletada, entao sem limpar is_deleted
        // aqui a questao ficaria presa e nunca mais poderia ser respondida.
        set: {
          fator: validado.fator,
          updated_at: new Date(),
          modified_by: RESPONDENTE,
          is_deleted: false,
          deleted_at: null,
        },
      });

    // Condicional e idempotente: se duas primeiras respostas chegarem juntas,
    // uma vence e a outra atualiza zero linhas, sem erro.
    await tx
      .update(assessments)
      .set({ situacao: "em_andamento", updated_at: new Date(), modified_by: RESPONDENTE })
      .where(and(eq(assessments.id, linha.id), eq(assessments.situacao, "pendente")));

    return { ok: true };
  });
}

/**
 * Agenda a escrita da narrativa deste assessment para depois da resposta.
 *
 * POR QUE AQUI E NAO NA PAGINA DO RELATORIO. `/relatorio/<token>` e publica e
 * sem sessao: gerar de la abriria um endpoint em que qualquer um com um token
 * queima chamada paga de IA, e ainda deixaria o cliente final do parceiro
 * parado minutos na frente de uma pagina em branco, porque a geracao demora.
 * O momento certo e este: os contadores acabaram de ser gravados, e ninguem
 * esta esperando o texto — quando o link for aberto, ele ja existe.
 *
 * POR QUE `after` E NAO `await`. O callback roda DEPOIS que a resposta foi
 * embora, entao a transacao de `concluir` ja fechou (a chamada nao segura a
 * linha travada nem a conexao do pool) e o respondente nao espera a IA para
 * ver a tela de conclusao.
 *
 * CONCORRENCIA. Dispara uma vez por assessment na vida: `concluir` recusa o
 * segundo fecho com a linha travada por `for update`, entao dois envios
 * simultaneos so agendam um. E o teto conhecido de `persistir.ts` — a
 * checagem de "ja existe narrativa?" fora de lock — deixa de ser alcancavel
 * por este caminho.
 *
 * FALHA. Nao ha mais resposta para escrever nela, entao fica no log. A lista
 * do parceiro continua oferecendo "Gerar relatorio" enquanto nao houver
 * narrativa, e e por ali que a segunda tentativa entra.
 */
function agendarNarrativa(token: string): void {
  const escrever = async () => {
    try {
      await gerarESalvar(token);
    } catch (erro) {
      console.error(`[relatorio] narrativa de ${token} nao foi gerada`, erro);
    }
  };

  try {
    after(escrever);
  } catch {
    // Fora de uma requisicao do Next — teste, seed, CLI — `after` lanca. Nao
    // ha o que agendar ali, e o fecho do assessment NAO pode falhar por causa
    // do texto: os contadores ja estao gravados. Quem roda fora do servidor
    // gera pelo `npm run relatorio:gerar`.
  }
}

/**
 * Fecha o assessment gravando os quatro contadores.
 *
 * Grava os contadores e nada mais: perfil primario, secundario e percentuais
 * saem de `resultadoDeContadores`, entao lista e relatorio derivam do mesmo
 * numero e nao tem como divergir.
 */
export async function concluir(
  token: string,
): Promise<{ ok: true; contadores: Record<FatorDisc, number> } | Recusa> {
  const resultado = await db.transaction(async (tx) => {
    // `.for("update")` trava a linha ate a transacao fechar. Sem ela, uma
    // correcao de resposta que chegue entre a contagem e a gravacao faria os
    // contadores divergirem das linhas do banco — calado, e os contadores sao
    // o produto inteiro. Duas abas abertas basta para reproduzir.
    const [linha] = await tx
      .select()
      .from(assessments)
      .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
      .limit(1)
      .for("update");

    if (!linha) return { ok: false, erro: "invalido" } as const;
    // Idem salvarResposta: fechar um MC-INV 2.2 aqui ainda agendaria a
    // narrativa ANTIGA, chamada paga de IA, sobre um mapa que nao e dela.
    if (linha.versao_instrumento !== VERSAO_LEGADO) return { ok: false, erro: "invalido" } as const;
    if (linha.situacao === "concluido") return { ok: false, erro: "concluido" } as const;
    if (expirou(linha.situacao, linha.expira_em)) return { ok: false, erro: "expirado" } as const;

    const somas = await tx
      .select({ fator: assessmentsRespostas.fator, total: count() })
      .from(assessmentsRespostas)
      .where(
        and(
          eq(assessmentsRespostas.assessment_id, linha.id),
          eq(assessmentsRespostas.is_deleted, false),
        ),
      )
      .groupBy(assessmentsRespostas.fator);

    const contadores: Record<FatorDisc, number> = { D: 0, I: 0, S: 0, C: 0 };
    for (const soma of somas) contadores[soma.fator] = soma.total;

    const respondidas = somas.reduce((total, soma) => total + soma.total, 0);
    // Nada foi gravado antes deste ponto, entao o commit vazio nao muda nada.
    // (Retornar do callback do drizzle COMMITA; rollback so com throw.)
    if (respondidas !== questoes.length) return { ok: false, erro: "incompleto" } as const;

    const [gravado] = await tx
      .update(assessments)
      .set({
        contador_d: contadores.D,
        contador_i: contadores.I,
        contador_s: contadores.S,
        contador_c: contadores.C,
        situacao: "concluido",
        concluido_em: new Date(),
        updated_at: new Date(),
        modified_by: RESPONDENTE,
      })
      .where(eq(assessments.id, linha.id))
      .returning();

    // Dentro da transacao: trilha e contadores gravam juntos ou nao gravam.
    await registrarAuditoria(
      {
        userId: RESPONDENTE,
        acao: "atualizar",
        tabela: TABELA,
        registroId: gravado!.id,
        detalhes: `Respondente concluiu o assessment de ${gravado!.avaliado_nome}`,
        dadosNovos: gravado,
      },
      tx,
    );

    return { ok: true, contadores } as const;
  });

  // Fora da transacao, de proposito: ela ja commitou aqui, e a narrativa e
  // consequencia do fecho, nao parte dele. Se a IA falhar, os contadores
  // continuam gravados.
  if (resultado.ok) agendarNarrativa(token);

  return resultado;
}
