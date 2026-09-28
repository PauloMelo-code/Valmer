/**
 * Pagina 16 · Gatilhos comportamentais de mobilizacao.
 *
 * Gatilho principal e complementar = motivador do 1o e do 2o fator natural
 * (`dados.gatilhos`, frase "Deriva do seu fator..." ja pronta). O cruzamento
 * com os valores usa o valor mais alto do ranking e a tabela de afinidade
 * fator x valor de `variantes/p15-21.ts` (C17, a confirmar): o "confirma e
 * reforca" do molde so e impresso quando o valor de fato e afim do principal.
 */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { PAGINA_16 } from '@/data/relatorio-mc/tensoes-gatilhos'
import { APLICACAO_VALOR, LEITURA_DO_ALINHAMENTO, MOTIVADOR_VALOR, alinhamento } from '@/data/relatorio-mc/variantes/p15-21'
import { BORDA_FATOR, COR_VALOR } from './p15-21/cores'
import type { PropsPagina } from './registro'

export default function Pagina16({ dados }: PropsPagina) {
  const [principal, complementar] = dados.gatilhos
  const valor = dados.valores.ranking[0]
  const fator = dados.fatores[principal.fator]
  const corValor = COR_VALOR[valor.valor]
  const leitura = LEITURA_DO_ALINHAMENTO[alinhamento(valor.valor, principal.fator, complementar.fator)].texto

  return (
    <Pagina dados={dados} numero={16} kicker={PAGINA_16.sobretitulo} titulo={PAGINA_16.titulo} subtitulo={PAGINA_16.intro}>
      <div className="soft" style={{ background: '#fff', borderColor: '#D8D2C5', borderLeft: '1.4mm solid #C39A42', marginBottom: '4mm', padding: '3.4mm 4.4mm' }}>
        <div style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '11pt', lineHeight: 1.4, color: '#17324D' }}>{PAGINA_16.ponte}</div>
      </div>
      <div className="g2" style={{ marginBottom: '4mm' }}>
        {dados.gatilhos.map(({ fator: f, posicao, gatilho, deriva }) => {
          const cor = dados.fatores[f].cor
          return (
            <div key={f} className="soft" style={{ background: '#fff', borderColor: BORDA_FATOR[f], borderTop: `1.2mm solid ${cor.principal}` }}>
              <span className="lab" style={{ color: cor.texto }}>
                {posicao === 'principal' ? PAGINA_16.rotuloPrincipal : PAGINA_16.rotuloComplementar}
              </span>
              <h2 style={{ fontSize: '13pt' }}>{gatilho.nome}</h2>
              <p className="sm">
                <b>{PAGINA_16.rotuloSignifica}</b> {posicao === 'principal' ? `${deriva} ${gatilho.oQueSignifica}` : deriva}
              </p>
              <p className="sm"><b>{PAGINA_16.rotuloComoAparece}</b> {gatilho.comoAparece}</p>
              <p className="sm"><b>{PAGINA_16.rotuloQuandoFalta}</b> {gatilho.quandoFalta}</p>
            </div>
          )
        })}
      </div>
      <div className="card" style={{ display: 'flex', gap: '5mm', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h2>{PAGINA_16.tituloCruzamento}</h2>
          <p className="sm">
            O seu valor mais alto é {valor.nomeMaiusculo}, com {valor.escore.texto} pontos, cujo motivador é {MOTIVADOR_VALOR[valor.valor].texto}. {leitura}
          </p>
          <p className="sm"><b>{PAGINA_16.rotuloAplicacao}</b> {APLICACAO_VALOR[valor.valor].texto}</p>
        </div>
        <div style={{ display: 'flex', gap: '2.6mm', flex: 'none' }}>
          <Mostrador rotulo={`FATOR ${fator.rotulo}`} numero={fator.natural.escore.texto} borda={BORDA_FATOR[fator.fator]} fundo={fator.cor.fundoSuave} cor={fator.cor.texto} />
          <Mostrador rotulo={`VALOR ${valor.nomeMaiusculo}`} numero={valor.escore.texto} borda={corValor.borda} fundo={corValor.fundo} cor={corValor.texto} />
        </div>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}

function Mostrador({ rotulo, numero, borda, fundo, cor }: { rotulo: string; numero: string; borda: string; fundo: string; cor: string }) {
  return (
    <div style={{ textAlign: 'center', border: `.6pt solid ${borda}`, background: fundo, borderRadius: '1.6mm', padding: '2.4mm 3.4mm' }}>
      <div className="xs" style={{ fontWeight: 700, letterSpacing: '.1em' }}>{rotulo}</div>
      <div className="num" style={{ fontSize: '24pt', color: cor }}>{numero}</div>
    </div>
  )
}
