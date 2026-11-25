/**
 * Os e-mails do ciclo de vida do mapa: convite, "concluiu" e "relatorio pronto".
 *
 * NAO e "use server" (ver `enviar.ts`): quem chama traz a propria autorizacao —
 * as actions de assessment (sessao e dono), o fecho do respondente (token) e os
 * geradores de narrativa.
 *
 * Regras comuns:
 * - Falha de e-mail NUNCA desfaz nem trava nada: tudo aqui devolve resultado ou
 *   engole o erro (so no log, sem link). Convite/lote/fecho/geracao ja
 *   aconteceram quando isto roda.
 * - Trilha de auditoria em cada envio que saiu, sem token nem link no texto.
 * - Os links levam o token na URL: nunca vao para log nem para auditoria.
 */
import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, usuarios } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { notificacoes } from "@/data/configuracoes";
import { enviarEmail } from "./enviar";
import { montarEmail, saudar } from "./modelo";

/** Assina a trilha dos envios que ninguem pediu na tela (fecho, geracao). */
const SISTEMA = "00000000-0000-0000-0000-000000000000";

export type Envio = { ok: true } | { ok: false; erro: string };

/** Origem publica da plataforma, a mesma que o Better Auth usa nos links dele. */
function origem(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export const linkDoQuestionario = (token: string) => `${origem()}/avaliacao/${token}`;
export const linkDoRelatorio = (token: string) => `${origem()}/relatorio/${token}`;

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "falha no envio";
}

function dataBr(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** O parceiro quer este aviso por e-mail? Sem preferencia salva vale o padrao. */
export function querEmail(preferencias: unknown, id: "questionario"): boolean {
  const salvo = (preferencias as Record<string, { email?: unknown } | undefined> | null)?.[id]?.email;
  if (typeof salvo === "boolean") return salvo;
  return notificacoes.find((n) => n.id === id)?.email ?? false;
}

type MapaDoConvite = {
  id: string;
  token: string;
  avaliado_nome: string;
  avaliado_email: string;
  expira_em: Date;
};

/**
 * Convite para responder o mapa. `convidante` e o nome de quem convida (o
 * facilitador dono); `quemId`, quem apertou o botao, para a trilha.
 */
export async function enviarConvite(
  mapa: MapaDoConvite,
  convidante: string,
  quemId: string,
  reenvio = false,
): Promise<Envio> {
  try {
    await enviarEmail({
      para: mapa.avaliado_email,
      ...montarEmail({
        assunto: "Você foi convidado para responder o seu mapa",
        saudacao: saudar(mapa.avaliado_nome),
        paragrafos: [
          `${convidante} convidou você para responder o seu Mapa Comportamental. São telas rápidas, e você pode parar e continuar depois.`,
          `O link vale até ${dataBr(mapa.expira_em)}.`,
        ],
        botao: { rotulo: "Responder o meu mapa", url: linkDoQuestionario(mapa.token) },
        rodape: "Se você não esperava este e-mail, pode ignorá-lo.",
      }),
    });
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }

  await registrarAuditoria({
    userId: quemId,
    acao: "atualizar",
    tabela: "assessments",
    registroId: mapa.id,
    detalhes: `${reenvio ? "Reenviou" : "Enviou"} o convite do mapa por e-mail para ${mapa.avaliado_email}`,
  });
  return { ok: true };
}

async function mapaComDono(assessmentId: string) {
  const [linha] = await db
    .select({
      id: assessments.id,
      token: assessments.token,
      situacao: assessments.situacao,
      avaliado_nome: assessments.avaliado_nome,
      avaliado_email: assessments.avaliado_email,
      dono: {
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        preferencias: usuarios.preferencias_notificacao,
      },
    })
    .from(assessments)
    .innerJoin(usuarios, eq(usuarios.id, assessments.facilitador_id))
    .where(and(eq(assessments.id, assessmentId), eq(assessments.is_deleted, false)))
    .limit(1);
  return linha ?? null;
}

async function auditar(registroId: string, detalhes: string) {
  await registrarAuditoria({ userId: SISTEMA, acao: "atualizar", tabela: "assessments", registroId, detalhes });
}

/**
 * "<Nome> concluiu o mapa", para o facilitador dono, se ele nao desligou o
 * aviso. Chamado depois do COMMIT do fecho, DISC e MC. Nunca lanca.
 */
export async function avisarConclusao(assessmentId: string): Promise<void> {
  try {
    const mapa = await mapaComDono(assessmentId);
    if (!mapa || !querEmail(mapa.dono.preferencias, "questionario")) return;

    await enviarEmail({
      para: mapa.dono.email,
      ...montarEmail({
        assunto: `${mapa.avaliado_nome} concluiu o mapa`,
        saudacao: saudar(mapa.dono.nome),
        paragrafos: [
          `${mapa.avaliado_nome} acabou de concluir o mapa. O relatório é preparado em alguns minutos, e você recebe outro aviso quando ele ficar pronto.`,
        ],
        botao: { rotulo: "Abrir o acervo de mapas", url: `${origem()}/facilitador/acervo-de-mapas` },
        rodape: "Você pode desligar este aviso em Configurações.",
      }),
    });
    await auditar(mapa.id, `Avisou por e-mail ao facilitador ${mapa.dono.email} que o mapa foi concluido`);
  } catch (erro) {
    console.error(`[email] aviso de conclusao do mapa ${assessmentId} nao saiu: ${mensagem(erro)}`);
  }
}

type Coluna = "relatorio_avaliado_enviado_em" | "relatorio_facilitador_enviado_em";

/**
 * Manda UMA vez: carimba a coluna com UPDATE condicional (`is null`) antes de
 * enviar, entao dois disparos simultaneos so deixam um passar. Se o envio
 * falha o carimbo volta a nulo, e a proxima geracao tenta de novo.
 */
async function umaVez(mapaId: string, coluna: Coluna, enviar: () => Promise<void>, oQue: string) {
  const [claim] = await db
    .update(assessments)
    .set({ [coluna]: new Date() })
    .where(and(eq(assessments.id, mapaId), isNull(assessments[coluna])))
    .returning({ id: assessments.id });
  if (!claim) return;

  try {
    await enviar();
  } catch (erro) {
    await db
      .update(assessments)
      .set({ [coluna]: null })
      .where(eq(assessments.id, mapaId));
    console.error(`[email] ${oQue} do mapa ${mapaId} nao saiu: ${mensagem(erro)}`);
    return;
  }
  await auditar(mapaId, `Enviou por e-mail ${oQue}`);
}

/**
 * Relatorio pronto: o link do proprio relatorio vai ao AVALIADO e ao
 * FACILITADOR, uma vez por mapa cada um. Chamado quando a narrativa e GRAVADA
 * (nunca quando e so reaproveitada). O aviso ao facilitador respeita a mesma
 * preferencia "questionario" do aviso de conclusao. Nunca lanca.
 */
export async function avisarRelatorioPronto(assessmentId: string): Promise<void> {
  try {
    const mapa = await mapaComDono(assessmentId);
    if (!mapa || mapa.situacao !== "concluido") return;
    const url = linkDoRelatorio(mapa.token);

    await umaVez(
      mapa.id,
      "relatorio_avaliado_enviado_em",
      () =>
        enviarEmail({
          para: mapa.avaliado_email,
          ...montarEmail({
            assunto: "O seu relatório está pronto",
            saudacao: saudar(mapa.avaliado_nome),
            paragrafos: ["O relatório do seu Mapa Comportamental já está pronto. Você pode abri-lo e salvá-lo em PDF."],
            botao: { rotulo: "Abrir o meu relatório", url },
            rodape: "Guarde este e-mail: o link é só seu.",
          }),
        }),
      `o relatorio pronto ao avaliado ${mapa.avaliado_email}`,
    );

    if (!querEmail(mapa.dono.preferencias, "questionario")) return;
    await umaVez(
      mapa.id,
      "relatorio_facilitador_enviado_em",
      () =>
        enviarEmail({
          para: mapa.dono.email,
          ...montarEmail({
            assunto: `O relatório de ${mapa.avaliado_nome} está pronto`,
            saudacao: saudar(mapa.dono.nome),
            paragrafos: [`O relatório de ${mapa.avaliado_nome} ficou pronto.`],
            botao: { rotulo: "Abrir o relatório", url },
            rodape: "Você pode desligar este aviso em Configurações.",
          }),
        }),
      `o relatorio pronto ao facilitador ${mapa.dono.email}`,
    );
  } catch (erro) {
    console.error(`[email] aviso de relatorio pronto do mapa ${assessmentId} falhou: ${mensagem(erro)}`);
  }
}

/**
 * Agenda o aviso de conclusao para DEPOIS da resposta ao respondente (`after`):
 * ele nao espera o SMTP para ver a tela final. Fora de uma requisicao do Next
 * (teste, CLI) `after` lanca e nao ha o que agendar — os testes chamam
 * `avisarConclusao` direto.
 */
export function agendarAvisoDeConclusao(assessmentId: string): void {
  try {
    after(() => avisarConclusao(assessmentId));
  } catch {
    // sem requisicao: nada a agendar, e o fecho nao pode falhar por isto.
  }
}
