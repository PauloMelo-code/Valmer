/**
 * Pagina 15 · Pontos de tensao e inseguranca.
 *
 * Os dois fatores mais altos do natural (`dados.tensoes`), cada um com a sua
 * lista de `TENSOES`. O "Como aparece." do segundo fator abre com a nota do
 * molde ("Aparecem com menos frequencia...") porque o que muda e a posicao, nao
 * o fator. O risco e o do fator mais alto: e ele que dirige a reacao.
 */
import type { CSSProperties } from 'react'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { PAGINA_15 } from '@/data/relatorio-mc/tensoes-gatilhos'
import { BORDA_FATOR } from './p15-21/cores'
import type { PropsPagina } from './registro'

export default function Pagina15({ dados }: PropsPagina) {
  const [primeiro] = dados.tensoes
  // No equilibrado os quatro empatam: "mais alto" seria falso, a ordem e so do desempate.
  const empate = dados.perfis.natural.tipo === 'equilibrado'
  const rotulo = (posicao: 'primeiro' | 'segundo') =>
    posicao === 'primeiro' ? (empate ? PAGINA_15.rotuloPrimeiroEmpate : PAGINA_15.rotuloPrimeiro) : empate ? PAGINA_15.rotuloSegundoEmpate : PAGINA_15.rotuloSegundo
  return (
    <Pagina dados={dados} numero={15} kicker={PAGINA_15.sobretitulo} titulo={PAGINA_15.titulo} subtitulo={PAGINA_15.intro}>
      <div className="g2" style={{ marginBottom: '4mm' }}>
        {dados.tensoes.map(({ fator, posicao, tensao }) => {
          const f = dados.fatores[fator]
          const comoAparece = posicao === 'primeiro' ? tensao.comoAparece : `${PAGINA_15.notaSegundoFator} ${tensao.comoAparece}`
          return (
            <div key={fator} className="soft" style={{ background: '#fff', borderColor: BORDA_FATOR[fator], borderTop: `1.2mm solid ${f.cor.principal}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ color: f.cor.texto }}>{PAGINA_15.ligadosAoFator(f.rotulo)}</h2>
                <span className="num" style={{ color: f.cor.texto, fontSize: '14pt' }}>{f.natural.escore.texto}</span>
              </div>
              <span className="lab">{rotulo(posicao)}</span>
              <ul className="l sm" style={{ '--bc': f.cor.principal, margin: '1.6mm 0 2.4mm' } as CSSProperties}>
                {tensao.itens.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="xs" style={{ background: f.cor.fundoSuave, padding: '2mm 2.6mm', borderRadius: '1mm' }}>
                <b>{PAGINA_15.rotuloComoAparece}</b> {comoAparece}
              </div>
            </div>
          )
        })}
      </div>
      <div className="g2">
        <div className="box-risk">
          <div className="bt" style={{ color: '#9F3345' }}>
            <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3 22 20H2z" fill="none" stroke="#9F3345" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M12 9.5v5M12 17.2v.3" stroke="#9F3345" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#171A1F' }}>{PAGINA_15.tituloRisco}</span>
          </div>
          <div className="sm">{primeiro.tensao.risco}</div>
        </div>
        <div className="soft" style={{ background: '#E4F3EC', borderColor: '#267057' }}>
          <div className="bt" style={{ color: '#267057' }}>
            <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="#267057" strokeWidth="2.2" />
              <path d="m7.5 12.2 3 3 6-6.2" fill="none" stroke="#267057" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#171A1F' }}>{PAGINA_15.tituloRecomendacao}</span>
          </div>
          <div className="sm">{PAGINA_15.recomendacao}</div>
        </div>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['a-confirmar']} />
    </Pagina>
  )
}
