import { z } from "zod";

/**
 * Cargo da tela Perfil Ideal por Cargo, com o alvo DISC da posicao.
 *
 * Os quatro alvos andam JUNTOS: ou todos preenchidos ou todos vazios, e
 * somando 100 quando preenchidos. A mesma regra esta no CHECK
 * `ck_cargos_alvo`, e a duplicidade e intencional — aqui ela existe para o
 * erro chegar ao formulario como frase ("os alvos precisam somar 100%"), e la
 * para valer tambem no seed, na importacao e no UPDATE feito no psql.
 *
 * Nulo e string vazia chegam do formulario como a mesma coisa: campo nao
 * preenchido. O `preprocess` traduz isso para `null` antes do resto, senao
 * "" viraria 0 e um cargo sem alvo passaria a somar 0 em vez de nao ter alvo.
 */
const alvo = z.preprocess(
  (valor) => (valor === "" || valor === null || valor === undefined ? null : valor),
  z.coerce.number().int("Percentual deve ser inteiro").min(0).max(100).nullable(),
);

const cargoBase = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome do cargo muito curto")
    .max(120, "Nome do cargo muito longo"),
  alvo_d: alvo,
  alvo_i: alvo,
  alvo_s: alvo,
  alvo_c: alvo,
  /** Opcional: o admin cadastra em nome de um parceiro. */
  facilitador_id: z.string().uuid().optional(),
});

/** Todos vazios, ou todos preenchidos somando 100. Nao ha meio termo. */
function alvoFechado({
  alvo_d,
  alvo_i,
  alvo_s,
  alvo_c,
}: {
  alvo_d: number | null;
  alvo_i: number | null;
  alvo_s: number | null;
  alvo_c: number | null;
}) {
  const valores = [alvo_d, alvo_i, alvo_s, alvo_c];
  if (valores.every((valor) => valor === null)) return true;
  if (valores.some((valor) => valor === null)) return false;
  return valores.reduce((soma, valor) => soma! + valor!, 0) === 100;
}

const RECADO_ALVO = {
  message: "Preencha os quatro alvos somando 100%, ou deixe os quatro em branco",
  path: ["alvo_d"],
};

export const criarCargoSchema = cargoBase.refine(alvoFechado, RECADO_ALVO);

/**
 * Edicao: o dono nao entra.
 *
 * O `omit` acontece no objeto CRU, antes do refine, porque schema ja refinado
 * nao tem `omit` — e repetir o refine e mais barato que reabrir o objeto.
 */
export const atualizarCargoSchema = cargoBase
  .omit({ facilitador_id: true })
  .refine(alvoFechado, RECADO_ALVO);

export type CriarCargo = z.infer<typeof criarCargoSchema>;
export type AtualizarCargo = z.infer<typeof atualizarCargoSchema>;
