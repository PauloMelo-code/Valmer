/** Pagina 11 · fator S. A estrutura e a das paginas 09 a 12, em p08-14/PaginaFator. */
import { PaginaFator } from './p08-14/PaginaFator'
import type { PropsPagina } from './registro'

export default function Pagina11({ dados }: PropsPagina) {
  return <PaginaFator dados={dados} fator="S" numero={11} />
}
