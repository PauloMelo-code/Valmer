import { z } from "zod";

/**
 * Preferencias de notificacao do proprio parceiro. `strictObject` nos dois
 * niveis: id de notificacao desconhecido ou canal a mais e recusado com nome,
 * em vez de gravar lixo na coluna jsonb.
 */
const canais = z.strictObject({ email: z.boolean(), whatsapp: z.boolean() });

export const preferenciasSchema = z.strictObject({
  questionario: canais,
  relatorio: canais,
  recarga: canais,
});

export type Preferencias = z.infer<typeof preferenciasSchema>;
