/**
 * Cores das paginas 15 a 21 que o `cores.ts` compartilhado nao tem.
 *
 * O molde so mostra o caso do Valmer (D e I em cima; E, N, T predominantes;
 * POL como valor mais alto). Os tons claros do molde nao sao cores soltas: sao
 * a cor cheia misturada com branco numa proporcao fixa (conferido nos 6 polos
 * e nas 4 funcoes). Por isso as variantes que o molde nao mostra saem da mesma
 * conta, e nao de hex escolhidos a olho.
 */
import type { Fator, Valor } from '@/data/inventario-mc'
import type { PoloJung } from '@/data/relatorio-mc/jung'

/** Mistura com branco: 0 = a cor, 1 = branco. */
export function clarear(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16)
  return '#' + [n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** Proporcoes medidas no molde (paginas 18-20: #4B4E85 -> #BBBCD1 e 0,62 etc.). */
export const TOM = {
  /** Fundo do cartao do polo predominante. */
  fundo: 0.89,
  /** Barra do polo complementar. */
  barra: 0.62,
  /** Borda do cartao do polo complementar. */
  borda: 0.55,
  /** Marcador da lista do polo complementar. */
  marcador: 0.45,
} as const

/** Pagina 21: a barra clareia com a posicao na hierarquia (#76549A, #5A7393, #BC7E95, #8AB6B5). */
export const TOM_HIERARQUIA = [0, 0.15, 0.3, 0.45] as const

/** Pilulas da pagina 17; as quatro funcoes usam a cor do seu polo. */
export const COR_POLO: Record<PoloJung, string> = {
  E: '#B14A2F', I: '#4B4E85', N: '#76549A', S: '#2B7A78', T: '#3D5A80', F: '#A04668',
}

/** Borda clara dos cartoes por fator (paginas 15 e 16; S e C das paginas 11-12 do molde). */
export const BORDA_FATOR: Record<Fator, string> = {
  D: '#E4A3A3', I: '#E8C173', S: '#8DBEAA', C: '#93ABC3',
}

/**
 * Mostrador do valor na pagina 16. POL e ECO sao as cores cheias do molde
 * (paginas 16, 25, 26). Os outros quatro so aparecem no molde em tom reduzido
 * (pagina 24): o texto usa o rotulo escuro daquela pagina e a borda, a barra.
 * A confirmar com o Valmer junto com a paleta de valores.
 */
export const COR_VALOR: Record<Valor, { texto: string; borda: string; fundo: string }> = {
  POL: { texto: '#913D4C', borda: '#913D4C', fundo: '#F4E6E9' },
  ECO: { texto: '#A56618', borda: '#A56618', fundo: '#F8ECD9' },
  SOC: { texto: '#1C4936', borda: '#6DA28C', fundo: clarear('#6DA28C', 0.85) },
  PRI: { texto: '#383E44', borda: '#8D949B', fundo: clarear('#8D949B', 0.85) },
  TEO: { texto: '#20385F', borda: '#728DB8', fundo: clarear('#728DB8', 0.85) },
  EST: { texto: '#553656', borda: '#CBB5CC', fundo: clarear('#CBB5CC', 0.7) },
}
