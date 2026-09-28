/**
 * Pagina 21 · A sua hierarquia funcional.
 *
 * As quatro funcoes na ordem do motor, com atitude ("Intuição Extrovertida"),
 * como a v2.2 define (C19). A barra de cada linha e o percentual da letra da
 * funcao e clareia com a posicao, na proporcao do molde. O cartao "Como a
 * ordem e determinada" usa a redacao da v2.2 (regra de clareza), em rascunho.
 */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import { PAGINA_21 } from '@/data/relatorio-mc/jung'
import { LIMITE_PROXIMIDADE, regraDeLeituraPar } from '@/data/relatorio-mc/variantes/p15-21'
import { COR_POLO, TOM_HIERARQUIA, clarear } from './p15-21/cores'
import type { PropsPagina } from './registro'

// O molde tem 8mm 1fr 40mm 12mm, para "Intuição" e "64". Com a atitude
// ("Intuição Extrovertida") e uma casa decimal ("88,9") o nome e o numero
// precisam de mais largura: a barra cede 10mm.
const COLUNAS = '8mm 1fr 30mm 15mm'
const REFERENCIA_22 = ', e está detalhada na página 22'

export default function Pagina21({ dados }: PropsPagina) {
  const { hierarquia } = dados.jung
  const [dominante, , terciaria, inferior] = hierarquia
  const par = (f: typeof inferior) => `${f.nomeFuncao} ${f.percentual.texto}`
  const proximas = Math.abs(inferior.percentual.valor - terciaria.percentual.valor) <= LIMITE_PROXIMIDADE
  // C35: so cita a pagina 22 se ela estiver no documento deste nivel.
  const definicao = (texto: string) => (dados.nivel.inclui[22] ? texto : texto.replace(REFERENCIA_22, ''))

  return (
    <Pagina
      dados={dados}
      numero={21}
      kicker={PAGINA_21.sobretitulo}
      titulo={PAGINA_21.titulo}
      subtitulo={`Tipo ${dominante.nome}. ${PAGINA_21.intro}`}
    >
      <div className="row" style={{ gap: '5mm', marginBottom: '4mm' }}>
        <div className="card col" style={{ flex: 1.7, padding: '2mm 4mm' }}>
          {hierarquia.map((f, i) => {
            const cor = COR_POLO[f.funcao]
            return (
              <div key={f.posicao} style={{ display: 'grid', gridTemplateColumns: COLUNAS, gap: '3mm', alignItems: 'center', padding: '2.4mm 0', borderBottom: '.5pt solid #E3DDD0' }}>
                <div className="num" style={{ fontSize: '15pt', color: '#171A1F' }}>{f.posicao}</div>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '2mm', alignItems: 'baseline' }}>
                    <span className="lab" style={{ margin: 0 }}>{f.rotulo}</span>
                    <span style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '10.5pt', color: cor, whiteSpace: 'nowrap' }}>{f.nome}</span>
                  </div>
                  <div className="xs">{definicao(f.definicao)}</div>
                </div>
                <div style={{ height: '4mm', background: '#EDE7DB', borderRadius: '1mm' }}>
                  <div style={{ width: `${f.percentual.valor}%`, height: '100%', background: clarear(cor, TOM_HIERARQUIA[i]), borderRadius: '1mm' }} />
                </div>
                <div className="num" style={{ fontSize: '14pt', textAlign: 'right' }}>{f.percentual.texto}</div>
              </div>
            )
          })}
        </div>
        <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
          <div className="card">
            <span className="lab">{PAGINA_21.tituloOrdem}</span>
            <div className="xs">{PAGINA_21.comoAOrdemEDeterminadaV22}</div>
            <div className="xs" style={{ marginTop: '1.4mm' }}>{PAGINA_21.fechoOrdem}</div>
          </div>
          <div className="card">
            <span className="lab">{PAGINA_21.tituloRegraDeLeitura}</span>
            <div className="xs">
              {PAGINA_21.regraDeLeitura} {regraDeLeituraPar(par(inferior), par(terciaria), proximas).texto}
            </div>
          </div>
        </div>
      </div>
      <TextoIA como="div" className="note" style={{ borderLeftColor: COR_POLO[dominante.funcao], marginBottom: '3mm' }} texto={dados.ia.hierarquia[0]} />
      <div className="card xs" style={{ borderLeft: '1.2mm solid #6B4E8A' }}>
        <b>{PAGINA_21.tituloGrauDeCerteza}</b> {dados.jung.grauDeCerteza}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore', 'a-confirmar']} />
    </Pagina>
  )
}
