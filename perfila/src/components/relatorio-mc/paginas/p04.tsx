/**
 * Pagina 04 · Metodologia DISC. Toda fixa (texto de `PAGINA_04`, retrato de
 * Marston). Os nomes das quatro dimensoes saem de `FATORES_RELATORIO`, para o
 * "Dominancia" de D8 mudar aqui junto com o resto do relatorio.
 */
import type { CSSProperties } from 'react'
import { Pagina } from '../Pagina'
import { FATORES_RELATORIO } from '@/data/relatorio-mc/fatores'
import { PAGINA_04 } from '@/data/relatorio-mc/textos-fixos'
import { realcar } from './p01-07/realce'
import type { PropsPagina } from './registro'

const TOPO: CSSProperties = { fontSize: '9.8pt', lineHeight: 1.5, color: '#17324D' }
const CORPO: CSSProperties = { fontSize: '9.5pt', lineHeight: 1.5, color: '#17324D' }

// Cores do molde: o I sai no tom de texto (#9A6500), porque o ambar puro nao se le sobre branco.
const DIMENSOES = [
  { trecho: FATORES_RELATORIO.D.nome, cor: '#C62828' },
  { trecho: FATORES_RELATORIO.I.nome, cor: '#9A6500' },
  { trecho: FATORES_RELATORIO.S.nome, cor: '#267057' },
  { trecho: FATORES_RELATORIO.C.nome, cor: '#315F8A' },
]

export default function Pagina04({ dados }: PropsPagina) {
  const p = PAGINA_04
  const [p1, p2, p3, p4, p5, p6, p7, p8, fecho] = p.paragrafos
  return (
    <Pagina dados={dados} numero={4} kicker={p.sobretitulo} titulo={p.titulo} grande>
      <div className="row" style={{ gap: '7mm', marginBottom: '5mm', alignItems: 'flex-start' }}>
        <div className="col" style={{ flex: 1.55 }}>
          <p style={TOPO}>{p1}</p>
          <p style={TOPO}>{realcar(p2, [{ trecho: 'William Moulton Marston' }])}</p>
        </div>
        <div style={{ width: '56mm', flex: 'none', textAlign: 'center' }}>
          <div style={{ border: '1.1mm solid #C39A42', borderRadius: '2mm', overflow: 'hidden', background: '#121820', boxShadow: '0 1mm 3mm rgba(23,50,77,.18)' }}>
            <img src="/relatorio-mc/imagens/marston.jpg" alt={`Retrato de ${p.retrato.nome}`} style={{ display: 'block', width: '100%', height: '58mm', objectFit: 'cover' }} />
          </div>
          <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '8.6pt', color: '#17324D', marginTop: '2.6mm', whiteSpace: 'nowrap' }}>{p.retrato.nome}</div>
          <div className="sm mut">{p.retrato.datas}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 0, flex: 1 }}>
        <div className="col" style={{ paddingRight: '6mm', borderRight: '.8pt solid #C39A42' }}>
          <p style={CORPO}>{p3}</p>
          <p style={{ ...CORPO, marginTop: '3mm' }}>{realcar(p4, [{ trecho: 'Emotions of Normal People', como: 'i' }])}</p>
        </div>
        <div className="col" style={{ paddingLeft: '6mm' }}>
          <p style={CORPO}>{realcar(p5, [{ trecho: 'DISC' }])}</p>
          <p style={CORPO}>{realcar(p6, DIMENSOES)}</p>
          <p style={CORPO}>{p7}</p>
          <p style={CORPO}>{p8}</p>
        </div>
      </div>
      <div className="dark" style={{ display: 'flex', gap: '4mm', alignItems: 'center', padding: '4mm 5mm', marginTop: '4mm' }}>
        <span style={{ width: '1.4mm', alignSelf: 'stretch', background: '#C39A42', borderRadius: '.6mm', flex: 'none' }} />
        <span style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10.4pt', lineHeight: 1.45 }}>{fecho}</span>
      </div>
    </Pagina>
  )
}
