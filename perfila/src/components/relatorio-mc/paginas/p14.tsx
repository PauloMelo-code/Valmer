/**
 * Pagina 14 · Relacionamento, decisao e espectro.
 *
 * - 4 cartoes: tabela por fator natural mais alto (`RELACIONAMENTO`, rascunho,
 *   C15). O molde trazia o texto do Valmer, com os escores dele.
 * - Espectro: pares e posicao de `dados.espectro` (regra 'a confirmar' em
 *   `espectro.ts`); o polo do lado do marcador vai em negrito, em 50 nenhum.
 * - Nota "O que o adaptado muda aqui.": pelo fator que mais mudou entre
 *   natural e adaptado e pelo sentido da mudanca (`ADAPTADO_P14`, rascunho).
 */
import { FATORES } from '@/data/inventario-mc'
import { PAGINA_14 } from '@/data/relatorio-mc/espectro'
import { ADAPTADO_P14, RELACIONAMENTO } from '@/data/relatorio-mc/variantes/p08-14'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { Pagina } from '../Pagina'
import { Marcacao } from '../Marcacao'
import { BORDA_FATOR } from './p08-14/PaginaFator'
import type { PropsPagina } from './registro'

const GRADE = { display: 'grid', gridTemplateColumns: '48mm 1fr 44mm 18mm', gap: '3mm' } as const
const FORTE = { fontWeight: 800, color: '#171A1F' } as const
const FRACO = { fontWeight: 400, color: '#5B6573' } as const
// Cores das bordas dos cartoes, fixas como no molde (nao sao do fator).
const CARTOES = ['#9A6500', '#267057', '#315F8A', '#17324D']

/** Texto da nota: o fator de maior variacao absoluta (empate: ordem D, I, S, C). */
function notaAdaptado(dados: DadosRelatorioMC): string {
  const f = FATORES.reduce((a, b) => (Math.abs(dados.fatores[b].variacao.valor) > Math.abs(dados.fatores[a].variacao.valor) ? b : a))
  const x = dados.fatores[f]
  if (x.classeVariacao === 'baixa' || x.direcao === 'mantem') return ADAPTADO_P14.estavel
  return ADAPTADO_P14[x.direcao][f](x.rotulo, x.adaptado.escore.texto)
}

export default function Pagina14({ dados }: PropsPagina) {
  const rel = RELACIONAMENTO[dados.ordemNatural[0]]
  const textos = [rel.aproxima, rel.sustenta, rel.desgasta, rel.pressao]

  return (
    <Pagina dados={dados} numero={14} kicker={PAGINA_14.sobretitulo} titulo={PAGINA_14.titulo} subtitulo={PAGINA_14.subtitulo}>
      <div className="g4" style={{ marginBottom: '4.5mm' }}>
        {PAGINA_14.cartoes.map((rotulo, i) => (
          <div key={rotulo} className="card" style={{ borderTop: `1.2mm solid ${CARTOES[i]}`, padding: '3mm 3.2mm' }}>
            <span className="lab">{rotulo}</span>
            <div className="xs">{textos[i]}</div>
          </div>
        ))}
      </div>
      <h2>{PAGINA_14.tituloEspectro}</h2>
      <div className="xs mut" style={{ marginBottom: '2mm' }}>{PAGINA_14.legenda}</div>
      <div className="card" style={{ padding: '2mm 3.6mm', marginBottom: '4mm' }}>
        <div style={{ ...GRADE, fontSize: '6.2pt', letterSpacing: '.14em', fontWeight: 700, color: '#5B6573', paddingBottom: '1mm', borderBottom: '.6pt solid #D8D2C5' }}>
          <span style={{ textAlign: 'right' }}>{PAGINA_14.colunas[0]}</span>
          <span style={{ textAlign: 'center' }}>{PAGINA_14.colunas[1]}</span>
          <span>{PAGINA_14.colunas[2]}</span>
          <span>{PAGINA_14.colunas[3]}</span>
        </div>
        {dados.espectro.map((par) => {
          const { cor, rotulo } = dados.fatores[par.fator]
          return (
            <div key={par.esquerda} style={{ ...GRADE, alignItems: 'center', fontSize: '8.2pt', padding: '1.6mm 0', borderBottom: '.5pt solid #E3DDD0' }}>
              <div style={{ textAlign: 'right', ...(par.predominante === 'esquerda' ? FORTE : FRACO) }}>{par.esquerda}</div>
              <div style={{ position: 'relative', height: '3mm', background: '#EDE7DB', borderRadius: '2mm', border: '.5pt solid #D8D2C5' }}>
                <div style={{ position: 'absolute', left: '50%', top: '-1mm', bottom: '-1mm', borderLeft: '.8pt dashed #8a8272' }} />
                <div
                  style={{
                    position: 'absolute', left: `calc(${par.posicao}% - 2.2mm)`, top: '-1.1mm', width: '4.4mm', height: '4.4mm',
                    borderRadius: '50%', background: cor.principal, border: '.9mm solid #fff', boxShadow: `0 0 0 .5pt ${cor.principal}`,
                  }}
                />
              </div>
              <div style={par.predominante === 'direita' ? FORTE : FRACO}>{par.direita}</div>
              <div>
                <span className="pill" style={{ background: cor.fundoSuave, color: cor.texto, border: `.5pt solid ${BORDA_FATOR[par.fator]}` }}>{rotulo}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="note" style={{ borderLeftColor: '#6B4E8A' }}>
        <b>{PAGINA_14.tituloAdaptado}</b> {notaAdaptado(dados)}
      </div>
      <div className="spacer" />
      <div>
        <Marcacao tipo="a-confirmar" />
      </div>
    </Pagina>
  )
}
