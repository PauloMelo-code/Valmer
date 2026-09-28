/**
 * Paginas 18, 19 e 20: um eixo de Jung por pagina, mesma estrutura.
 *
 * A barra mantem o polo A (E, N, T) sempre a esquerda, como no molde; o que
 * troca e qual lado e cheio. Os cartoes seguem outra regra: o predominante vem
 * primeiro, porque e dele que a pagina fala. Os tons claros do complementar
 * saem de `clarear` com as proporcoes medidas no molde.
 *
 * Os dois textos de baixo sao os dois paragrafos de `jung_*_narrativa` (IA):
 * "Como aparece em voce" e "Aplicacao no trabalho" (C18 resolvido pela IA, sem
 * tabela por polo). Bloco que a narrativa nao trouxe some com o cartao.
 */
import type { CSSProperties } from 'react'
import type { EixoJung } from '@/data/inventario-mc'
import { ROTULOS_PAGINA_EIXO } from '@/data/relatorio-mc/jung'
import type { DadosRelatorioMC, PoloDados } from '@/lib/relatorio-mc/dados'
import { maiusculas } from '@/lib/relatorio-mc/formato'
import { Pagina } from '../../Pagina'
import { Marcacoes } from '../../Marcacao'
import { TextoIA } from '../../TextoIA'
import { COR_POLO, TOM, clarear } from './cores'

const NUMERO_PAGINA: Record<EixoJung, number> = { EI: 18, NS: 19, TF: 20 }
/** SVG do molde: 1720 unidades = 100 pontos. */
const ESCALA = 17.2
const ESCURO = '#171A1F'

export function PaginaEixo({ dados, eixo }: { dados: DadosRelatorioMC; eixo: EixoJung }) {
  const e = dados.jung.eixos.find((x) => x.eixo === eixo)!
  const [comoAparece, aplicacao] = dados.ia.jung[eixo]
  const aPredomina = e.predominante.polo === e.poloA.polo
  const larguraA = ESCALA * e.poloA.percentual.valor
  const corA = aPredomina ? COR_POLO[e.poloA.polo] : clarear(COR_POLO[e.poloA.polo], TOM.barra)
  const corB = aPredomina ? clarear(COR_POLO[e.poloB.polo], TOM.barra) : COR_POLO[e.poloB.polo]
  // O rotulo do complementar pode passar do proprio trecho quando o polo e
  // pequeno (abaixo de ~30): o contorno no tom claro mantem o texto legivel
  // sobre a cor cheia sem mudar nada quando ele cabe.
  const contorno = { stroke: aPredomina ? corB : corA, strokeWidth: 10, strokeLinejoin: 'round', paintOrder: 'stroke' } as const
  const papel = (predomina: boolean) => (predomina ? ROTULOS_PAGINA_EIXO.poloPredominante : ROTULOS_PAGINA_EIXO.poloComplementar)

  return (
    <Pagina dados={dados} numero={NUMERO_PAGINA[eixo]} kicker={e.ficha.sobretitulo} titulo={e.ficha.titulo} subtitulo={e.ficha.subtitulo}>
      <div className="card" style={{ padding: '3.4mm 3.8mm', marginBottom: '4mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6.6pt', fontWeight: 700, letterSpacing: '.14em', marginBottom: '1.4mm' }}>
          <span className={aPredomina ? undefined : 'mut'}>{papel(aPredomina)} · {maiusculas(e.poloA.nome)}</span>
          <span className={aPredomina ? 'mut' : undefined}>{papel(!aPredomina)} · {maiusculas(e.poloB.nome)}</span>
        </div>
        <svg width="172mm" height="12mm" viewBox="0 0 1720 120" style={{ display: 'block' }} role="img" aria-label={`${e.poloA.nome} ${e.poloA.percentual.texto}, ${e.poloB.nome} ${e.poloB.percentual.texto}`}>
          <rect x="0" y="10" width={larguraA} height="100" rx="8" fill={corA} />
          <rect x={larguraA} y="10" width={1720 - larguraA} height="100" fill={corB} />
          <line x1="860" x2="860" y1="0" y2="120" stroke={ESCURO} strokeWidth="3" strokeDasharray="8 6" />
          <text x="28" y="76" fontSize="44" fontWeight="800" fill={aPredomina ? '#fff' : ESCURO} fontFamily="AR" {...(aPredomina ? {} : contorno)}>
            {maiusculas(e.poloA.nome)} {e.poloA.percentual.texto}
          </text>
          <text x="1692" y="76" textAnchor="end" fontSize="44" fontWeight="800" fill={aPredomina ? ESCURO : '#fff'} fontFamily="AR" {...(aPredomina ? contorno : {})}>
            {e.poloB.percentual.texto} {maiusculas(e.poloB.nome)}
          </text>
        </svg>
      </div>
      <div className="g2" style={{ marginBottom: '4mm' }}>
        <CartaoPolo polo={e.predominante} predominante />
        <CartaoPolo polo={e.complementar} predominante={false} />
      </div>
      <div className="g2">
        {comoAparece === '' ? null : (
          <div className="card">
            <h3>{ROTULOS_PAGINA_EIXO.comoAparece}</h3>
            <TextoIA como="div" className="sm" texto={comoAparece} />
          </div>
        )}
        {aplicacao === '' ? null : (
          <div className="soft" style={{ background: '#fff', borderColor: '#8DBEAA', borderTop: '1.2mm solid #1F7A6D' }}>
            <div className="bt" style={{ color: '#1F7A6D' }}>
              <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="#1F7A6D" strokeWidth="2.2" />
                <path d="m7.5 12.2 3 3 6-6.2" fill="none" stroke="#1F7A6D" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span style={{ color: ESCURO }}>{ROTULOS_PAGINA_EIXO.aplicacao}</span>
            </div>
            <TextoIA como="div" className="sm" texto={aplicacao} />
          </div>
        )}
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}

function CartaoPolo({ polo, predominante }: { polo: PoloDados; predominante: boolean }) {
  const cor = COR_POLO[polo.polo]
  const borda = predominante ? cor : clarear(cor, TOM.borda)
  return (
    <div className="soft" style={{ background: predominante ? clarear(cor, TOM.fundo) : '#fff', borderColor: borda, borderTop: `1.2mm solid ${borda}` }}>
      <span className="lab" style={predominante ? { color: ESCURO } : undefined}>
        {predominante ? ROTULOS_PAGINA_EIXO.seuPoloPredominante : ROTULOS_PAGINA_EIXO.poloComplementarCartao} · {polo.percentual.texto}
      </span>
      <h2 style={{ color: cor }}>{polo.nome}</h2>
      <p className="sm">{polo.ficha.definicao}</p>
      <ul className="l sm" style={{ '--bc': predominante ? cor : clarear(cor, TOM.marcador) } as CSSProperties}>
        {polo.ficha.caracteristicas.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  )
}
