/**
 * Pede ao Better Auth o link de primeiro acesso e o manda por e-mail.
 *
 * NAO e "use server": recebe o parceiro ja lido e o id de quem pediu, e quem
 * decide se PODE e a action (`actions/facilitadores.ts`), com sessao e RBAC.
 * Exportado de um modulo "use server" isto viraria endpoint publico.
 *
 * Nunca lanca por falha de envio: devolve o motivo, porque o chamador tem de
 * seguir (o cadastro ja foi commitado). A trilha registra o EVENTO, sem token.
 */
import { registrarAuditoria } from "@/lib/audit/logger";
import { resultadoDoEnvio, type ResultadoDoEnvio } from "@/lib/email/acesso";
import { auth } from "./config";

export type EnvioDeAcesso = { ok: true } | { ok: false; erro: string };

export async function enviarAcessoPorEmail(
  parceiro: { id: string; email: string },
  quemPediuId: string,
): Promise<EnvioDeAcesso> {
  const estado: ResultadoDoEnvio = { enviado: false };

  try {
    await resultadoDoEnvio.run(estado, () =>
      auth.api.requestPasswordReset({
        body: { email: parceiro.email, redirectTo: "/definir-senha" },
      }),
    );
  } catch {
    return { ok: false, erro: "não foi possível gerar o link de acesso" };
  }

  if (!estado.enviado) return { ok: false, erro: estado.erro ?? "o e-mail não foi enviado" };

  await registrarAuditoria({
    userId: quemPediuId,
    acao: "atualizar",
    tabela: "usuarios",
    registroId: parceiro.id,
    detalhes: `Enviou o acesso por e-mail para ${parceiro.email}`,
  });
  return { ok: true };
}
