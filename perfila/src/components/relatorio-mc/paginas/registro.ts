/**
 * As 42 paginas do relatorio MC 3.1, na ordem do molde.
 *
 * Cada pagina e `pNN.tsx` com `export default function PaginaNN({ dados }: PropsPagina)`,
 * componente SINCRONO (sem `async`: `useTexturas` usa hook) que le so `dados` —
 * nada de banco, nada de conta. Quem decide quais entram e o nivel (D9):
 * `DocumentoMC` filtra por `dados.nivel.inclui`.
 */
import type { ComponentType } from 'react'
import { INDICE } from '@/data/relatorio-mc/textos-fixos'
import { etapaDaPagina, type CodigoEtapa, type DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import P01 from './p01'
import P02 from './p02'
import P03 from './p03'
import P04 from './p04'
import P05 from './p05'
import P06 from './p06'
import P07 from './p07'
import P08 from './p08'
import P09 from './p09'
import P10 from './p10'
import P11 from './p11'
import P12 from './p12'
import P13 from './p13'
import P14 from './p14'
import P15 from './p15'
import P16 from './p16'
import P17 from './p17'
import P18 from './p18'
import P19 from './p19'
import P20 from './p20'
import P21 from './p21'
import P22 from './p22'
import P23 from './p23'
import P24 from './p24'
import P25 from './p25'
import P26 from './p26'
import P27 from './p27'
import P28 from './p28'
import P29 from './p29'
import P30 from './p30'
import P31 from './p31'
import P32 from './p32'
import P33 from './p33'
import P34 from './p34'
import P35 from './p35'
import P36 from './p36'
import P37 from './p37'
import P38 from './p38'
import P39 from './p39'
import P40 from './p40'
import P41 from './p41'
import P42 from './p42'

export type PropsPagina = { dados: DadosRelatorioMC }

export type PaginaRegistrada = {
  numero: number
  /** Titulo do indice (pagina 02). A capa e o proprio indice nao estao no indice do molde. */
  titulo: string
  etapa: CodigoEtapa
  Componente: ComponentType<PropsPagina>
}

const COMPONENTES: ComponentType<PropsPagina>[] = [
  P01, P02, P03, P04, P05, P06, P07, P08, P09, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21, P22, P23, P24, P25, P26, P27, P28, P29, P30, P31, P32, P33, P34, P35, P36, P37, P38, P39, P40, P41, P42,
]

const TITULO_FORA_DO_INDICE: Record<number, string> = { 1: 'Capa', 2: 'Índice' }

export const PAGINAS: readonly PaginaRegistrada[] = COMPONENTES.map((Componente, i) => ({
  numero: i + 1,
  titulo: TITULO_FORA_DO_INDICE[i + 1] ?? INDICE[i + 1],
  etapa: etapaDaPagina(i + 1).codigo,
  Componente,
}))
