/**
 * Cores de valor, de polo de Jung e de estilo de lideranca usadas nas paginas
 * 22 a 28. `cores.ts` dos dados so tem as dos fatores DISC.
 *
 * Por que uma tabela e nao conta na pagina: a mesma cor aparece na 24, 25, 26
 * e 27, e o leitor reconhece o valor pela cor de uma pagina para a outra.
 */
import type { Fator, Valor } from '@/data/inventario-mc'
import type { CodigoFaixaValor } from '@/data/relatorio-mc/spranger'
import type { PoloJung } from '@/data/relatorio-mc/jung'
import type { Lideranca } from '@/lib/motor'

/**
 * `texto`: nome sobre fundo claro (24). `cheio` / `reduzido` / `claro`: tom
 * da barra por faixa (24, 27) — "cor cheia para significativo, tom reduzido
 * para circunstancial e tom mais claro para indiferente". `fundo`: cartao da 25.
 *
 * O molde so mostra um tom de cada valor (o do Valmer). Os que faltam saem da
 * mesma regra: reduzido = cheio 30% para o branco, claro = 60%, fundo = 88%.
 * O cheio de SOC, PRI e TEO foi recuperado do reduzido do molde, e o de EST do
 * claro, pela mesma regra; POL e ECO sao os do molde. A confirmar com o Valmer.
 */
export const COR_VALOR: Record<Valor, { texto: string; cheio: string; reduzido: string; claro: string; fundo: string }> = {
  POL: { texto: '#58252E', cheio: '#913D4C', reduzido: '#B27782', claro: '#D3B1B7', fundo: '#F4E6E9' },
  ECO: { texto: '#65400E', cheio: '#A56618', reduzido: '#C0945D', claro: '#DBC2A3', fundo: '#F8ECD9' },
  SOC: { texto: '#1C4936', cheio: '#2E7A5B', reduzido: '#6DA28C', claro: '#ABCABD', fundo: '#E6EFEB' },
  PRI: { texto: '#383E44', cheio: '#5C6670', reduzido: '#8D949B', claro: '#BEC2C6', fundo: '#EBEDEE' },
  TEO: { texto: '#20385F', cheio: '#365C9A', reduzido: '#728DB8', claro: '#AFBED7', fundo: '#E7EBF3' },
  EST: { texto: '#553656', cheio: '#7D4680', reduzido: '#A47EA6', claro: '#CBB5CC', fundo: '#EFE9F0' },
}

export function tomDoValor(valor: Valor, faixa: CodigoFaixaValor): string {
  const c = COR_VALOR[valor]
  return faixa === 'significativo' ? c.cheio : faixa === 'circunstancial' ? c.reduzido : c.claro
}

/** Paginas 17-22 do molde. `fundo` de I e F nao aparece no molde: 90% para o branco. */
export const COR_POLO: Record<PoloJung, { principal: string; fundo: string }> = {
  E: { principal: '#B14A2F', fundo: '#F8E8E2' },
  I: { principal: '#4B4E85', fundo: '#EDEDF3' },
  N: { principal: '#76549A', fundo: '#F0EAF6' },
  S: { principal: '#2B7A78', fundo: '#E2F1F0' },
  T: { principal: '#3D5A80', fundo: '#E7EEF4' },
  F: { principal: '#A04668', fundo: '#F6EDF0' },
}

/** Cada estilo pela cor do fator de peso 0,6 na formula do motor (lideranca.ts). */
export const FATOR_DO_ESTILO: Record<keyof Lideranca, Fator> = {
  executivo: 'D',
  motivador: 'I',
  metodico: 'S',
  sistematico: 'C',
}
