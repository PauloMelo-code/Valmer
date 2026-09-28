/**
 * Pagina 34 · Pontos a desenvolver, 04 a 06, e o PDI.
 *
 * D5/C30: o PDI entra no lugar do cartao "Como acompanhar" do molde, que era
 * conselho generico. Ele precisa de mais espaco que o cartao de meia largura,
 * entao "Por onde comecar" encolhe para a lateral.
 */
import { POR_ONDE_COMECAR, ROTULOS_PDI } from '@/data/relatorio-mc/variantes/p29-35'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import type { PropsPagina } from './registro'
import { PontosDesenvolver } from './p29-35/PontosDesenvolver'

export default function Pagina34({ dados }: PropsPagina) {
  const pdi = dados.ia.pdi
  return (
    <Pagina dados={dados} numero={34} kicker="Depois do perfil" titulo="Pontos a desenvolver · continuação" subtitulo="Pontos 04 a 06.">
      <PontosDesenvolver pontos={dados.ia.pontosDesenvolver} primeiro={3} />
      <div className="row" style={{ gap: '3.5mm' }}>
        <div className="card" style={{ flex: 1 }}>
          <h3>{POR_ONDE_COMECAR.titulo}</h3>
          <div className="xs">{POR_ONDE_COMECAR.texto}</div>
        </div>
        <div className="card" style={{ flex: 2.2, borderTop: '1.2mm solid #1F7A6D' }}>
          <h3>{ROTULOS_PDI.titulo}</h3>
          <div className="g2" style={{ gap: '3mm' }}>
            <div>
              <span className="lab">{ROTULOS_PDI.prioridade}</span>
              <TextoIA como="div" className="xs" texto={pdi?.prioridade_principal} style={{ marginBottom: '1.6mm' }} />
              <span className="lab">{ROTULOS_PDI.acoes}</span>
              {pdi ? (
                <ul className="l xs">
                  {pdi.acoes_semanais.map((a) => <li key={a}>{a}</li>)}
                </ul>
              ) : (
                <TextoIA como="div" className="xs" texto={null} />
              )}
            </div>
            <div>
              <span className="lab">{ROTULOS_PDI.desafio}</span>
              <TextoIA como="div" className="xs" texto={pdi?.desafio_30_dias} style={{ marginBottom: '1.6mm' }} />
              <span className="lab">{ROTULOS_PDI.medir}</span>
              <TextoIA como="div" className="xs" texto={pdi?.como_medir} />
            </div>
          </div>
        </div>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
