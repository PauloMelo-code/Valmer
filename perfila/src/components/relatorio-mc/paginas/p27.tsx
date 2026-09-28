/**
 * Pagina 27 · Painel consolidado.
 *
 * Barras verticais do molde (viewBox 800x600): base y=450, 100 em y=60, 3,9
 * por ponto; faixa sombreada = zona de flexibilidade, acima de 32 e abaixo de
 * 70 (C11). Rotulo de zona da regua de 6 (D4, C01). Lideranca com os estilos
 * da v2.2 em percentual, ordenados (D6, C25). O rodape do deslocamento aponta
 * para a 08, onde o detalhe esta (C25).
 */
import { Fragment, type ReactNode } from 'react'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { DefsTexturas, useTexturas, type IdsTextura } from '../Textura'
import { FATORES } from '@/data/inventario-mc'
import { DEFINICAO_AMPLITUDE, LEGENDA_LIDERANCA } from '@/data/relatorio-mc/variantes/p22-28'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { COR_POLO, COR_VALOR, FATOR_DO_ESTILO, tomDoValor } from './p22-28/cores'
import type { PropsPagina } from './registro'

const BASE = 450
const ESCALA = 3.9
const y = (v: number) => BASE - ESCALA * v
const X_BARRA = [109.05, 286.55, 464.05, 641.55]
const LARGURA_BARRA = 99.4

function Barras({ dados, condicao, tx }: { dados: DadosRelatorioMC; condicao: 'natural' | 'adaptado'; tx?: IdsTextura }) {
  return (
    <svg width="80mm" height="60mm" viewBox="0 0 800 600" style={{ display: 'block' }}>
      {tx ? <DefsTexturas ids={tx} /> : null}
      <rect x="70" y={y(70)} width="710" height={ESCALA * (70 - 32)} fill="#E9E3D6" />
      {[0, 50, 100].map((t) => (
        <g key={t}>
          <line x1="70" x2="780" y1={y(t)} y2={y(t)} stroke="#C9C2B3" strokeWidth={t === 0 ? 2 : 1.2} strokeDasharray={t === 0 ? undefined : '6 6'} />
          <text x="58" y={y(t) + 7} textAnchor="end" fontSize="21" fill="#5B6573" fontFamily="OS">{t}</text>
        </g>
      ))}
      {FATORES.map((f, i) => {
        const d = dados.fatores[f]
        const c = d[condicao]
        const cx = X_BARRA[i] + LARGURA_BARRA / 2
        const topo = y(c.escore.valor)
        return (
          <g key={f}>
            <rect
              x={X_BARRA[i]} y={topo} width={LARGURA_BARRA} height={BASE - topo}
              fill={tx ? `url(#${tx[f]})` : d.cor.principal}
              {...(tx ? { stroke: d.cor.principal, strokeWidth: 4, strokeDasharray: '14 7' } : {})}
            />
            <text x={cx} y={topo - 14} textAnchor="middle" fontSize="40" fontWeight="800" fill={d.cor.texto} fontFamily="AR">{c.escore.texto}</text>
            <text x={cx} y="490" textAnchor="middle" fontSize="21" fontWeight="700" fill="#171A1F" fontFamily="OS" letterSpacing="1.5">{d.rotulo}</text>
            <text x={cx} y="522" textAnchor="middle" fontSize="22" fill="#5B6573" fontFamily="OS">{c.zona.nome}</text>
          </g>
        )
      })}
    </svg>
  )
}

type ItemLinha = { chave: string; nome: string; pct: number; cor: string; texto: string }

/**
 * "nome · barra · numero" dos tres cartoes do meio, numa grade so por cartao.
 * O molde usa uma grade por linha com o nome em 24mm fixos: quando o `.zw`
 * amplia (ate 1,3), a largura util do cartao encolhe e a barra some (conferido
 * no proprio molde). Com a coluna do nome em `auto` ela ocupa so o nome mais
 * longo, igual em todas as linhas, e a barra fica com o resto. `pct` de 0 a 100.
 */
function Linhas({ itens }: { itens: ItemLinha[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: '2mm', rowGap: '1.2mm', alignItems: 'center', fontSize: '7.4pt', marginBottom: '1.2mm' }}>
      {itens.map((i) => (
        <Fragment key={i.chave}>
          <span style={{ fontWeight: 700 }}>{i.nome}</span>
          <span style={{ height: '2.6mm', background: '#EDE7DB', borderRadius: '1mm', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${i.pct}%`, background: i.cor, borderRadius: '1mm' }} />
          </span>
          <span className="num" style={{ textAlign: 'right', color: '#171A1F' }}>{i.texto}</span>
        </Fragment>
      ))}
    </div>
  )
}

function Indicador({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: '3mm' }}>
      <span className="lab">{rotulo}</span>
      {children}
    </div>
  )
}

const NUMERO = { fontSize: '22pt', color: '#17324D', lineHeight: 1 } as const

export default function Pagina27({ dados }: PropsPagina) {
  const tx = useTexturas()
  const { eixos, hierarquia } = dados.jung
  const { indices } = dados
  const [dom, aux, ter, inf] = hierarquia
  const hierarquiaTexto = `Tipo ${dom.nome}. Dominante ${dom.nomeFuncao}, auxiliar ${aux.nomeFuncao}, terciária ${ter.nomeFuncao}, inferior ${inf.nomeFuncao}.`

  return (
    <Pagina dados={dados} numero={27} kicker="Tudo em uma página" titulo="Painel consolidado" subtitulo="Comportamento, processamento, valores e liderança lado a lado.">
      <div className="g2" style={{ marginBottom: '3.5mm' }}>
        {(['natural', 'adaptado'] as const).map((condicao) => (
          <div key={condicao} className="card" style={{ padding: '2.6mm 3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Perfil {condicao}</h3>
              <span className="xs" style={{ fontWeight: 700 }}>{dados.perfis[condicao].rotulo}</span>
            </div>
            <Barras dados={dados} condicao={condicao} tx={condicao === 'adaptado' ? tx : undefined} />
          </div>
        ))}
      </div>
      <div className="g3" style={{ marginBottom: '3.5mm' }}>
        <div className="card" style={{ padding: '3mm' }}>
          <span className="lab">Processamento</span>
          <Linhas itens={eixos.map(({ predominante: p }) => ({ chave: p.polo, nome: p.nome, pct: p.percentual.valor, cor: COR_POLO[p.polo].principal, texto: p.percentual.texto }))} />
          <div className="xs mut">Complementares: {eixos.map((e) => `${e.complementar.nome} ${e.complementar.percentual.texto}`).join(' · ')}.</div>
          <div className="xs" style={{ marginTop: '1.4mm' }}>{hierarquiaTexto}</div>
        </div>
        <div className="card" style={{ padding: '3mm' }}>
          <span className="lab">Valores</span>
          <Linhas itens={dados.valores.ranking.map((v) => ({ chave: v.valor, nome: v.nome, pct: v.escore.valor, cor: tomDoValor(v.valor, v.faixa), texto: v.escore.texto }))} />
        </div>
        <div className="card" style={{ padding: '3mm' }}>
          <span className="lab">Estilo de liderança</span>
          <Linhas itens={dados.lideranca.map((e) => ({ chave: e.estilo, nome: e.nome, pct: e.percentual.valor, cor: dados.fatores[FATOR_DO_ESTILO[e.estilo]].cor.principal, texto: e.percentual.texto }))} />
          <div className="xs mut">{LEGENDA_LIDERANCA.texto}</div>
        </div>
      </div>
      <div className="g4">
        <Indicador rotulo="Índice de adaptação">
          <div className="num" style={NUMERO}>{indices.adaptacao.texto}</div>
          <div className="xs">adaptação {indices.classe}</div>
        </Indicador>
        <Indicador rotulo="Amplitude do natural">
          <div className="num" style={NUMERO}>{indices.amplitude.texto}</div>
          <div className="xs">{DEFINICAO_AMPLITUDE.texto}</div>
        </Indicador>
        <Indicador rotulo="Fatores polarizados">
          <div className="num" style={NUMERO}>{indices.polarizados.length}</div>
          <div className="xs">{indices.polarizadosTexto || 'nenhum'}</div>
        </Indicador>
        <Indicador rotulo="Deslocamento por fator">
          <div className="xs" style={{ lineHeight: 1.55 }}>
            {FATORES.map((f) => (
              <div key={f}>
                <b style={{ color: dados.fatores[f].cor.texto }}>{dados.fatores[f].rotulo} {dados.fatores[f].variacao.texto}</b>
              </div>
            ))}
          </div>
          {dados.nivel.inclui[8] ? <div className="xs mut">Detalhes na página 08.</div> : null}
        </Indicador>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
