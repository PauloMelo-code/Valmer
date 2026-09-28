/**
 * O inventario MC-INV 2.2 em dados, com tipo.
 *
 * `inventario-mc.json` e copia byte a byte de
 * `contexto/referencias/mc-inv-2.2/inventario.json`, que por sua vez e
 * identico ao que `motor_referencia.py` gera (conferido em 28/09/2026). A regra
 * da secao 24 do blueprint e nao redigitar item nenhum: quem precisa de uma
 * palavra, de um grupo ou de um par le daqui. Trocar uma palavra e decisao do
 * Valmer, comeca no motor Python e sobe a versao do instrumento — ver ADR-0007.
 *
 * Os identificadores sao o contrato entre tela, banco e motor, e nao mudam:
 *   - item DISC   `G07-D`   (grupo 07, fator D)        tela `G07`
 *   - par de Jung `NS04`    (eixo NS, quarto par)      tela `NS04`
 *   - item valor  `V03-ECO` (grupo 03, valor ECO)      tela `V03`
 */
import dados from './inventario-mc.json'

export const VERSAO_INSTRUMENTO = 'MC-INV 2.2'

export const FATORES = ['D', 'I', 'S', 'C'] as const
export type Fator = (typeof FATORES)[number]

export const EIXOS_JUNG = ['EI', 'NS', 'TF'] as const
export type EixoJung = (typeof EIXOS_JUNG)[number]
/** Polo A de cada eixo e o primeiro da dupla: E, N, T. */
export const POLOS: Record<EixoJung, readonly [string, string]> = {
  EI: ['E', 'I'],
  NS: ['N', 'S'],
  TF: ['T', 'F'],
}

export const VALORES = ['TEO', 'ECO', 'EST', 'SOC', 'POL', 'PRI'] as const
export type Valor = (typeof VALORES)[number]

export type Competencia =
  | 'ousadia' | 'comando' | 'objetividade' | 'assertividade'
  | 'persuasao' | 'extroversao' | 'entusiasmo' | 'sociabilidade'
  | 'empatia' | 'paciencia' | 'constancia' | 'cooperacao'
  | 'organizacao' | 'detalhismo' | 'analise' | 'investigacao'

export type ItemDisc = { id: string; texto: string; fator: Fator; competencia: Competencia }
export type GrupoDisc = { grupo: number; itens: ItemDisc[] }

export type ItemValor = { id: string; texto: string; valor: Valor }
export type GrupoValor = { grupo: number; itens: ItemValor[] }

export type ParJung = { id: string; eixo: EixoJung; poloA: string; poloB: string }

type Bruto = {
  versao: string
  disc: GrupoDisc[]
  jung: Record<EixoJung, [string, string][]>
  valores: GrupoValor[]
}

const bruto = dados as Bruto

if (bruto.versao !== VERSAO_INSTRUMENTO) {
  // Um JSON de outra versao carregado aqui calcularia com os itens errados em
  // silencio. Melhor nao subir.
  throw new Error(`inventario-mc.json e ${bruto.versao}, o codigo espera ${VERSAO_INSTRUMENTO}`)
}

export const GRUPOS_DISC: readonly GrupoDisc[] = bruto.disc
export const GRUPOS_VALORES: readonly GrupoValor[] = bruto.valores

export const PARES_JUNG: readonly ParJung[] = EIXOS_JUNG.flatMap((eixo) =>
  bruto.jung[eixo].map(([poloA, poloB], indice) => ({
    id: `${eixo}${String(indice + 1).padStart(2, '0')}`,
    eixo,
    poloA,
    poloB,
  })),
)

export const COMPETENCIAS_POR_FATOR: Record<Fator, Competencia[]> = {
  D: ['ousadia', 'comando', 'objetividade', 'assertividade'],
  I: ['persuasao', 'extroversao', 'entusiasmo', 'sociabilidade'],
  S: ['empatia', 'paciencia', 'constancia', 'cooperacao'],
  C: ['organizacao', 'detalhismo', 'analise', 'investigacao'],
}

/** 16 + 16 + 27 + 10. O fim do inventario e a 69a tela salva. */
export const TOTAL_TELAS = GRUPOS_DISC.length * 2 + PARES_JUNG.length + GRUPOS_VALORES.length

/** `G07` → 7. `V03` → 3. Recusa o que nao for tela de grupo. */
export function numeroDoGrupo(tela: string): number {
  const casou = /^[GV](\d{2})$/.exec(tela)
  if (!casou) throw new Error(`tela de grupo invalida: ${tela}`)
  return Number(casou[1])
}

export function telaDoGrupo(prefixo: 'G' | 'V', grupo: number): string {
  return `${prefixo}${String(grupo).padStart(2, '0')}`
}
