/**
 * Pagina 03 · Sobre o seu Mapa Comportamental. Toda fixa (texto de
 * `PAGINA_03`); nenhum dado do avaliado alem do cabecalho.
 */
import { Pagina } from '../Pagina'
import { FATORES } from '@/data/inventario-mc'
import { CORES_FATOR } from '@/data/relatorio-mc/cores'
import { FATORES_RELATORIO } from '@/data/relatorio-mc/fatores'
import { PAGINA_03 } from '@/data/relatorio-mc/textos-fixos'
import { realcar } from './p01-07/realce'
import type { PropsPagina } from './registro'

const COLUNA_COM_FIO = { borderLeft: '.6pt solid #D8D2C5', paddingLeft: '6mm' }
// A camada 01 nomeia os quatro fatores, cada um na cor dele.
const FATORES_COLORIDOS = FATORES.map((f) => ({ trecho: FATORES_RELATORIO[f].rotulo, cor: CORES_FATOR[f].principal }))

export default function Pagina03({ dados }: PropsPagina) {
  const p = PAGINA_03
  return (
    <Pagina
      dados={dados}
      numero={3}
      kicker={p.sobretitulo}
      titulo={p.titulo}
      subtitulo={<i style={{ fontSize: '9.1pt', whiteSpace: 'nowrap' }}>{p.subtitulo}</i>}
    >
      <div className="fit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="quote" style={{ marginBottom: '2.2mm', padding: '2.4mm 4mm' }}>
          <div style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '11.6pt', lineHeight: 1.35, color: '#17324D' }}>{p.citacao}</div>
        </div>
        <div className="row" style={{ gap: '6mm', marginBottom: '2.2mm' }}>
          <div className="col"><p className="sm">{p.colunas[0]}</p></div>
          <div className="col" style={COLUNA_COM_FIO}><p className="sm">{p.colunas[1]}</p></div>
        </div>
        <h2 className="h2u" style={{ fontSize: '13pt', marginBottom: '1.6mm' }}>{p.tituloCamadas}</h2>
        <div className="g3" style={{ gap: '3mm', marginBottom: '2.4mm' }}>
          {p.camadas.map((c, i) => (
            <div key={c.numero} style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderTop: '1.4mm solid #17324D', borderRadius: '1.6mm', padding: '0 0 3mm', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '3mm', alignItems: 'center', padding: '2.2mm 3.2mm 1.6mm' }}>
                <span style={{ background: '#17324D', color: '#fff', fontFamily: 'AR', fontWeight: 800, fontSize: '15pt', borderRadius: '1.2mm', padding: '.6mm 2.4mm' }}>{c.numero}</span>
                <div>
                  <div className="lab" style={{ margin: 0 }}>{c.rotulo}</div>
                  <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '9.6pt', color: '#17324D', textTransform: 'uppercase' }}>{c.titulo}</div>
                </div>
              </div>
              <div className="xs" style={{ padding: '0 3.2mm' }}>{i === 0 ? realcar(c.texto, FATORES_COLORIDOS) : c.texto}</div>
              <div className="spacer" />
              <div style={{ margin: '2.4mm 3.2mm 0', paddingTop: '2mm', borderTop: '.6pt solid #D8D2C5' }} className="sm">
                <b style={{ color: '#17324D' }}>{p.rotuloPergunta}</b> {c.pergunta}
              </div>
            </div>
          ))}
        </div>
        <div className="quote xs" style={{ marginBottom: '2.4mm', padding: '2.2mm 4mm' }}>
          <span className="lab" style={{ color: '#171A1F' }}>{p.observacaoDeMetodo.destaque}</span>
          {p.observacaoDeMetodo.texto}
        </div>
        <div className="row" style={{ gap: '6mm' }}>
          <div className="col">
            <h2 className="h2u">{p.tituloComoUsar}</h2>
            {p.comoUsar.map((t) => <p key={t} className="sm">{t}</p>)}
          </div>
          <div className="col" style={COLUNA_COM_FIO}>
            <h2 className="h2u">{p.tituloNaoFaz}</h2>
            {p.naoFaz.map((n) => (
              <p key={n.destaque} className="sm" style={{ marginBottom: '1.8mm' }}><b>{n.destaque}</b> {n.texto}</p>
            ))}
          </div>
        </div>
      </div>
    </Pagina>
  )
}
