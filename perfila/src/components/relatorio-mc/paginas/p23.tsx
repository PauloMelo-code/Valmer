/**
 * Pagina 23 · Teoria de valores. Texto fixo, menos o rotulo das faixas, que
 * sai dos limites da v2.2 (">= 66, 31 a 65,9, <= 30,9") e nao do molde
 * ("31 a 65", "1 a 30"), onde 65,5 ficaria sem faixa (C21).
 */
import type { ReactNode } from 'react'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { FAIXAS_VALOR } from '@/data/relatorio-mc/spranger'
import { PAGINA_23 } from '@/data/relatorio-mc/textos-fixos'
import { numero } from '@/lib/relatorio-mc/formato'
import type { PropsPagina } from './registro'

/** Cor do filete de cada faixa, na ordem de FAIXAS_VALOR (molde). */
const FILETE = ['#17324D', '#C39A42', '#B8C4CE']

/** O molde poe em negrito o fim de dois paragrafos; o texto continua vindo de PAGINA_23. */
function negritoDesde(texto: string, inicio: string): ReactNode {
  const i = texto.indexOf(inicio)
  if (i < 0) return texto
  return (
    <>
      {texto.slice(0, i)}
      <b>{texto.slice(i)}</b>
    </>
  )
}

export default function Pagina23({ dados }: PropsPagina) {
  const [destaque, forte, terceira, camada] = PAGINA_23.paragrafos
  return (
    <Pagina dados={dados} numero={23} kicker={PAGINA_23.sobretitulo} titulo={PAGINA_23.titulo} grande subtitulo={PAGINA_23.subtitulo}>
      <div className="row" style={{ gap: '6mm', marginBottom: '4mm' }}>
        <div className="col">
          <div style={{ borderLeft: '1.6mm solid #C39A42', paddingLeft: '4mm', marginBottom: '3mm' }}>
            <div style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '11pt', lineHeight: 1.38, color: '#17324D' }}>{destaque}</div>
          </div>
          <p className="sm">{forte}</p>
          <p className="sm">{negritoDesde(terceira, 'por que aquilo vale o esforço')}</p>
        </div>
        <div className="col">
          <p className="sm">{negritoDesde(camada, 'É correspondência')}</p>
          <div className="card">
            <span className="lab">{PAGINA_23.origem.destaque}</span>
            <div className="sm">{PAGINA_23.origem.texto}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '2.6mm' }}>
        <span className="lab" style={{ margin: 0 }}>{PAGINA_23.tituloFaixas}</span>
        <span style={{ flex: 1, height: '.5pt', background: '#D8D2C5' }} />
      </div>
      <div className="g3" style={{ gap: '3.6mm' }}>
        {FAIXAS_VALOR.map((f, i) => (
          <div
            key={f.codigo}
            style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderTop: `1.6mm solid ${FILETE[i]}`, borderRadius: '1.6mm', padding: '3mm 3.4mm' }}
          >
            <div className="lab" style={{ margin: 0 }}>{`${numero(f.minimo)} a ${numero(f.maximo)}`}</div>
            <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '13pt', color: '#171A1F', textTransform: 'uppercase', margin: '.4mm 0 1.4mm' }}>{f.nome}</div>
            <div style={{ height: '.8mm', width: '9mm', background: '#C39A42', marginBottom: '2mm' }} />
            <div className="sm">{f.textoPagina23}</div>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['fato-do-modelo']} />
    </Pagina>
  )
}
