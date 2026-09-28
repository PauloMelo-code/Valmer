/** Pagina 19 · Intuicao e Sensacao (eixo NS). Estrutura comum em `p15-21/PaginaEixo`. */
import { PaginaEixo } from './p15-21/PaginaEixo'
import type { PropsPagina } from './registro'

export default function Pagina19({ dados }: PropsPagina) {
  return <PaginaEixo dados={dados} eixo="NS" />
}
