/**
 * Pagina 31 · Mapa de Competencias, resultado: radar de 12 (D7, C28).
 *
 * Geometria do molde: centro (700,500), 100 pontos = raio 340, 12 eixos a 30
 * graus a partir do topo em sentido horario. Natural em linha continua,
 * adaptado tracejado.
 */
import { FATORES } from '@/data/inventario-mc'
import { NIVEIS_COMPETENCIA, ROTULOS_COMPETENCIAS } from '@/data/relatorio-mc/competencias'
import { FRASES_DESTAQUE } from '@/data/relatorio-mc/variantes/p29-35'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'
import { COR_NIVEL } from './p29-35/cor-nivel'

const ponto = (i: number, v: number) => {
  const a = (i * Math.PI) / 6
  return { x: 700 + 3.4 * v * Math.sin(a), y: 500 - 3.4 * v * Math.cos(a) }
}
const poligono = (valores: number[]) => valores.map((v, i) => { const p = ponto(i, v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')

// Onde o molde pos o ponto do fator e o rotulo de cada eixo (ajustados a mao
// para os nomes nao baterem no grafico). O eixo e fixo; o nome vem do dado.
const ROTULOS: { x: number; y: number; ancora: 'middle' | 'start' | 'end' }[] = [
  { x: 700, y: 37.2, ancora: 'middle' }, { x: 893.4, y: 130.8, ancora: 'start' }, { x: 1045.2, y: 282.6, ancora: 'start' },
  { x: 1100.8, y: 490, ancora: 'start' }, { x: 1045.2, y: 697.4, ancora: 'start' }, { x: 893.4, y: 849.2, ancora: 'start' },
  { x: 700, y: 866.8, ancora: 'middle' }, { x: 506.6, y: 849.2, ancora: 'end' }, { x: 354.8, y: 697.4, ancora: 'end' },
  { x: 299.2, y: 490, ancora: 'end' }, { x: 354.8, y: 282.6, ancora: 'end' }, { x: 506.6, y: 130.8, ancora: 'end' },
]

export default function Pagina31({ dados }: PropsPagina) {
  const radar = dados.competencias.radar
  const nat = radar.map((c) => c.natural.valor)
  const ada = radar.map((c) => c.adaptado.valor)

  return (
    <Pagina dados={dados} numero={31} kicker="O seu resultado" titulo={ROTULOS_COMPETENCIAS.tituloResultado} subtitulo={ROTULOS_COMPETENCIAS.subtituloResultado}>
      <div style={{ display: 'flex', gap: '5mm', flexWrap: 'wrap', fontSize: '6.6pt', fontWeight: 700, letterSpacing: '.1em', alignItems: 'center' }}>
        <span style={{ display: 'flex', gap: '1.4mm', alignItems: 'center' }}>
          <svg width="9mm" height="3mm" viewBox="0 0 90 30" aria-hidden>
            <line x1="0" y1="15" x2="70" y2="15" stroke="#17324D" strokeWidth="5" />
            <circle cx="80" cy="15" r="7" fill="#17324D" />
          </svg>
          {ROTULOS_COMPETENCIAS.legendaNatural}
        </span>
        <span style={{ display: 'flex', gap: '1.4mm', alignItems: 'center' }}>
          <svg width="9mm" height="3mm" viewBox="0 0 90 30" aria-hidden>
            <line x1="0" y1="15" x2="70" y2="15" stroke="#9A711E" strokeWidth="5" strokeDasharray="12 7" />
            <rect x="73" y="8" width="14" height="14" fill="#fff" stroke="#9A711E" strokeWidth="4" />
          </svg>
          {ROTULOS_COMPETENCIAS.legendaAdaptado}
        </span>
        {FATORES.map((f) => (
          <span key={f} style={{ display: 'flex', gap: '1mm', alignItems: 'center' }}>
            <span style={{ width: '2.2mm', height: '2.2mm', borderRadius: '50%', background: dados.fatores[f].cor.principal }} />
            {dados.fatores[f].rotulo}
          </span>
        ))}
      </div>
      <div className="xs mut" style={{ margin: '1mm 0 1mm' }}>{ROTULOS_COMPETENCIAS.escalaRadar}</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2mm' }}>
        <svg width="177.8mm" height="127mm" viewBox="0 0 1400 1000" style={{ display: 'block' }}>
          {[25, 50, 75, 100].map((t) => (
            <g key={t}>
              <polygon points={poligono(Array(12).fill(t))} fill="none" stroke="#D8DDE2" strokeWidth="2" />
              <text x="706" y={500 - 3.4 * t - 6} fontSize="20" fill="#5B6573" fontFamily="OS">{t}</text>
            </g>
          ))}
          {ROTULOS.map((_, i) => {
            const p = ponto(i, 100)
            return <line key={i} x1="700" y1="500" x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#D8DDE2" strokeWidth="2" />
          })}
          <polygon points={poligono(ada)} fill="#9A711E" fillOpacity=".14" stroke="#9A711E" strokeWidth="5" strokeDasharray="16 10" />
          <polygon points={poligono(nat)} fill="#17324D" fillOpacity=".18" stroke="#17324D" strokeWidth="5.5" />
          {radar.map((c, i) => {
            const n = ponto(i, c.natural.valor)
            const a = ponto(i, c.adaptado.valor)
            return (
              <g key={c.competencia}>
                <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r="9" fill="#17324D" />
                <rect x={(a.x - 8).toFixed(1)} y={(a.y - 8).toFixed(1)} width="16" height="16" fill="#fff" stroke="#9A711E" strokeWidth="4" />
              </g>
            )
          })}
          {radar.map((c, i) => {
            const r = ROTULOS[i]
            const lado = r.ancora === 'middle'
            const tx = r.x + (r.ancora === 'start' ? 10 : r.ancora === 'end' ? -10 : 0)
            const ty = r.y + (lado ? 46 : 8)
            return (
              <g key={c.competencia}>
                <circle cx={r.x} cy={r.y} r="7" fill={dados.fatores[c.fator].cor.principal} />
                <text x={tx} y={ty} textAnchor={r.ancora} fontSize="27" fontWeight="700" fill="#171A1F" fontFamily="OS">{c.nome}</text>
                <text x={tx} y={ty + 30} textAnchor={r.ancora} fontSize="24" fill="#5B6573" fontFamily="OS">{`${c.natural.texto} · ${c.adaptado.texto}`}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="g3">
        {NIVEIS_COMPETENCIA.map((n) => {
          const lista = dados.competencias.destaques[n.codigo]
          return (
            <div key={n.codigo} className="card" style={{ borderTop: `1.2mm solid ${COR_NIVEL[n.codigo]}`, padding: '3mm 3.4mm' }}>
              <span className="lab">{n.nome}</span>
              <div className="xs">
                {lista.length ? (
                  <>
                    <b>{lista.map((c) => `${c.nome} ${c.natural.texto}`).join(' · ')}.</b> {FRASES_DESTAQUE[n.codigo]}
                  </>
                ) : (
                  FRASES_DESTAQUE.vazio
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
