import { z } from "zod";
import { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, telaDoGrupo } from "@/data/inventario-mc";

/**
 * Uma tela do inventario MC-INV 2.2, como o respondente envia.
 *
 * As telas e os ids validos saem do INVENTARIO, e nao de regex: "G17" tem o
 * formato certo e nao existe, e um id inventado aceito aqui vira ponto num
 * fator que ninguem consegue explicar depois. /avaliacao/<token> e entrada
 * publica sem login — a fronteira de confianca do sistema.
 *
 * Entrada adulterada LANCA (parse). A recusa em objeto de lib/inventario e
 * para estado esperado (sem consentimento, etapa travada), nao para isto.
 */

/** Tela -> ids dos itens dela, na ordem de cadastro. Etapas 1, 2 e 4. */
const ITENS_DA_TELA = new Map<string, string[]>([
  ...GRUPOS_DISC.map((g) => [telaDoGrupo("G", g.grupo), g.itens.map((i) => i.id)] as const),
  ...GRUPOS_VALORES.map((g) => [telaDoGrupo("V", g.grupo), g.itens.map((i) => i.id)] as const),
]);

const TELAS_DISC = GRUPOS_DISC.map((g) => telaDoGrupo("G", g.grupo)) as [string, ...string[]];
const TELAS_VALORES = GRUPOS_VALORES.map((g) => telaDoGrupo("V", g.grupo)) as [string, ...string[]];
const TELAS_JUNG = PARES_JUNG.map((p) => p.id) as [string, ...string[]];

/** Quantas telas cada etapa tem: 16, 16, 27, 10. */
export const TELAS_POR_ETAPA = {
  1: TELAS_DISC.length,
  2: TELAS_DISC.length,
  3: TELAS_JUNG.length,
  4: TELAS_VALORES.length,
} as const;

export type Etapa = keyof typeof TELAS_POR_ETAPA;

/**
 * Carimbo do navegador. Aceita offset porque o relogio e o do respondente;
 * quem compara tempos (validade V1/V2) compara saida com entrada da MESMA
 * pessoa, entao fuso nao distorce nada.
 */
const carimbo = z.iso.datetime({ offset: true }).transform((texto) => new Date(texto));

const comum = {
  moveu_item: z.boolean(),
  entrou_em: carimbo,
  saiu_em: carimbo,
};

/**
 * `ordem_final` tem que ser os ids DAQUELA tela, cada um uma vez. Sem isso,
 * "G07-D" repetido quatro vezes daria 10 pontos a D numa tela so.
 */
const ordem = (tamanho: number) => z.array(z.string()).length(tamanho);

export const telaSchema = z
  .discriminatedUnion("etapa", [
    z.object({ etapa: z.literal([1, 2]), tela: z.enum(TELAS_DISC), ordem_final: ordem(4), ...comum }),
    z.object({
      etapa: z.literal(3),
      tela: z.enum(TELAS_JUNG),
      lado_polo_a: z.enum(["esquerda", "direita"]),
      resposta_exibida: z.int().min(0).max(3),
      ...comum,
    }),
    z.object({ etapa: z.literal(4), tela: z.enum(TELAS_VALORES), ordem_final: ordem(6), ...comum }),
  ])
  .superRefine((tela, ctx) => {
    if (tela.saiu_em < tela.entrou_em) {
      ctx.addIssue({ code: "custom", path: ["saiu_em"], message: "Saida antes da entrada" });
    }
    if (tela.etapa === 3) return;

    const esperados = [...ITENS_DA_TELA.get(tela.tela)!].sort();
    const enviados = [...tela.ordem_final].sort();
    if (esperados.some((id, i) => id !== enviados[i])) {
      ctx.addIssue({
        code: "custom",
        path: ["ordem_final"],
        message: "A ordem precisa conter cada item desta tela exatamente uma vez",
      });
    }
  });

export type TelaEnviada = z.input<typeof telaSchema>;
export type TelaValidada = z.output<typeof telaSchema>;

/**
 * Botao clicado -> escala do polo A (secao 23 do blueprint): com o polo A a
 * esquerda, o botao 0 ("muito esquerda") e "muito A" = 3; a direita, o botao
 * ja esta na orientacao certa. O CHECK `ck_assessments_telas_polo_a` repete a
 * regra no banco.
 */
export function paraPoloA(lado: "esquerda" | "direita", botao: number): number {
  return lado === "esquerda" ? 3 - botao : botao;
}
