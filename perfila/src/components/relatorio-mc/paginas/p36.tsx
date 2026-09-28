/**
 * Pagina 36 · Comunicar com os perfis D e I. Cartoes fixos por fator; a nota
 * do pe depende da ordem natural do avaliado (C31, ver p36-42/conversa).
 */
import { PAGINAS_COMUNICACAO_LIDERANCA } from '@/data/relatorio-mc/comunicacao-lideranca'
import { Pagina } from '../Pagina'
import { CorpoConversa } from './p36-42/conversa'
import type { PropsPagina } from './registro'

const P = PAGINAS_COMUNICACAO_LIDERANCA[36]

export default function Pagina36({ dados }: PropsPagina) {
  return (
    <Pagina dados={dados} numero={36} kicker={P.sobretitulo} titulo={P.titulo} subtitulo={P.subtitulo}>
      <CorpoConversa dados={dados} pagina={36} par={P.fatores} />
    </Pagina>
  )
}
