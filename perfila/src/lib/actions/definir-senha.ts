/**
 * Definir a propria senha pelo link enviado por e-mail (/definir-senha).
 *
 * Publica de proposito: o token do link e a credencial, como em /avaliacao.
 * Quem grava e `auth.api.resetPassword` (token de uso unico, 48h), que o
 * `disabledPaths` do Better Auth nao alcanca por ser chamada em processo — o
 * endpoint HTTP dele segue desligado. A regra de forca e a de todo o sistema
 * (`senhaNovaSchema`), cobrada aqui e de novo pela biblioteca (min 10).
 * Recusa em objeto: erro esperado nao pode chegar como digest opaco.
 */
"use server";

import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/config";
import { senhaNovaSchema } from "@/lib/validators/auth";

export type RespostaDefinirSenha =
  | { ok: true }
  | { ok: false; erro: string; linkInvalido?: boolean };

export async function definirSenhaPeloLink(
  token: unknown,
  senha: unknown,
  confirmacao: unknown,
): Promise<RespostaDefinirSenha> {
  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    return { ok: false, erro: "Link inválido.", linkInvalido: true };
  }

  const validada = senhaNovaSchema.safeParse(senha);
  if (!validada.success) {
    return { ok: false, erro: validada.error.issues[0]?.message ?? "Senha inválida" };
  }
  if (senha !== confirmacao) return { ok: false, erro: "As senhas não conferem." };

  try {
    await auth.api.resetPassword({ body: { newPassword: validada.data, token } });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof APIError && erro.body?.code === "INVALID_TOKEN") {
      return { ok: false, erro: "Este link expirou ou já foi usado.", linkInvalido: true };
    }
    throw erro;
  }
}
