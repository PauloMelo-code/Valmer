/**
 * Pagina 40 · Liderando os perfis S e C. Cartoes fixos por fator; o atrito
 * previsivel depende do fator mais alto do avaliado (C31, ver p36-42/lideranca).
 */
import { PAGINAS_COMUNICACAO_LIDERANCA } from '@/data/relatorio-mc/comunicacao-lideranca'
import { Pagina } from '../Pagina'
import { CorpoLideranca } from './p36-42/lideranca'
import type { PropsPagina } from './registro'

const P = PAGINAS_COMUNICACAO_LIDERANCA[40]

export default function Pagina40({ dados }: PropsPagina) {
  return (
    <Pagina dados={dados} numero={40} kicker={P.sobretitulo} titulo={P.titulo} subtitulo={P.subtitulo}>
      <CorpoLideranca dados={dados} par={P.fatores} />
    </Pagina>
  )
}
