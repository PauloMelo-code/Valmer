/**
 * Codigo humano do mapa, impresso na capa do relatorio: MC-AAAA-MMDD-XX.
 *
 * AAAA-MMDD e a data de criacao no horario de Brasilia (o servidor roda em
 * UTC, e um mapa criado as 22h do dia 28 nao pode sair com a data do dia 29).
 * XX sao as iniciais do avaliado — primeira letra do primeiro e do ultimo nome,
 * como no exemplo do blueprint, "MC-2026-0823-VA" para Valmer Albuquerque.
 *
 * REGRA DE COLISAO. Duas pessoas com as mesmas iniciais no mesmo dia sao
 * esperadas (envio em lote de 700). A primeira fica com o codigo limpo; as
 * seguintes ganham sufixo sequencial: MC-2026-0928-VA-2, -3... O primeiro
 * numero livre, e nao o maior + 1, porque um codigo nunca e liberado (o indice
 * unico ignora `is_deleted`), entao nao ha buraco para reaproveitar.
 */
import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";

const DATA_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Valmer Albuquerque" -> "VA". "Ana" -> "AN". Sem letra nenhuma -> "XX". */
export function iniciais(nome: string): string {
  const palavras = nome
    .normalize("NFD")
    .replace(/[^A-Za-z\s]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 0) return "XX";
  if (palavras.length === 1) return palavras[0]!.padEnd(2, "X").slice(0, 2);
  return palavras[0]![0]! + palavras[palavras.length - 1]![0]!;
}

/** Sem colisao: MC-2026-0928-VA. */
export function codigoBase(nome: string, quando: Date): string {
  const [ano, mes, dia] = DATA_SP.format(quando).split("-");
  return `MC-${ano}-${mes}${dia}-${iniciais(nome)}`;
}

/** O primeiro codigo livre a partir da base, dado o que ja esta ocupado. */
export function proximoCodigo(base: string, ocupados: readonly string[]): string {
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

type Executor = Pick<typeof db, "select">;

/**
 * Consulta os codigos do dia com as mesmas iniciais e devolve o proximo livre.
 *
 * Le TODAS as linhas, inclusive as excluidas: o codigo de um mapa excluido ja
 * pode estar impresso num PDF entregue, e reaproveitar faria dois relatorios
 * diferentes com o mesmo codigo.
 *
 * ponytail: duas criacoes simultaneas com a mesma base podem escolher o mesmo
 * codigo; o `uq_assessments_codigo` recusa a segunda (23505) e quem cria
 * tenta de novo. Se o lote paralelo tornar isso frequente, travar por base
 * com pg_advisory_xact_lock(hashtext(base)) dentro da transacao da criacao.
 */
export async function gerarCodigo(executor: Executor, nome: string, quando: Date): Promise<string> {
  const base = codigoBase(nome, quando);
  const linhas = await executor
    .select({ codigo: assessments.codigo })
    .from(assessments)
    .where(like(assessments.codigo, `${base}%`));
  return proximoCodigo(base, linhas.map((l) => l.codigo!));
}
