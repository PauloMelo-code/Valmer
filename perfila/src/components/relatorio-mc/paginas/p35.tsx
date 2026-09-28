/** Pagina 35 · Como se comunicar com cada perfil. Tudo fixo (`PAGINA_35`). */
import { PAGINA_35 } from '@/data/relatorio-mc/textos-fixos'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'

// Cor do filete de cada custo, como no molde.
const TOPO = ['#17324D', '#C39A42', '#B8C4CE']

export default function Pagina35({ dados }: PropsPagina) {
  const [p1, p2, p3, citacao] = PAGINA_35.paragrafos
  // O molde poe em negrito a primeira frase do terceiro paragrafo.
  const corte = p3.indexOf('. ') + 1
  return (
    <Pagina dados={dados} numero={35} kicker={PAGINA_35.sobretitulo} titulo={PAGINA_35.titulo} grande>
      <div className="row" style={{ gap: '6mm', marginBottom: '4mm' }}>
        <div className="col">
          <p>{p1}</p>
          <p>{p2}</p>
        </div>
        <div className="col">
          <p className="sm">
            <b>{p3.slice(0, corte)}</b>
            {p3.slice(corte)}
          </p>
          <div className="quote">
            <div style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10pt', lineHeight: 1.4, color: '#17324D' }}>{citacao}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '1.6mm' }}>
        <span className="lab" style={{ margin: 0 }}>{PAGINA_35.tituloCusto}</span>
        <span style={{ flex: 1, height: '.5pt', background: '#D8D2C5' }} />
      </div>
      <p className="sm" style={{ marginBottom: '2.6mm' }}>{PAGINA_35.introCusto}</p>
      {/* Colunas `1fr` do molde: a do meio alarga ate caber "DESENGAJAMENTO", que nao quebra. */}
      <div className="g3" style={{ gap: '3.6mm', marginBottom: '4mm', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {PAGINA_35.custos.map((c, i) => (
          <div key={c.numero} style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderTop: `1.6mm solid ${TOPO[i]}`, borderRadius: '1.6mm', padding: '3mm 3.4mm' }}>
            <div className="lab" style={{ margin: 0 }}>{c.numero} ·</div>
            <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '12pt', color: '#17324D', textTransform: 'uppercase', lineHeight: 1.1, margin: '.4mm 0 1.4mm' }}>{c.titulo}</div>
            <div style={{ height: '.8mm', width: '9mm', background: '#C39A42', marginBottom: '2mm' }} />
            <div className="sm">{c.texto}</div>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['aplicacao-pratica']} />
    </Pagina>
  )
}
