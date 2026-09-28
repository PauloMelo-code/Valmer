/**
 * Pagina 32 · Competencias em detalhe: as 16, quatro por fator (D7, C29).
 *
 * Cada barra tem duas faixas: a de cima, solida, e o natural; a de baixo,
 * hachurada na mesma cor, e o adaptado (sobrevive a impressao em preto e branco).
 */
import { FATORES, type Fator } from '@/data/inventario-mc'
import { ROTULOS_COMPETENCIAS } from '@/data/relatorio-mc/competencias'
import { LEITURA_P32 } from '@/data/relatorio-mc/variantes/p29-35'
import { numero } from '@/lib/relatorio-mc/formato'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import type { PropsPagina } from './registro'

export default function Pagina32({ dados }: PropsPagina) {
  const { porFator } = dados.competencias
  // O fator de maior variacao: a media das quatro competencias e o escore do fator.
  const alvo = FATORES.reduce<Fator>((m, f) => (Math.abs(dados.fatores[f].variacao.valor) > Math.abs(dados.fatores[m].variacao.valor) ? f : m), FATORES[0])
  const faixa = (vs: number[]) => {
    const [de, ate] = [numero(Math.min(...vs)), numero(Math.max(...vs))]
    return de === ate ? de : `${de} a ${ate}`
  }

  return (
    <Pagina dados={dados} numero={32} kicker="Desdobramento" titulo={ROTULOS_COMPETENCIAS.tituloDetalhe} subtitulo={ROTULOS_COMPETENCIAS.subtituloDetalhe}>
      <div className="xs mut" style={{ marginBottom: '2mm' }}>{ROTULOS_COMPETENCIAS.legendaBarras}</div>
      {/* Padding 1,3mm (molde: 1,6): com a fonte real e descricoes de duas linhas a nota encostava no pe da pagina. */}
      <div className="g2" style={{ gap: '3.5mm', marginBottom: '3.5mm' }}>
        {FATORES.map((f) => {
          const { cor, rotulo } = dados.fatores[f]
          return (
            <div key={f} className="card" style={{ borderTop: `1.2mm solid ${cor.principal}`, padding: '2.4mm 3.4mm' }}>
              <span className="lab" style={{ color: cor.texto }}>Fator {rotulo}</span>
              {porFator[f].map((c) => (
                <div key={c.competencia} style={{ padding: '1.3mm 0', borderBottom: '.5pt solid #E3DDD0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <b style={{ fontSize: '8.2pt' }}>{c.nome}</b>
                    <span className="num" style={{ fontSize: '9pt' }}>
                      <span style={{ color: cor.texto }}>{c.natural.texto}</span>{' '}
                      <span className="mut" style={{ fontWeight: 600 }}>·</span>{' '}
                      <span style={{ color: '#171A1F' }}>{c.adaptado.texto}</span>
                    </span>
                  </div>
                  <div className="xs mut" style={{ margin: '.3mm 0 1mm' }}>{c.descricao}</div>
                  <div style={{ position: 'relative', height: '2.6mm', background: '#EDE7DB', borderRadius: '1mm' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '1.3mm', width: `${c.natural.valor}%`, background: cor.principal }} />
                    <div
                      style={{
                        position: 'absolute', left: 0, bottom: 0, height: '1.3mm', width: `${c.adaptado.valor}%`,
                        background: `repeating-linear-gradient(45deg,${cor.principal} 0 .6mm,${cor.fundoSuave} .6mm 1.3mm)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="note xs">
        <b>{LEITURA_P32.titulo}</b> {LEITURA_P32.texto(
          dados.fatores[alvo].rotulo,
          faixa(porFator[alvo].map((c) => c.natural.valor)),
          faixa(porFator[alvo].map((c) => c.adaptado.valor)),
          dados.nivel.inclui[8],
        )}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
