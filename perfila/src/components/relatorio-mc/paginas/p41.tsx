/**
 * Pagina 41 · O desenvolvimento continua (D5, C32).
 *
 * O molde tem tres paragrafos fixos entre a frase de abertura e o painel
 * escuro. O blueprint pede ali a `mensagem_final` da IA, e a D5 traz para ca
 * as cinco leituras (o molde de 42 paginas nao tem outro lugar para elas).
 * Ficam: frase de abertura e painel do molde; no meio, a mensagem (2
 * paragrafos) e a lista de leituras. PENDENTE Valmer (C32).
 */
import { PAGINA_41 } from '@/data/relatorio-mc/textos-fixos'
import { TITULO_LEITURAS } from '@/data/relatorio-mc/variantes/p36-42'
import { Pagina } from '../Pagina'
import { TextoIA } from '../TextoIA'
import type { PropsPagina } from './registro'

const FIO = { height: '.5pt', background: '#C39A42', margin: '4mm 0' } as const

export default function Pagina41({ dados }: PropsPagina) {
  const mensagem = dados.ia.mensagemFinal
  const leituras = dados.ia.leituras
  return (
    <Pagina dados={dados} numero={41} kicker={PAGINA_41.sobretitulo} titulo={PAGINA_41.titulo} grande>
      <p style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10.6pt', color: '#17324D', marginBottom: '4mm' }}>
        <i>{PAGINA_41.subtitulo}</i>
      </p>
      {/* Sem narrativa os dois blocos sao o mesmo pendente: um aviso basta. */}
      {mensagem.every((p) => p == null) ? <TextoIA texto={null} /> : mensagem.map((p, i) => <TextoIA key={i} texto={p} />)}
      <div style={FIO} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '2.6mm' }}>
        <span className="lab" style={{ margin: 0 }}>{TITULO_LEITURAS.texto}</span>
        <span style={{ flex: 1, height: '.5pt', background: '#D8D2C5' }} />
      </div>
      {leituras == null ? (
        <TextoIA texto={null} className="sm" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.4mm' }}>
          {leituras.map((l, i) => (
            <div key={l.titulo} style={{ display: 'flex', gap: '3mm', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '11pt', color: '#C39A42', lineHeight: 1.2, width: '6mm', flex: 'none' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="sm">
                  <b style={{ fontFamily: 'AR', color: '#17324D' }}>{l.titulo}</b>
                  <span className="mut"> · {l.autor}</span>
                </div>
                <div className="xs">{l.por_que_para_voce}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="spacer" />
      <div className="dark" style={{ padding: '4.4mm 5mm' }}>
        <div style={{ height: '.9mm', width: '14mm', background: '#C39A42', marginBottom: '2.6mm' }} />
        <div className="sm" style={{ marginBottom: '2mm' }}>{PAGINA_41.paragrafos[3]}</div>
        <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '11.5pt', lineHeight: 1.35 }}>
          {PAGINA_41.fecho[0]}
          <br />
          {PAGINA_41.fecho[1]}
        </div>
      </div>
    </Pagina>
  )
}
