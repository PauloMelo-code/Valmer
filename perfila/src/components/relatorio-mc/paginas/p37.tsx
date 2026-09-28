/**
 * Pagina 37 · Comunicar com os perfis S e C. Cartoes fixos por fator; a nota
 * do pe depende da ordem natural do avaliado (C31, ver p36-42/conversa).
 */
import { PAGINAS_COMUNICACAO_LIDERANCA } from '@/data/relatorio-mc/comunicacao-lideranca'
import { Pagina } from '../Pagina'
import { CorpoConversa } from './p36-42/conversa'
import type { PropsPagina } from './registro'

const P = PAGINAS_COMUNICACAO_LIDERANCA[37]

export default function Pagina37({ dados }: PropsPagina) {
  return (
    <Pagina dados={dados} numero={37} kicker={P.sobretitulo} titulo={P.titulo} subtitulo={P.subtitulo}>
      <CorpoConversa dados={dados} pagina={37} par={P.fatores} />
    </Pagina>
  )
}
