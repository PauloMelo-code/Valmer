import { z } from "zod";

/**
 * Territorio da Empresa: o perfil coletivo de uma empresa.
 *
 * O formulario tem dois campos, nome e descricao. O slug NAO e campo: sai do
 * nome, porque pedir ao parceiro um "identificador da URL" e pedir que ele
 * resolva um problema nosso. Quem fecha a colisao de slug e o indice unico
 * (dono, slug) mais o sufixo de `actions/territorios.ts`.
 */

/**
 * Slug a partir do nome: minusculo, sem acento, so letra, numero e hifen.
 *
 * A normalizacao NFD separa a letra do acento e o range ̀-ͯ apaga o
 * acento sozinho — "DM Distribuidora de Produtos & Acessorios Ltda" vira
 * "dm-distribuidora-de-produtos-acessorios-ltda". Sem isso o "ç" e o "õ" iriam
 * para a URL percent-encoded, e o link que o parceiro manda por WhatsApp
 * chegaria ilegivel do outro lado.
 *
 * Nome inteiro em caractere que nao sobrevive a isso (so emoji, so ideograma)
 * resulta em string vazia; quem trata e o `min(1)` do schema, que devolve o
 * erro ao formulario em vez de gravar um slug vazio e uma URL quebrada.
 */
export function slugDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const territorioBase = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome do territorio muito curto")
    .max(160, "Nome do territorio muito longo")
    .refine((nome) => slugDoNome(nome).length >= 1, "Nome precisa ter letra ou numero"),
  /**
   * String vazia e nulo chegam do textarea como a mesma coisa: nao preenchido.
   * Sem este preprocess, "" viraria descricao vazia gravada, e a tela mostraria
   * um bloco de descricao em branco em vez de nao mostrar bloco nenhum.
   */
  descricao: z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
    z.string().trim().max(1000, "Descricao muito longa").nullable().default(null),
  ),
  /** Opcional: o admin cadastra em nome de um parceiro. */
  facilitador_id: z.string().uuid().optional(),
});

export const criarTerritorioSchema = territorioBase;

/**
 * Edicao: o dono nao entra, e o slug tambem nao muda.
 *
 * Renomear a empresa mantem a URL, porque o link do relatorio coletivo ja foi
 * enviado ao cliente. Slug que acompanha o nome quebraria esse link em silencio
 * — a pessoa recebe 404 e ninguem fica sabendo.
 */
export const atualizarTerritorioSchema = territorioBase.omit({ facilitador_id: true });

/** Vinculo de um inventario ao territorio. */
export const vincularInventarioSchema = z.object({
  territorio_id: z.string().uuid("Territorio invalido"),
  assessment_id: z.string().uuid("Inventario invalido"),
});

export type CriarTerritorio = z.infer<typeof criarTerritorioSchema>;
export type AtualizarTerritorio = z.infer<typeof atualizarTerritorioSchema>;
