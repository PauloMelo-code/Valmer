/**
 * DISC natural e adaptado (secoes 5.1 a 5.3). Mesma conta para as duas
 * etapas; quem chama pontua cada uma separadamente.
 *
 *   pontos(item)       = 5 - posicao                  (1o = 4 ... 4o = 1)
 *   escore(fator)      = (bruto - 16) / 48 * 100      bruto de 16 a 64
 *   escore(competencia) = (bruto - 4) / 12 * 100      bruto de 4 a 16
 *
 * Os quatro escores somam 200 (+-0,2). Se nao somam, a resposta chegou
 * corrompida e e recusada — nao existe relatorio "quase certo".
 */
import { FATORES, GRUPOS_DISC, type Competencia, type Fator, type GrupoDisc } from '@/data/inventario-mc'
import { r1 } from './arredondamento'
import { conferirSoma, posicoesDoGrupo, type RespostasGrupos } from './ordenacao'

export type PontuacaoDisc = {
  bruto: Record<Fator, number>
  escore: Record<Fator, number>
  competencias: Record<Competencia, number>
  /** Quantas vezes cada fator ficou em 1o lugar — desempate do perfil. */
  primeiros: Record<Fator, number>
}

export function pontuarDisc(respostas: RespostasGrupos, grupos: readonly GrupoDisc[] = GRUPOS_DISC): PontuacaoDisc {
  const n = grupos.length
  const bruto = { D: 0, I: 0, S: 0, C: 0 }
  const primeiros = { D: 0, I: 0, S: 0, C: 0 }
  const brutoComp: Partial<Record<Competencia, number>> = {}
  for (const g of grupos) {
    const pos = posicoesDoGrupo(respostas, g.grupo, g.itens.map((i) => i.id))
    for (const it of g.itens) {
      const p = 5 - pos[it.id]
      bruto[it.fator] += p
      brutoComp[it.competencia] = (brutoComp[it.competencia] ?? 0) + p
      if (pos[it.id] === 1) primeiros[it.fator] += 1
    }
  }
  const escore = { D: 0, I: 0, S: 0, C: 0 }
  for (const f of FATORES) escore[f] = r1(((bruto[f] - n) / (3 * n)) * 100)
  conferirSoma(FATORES.map((f) => escore[f]), 200, 0.2, 'DISC')
  const competencias = Object.fromEntries(
    Object.entries(brutoComp).map(([c, b]) => [c, r1(((b - 4) / 12) * 100)]),
  ) as Record<Competencia, number>
  return { bruto, escore, competencias, primeiros }
}

/** Regua unica de 6 zonas (ADR-0007 D4). O limite e o piso da zona. */
export const ZONAS = [
  { limite: 88, codigo: 'EA', nome: 'Extremo alto' },
  { limite: 70, codigo: 'MA', nome: 'Muito alto' },
  { limite: 51, codigo: 'A', nome: 'Alto' },
  { limite: 33, codigo: 'B', nome: 'Baixo' },
  { limite: 16, codigo: 'MB', nome: 'Muito baixo' },
  { limite: 0, codigo: 'EB', nome: 'Extremo baixo' },
] as const
export type Zona = (typeof ZONAS)[number]['codigo']

export function zona(escore: number): Zona {
  return ZONAS.find((z) => escore >= z.limite)?.codigo ?? 'EB'
}
