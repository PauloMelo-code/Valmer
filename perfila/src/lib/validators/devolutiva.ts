import { z } from "zod";

/**
 * Devolutiva: a sessao de feedback sobre UM assessment.
 *
 * Nao ha campo `situacao` porque nao ha coluna `situacao`. O estado sai de
 * `finalizada_em`, e quem finaliza e a action — a tela nao manda "Finalizada"
 * como se fosse um dado a mais, senao o dia em que a data e o rotulo
 * discordarem nao havera como saber qual dos dois esta certo.
 *
 * `duracao_segundos` tambem e validado no banco (`ck_devolutivas_duracao`).
 * Aqui o zero e aceito: sessao aberta e fechada em seguida durou zero, o que e
 * diferente de nao ter cronometro nenhum (nulo).
 */
export const criarDevolutivaSchema = z.object({
  assessment_id: z.string().uuid("Mapa invalido"),
  /** Opcional: o admin abre a devolutiva em nome de um parceiro. */
  facilitador_id: z.string().uuid().optional(),
});

export const atualizarDevolutivaSchema = z.object({
  duracao_segundos: z
    .number()
    .int("Duracao deve ser em segundos inteiros")
    .min(0, "Duracao nao pode ser negativa")
    .nullable(),
  /** True finaliza a sessao; false a devolve para pausada. */
  finalizada: z.boolean(),
});

export type CriarDevolutiva = z.infer<typeof criarDevolutivaSchema>;
export type AtualizarDevolutiva = z.infer<typeof atualizarDevolutivaSchema>;
