/**
 * Pagina 05 · Teoria DISC. Toda fixa: os quatro cartoes saem de
 * `FATORES_RELATORIO[f].pagina05`, nas cores oficiais de cada fator.
 */
import { Pagina } from '../Pagina'
import { FATORES } from '@/data/inventario-mc'
import { CORES_FATOR } from '@/data/relatorio-mc/cores'
import { FATORES_RELATORIO } from '@/data/relatorio-mc/fatores'
import { PAGINA_05 } from '@/data/relatorio-mc/textos-fixos'
import type { PropsPagina } from './registro'

const TEXTO = { fontSize: '11.2pt', lineHeight: 1.4 } as const

export default function Pagina05({ dados }: PropsPagina) {
  const r = PAGINA_05.rotulos
  return (
    <Pagina dados={dados} numero={5} kicker={PAGINA_05.sobretitulo} titulo={PAGINA_05.titulo} grande>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '5mm' }}>
        {FATORES.map((f) => {
          const cor = CORES_FATOR[f].principal
          const ficha = FATORES_RELATORIO[f]
          // Nunca texto branco sobre o ambar (paleta, secao 02): no I a faixa da pergunta usa o texto escuro.
          const sobreCor = f === 'I' ? '#171A1F' : '#FFFFFF'
          return (
            <div key={f} style={{ background: '#fff', border: `1pt solid ${cor}`, borderRadius: '2.4mm', padding: '3.4mm 4mm', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '4mm', alignItems: 'center' }}>
                <span style={{ fontFamily: 'AR', fontWeight: 900, fontSize: '40pt', lineHeight: 0.85, color: cor }}>{f}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '17pt', color: cor, lineHeight: 1 }}>{ficha.rotulo}</div>
                  <div style={{ height: '.8mm', background: cor, margin: '1.4mm 0 1.4mm' }} />
                  <div className="lab" style={{ margin: 0 }}>{ficha.pagina05.foco}</div>
                </div>
              </div>
              <div style={{ marginTop: '4mm' }}>
                <span className="lab" style={{ marginBottom: '1mm' }}>{r.caracteristica}</span>
                <div style={TEXTO}>{ficha.pagina05.caracteristica}</div>
              </div>
              <div style={{ marginTop: '3.4mm', borderTop: '.6pt solid #E3DDD0', paddingTop: '3.4mm' }}>
                <span className="lab" style={{ marginBottom: '1mm' }}>{r.formaDeAgir}</span>
                <div style={TEXTO}>{ficha.pagina05.formaDeAgir}</div>
              </div>
              <div className="spacer" />
              <div style={{ marginTop: '3mm', background: cor, color: sobreCor, borderRadius: '1.4mm', padding: '2.2mm 3.4mm', display: 'flex', alignItems: 'center', gap: '3.4mm' }}>
                <span style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '13pt', whiteSpace: 'nowrap' }}>{ficha.pagina05.perguntaCentral}</span>
                <span style={{ width: '.4mm', height: '5mm', background: sobreCor, opacity: 0.45, flex: 'none' }} />
                <span className="xs" style={{ opacity: 0.85, whiteSpace: 'nowrap' }}>{r.pergunta}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Pagina>
  )
}
