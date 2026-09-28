/**
 * Valores de Spranger (secao 5.8).
 *
 *   pontos(item)  = 7 - posicao               (1o = 6 ... 6o = 1)
 *   escore(valor) = (bruto - 10) / 50 * 100   bruto de 10 a 60
 *
 * Os seis escores somam 300; se nao somam, a resposta e recusada, como no DISC.
 */
import { GRUPOS_VALORES, VALORES, type GrupoValor, type Valor } from '@/data/inventario-mc'
import { r1 } from './arredondamento'
import { conferirSoma, posicoesDoGrupo, type RespostasGrupos } from './ordenacao'

export type NivelValor = 'Significativo' | 'Circunstancial' | 'Indiferente'

export type PontuacaoValores = {
  bruto: Record<Valor, number>
  escore: Record<Valor, number>
  nivel: Record<Valor, NivelValor>
  /** Do que mais move ao que menos; empate na ordem TEO, ECO, EST, SOC, POL, PRI. */
  ranking: Valor[]
}

function nivel(escore: number): NivelValor {
  if (escore >= 66) return 'Significativo'
  if (escore >= 31) return 'Circunstancial'
  return 'Indiferente'
}

export function pontuarValores(
  respostas: RespostasGrupos,
  grupos: readonly GrupoValor[] = GRUPOS_VALORES,
): PontuacaoValores {
  const n = grupos.length
  const bruto = { TEO: 0, ECO: 0, EST: 0, SOC: 0, POL: 0, PRI: 0 }
  for (const g of grupos) {
    const pos = posicoesDoGrupo(respostas, g.grupo, g.itens.map((i) => i.id))
    for (const it of g.itens) bruto[it.valor] += 7 - pos[it.id]
  }
  const escore = { ...bruto }
  const niveis = {} as Record<Valor, NivelValor>
  for (const v of VALORES) {
    escore[v] = r1(((bruto[v] - n) / (5 * n)) * 100)
    niveis[v] = nivel(escore[v])
  }
  conferirSoma(VALORES.map((v) => escore[v]), 300, 0.3, 'Valores')
  const ranking = [...VALORES].sort((a, b) => escore[b] - escore[a] || VALORES.indexOf(a) - VALORES.indexOf(b))
  return { bruto, escore, nivel: niveis, ranking }
}
