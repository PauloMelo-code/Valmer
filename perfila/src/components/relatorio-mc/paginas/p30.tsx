/**
 * Pagina 30 · Mapa de Competencias (fundamentacao). Tudo fixo.
 *
 * O cartao "Como este mapa foi construido" usa o texto da v2.2 (C27): o do
 * molde dizia que competencia = fator + ajuste, falso desde que cada uma e
 * medida por quatro palavras.
 */
import { NIVEIS_COMPETENCIA } from '@/data/relatorio-mc/competencias'
import { PAGINA_30 } from '@/data/relatorio-mc/textos-fixos'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'
import { COR_NIVEL } from './p29-35/cor-nivel'

export default function Pagina30({ dados }: PropsPagina) {
  const [p1, p2, p3] = PAGINA_30.paragrafos
  return (
    <Pagina dados={dados} numero={30} kicker={PAGINA_30.sobretitulo} titulo={PAGINA_30.titulo} subtitulo={PAGINA_30.subtitulo}>
      <div className="row" style={{ gap: '6mm', marginBottom: '4.5mm' }}>
        <div className="col">
          <p>{p1}</p>
          <p>{p2}</p>
        </div>
        <div className="col">
          <p>{p3}</p>
          <div className="card">
            <span className="lab">{PAGINA_30.tituloComoFoiConstruido}</span>
            <div className="sm">{PAGINA_30.comoFoiConstruidoV22}</div>
          </div>
        </div>
      </div>
      <div className="g3">
        {NIVEIS_COMPETENCIA.map((n) => (
          <div key={n.codigo} className="card" style={{ borderTop: `1.2mm solid ${COR_NIVEL[n.codigo]}` }}>
            <h2>{n.nome}</h2>
            <div className="sm">{n.texto}</div>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['fato-do-modelo']} />
    </Pagina>
  )
}
