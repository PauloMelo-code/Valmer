/** Pagina 18 · Extroversao e Introversao (eixo EI). Estrutura comum em `p15-21/PaginaEixo`. */
import { PaginaEixo } from './p15-21/PaginaEixo'
import type { PropsPagina } from './registro'

export default function Pagina18({ dados }: PropsPagina) {
  return <PaginaEixo dados={dados} eixo="EI" />
}
