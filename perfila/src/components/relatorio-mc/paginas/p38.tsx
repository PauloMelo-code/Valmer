/**
 * Pagina 38 · Como liderar cada perfil. Tudo fixo (texto em PAGINA_38).
 */
import type { ReactNode } from 'react'
import { FATORES, type Fator } from '@/data/inventario-mc'
import { FATORES_RELATORIO } from '@/data/relatorio-mc/fatores'
import { PAGINA_38 } from '@/data/relatorio-mc/textos-fixos'
import { Marcacoes } from '../Marcacao'
import { Pagina } from '../Pagina'
import type { PropsPagina } from './registro'

// Os trechos em negrito do molde. PAGINA_38 guarda o texto corrido, sem marca.
const NEGRITO = [
  'criar direção, estabelecer padrões',
  'resultados consistentes.',
  'oferecer o mesmo tipo de motivação para todos e interpretar diferenças como falta de compromisso.',
]

function comNegrito(texto: string): ReactNode {
  const partes: ReactNode[] = []
  let resto = texto
  for (const trecho of NEGRITO) {
    const i = resto.indexOf(trecho)
    if (i < 0) continue
    partes.push(resto.slice(0, i), <b key={trecho}>{trecho}</b>)
    resto = resto.slice(i + trecho.length)
  }
  return [...partes, resto]
}

// Os cartoes de delegacao escrevem o rotulo ("INFLUENTE"); a cor vem do fator dele.
const fatorDoRotulo = (rotulo: string): Fator => FATORES.find((f) => FATORES_RELATORIO[f].rotulo === rotulo) as Fator

const [p1, p2, p3, p4] = PAGINA_38.paragrafos

export default function Pagina38({ dados }: PropsPagina) {
  return (
    <Pagina dados={dados} numero={38} kicker={PAGINA_38.sobretitulo} titulo={PAGINA_38.titulo} grande>
      <div className="row" style={{ gap: '6mm', marginBottom: '3.6mm' }}>
        <div className="col" style={{ borderLeft: '1.6mm solid #C39A42', paddingLeft: '4mm' }}>
          <p className="sm">{comNegrito(p1)}</p>
          <p className="sm mut">{p2}</p>
        </div>
        <div className="col" style={{ borderLeft: '.6pt solid #D8D2C5', paddingLeft: '6mm' }}>
          <p className="sm">{comNegrito(p3)}</p>
          <p className="sm mut">{p4}</p>
        </div>
      </div>
      <div className="dark" style={{ textAlign: 'center', padding: '4mm', marginBottom: '4mm' }}>
        <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '14.5pt' }}>{PAGINA_38.destaque[0]}</div>
        <div style={{ fontSize: '12.5pt' }}>{PAGINA_38.destaque[1]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '2.6mm' }}>
        <span className="lab" style={{ margin: 0 }}>{PAGINA_38.tituloDelegacao}</span>
        <span style={{ flex: 1, height: '.5pt', background: '#D8D2C5' }} />
      </div>
      <div className="g2" style={{ gap: '4mm', marginBottom: '3.4mm' }}>
        {PAGINA_38.delegacao.map((regra, i) => (
          <div key={regra.numero} style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderTop: `1.6mm solid ${i ? '#B8C4CE' : '#C39A42'}`, borderRadius: '1.6mm', padding: '3mm 3.4mm' }}>
            <div style={{ display: 'flex', gap: '3mm', alignItems: 'center', marginBottom: '2.4mm' }}>
              <span style={{ background: '#17324D', color: '#fff', fontFamily: 'AR', fontWeight: 800, fontSize: '9pt', borderRadius: '50%', width: '7mm', height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{regra.numero}</span>
              <span className="lab" style={{ margin: 0 }}>{regra.titulo}</span>
            </div>
            {regra.perfis.map(({ rotulo, nota }) => {
              const cor = dados.fatores[fatorDoRotulo(rotulo)].cor
              return (
                <div key={rotulo} style={{ background: cor.fundoSuave, borderLeft: `1.4mm solid ${cor.principal}`, borderRadius: '0 1.2mm 1.2mm 0', padding: '2mm 3mm', marginBottom: '2mm' }}>
                  <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '12.5pt', color: cor.principal, lineHeight: 1.1 }}>{rotulo}</div>
                  {nota ? <div className="sm">{nota}</div> : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', borderTop: '.6pt solid #D8D2C5', paddingTop: '3mm' }}>
        <span style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10pt', color: '#17324D' }}>{PAGINA_38.fechoDelegacao}</span>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['aplicacao-pratica']} />
    </Pagina>
  )
}
