/**
 * Perfil DISC (secao 5.4): a sigla que busca o arquetipo do perfil composto.
 *
 * Ordem dos fatores: maior escore primeiro; empate vai para quem ficou mais
 * vezes em 1o lugar; persistindo, a ordem fixa D, I, S, C. Predominante e o
 * fator com escore >= 51 (piso da zona Alto). A sigla junta os dois primeiros
 * predominantes; nenhum predominante e "EQUILIBRADO".
 */
import { FATORES, type Fator } from '@/data/inventario-mc'

export const PERFIL_EQUILIBRADO = 'EQUILIBRADO'

export type Perfil = { sigla: string; ordem: Fator[] }

export function perfil(escore: Record<Fator, number>, primeiros: Record<Fator, number>): Perfil {
  const ordem = [...FATORES].sort(
    (a, b) => escore[b] - escore[a] || primeiros[b] - primeiros[a] || FATORES.indexOf(a) - FATORES.indexOf(b),
  )
  const acima = ordem.filter((f) => escore[f] >= 51)
  return { sigla: acima.length ? acima.slice(0, 2).join('') : PERFIL_EQUILIBRADO, ordem }
}
