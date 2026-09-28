/**
 * Paginas 09 a 12 do molde: um fator por pagina, mesma estrutura. As quatro
 * sao arquivos finos que so dizem o fator e o numero; tudo o que muda de uma
 * para a outra (cor, nome, subtitulo, linhas do cartao) vem da ficha do fator.
 *
 * O que o molde tinha e a v2.2 trocou:
 * - legenda da escala com as 6 zonas (D4), largura proporcional a faixa, e
 *   EA/EB com borda pontilhada: sao excesso, nao conquista (bp§09, C12);
 * - "No natural"/"No adaptado" com os 4 descritores da zona (bp§09), e nao a
 *   lista livre do molde; zona de atencao sai marcada;
 * - os dois paragrafos e a "Aplicacao no trabalho" sao os 3 blocos de
 *   `fator_X_narrativa` (R1, C13).
 */
import type { Fator } from '@/data/inventario-mc'
import { CODIGOS_ZONA, ZONAS } from '@/data/relatorio-mc/zonas'
import { NOTA_EMOCAO_ASSOCIADA, ROTULOS_PAGINA_FATOR } from '@/data/relatorio-mc/fatores'
import type { CondicaoDados, DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { Pagina } from '../../Pagina'
import { Marcacao } from '../../Marcacao'
import { TextoIA } from '../../TextoIA'
import { DefsTexturas, useTexturas } from '../../Textura'

/** Borda clara do fator (cartao adaptado, pilula), copiada do molde; a paleta oficial nao a nomeia. */
export const BORDA_FATOR: Record<Fator, string> = { D: '#E4A3A3', I: '#E8C173', S: '#8DBEAA', C: '#93ABC3' }

// Geometria do SVG do molde (viewBox 1720 x 330): trilho em x=250, 1360 de largura.
const X0 = 250
const LARGURA = 1360
const escalaX = (v: number) => (LARGURA * v) / 100

/** Mistura a cor com branco: `t` = 0 branco, 1 a cor. Gera os 6 tons da legenda a partir da cor do fator. */
function tom(hex: string, t: number): string {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)
    return Math.round(255 + (c - 255) * t).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(1)}${canal(2)}`
}
// Do EB ao EA, como os 5 tons do molde (claro -> cor de texto do fator).
const TONS = [0.1, 0.22, 0.4, 0.62, 0.85]

function Adjetivos({ c, rotulo, cor, fundo, adaptado, texto, borda }: { c: CondicaoDados; rotulo: string; cor: string; fundo: string; adaptado: boolean; texto: string; borda: string }) {
  const frase = c.descritores.map((a, i) => (i === 0 ? a : a.toLocaleLowerCase('pt-BR'))).join(', ') + '.'
  return (
    <div
      className="soft"
      style={{
        background: adaptado ? fundo : '#fff',
        borderColor: c.zona.atencao ? '#8A8272' : borda,
        borderStyle: c.zona.atencao ? 'dotted' : undefined,
        borderLeft: `1.4mm ${adaptado ? 'dashed' : 'solid'} ${cor}`,
      }}
    >
      <span className="lab" style={{ color: texto }}>
        {rotulo} · {c.zona.nome}
      </span>
      <div className="xs">{frase}</div>
      {c.zona.atencao ? <div className="xs mut" style={{ marginTop: '.8mm', fontStyle: 'italic' }}>{ZONAS[c.zona.codigo].comoAparece}</div> : null}
    </div>
  )
}

export function PaginaFator({ dados, fator, numero }: { dados: DadosRelatorioMC; fator: Fator; numero: 9 | 10 | 11 | 12 }) {
  const tx = useTexturas()
  const f = dados.fatores[fator]
  const { principal, fundoSuave, texto } = f.cor
  const borda = BORDA_FATOR[fator]
  const ia = dados.ia.fatores[fator]
  const R = ROTULOS_PAGINA_FATOR
  // Nunca texto branco sobre o ambar (bp§02).
  const corSobrePrincipal = fator === 'I' ? '#171A1F' : '#FFFFFF'
  const wNat = escalaX(f.natural.escore.valor)
  const wAda = escalaX(f.adaptado.escore.valor)
  const zonas = [...CODIGOS_ZONA].reverse().map((z) => ZONAS[z]) // EB -> EA

  return (
    <Pagina
      dados={dados}
      numero={numero}
      kicker={f.ficha.pagina.ordem}
      titulo={<span style={{ color: texto }}>{f.rotulo}</span>}
      subtitulo={f.ficha.pagina.comoLida}
    >
      <div className="card" style={{ padding: '2.6mm 3.6mm', marginBottom: '3mm', borderTop: `1.2mm solid ${principal}` }}>
        <span className="lab">{R.escala}</span>
        <svg width="172mm" height="33.0mm" viewBox="0 0 1720 330" style={{ display: 'block' }}>
          <DefsTexturas ids={tx} fundo="suave" />
          <text x="0" y="44" fontSize="24" fontWeight="800" fill="#171A1F" fontFamily="OS" letterSpacing="2">{R.natural}</text>
          <text x="0" y="74" fontSize="22" fill="#5B6573" fontFamily="OS">barra sólida</text>
          <rect x={X0} y="14" width={LARGURA} height="66" rx="6" fill="#fff" stroke="#D8D2C5" strokeWidth="2" />
          <rect x={X0} y="14" width={wNat} height="66" rx="6" fill={principal} />
          <text x={X0 + wNat + 16} y="62" fontSize="44" fontWeight="800" fill={texto} fontFamily="AR">{f.natural.escore.texto}</text>
          <text x="0" y="134" fontSize="24" fontWeight="800" fill="#171A1F" fontFamily="OS" letterSpacing="2">{R.adaptado}</text>
          <text x="0" y="164" fontSize="22" fill="#5B6573" fontFamily="OS">barra hachurada</text>
          <rect x={X0} y="104" width={LARGURA} height="66" rx="6" fill="#fff" stroke="#D8D2C5" strokeWidth="2" />
          <rect x={X0} y="104" width={wAda} height="66" rx="6" fill={`url(#${tx[fator]})`} stroke={principal} strokeWidth="4" strokeDasharray="14 7" />
          <text x={X0 + wAda + 16} y="152" fontSize="44" fontWeight="800" fill={texto} fontFamily="AR">{f.adaptado.escore.texto}</text>
          {zonas.map((z, i) => {
            // Faixa ate o inicio da proxima zona (EB 0-16 ... EA 88-100), 2 de folga de cada lado como no molde.
            const fim = i < zonas.length - 1 ? zonas[i + 1].minimo : 100
            const x = X0 + escalaX(z.minimo) + 2
            const w = escalaX(fim - z.minimo) - 4
            const cor = i === zonas.length - 1 ? texto : tom(principal, TONS[i])
            return (
              <g key={z.codigo}>
                <rect
                  x={x} y="214" width={w} height="22" fill={cor}
                  stroke={z.atencao ? '#5B6573' : undefined} strokeWidth={z.atencao ? 2.5 : undefined} strokeDasharray={z.atencao ? '4 4' : undefined}
                />
                <text x={x + w / 2} y="272" textAnchor="middle" fontSize="20" fontWeight="700" fill="#171A1F" fontFamily="OS">{z.nome}</text>
                <text x={x + w / 2} y="304" textAnchor="middle" fontSize="20" fill="#5B6573" fontFamily="OS">{z.faixa}</text>
              </g>
            )
          })}
          <text x="0" y="234" fontSize="20" fontWeight="700" fill="#5B6573" fontFamily="OS" letterSpacing="1.5">INTENSIDADE</text>
        </svg>
      </div>

      <div className="g3" style={{ marginBottom: '3mm' }}>
        <div className="soft" style={{ background: principal, borderColor: principal, color: corSobrePrincipal, padding: '3mm 4mm' }}>
          <div className="xs" style={{ fontWeight: 700, letterSpacing: '.14em' }}>{R.natural}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4mm' }}>
            <span className="num" style={{ fontSize: '28pt', lineHeight: 1.05 }}>{f.natural.escore.texto}</span>
            <span style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10pt' }}>{f.natural.zona.nome}</span>
          </div>
        </div>
        <div className="soft" style={{ background: fundoSuave, borderColor: borda, borderStyle: 'dashed', padding: '3mm 4mm' }}>
          <div className="xs" style={{ fontWeight: 700, letterSpacing: '.14em' }}>{R.adaptado}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4mm' }}>
            <span className="num" style={{ fontSize: '28pt', lineHeight: 1.05, color: texto }}>{f.adaptado.escore.texto}</span>
            <span style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10pt' }}>{f.adaptado.zona.nome}</span>
          </div>
        </div>
        <div className="card" style={{ padding: '3mm 4mm' }}>
          <div className="xs" style={{ fontWeight: 700, letterSpacing: '.14em' }}>{R.variacao}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4mm' }}>
            <span className="num" style={{ fontSize: '28pt', lineHeight: 1.05, color: '#171A1F' }}>{f.variacao.texto}</span>
            <span style={{ fontFamily: 'AR', fontWeight: 700, fontSize: '10pt' }}>{f.textoDirecao}</span>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: '5mm' }}>
        <div className="col" style={{ flex: 1.55 }}>
          <TextoIA texto={ia[0]} className="sm" />
          <TextoIA texto={ia[1]} className="sm" rotulo={f.polarizado ? R.polarizado : undefined} />
          <div className="g2" style={{ gap: '3mm', marginTop: '2mm' }}>
            <Adjetivos c={f.natural} rotulo={R.noNatural} cor={principal} fundo={fundoSuave} texto={texto} borda={borda} adaptado={false} />
            <Adjetivos c={f.adaptado} rotulo={R.noAdaptado} cor={principal} fundo={fundoSuave} texto={texto} borda={borda} adaptado />
          </div>
        </div>
        <div className="col">
          <div className="card" style={{ padding: '2.6mm 3.4mm', marginBottom: '3mm' }}>
            <div className="kv"><span>{R.palavraChave}</span><span>{f.ficha.pagina.palavraChave}</span></div>
            <div className="kv"><span>{R.emocao}</span><span>{f.ficha.emocaoMarston}</span></div>
            <div className="kv"><span>{R.motivador}</span><span>{f.ficha.motivador}</span></div>
            <div className="kv"><span>{R.comunicacao}</span><span>{f.ficha.pagina.comunicacao}</span></div>
            <div className="kv"><span>{R.decisao}</span><span>{f.ficha.pagina.decisao}</span></div>
            <div className="kv"><span>{R.contribuicao}</span><span>{f.ficha.pagina.contribuicao}</span></div>
          </div>
          {ia[2] === '' ? null : (
            <div className="soft" style={{ background: '#fff', borderColor: '#8DBEAA', borderTop: '1.2mm solid #1F7A6D' }}>
              <div className="bt" style={{ color: '#1F7A6D' }}>
                <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#1F7A6D" strokeWidth="2.2" />
                  <path d="m7.5 12.2 3 3 6-6.2" fill="none" stroke="#1F7A6D" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span style={{ color: '#171A1F' }}>{R.aplicacao}</span>
              </div>
              <TextoIA texto={ia[2]} como="div" className="xs" />
            </div>
          )}
          <div style={{ marginTop: '3mm' }}>
            <Marcacao tipo="derivado-do-escore" />
          </div>
        </div>
      </div>
      {numero === 9 ? (
        <div className="note xs" style={{ borderLeftColor: '#17324D', marginTop: '3mm' }}>
          <b>{NOTA_EMOCAO_ASSOCIADA.titulo}</b> {NOTA_EMOCAO_ASSOCIADA.texto}
        </div>
      ) : null}
    </Pagina>
  )
}
