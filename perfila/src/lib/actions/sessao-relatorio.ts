/**
 * O token do relatorio do mapa que a sessao de leitura discute.
 *
 * Existe porque a tela de Sessao de Leitura precisa levar o facilitador ao
 * documento — a rota `/relatorio/<token>` — e a lista dela nao carrega o token
 * (ela lista devolutivas, nao mapas). Em vez de gerar PDF novo, aponta para a
 * MESMA pagina que a lista de mapas ja abre e que o Puppeteer do CLI imprime:
 * um caminho so, e o arquivo sai igual ao que a pessoa reviu na tela.
 *
 * Leitura, entao NAO passa por `paraTela`: aquilo chama `revalidatePath`, e
 * revalidar a rota a cada clique de "ver" recarregaria a lista inteira sem
 * nada ter mudado no banco.
 */
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { assessments, devolutivas } from "@/lib/db/schema";
import { getSession, temPermissao } from "@/lib/auth";

const idSchema = z.string().uuid("Sessão de leitura inválida");

/**
 * Nulo quando nao ha relatorio a abrir, e de proposito indistinguivel entre os
 * casos: sessao que nao existe, sessao de OUTRO parceiro, mapa excluido depois
 * da sessao aberta, mapa que nao esta concluido. Tudo isso a tela resolve com a
 * mesma frase; separar em mensagens diferentes contaria a um parceiro que a
 * sessao do concorrente existe.
 *
 * Server Action e endpoint POST publico: a sessao, a permissao e o recorte por
 * dono sao conferidos AQUI DENTRO, e nao em quem chama.
 */
export async function tokenDoRelatorioDaSessao(id: unknown): Promise<string | null> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "devolutivas", "ler")) {
    throw new Error("Sem permissao para ler sessões de leitura");
  }

  // Id invalido morre aqui: passado adiante, ele chega ao Postgres como texto
  // que nao e uuid e volta como erro de driver na tela.
  const validado = idSchema.safeParse(id);
  if (!validado.success) return null;

  const [linha] = await db
    .select({ token: assessments.token })
    .from(devolutivas)
    .innerJoin(assessments, eq(assessments.id, devolutivas.assessment_id))
    .where(
      and(
        eq(devolutivas.id, validado.data),
        eq(devolutivas.is_deleted, false),
        eq(assessments.is_deleted, false),
        // Sem conclusao nao ha contadores, e `carregarRelatorio` devolveria
        // null: a aba abriria num 404 em vez de num documento.
        eq(assessments.situacao, "concluido"),
        sessao.papel === "admin" ? undefined : eq(devolutivas.facilitador_id, sessao.userId),
      ),
    )
    .limit(1);

  return linha?.token ?? null;
}
