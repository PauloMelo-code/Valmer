/** Pagina 12 · fator C. A estrutura e a das paginas 09 a 12, em p08-14/PaginaFator. */
import { PaginaFator } from './p08-14/PaginaFator'
import type { PropsPagina } from './registro'

export default function Pagina12({ dados }: PropsPagina) {
  return <PaginaFator dados={dados} fator="C" numero={12} />
}
