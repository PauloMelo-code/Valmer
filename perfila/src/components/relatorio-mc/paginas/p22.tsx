/**
 * Pagina 22 · O lado que aparece sob pressao (funcao inferior).
 *
 * O molde foi escrito para Sensacao inferior; aqui a funcao, o texto de
 * "Como aparece" e as regulacoes vem da inferior do avaliado (C20). O bloco
 * "Por que a adaptacao atual custa tanto" saiu: e condicional e a v2.2 nao da
 * regra para decidir quando ele vale (C20). Os tres sinais sao da IA.
 */
import type { CSSProperties } from 'react'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import { PAGINA_22 } from '@/data/relatorio-mc/jung'
import { maiusculas } from '@/lib/relatorio-mc/formato'
import { REGULACOES_INFERIOR, ondeMoraComplemento } from '@/data/relatorio-mc/variantes/p22-28'
import { COR_POLO } from './p22-28/cores'
import type { PropsPagina } from './registro'

const RISCO = '#9F3345'

export default function Pagina22({ dados }: PropsPagina) {
  const { inferior, hierarquia, dominanteDePercepcao } = dados.jung
  const cor = COR_POLO[inferior.funcao]
  const sinais = dados.ia.sinaisFuncaoInferior

  return (
    <Pagina
      dados={dados}
      numero={22}
      kicker={PAGINA_22.sobretitulo}
      titulo={PAGINA_22.titulo}
      subtitulo={`${PAGINA_22.rotuloFuncaoInferior}: ${inferior.nome}, ${inferior.percentual.texto} pontos.`}
    >
      <div className="row" style={{ gap: '5mm', marginBottom: '4mm' }}>
        <div className="col" style={{ flex: 1.5 }}>
          <p className="sm">
            <b>{PAGINA_22.tituloOndeMora}</b> {PAGINA_22.ondeMora} {ondeMoraComplemento(hierarquia[0].nomeFuncao, inferior.nomeFuncao)}
          </p>
          <p className="sm">
            <b>{PAGINA_22.tituloOQueAtiva}</b> {PAGINA_22.oQueAtiva(dominanteDePercepcao)}
          </p>
          <p className="sm">
            <b>{PAGINA_22.tituloComoAparece}</b> {inferior.manifestacao}
          </p>
        </div>
        <div className="col">
          <div className="box-risk">
            <div className="bt" style={{ color: RISCO }}>
              <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 3 22 20H2z" fill="none" stroke={RISCO} strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M12 9.5v5M12 17.2v.3" stroke={RISCO} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span style={{ color: '#171A1F' }}>{PAGINA_22.tituloSinais}</span>
            </div>
            <ul className="l sm" style={{ '--bc': RISCO } as CSSProperties}>
              {sinais ? sinais.map((s, i) => <TextoIA key={i} como="li" texto={s} />) : <TextoIA como="li" texto={null} />}
            </ul>
          </div>
          <div className="soft" style={{ marginTop: '3mm', background: cor.fundo, borderColor: cor.principal, textAlign: 'center' }}>
            <div className="xs" style={{ fontWeight: 700, letterSpacing: '.12em' }}>
              {maiusculas(PAGINA_22.rotuloFuncaoInferior)}
            </div>
            <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '15pt', color: cor.principal }}>
              {inferior.nomeFuncao} · {inferior.percentual.texto}
            </div>
          </div>
        </div>
      </div>
      <div className="g3" style={{ marginBottom: '3.5mm' }}>
        {REGULACOES_INFERIOR[inferior.funcao].itens.map((texto, i) => (
          <div key={i} className="card" style={{ borderTop: '1.2mm solid #17324D' }}>
            <span className="lab">Regulação {String(i + 1).padStart(2, '0')}</span>
            <div className="xs">{texto}</div>
          </div>
        ))}
      </div>
      <div className="box-warn xs">
        <b>{PAGINA_22.tituloCuidado}</b> {PAGINA_22.cuidado}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['a-confirmar']} />
    </Pagina>
  )
}
