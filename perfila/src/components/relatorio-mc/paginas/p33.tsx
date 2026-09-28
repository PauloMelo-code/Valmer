/** Pagina 33 · Pontos a desenvolver, 01 a 03 (IA: `seis_pontos_desenvolver[0..2]`). */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'
import { PontosDesenvolver } from './p29-35/PontosDesenvolver'

export default function Pagina33({ dados }: PropsPagina) {
  return (
    <Pagina
      dados={dados}
      numero={33}
      kicker="Depois do perfil"
      titulo="Pontos a desenvolver"
      subtitulo="Desenvolver não significa corrigir quem você é. Significa ampliar repertório para que suas características trabalhem a seu favor em mais situações. Todo padrão comportamental possui potência e risco: quando usado com consciência, gera resultado; quando se torna automático ou excessivo, pode limitar relações, decisões e performance. Escolha poucas prioridades, transforme-as em ações observáveis e acompanhe evidências de evolução."
    >
      <PontosDesenvolver pontos={dados.ia.pontosDesenvolver} primeiro={0} />
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
