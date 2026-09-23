import { z } from "zod";

/**
 * Turma criada pelo parceiro.
 *
 * Os limites do nome sao de TELA, e nao do banco: o nome aparece na primeira
 * coluna da lista e no topo do relatorio, e um nome que nao cabe e cortado no
 * meio de uma palavra.
 *
 * `area` e `tipo_relatorio` sao os mesmos valores dos enums do Postgres. A
 * validacao aqui nao substitui o tipo do banco: ela existe para o erro chegar
 * ao formulario como frase, em vez de como violacao de enum vinda do driver.
 */
export const criarTurmaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome do grupo muito curto")
    .max(120, "Nome do grupo muito longo"),
  area: z.enum(["global", "pessoal", "profissional"]),
  tipo_relatorio: z.enum(["S1", "S2", "S3", "S4"]),
  permite_download: z.boolean(),
  /** Opcional: o admin cria em nome de um parceiro. */
  facilitador_id: z.string().uuid().optional(),
});

/**
 * Edicao: o dono nao entra.
 *
 * Trocar `facilitador_id` de uma turma existente moveria junto tudo que pende
 * dela — os assessments continuariam com o dono antigo, e a FK composta
 * passaria a recusar a propria turma.
 */
export const atualizarTurmaSchema = criarTurmaSchema.omit({ facilitador_id: true });

export type CriarTurma = z.infer<typeof criarTurmaSchema>;
export type AtualizarTurma = z.infer<typeof atualizarTurmaSchema>;
