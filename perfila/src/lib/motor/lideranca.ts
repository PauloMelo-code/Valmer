/**
 * Estilos de lideranca (secao 5.6, pagina 29), sempre sobre o perfil natural.
 * Cada estilo pondera dois fatores; o percentual e a fatia de cada um na soma
 * dos quatro, e por isso os quatro somam 100 (+-0,2 do arredondamento).
 */
import type { Fator } from '@/data/inventario-mc'
import { r1 } from './arredondamento'

export type Lideranca = { executivo: number; metodico: number; motivador: number; sistematico: number }

export function lideranca(n: Record<Fator, number>): Lideranca {
  const executivo = n.D * 0.6 + n.C * 0.4
  const metodico = n.S * 0.6 + n.C * 0.4
  const motivador = n.I * 0.6 + n.S * 0.4
  const sistematico = n.C * 0.6 + n.D * 0.4
  // Mesma ordem de soma da referencia: em ponto flutuante a ordem muda o ultimo bit.
  const t = executivo + metodico + motivador + sistematico
  return {
    executivo: r1((executivo / t) * 100),
    metodico: r1((metodico / t) * 100),
    motivador: r1((motivador / t) * 100),
    sistematico: r1((sistematico / t) * 100),
  }
}
