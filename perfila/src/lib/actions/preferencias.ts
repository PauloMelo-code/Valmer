/**
 * Preferencias de notificacao de quem esta logado (/facilitador/configuracoes).
 *
 * Moram no servidor, e nao mais no navegador, porque agora o servidor precisa
 * lê-las: o aviso de "mapa respondido" por e-mail so sai se o parceiro nao o
 * desligou (`lib/email/avisos-do-mapa.ts`). WHERE sempre `id = sessao.userId`,
 * como em `actions/perfil.ts`: nao ha id vindo do cliente.
 */
"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { getSession, temPermissao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { preferenciasSchema } from "@/lib/validators/preferencias";

async function exigirSessao() {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "perfil", "atualizar")) {
    throw new Error("Sem permissao para atualizar o perfil");
  }
  return sessao;
}

/** O que a pessoa salvou, ou null se nunca salvou (a tela usa o padrao). */
export async function obterPreferencias(): Promise<unknown> {
  const sessao = await exigirSessao();
  const [linha] = await db
    .select({ preferencias: usuarios.preferencias_notificacao })
    .from(usuarios)
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .limit(1);
  return linha?.preferencias ?? null;
}

export async function salvarPreferencias(dados: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await exigirSessao();
  const parsed = preferenciasSchema.safeParse(dados);
  if (!parsed.success) return { ok: false, erro: "Preferências inválidas." };

  await db
    .update(usuarios)
    .set({ preferencias_notificacao: parsed.data, updated_at: new Date(), modified_by: sessao.userId })
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)));

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: "usuarios",
    registroId: sessao.userId,
    detalhes: "Atualizou as preferencias de notificacao",
  });
  return { ok: true };
}
