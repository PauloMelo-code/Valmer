/** Pagina 20 · Pensamento e Sentimento (eixo TF). Estrutura comum em `p15-21/PaginaEixo`. */
import { PaginaEixo } from './p15-21/PaginaEixo'
import type { PropsPagina } from './registro'

export default function Pagina20({ dados }: PropsPagina) {
  return <PaginaEixo dados={dados} eixo="TF" />
}
