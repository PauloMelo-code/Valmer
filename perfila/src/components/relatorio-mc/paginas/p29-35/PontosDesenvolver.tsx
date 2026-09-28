/**
 * Os tres cartoes de ponto a desenvolver das paginas 33 (pontos 1-3) e 34
 * (pontos 4-6). Texto todo da IA (`seis_pontos_desenvolver`); sem narrativa,
 * a estrutura fica e cada campo sai como pendente.
 */
import type { NarrativaMC } from '@/lib/relatorio-mc/narrativa-esquema'
import { TextoIA } from '../../TextoIA'

type Ponto = NarrativaMC['seis_pontos_desenvolver'][number]

const CAIXA = { borderRadius: '1.2mm', padding: '2mm 2.4mm' }

/** `compacto`: a pagina 34 divide a altura com o PDI e precisa de folga para texto da IA mais longo. */
export function PontosDesenvolver({ pontos, primeiro, compacto = false }: { pontos: readonly Ponto[] | null; primeiro: 0 | 3; compacto?: boolean }) {
  return [0, 1, 2].map((i) => {
    const p = pontos?.[primeiro + i] ?? null
    return (
      <div key={i} className="card" style={compacto ? { padding: '2.6mm 4mm', marginBottom: '2.2mm' } : { padding: '3.2mm 4mm', marginBottom: '3mm' }}>
        <div style={{ display: 'flex', gap: '3mm', alignItems: 'center', marginBottom: compacto ? '1.4mm' : '2mm' }}>
          <span
            className="num"
            style={{ background: '#1F7A6D', color: '#fff', borderRadius: '1.2mm', width: '9mm', height: '8mm', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10pt', flex: 'none' }}
          >
            {String(primeiro + i + 1).padStart(2, '0')}
          </span>
          {p ? <h2 style={{ margin: 0 }}>{p.titulo}</h2> : <TextoIA como="div" className="xs" texto={null} />}
        </div>
        <div className="g3" style={{ gap: '3mm' }}>
          <div>
            <span className="lab">Como aparece</span>
            <TextoIA como="div" className="xs" texto={p?.como_aparece} />
          </div>
          <div style={{ ...CAIXA, background: '#FFF2D8' }}>
            <span className="lab" style={{ color: '#171A1F' }}>Impacto possível</span>
            <TextoIA como="div" className="xs" texto={p?.impacto_possivel} />
          </div>
          <div style={{ ...CAIXA, background: '#E4F3EC' }}>
            <span className="lab" style={{ color: '#171A1F' }}>Prática recomendada</span>
            <TextoIA como="div" className="xs" texto={p?.pratica_recomendada} />
          </div>
        </div>
      </div>
    )
  })
}
