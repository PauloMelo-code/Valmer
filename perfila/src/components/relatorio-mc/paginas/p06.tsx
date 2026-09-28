/**
 * Pagina 06 · Mapa de Intensidade Comportamental.
 *
 * Layout do Prompt_Redesign_Pagina_07 (legenda da regua, dois cartoes de
 * barras horizontais com sigla, nome, escala, badge e classificacao, painel
 * escuro), com as trocas da v2.2: regua de 6 zonas no lugar das 5 faixas (D4,
 * C01) e linha de predominancia em 51, que e o limiar do motor (C02). A
 * geometria do SVG e a do molde: trilho x=360, 1130 de largura, 11,3 por ponto.
 *
 * A "leitura rapida" nao e IA (C05): frase-molde com o que sobe e o que desce
 * do natural para o adaptado (`variantes/p01-07.ts`).
 */
import { Pagina } from '../Pagina'
import { DefsTexturas, useTexturas, type IdsTextura } from '../Textura'
import { FATORES } from '@/data/inventario-mc'
import { MARCAS_DA_REGUA, ZONAS, type CodigoZona } from '@/data/relatorio-mc/zonas'
import { SEM_FATOR_PREDOMINANTE, SUBSTANTIVOS_LEITURA_RAPIDA, leituraRapida } from '@/data/relatorio-mc/variantes/p01-07'
import type { DadosRelatorioMC, FatorDados, PerfilDados } from '@/lib/relatorio-mc/dados'
import { juntar } from '@/lib/relatorio-mc/formato'
import type { PropsPagina } from './registro'

const X0 = 360
const LARGURA = 1130
const x = (v: number) => X0 + (LARGURA * v) / 100
const PREDOMINANCIA = 51
const PASSO = 132
const Y_PRIMEIRA = 138

// Da mais baixa para a mais alta, como a regua se le da esquerda para a direita.
const ZONAS_NA_REGUA: CodigoZona[] = ['EB', 'MB', 'B', 'A', 'MA', 'EA']
const TOM_DA_ZONA: Record<CodigoZona, { fundo: string; texto: string }> = {
  EB: { fundo: '#EEF2F6', texto: '#17324D' },
  MB: { fundo: '#DCE5EE', texto: '#17324D' },
  B: { fundo: '#C3D2E0', texto: '#17324D' },
  A: { fundo: '#A6BCD1', texto: '#17324D' },
  MA: { fundo: '#5F7F9E', texto: '#FFFFFF' },
  EA: { fundo: '#17324D', texto: '#FFFFFF' },
}

function Legenda() {
  return (
    <div style={{ marginBottom: '3mm' }}>
      <span className="lab" style={{ marginBottom: '1mm' }}>Régua de intensidade · seis zonas</span>
      <div style={{ display: 'flex', borderRadius: '1mm', overflow: 'hidden' }}>
        {ZONAS_NA_REGUA.map((z) => {
          const zona = ZONAS[z]
          const tom = TOM_DA_ZONA[z]
          return (
            <div
              key={z}
              style={{
                // Largura proporcional a faixa: 16, 17, 18, 19, 18 e 12 pontos.
                flex: `${Math.ceil(zona.maximo) - zona.minimo} 0 0`,
                background: tom.fundo, color: tom.texto, padding: '1mm 1.4mm', lineHeight: 1.2,
                // EA e EB sao zona de atencao: borda pontilhada, nunca celebracao (bp§09).
                outline: zona.atencao ? `.6pt dashed ${z === 'EA' ? '#C39A42' : '#5B6573'}` : undefined, outlineOffset: '-.8mm',
              }}
            >
              <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '6.8pt', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{zona.nome}</div>
              <div style={{ fontSize: '6.6pt' }}>{zona.faixa}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Linha({ f, i, adaptado, tx }: { f: FatorDados; i: number; adaptado: boolean; tx: IdsTextura }) {
  const c = adaptado ? f.adaptado : f.natural
  const y = Y_PRIMEIRA + i * PASSO
  const fim = x(c.escore.valor)
  const largura = fim - X0
  const cor = f.cor.principal
  const texto = c.escore.texto
  return (
    <g>
      <text x="0" y={y + 32} fontSize="46" fontWeight="900" fill={cor} fontFamily="AR">{f.fator}</text>
      <text x="52" y={y + 27} fontSize="25" fontWeight="700" fill="#171A1F" fontFamily="OS">{f.nome}</text>
      <rect x={X0} y={y} width={LARGURA} height="34" rx="4" fill="#E2E2E2" />
      {adaptado ? (
        <>
          <rect x={X0} y={y} width={largura} height="34" rx="4" fill={`url(#${tx[f.fator]})`} />
          <rect x={X0} y={y} width={largura} height="34" rx="4" fill="none" stroke={cor} strokeWidth="3" />
        </>
      ) : (
        <rect x={X0} y={y} width={largura} height="34" rx="4" fill={cor} />
      )}
      <circle cx={fim} cy={y + 17} r="34" fill={cor} stroke="#fff" strokeWidth="4" />
      {/* Com decimal ("87,5") o numero nao cabe no circulo a 27 (C03). */}
      <text x={fim} y={y + 26} textAnchor="middle" fontSize={texto.length > 2 ? 22 : 27} fontWeight="800" fill={f.fator === 'I' ? '#171A1F' : '#FFFFFF'} fontFamily="AR">{texto}</text>
      {MARCAS_DA_REGUA.map((m) => (
        <g key={m}>
          <line x1={x(m)} y1={y + 38} x2={x(m)} y2={y + 48} stroke="#B9B3A5" strokeWidth="2" />
          {/* O 51 ja esta no selo do topo, e a linha dourada cortaria o rotulo ("5|1"). */}
          {m === PREDOMINANCIA ? null : <text x={x(m)} y={y + 72} textAnchor="middle" fontSize="19" fill="#5B6573" fontFamily="OS">{m}</text>}
        </g>
      ))}
      <rect
        x="1530" y={y - 6} width="190" height="46" rx="4" fill={f.cor.fundoSuave}
        stroke={c.zona.atencao ? cor : undefined} strokeWidth={c.zona.atencao ? 2.4 : undefined} strokeDasharray={c.zona.atencao ? '7 5' : undefined}
      />
      <text x="1625" y={y + 24} textAnchor="middle" fontSize="23" fontWeight="700" fill={f.cor.texto} fontFamily="OS">{c.zona.nome}</text>
    </g>
  )
}

function Cartao({ dados, adaptado, titulo, subtitulo }: { dados: DadosRelatorioMC; adaptado: boolean; titulo: string; subtitulo: string }) {
  const tx = useTexturas()
  const xp = x(PREDOMINANCIA)
  const altura = Y_PRIMEIRA + 3 * PASSO + 90
  return (
    <div style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderRadius: '2mm', padding: '3mm 4mm 2.4mm', marginBottom: '2.8mm' }}>
      <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '15pt', color: '#171A1F', textTransform: 'uppercase', lineHeight: 1.1 }}>{titulo}</div>
      <div className="sm mut" style={{ marginBottom: '1.2mm' }}>{subtitulo}</div>
      <svg width="172mm" height={`${altura / 10}mm`} viewBox={`0 0 1720 ${altura}`} style={{ display: 'block' }} role="img" aria-label={`${titulo}: ${FATORES.map((f) => `${dados.fatores[f].nome} ${(adaptado ? dados.fatores[f].adaptado : dados.fatores[f].natural).escore.texto}`).join(', ')}`}>
        {adaptado ? <DefsTexturas ids={tx} fundo="branco" /> : null}
        <rect x={xp} y="92" width={x(100) - xp} height={altura - 150} fill="#EAF1F9" />
        <text x={xp} y="28" textAnchor="middle" fontSize="19" fontWeight="700" fill="#C39A42" fontFamily="OS" letterSpacing="1.6">LINHA DE PREDOMINÂNCIA</text>
        <text x={(xp + x(100)) / 2} y="68" textAnchor="middle" fontSize="19" fontWeight="700" fill="#5B6573" fontFamily="OS" letterSpacing="1.6">FATORES PREDOMINANTES</text>
        <path d={`M ${xp + 22.6} 82 H ${x(100)}`} stroke="#5B6573" strokeWidth="2.4" />
        <path d={`M ${xp + 22.6} 82 l 14 -7 M ${xp + 22.6} 82 l 14 7`} stroke="#5B6573" strokeWidth="2.4" fill="none" />
        <path d={`M ${x(100)} 82 l -14 -7 M ${x(100)} 82 l -14 7`} stroke="#5B6573" strokeWidth="2.4" fill="none" />
        <line x1={xp} y1="92" x2={xp} y2={altura - 58} stroke="#C39A42" strokeWidth="3.5" />
        <circle cx={xp} cy="92" r="30" fill="#fff" stroke="#C39A42" strokeWidth="4" />
        <text x={xp} y="101" textAnchor="middle" fontSize="26" fontWeight="800" fill="#C39A42" fontFamily="AR">{PREDOMINANCIA}</text>
        {FATORES.map((f, i) => <Linha key={f} f={dados.fatores[f]} i={i} adaptado={adaptado} tx={tx} />)}
      </svg>
    </div>
  )
}

/** "método, cautela, estabilidade e acompanhamento": os fatores que mudaram, do que mais mudou ao que menos. */
function substantivos(fatores: FatorDados[]): string {
  const ordem = [...fatores].sort((a, b) => Math.abs(b.variacao.valor) - Math.abs(a.variacao.valor))
  return juntar(ordem.flatMap((f) => SUBSTANTIVOS_LEITURA_RAPIDA[f.fator]))
}

function Perfil({ rotulo, perfil }: { rotulo: string; perfil: PerfilDados }) {
  return (
    <div style={{ flex: 1, padding: '0 4mm' }}>
      <div className="lab" style={{ color: '#C39A42', marginBottom: '1mm' }}>{rotulo}</div>
      <div style={{ height: '.8mm', width: '9mm', background: '#C39A42', marginBottom: '2mm' }} />
      <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '13pt', lineHeight: 1.15, textTransform: 'uppercase' }}>{perfil.rotulo}</div>
      {perfil.tipo === 'equilibrado' ? <div className="xs" style={{ marginTop: '1mm', opacity: 0.8 }}>{SEM_FATOR_PREDOMINANTE}</div> : null}
    </div>
  )
}

export default function Pagina06({ dados }: PropsPagina) {
  const mudaram = FATORES.map((f) => dados.fatores[f]).filter((f) => f.classeVariacao !== 'baixa')
  const leitura = leituraRapida(
    substantivos(mudaram.filter((f) => f.direcao === 'sobe')),
    substantivos(mudaram.filter((f) => f.direcao === 'desce')),
  )
  return (
    <Pagina
      dados={dados}
      numero={6}
      kicker="O seu resultado"
      titulo="Mapa de Intensidade Comportamental"
      subtitulo="Cada fator é medido de 0 a 100. A pontuação indica a intensidade com que o comportamento tende a aparecer, nunca se ele é bom ou ruim."
    >
      <Legenda />
      <Cartao dados={dados} adaptado={false} titulo="Perfil natural" subtitulo="Como você tende a agir quando age por conta própria" />
      <Cartao dados={dados} adaptado titulo="Perfil adaptado" subtitulo="Como o ambiente atual leva você a agir" />
      <div className="spacer" />
      <div className="dark" style={{ display: 'flex', alignItems: 'stretch', padding: '4mm 1mm' }}>
        <Perfil rotulo="Natural" perfil={dados.perfis.natural} />
        <div style={{ width: '.4pt', background: '#3A5470' }} />
        <Perfil rotulo="Adaptado" perfil={dados.perfis.adaptado} />
        <div style={{ width: '.4pt', background: '#3A5470' }} />
        <div style={{ flex: 2.2, padding: '0 4mm' }}>
          <div className="lab" style={{ color: '#C39A42', marginBottom: '1mm' }}>Leitura rápida</div>
          <div style={{ height: '.8mm', width: '9mm', background: '#C39A42', marginBottom: '2mm' }} />
          <div className="sm">{leitura}</div>
        </div>
      </div>
    </Pagina>
  )
}
