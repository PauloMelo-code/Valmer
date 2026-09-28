/**
 * Pagina 29 · O seu estilo de lideranca (D6, C26).
 *
 * Os quatro cartoes do molde ficam, mas sao os estilos da v2.2 ordenados por
 * percentual. O grafico da direita continua sendo o perfil natural, que e a
 * base de onde os estilos saem (secao 16).
 */
import type { Lideranca } from '@/lib/motor'
import { FATORES, type Fator } from '@/data/inventario-mc'
import { CORES_FATOR } from '@/data/relatorio-mc/cores'
import { ALERTA_AMBIENTE, ESTILOS_LIDERANCA, SINTESE_LIDERANCA } from '@/data/relatorio-mc/variantes/p29-35'
import { juntar, numero } from '@/lib/relatorio-mc/formato'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'

/**
 * Cor do cartao: a do fator de maior peso (0,6) na formula do estilo.
 * Assim o leitor reconhece a origem pela cor que aprendeu na pagina 05.
 */
const FATOR_DO_ESTILO: Record<keyof Lideranca, Fator> = { executivo: 'D', motivador: 'I', metodico: 'S', sistematico: 'C' }

// Borda do cartao do molde: um tom entre o fundo suave e a cor principal.
const BORDA: Record<Fator, string> = { D: '#E4A3A3', I: '#E8C173', S: '#8DBEAA', C: '#93ABC3' }

// Escala do grafico: base y=510, 4,5 por ponto.
const y = (v: number) => 510 - 4.5 * v

export default function Pagina29({ dados }: PropsPagina) {
  const est = dados.lideranca
  const soma = (a: number, b: number) => numero(Math.round((a + b) * 10) / 10)
  // So os predominantes (>= 51) conduzem: perfil puro tem um, EQUILIBRADO nenhum.
  const naturais = dados.perfis.natural.fatores
  const adaptados = dados.perfis.adaptado.fatores
  const mudouOTopo = adaptados.some((x) => !naturais.includes(x))
  const f = dados.fatores
  const lista = (fs: Fator[], lado: 'natural' | 'adaptado') => juntar(fs.map((x) => `${f[x].rotulo} em ${f[x][lado].escore.texto}`))

  return (
    <Pagina
      dados={dados}
      numero={29}
      kicker="Você e as outras pessoas"
      titulo="O seu estilo de liderança"
      subtitulo="O estilo de liderança representa a forma mais provável de mobilizar pessoas, tomar decisões, administrar o ritmo e acompanhar resultados. Nenhum estilo é suficiente em todas as situações. Liderar com maturidade significa reconhecer sua tendência natural e desenvolver flexibilidade para oferecer à equipe o tipo de direção, comunicação e suporte que cada contexto exige."
    >
      <div className="g4" style={{ marginBottom: '4mm' }}>
        {est.map((e) => {
          const fator = FATOR_DO_ESTILO[e.estilo]
          const cor = CORES_FATOR[fator]
          const ficha = ESTILOS_LIDERANCA[e.estilo]
          return (
            <div
              key={e.estilo}
              className="soft"
              style={{ background: cor.fundoSuave, borderColor: BORDA[fator], borderTop: `1.2mm solid ${cor.principal}`, padding: '3mm 3.2mm' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                {/* 13pt (molde: 15): "33,6%" tem o dobro de caracteres de "89" e batia no rotulo. */}
                <span className="lab" style={{ color: '#171A1F', margin: 0, whiteSpace: 'nowrap' }}>{e.rotuloPosicao}</span>
                <span className="num" style={{ fontSize: '13pt', color: cor.texto, marginLeft: '1.5mm' }}>{e.percentual.texto}%</span>
              </div>
              <h3 style={{ color: cor.texto, marginTop: '1mm' }}>{e.nome}</h3>
              <div className="xs">{ficha.definicao}</div>
              <div className="xs" style={{ marginTop: '1.4mm', borderTop: `.5pt solid ${BORDA[fator]}`, paddingTop: '1.4mm' }}>
                <b>{ficha.efeito}</b>
              </div>
            </div>
          )
        })}
      </div>
      <div className="row" style={{ gap: '5mm' }}>
        <div className="col" style={{ flex: 1.4 }}>
          <h2>Síntese do seu estilo</h2>
          <p className="sm">{SINTESE_LIDERANCA.primeiro(est[0].nome, est[0].percentual.texto, est[1].nome, est[1].percentual.texto)}</p>
          <p className="sm">
            {SINTESE_LIDERANCA.segundo(
              `${est[0].nome} e ${est[1].nome}`,
              soma(est[0].percentual.valor, est[1].percentual.valor),
              `${est[2].nome} e ${est[3].nome}`,
              soma(est[2].percentual.valor, est[3].percentual.valor),
            )}
          </p>
          {mudouOTopo ? (
            <div className="box-warn" style={{ marginTop: '3mm' }}>
              <div className="bt" style={{ color: '#9A6200' }}>
                <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#9A6200" strokeWidth="2.4" />
                  <path d="M12 7v6.5M12 16.6v.4" stroke="#9A6200" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                <span style={{ color: '#171A1F' }}>{ALERTA_AMBIENTE.titulo}</span>
              </div>
              <div className="sm">
                {naturais.length
                  ? ALERTA_AMBIENTE.texto(lista(adaptados, 'adaptado'), lista(naturais, 'natural'))
                  : ALERTA_AMBIENTE.textoEquilibrado(lista(adaptados, 'adaptado'))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="card" style={{ width: '66mm', flex: 'none', padding: '2.6mm' }}>
          <span className="lab">Perfil natural · base do estilo</span>
          <svg width="60mm" height="66mm" viewBox="0 0 600 660" style={{ display: 'block' }}>
            {/* Faixa de flexibilidade: acima de 32 e abaixo de 70 (C11). */}
            <rect x="70" y={y(70)} width="510" height={y(32) - y(70)} fill="#E9E3D6" />
            {[0, 50, 100].map((t) => (
              <g key={t}>
                <line x1="70" x2="580" y1={y(t)} y2={y(t)} stroke="#C9C2B3" strokeWidth={t ? 1.2 : 2} strokeDasharray={t ? '6 6' : undefined} />
                <text x="58" y={y(t) + 7} textAnchor="end" fontSize="21" fill="#5B6573" fontFamily="OS">{t}</text>
              </g>
            ))}
            {FATORES.map((fator, i) => {
              const d = f[fator]
              const cx = 133.75 + 127.5 * i
              const topo = y(d.natural.escore.valor)
              return (
                <g key={fator}>
                  <rect x={cx - 35.7} y={topo} width="71.4" height={510 - topo} fill={d.cor.principal} />
                  <text x={cx} y={topo - 14} textAnchor="middle" fontSize="40" fontWeight="800" fill={d.cor.texto} fontFamily="AR">{d.natural.escore.texto}</text>
                  {/* 17 e 18 (molde: 19 com espacamento e 22): colunas a 127,5 de distancia; "DOMINANTE INFLUENTE" e dois "Muito baixo" vizinhos se encostavam. */}
                  <text x={cx} y="550" textAnchor="middle" fontSize="17" fontWeight="700" fill="#171A1F" fontFamily="OS">{d.rotulo}</text>
                  <text x={cx} y="580" textAnchor="middle" fontSize="18" fill="#5B6573" fontFamily="OS">{d.natural.zona.nome}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
