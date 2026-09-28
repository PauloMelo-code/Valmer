/**
 * Pagina 25 · Os seus dois valores predominantes.
 *
 * Os dois primeiros do ranking. Cartao de cada um: tabela por valor (C23; o
 * molde so tinha POL e ECO). "Como estes dois conversam" sao os paragrafos 1 e
 * 2 de `dois_valores_narrativa`; "O que move voce agora" e o 3o (R1).
 */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import { PAGINA_25 } from '@/data/relatorio-mc/spranger'
import { ONDE_APARECE_VALOR } from '@/data/relatorio-mc/variantes/p22-28'
import type { ValorDados } from '@/lib/relatorio-mc/dados'
import { COR_VALOR } from './p22-28/cores'
import type { PropsPagina } from './registro'

function CartaoValor({ v }: { v: ValorDados }) {
  const cor = COR_VALOR[v.valor]
  return (
    <div className="soft" style={{ background: cor.fundo, borderColor: cor.cheio, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3mm 4mm', background: cor.cheio, color: '#fff' }}>
        <div>
          <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '13pt' }}>{v.nomeMaiusculo}</div>
          <div className="xs" style={{ letterSpacing: '.12em', fontWeight: 700 }}>{v.ficha.subtituloPagina25}</div>
        </div>
        <div className="num" style={{ fontSize: '26pt' }}>{v.escore.texto}</div>
      </div>
      <div style={{ padding: '3mm 4mm' }}>
        <p className="sm"><b>{PAGINA_25.rotuloRepresenta}</b> {v.ficha.oQueRepresenta}</p>
        <p className="sm"><b>{PAGINA_25.rotuloOndeAparece}</b> {ONDE_APARECE_VALOR[v.valor].texto}</p>
        <p className="sm"><b>{PAGINA_25.rotuloRisco}</b> {v.ficha.risco}</p>
      </div>
    </div>
  )
}

export default function Pagina25({ dados }: PropsPagina) {
  const [primeiro, segundo] = dados.valores.predominantes
  const [mesmoLado, divergem, moveAgora] = dados.ia.doisValores

  return (
    <Pagina dados={dados} numero={25} kicker={PAGINA_25.sobretitulo} titulo={PAGINA_25.titulo} subtitulo={PAGINA_25.intro}>
      <div className="g2" style={{ marginBottom: '4mm' }}>
        <CartaoValor v={primeiro} />
        <CartaoValor v={segundo} />
      </div>
      <div className="row" style={{ gap: '4mm', marginBottom: '4mm' }}>
        <div className="col" style={{ flex: 1.4, background: '#F7F3EC', border: '.6pt solid #D8D2C5', borderRadius: '1.6mm', padding: '3.4mm 4mm' }}>
          <div style={{ display: 'flex', height: '1.2mm', marginBottom: '2.4mm' }}>
            <div style={{ flex: 1, background: COR_VALOR[primeiro.valor].cheio }} />
            <div style={{ width: '2mm' }} />
            <div style={{ flex: 1, background: COR_VALOR[segundo.valor].cheio }} />
          </div>
          <h2>{PAGINA_25.tituloConversa}</h2>
          <TextoIA className="sm" texto={mesmoLado} />
          <TextoIA className="sm" texto={divergem} />
        </div>
        <div className="col card">
          <span className="lab">{PAGINA_25.tituloMoveAgora}</span>
          <TextoIA como="div" className="sm" texto={moveAgora} />
        </div>
      </div>
      <div className="note xs">{PAGINA_25.fecho}</div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
