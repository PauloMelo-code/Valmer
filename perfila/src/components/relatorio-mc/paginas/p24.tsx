/**
 * Pagina 24 · Os seus seis valores.
 *
 * Grafico do molde (viewBox 1700x750): seis linhas na ordem do ranking,
 * trilho x=560 com 990 de largura (9,9 por ponto), tom pela faixa. As
 * tracejadas ficam no inicio das faixas da v2.2, 31 e 66 (C21). O nome do PRI
 * vem de `VALORES_RELATORIO` (D8, C22), nunca "REGULATÓRIO".
 */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { VALORES } from '@/data/inventario-mc'
import { FAIXAS_VALOR, PAGINA_24 } from '@/data/relatorio-mc/spranger'
import { FAIXA_VAZIA_24, FRASE_FAIXA_24, legendaPagina24 } from '@/data/relatorio-mc/variantes/p22-28'
import { juntar, numero } from '@/lib/relatorio-mc/formato'
import { COR_VALOR, tomDoValor } from './p22-28/cores'
import type { PropsPagina } from './registro'

const X0 = 560
const LARGURA = 990
const PASSO = 110
const x = (v: number) => X0 + (LARGURA * v) / 100
const faixa = (codigo: string) => FAIXAS_VALOR.find((f) => f.codigo === codigo)!

export default function Pagina24({ dados }: PropsPagina) {
  const { ranking, porValor, grupos } = dados.valores
  const limites = [faixa('circunstancial').minimo, faixa('significativo').minimo]

  return (
    <Pagina dados={dados} numero={24} kicker={PAGINA_24.sobretitulo} titulo={PAGINA_24.titulo} subtitulo={PAGINA_24.subtitulo}>
      <div className="card sm" style={{ marginBottom: '4mm', lineHeight: 1.6 }}>
        {PAGINA_24.intro}
        {VALORES.map((v) => (
          <span key={v}>
            {' '}
            <span style={{ fontWeight: 800, color: COR_VALOR[v].texto }}>{porValor[v].nomeMaiusculo}</span> {porValor[v].ficha.descricaoPagina24}.
          </span>
        ))}
      </div>
      <div className="card" style={{ padding: '4mm 4.4mm', marginBottom: '4mm' }}>
        <svg width="170mm" height="75.0mm" viewBox="0 0 1700 750" style={{ display: 'block' }}>
          {limites.map((l) => (
            <line key={l} x1={x(l)} x2={x(l)} y1="0" y2="660" stroke="#B8B09E" strokeWidth="2" strokeDasharray="8 7" />
          ))}
          {ranking.map((v, i) => {
            const y = i * PASSO
            const cor = COR_VALOR[v.valor]
            return (
              <g key={v.valor}>
                <text x="0" y={64 + y} fontSize="34" fontWeight="800" fill={cor.texto} fontFamily="AR">{v.nomeMaiusculo}</text>
                <text x="0" y={102 + y} fontSize="24" fill="#5B6573" fontFamily="OS">{v.nivel}</text>
                <rect x={X0} y={36 + y} width={LARGURA} height="58" rx="6" fill="#fff" stroke="#D8D2C5" strokeWidth="2" />
                <rect x={X0} y={36 + y} width={(LARGURA * v.escore.valor) / 100} height="58" rx="6" fill={tomDoValor(v.valor, v.faixa)} />
                <text x="1700" y={82 + y} textAnchor="end" fontSize="46" fontWeight="800" fill={cor.texto} fontFamily="AR">{v.escore.texto}</text>
              </g>
            )
          })}
          {[0, 25, 50, 75, 100].map((t) => (
            <text key={t} x={x(t)} y="720" textAnchor="middle" fontSize="24" fill="#5B6573" fontFamily="OS">{t}</text>
          ))}
        </svg>
        <div className="xs mut" style={{ marginTop: '1.6mm' }}>{legendaPagina24(numero(limites[0]), numero(limites[1]))}</div>
      </div>
      <div className="g3">
        {FAIXAS_VALOR.map((f) => {
          const lista = grupos[f.codigo]
          const frase = FRASE_FAIXA_24[f.codigo]
          return (
            <div key={f.codigo} className="card">
              <span className="lab">{`${f.nome} · ${numero(f.minimo)} a ${numero(f.maximo)}`}</span>
              {lista.length ? (
                <>
                  <div className="sm"><b>{juntar(lista.map((v) => v.nomeMaiusculo))}.</b></div>
                  <div className="xs mut" style={{ marginTop: '1mm' }}>{lista.length === 1 ? frase.um : frase.varios}</div>
                </>
              ) : (
                <div className="sm mut">{FAIXA_VAZIA_24.texto}</div>
              )}
            </div>
          )
        })}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
