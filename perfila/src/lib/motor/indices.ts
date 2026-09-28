/**
 * Indices de adaptacao (secao 5.5, pagina 08 do relatorio).
 *
 * A variacao sai dos escores JA arredondados, de proposito: o leitor ve 66,7 e
 * 33,3 nas barras e confere a diferenca de cabeca. Calcular do bruto daria uma
 * variacao que nao bate com os numeros impressos.
 */
import { FATORES, type Fator } from '@/data/inventario-mc'
import { r1 } from './arredondamento'

export type ClasseAdaptacao = 'baixa' | 'moderada' | 'alta' | 'muito alta' | 'extremamente alta'

export type Indices = {
  /** adaptado - natural; negativo = o fator cai no ambiente atual. */
  variacao: Record<Fator, number>
  indice_adaptacao: number
  classe: ClasseAdaptacao
  /** Fatores que trocam de extremo: <= 32 num lado e >= 70 no outro. */
  polarizados: Fator[]
  amplitude_natural: number
}

function classe(media: number): ClasseAdaptacao {
  if (media <= 10) return 'baixa'
  if (media <= 20) return 'moderada'
  if (media <= 25) return 'alta'
  if (media <= 35) return 'muito alta'
  return 'extremamente alta'
}

export function indices(nat: Record<Fator, number>, ada: Record<Fator, number>): Indices {
  const variacao = { D: 0, I: 0, S: 0, C: 0 }
  for (const f of FATORES) variacao[f] = r1(ada[f] - nat[f])
  const media = r1(FATORES.reduce((s, f) => s + Math.abs(variacao[f]), 0) / 4)
  const polarizados = FATORES.filter((f) => (nat[f] <= 32 && ada[f] >= 70) || (nat[f] >= 70 && ada[f] <= 32))
  const naturais = FATORES.map((f) => nat[f])
  return {
    variacao,
    indice_adaptacao: media,
    classe: classe(media),
    polarizados,
    amplitude_natural: r1(Math.max(...naturais) - Math.min(...naturais)),
  }
}
