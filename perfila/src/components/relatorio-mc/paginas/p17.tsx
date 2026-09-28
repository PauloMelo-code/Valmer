/**
 * Pagina 17 · Tipos psicologicos. Toda fixa: abre a camada de Jung e
 * apresenta os tres eixos que as paginas 18 a 20 medem.
 */
import { Pagina } from '../Pagina'
import { EIXOS_JUNG, POLOS } from '@/data/inventario-mc'
import { EIXOS_RELATORIO, POLOS_JUNG, type PoloJung } from '@/data/relatorio-mc/jung'
import { PAGINA_17 } from '@/data/relatorio-mc/textos-fixos'
import { maiusculas } from '@/lib/relatorio-mc/formato'
import { COR_POLO } from './p15-21/cores'
import type { PropsPagina } from './registro'

export default function Pagina17({ dados }: PropsPagina) {
  const [subtitulo, destaque, consciencia, objetivo] = PAGINA_17.paragrafos
  // O molde poe em negrito a frase antes dos dois pontos.
  const corte = objetivo.indexOf(':') + 1
  return (
    <Pagina dados={dados} numero={17} kicker={PAGINA_17.sobretitulo} titulo={PAGINA_17.titulo} grande subtitulo={subtitulo}>
      <div className="row" style={{ gap: '6mm', marginBottom: '4mm' }}>
        <div className="col">
          <p style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '11pt', lineHeight: 1.38, color: '#17324D', marginBottom: '2.6mm' }}>{destaque}</p>
          <p className="sm">{consciencia}</p>
          <p className="sm">
            <b style={{ color: '#17324D' }}>{objetivo.slice(0, corte)}</b>
            {objetivo.slice(corte)}
          </p>
        </div>
        <div className="col" style={{ borderLeft: '.6pt solid #D8D2C5', paddingLeft: '6mm' }}>
          <h2 className="h2u">{PAGINA_17.tituloAcrescenta}</h2>
          {PAGINA_17.acrescenta.map((p) => <p key={p} className="sm">{p}</p>)}
        </div>
      </div>
      <div className="g3" style={{ gap: '3.6mm' }}>
        {EIXOS_JUNG.map((eixo) => {
          const e = EIXOS_RELATORIO[eixo]
          const inicio = `${e.nome}. `
          return (
            <div key={eixo} style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderTop: '1.4mm solid #17324D', borderRadius: '1.6mm', padding: '3mm 3.4mm', display: 'flex', flexDirection: 'column' }}>
              <div className="lab" style={{ margin: 0 }}>Eixo {e.numero}</div>
              <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '12.4pt', color: '#17324D', lineHeight: 1.12, margin: '.6mm 0 2mm' }}>{e.tituloPagina17}</div>
              <div style={{ display: 'flex', gap: '1.6mm', marginBottom: '2.4mm' }}>
                {(POLOS[eixo] as readonly PoloJung[]).map((p) => (
                  <span key={p} className="pill" style={{ background: COR_POLO[p], color: '#fff' }}>{maiusculas(POLOS_JUNG[p].nome)}</span>
                ))}
              </div>
              <div className="sm">
                <b>{inicio.trim()}</b> {e.textoPagina17.slice(inicio.length)}
              </div>
            </div>
          )
        })}
      </div>
    </Pagina>
  )
}
