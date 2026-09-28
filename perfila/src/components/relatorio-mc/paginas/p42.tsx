/**
 * Pagina 42 · Impacto Academy. Institucional e fixa; sem moldura no molde, por
 * isso monta a propria section. Os canais sao os do molde ate existir campo
 * de canais no facilitador (C33, `CANAIS_OFICIAIS`).
 */
import type { CSSProperties } from 'react'
import { PAGINA_42 } from '@/data/relatorio-mc/textos-fixos'
import { CANAIS_OFICIAIS } from '@/data/relatorio-mc/variantes/p36-42'
import { idPagina } from '../Pagina'
import type { PropsPagina } from './registro'

const OURO = '#D4AF62'
const TITULO: CSSProperties = { fontFamily: 'CZ', fontWeight: 700, fontSize: '17pt', color: OURO, letterSpacing: '.02em', lineHeight: 1.1 }
const TRACO: CSSProperties = { width: '14mm', height: '.5mm', background: OURO, margin: '2mm 0 3mm' }
const TEXTO: CSSProperties = { fontFamily: 'GA', fontSize: '11.2pt', lineHeight: 1.42, color: '#E9E6DF', marginBottom: '2.4mm' }
const PASSO: CSSProperties = { display: 'flex', gap: '3.4mm', alignItems: 'center', marginBottom: '3mm', fontFamily: 'GA', fontSize: '12pt', color: '#EFEAE0' }
const LINHA_FINA = (extra?: CSSProperties): CSSProperties => ({ flex: 1, height: '.5pt', background: OURO, ...extra })

// "SEU MAPA NAO TERMINA NESTA" / "PAGINA": o molde quebra a ultima palavra em corpo maior.
const tituloContinua = PAGINA_42.tituloContinua.split(' ')
const ultimaPalavra = tituloContinua.pop()

export default function Pagina42(_props: PropsPagina) {
  return (
    <section
      className="page"
      id={idPagina(42)}
      style={{ background: 'radial-gradient(120% 90% at 50% 30%,#152235 0%,#0C1522 70%,#09111C 100%)', padding: '0 14mm', color: '#EFEAE0' }}
    >
      <svg style={{ position: 'absolute', right: 0, top: 0 }} width="45mm" height="40mm" viewBox="0 0 450 400" aria-hidden>
        <path d="M60 0 Q 300 120 450 330" fill="none" stroke={OURO} strokeWidth="2.4" opacity=".7" />
        <path d="M130 0 Q 330 90 450 250" fill="none" stroke={OURO} strokeWidth="1.6" opacity=".45" />
      </svg>
      <svg style={{ position: 'absolute', left: 0, bottom: 0 }} width="45mm" height="45mm" viewBox="0 0 450 450" aria-hidden>
        <path d="M0 120 Q 200 220 330 450" fill="none" stroke={OURO} strokeWidth="2.4" opacity=".7" />
        <path d="M0 200 Q 150 280 240 450" fill="none" stroke={OURO} strokeWidth="1.6" opacity=".45" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5mm', marginTop: '10mm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- pagina impressa em A4: o molde fixa a altura em mm */}
        <img src="/relatorio-mc/imagens/brasao-impacto-academy.png" alt="Brasão da Impacto Academy" style={{ height: '27mm', display: 'block' }} />
        <div>
          <div style={{ fontFamily: 'CZ', fontWeight: 700, fontSize: '21pt', color: OURO, letterSpacing: '.03em', lineHeight: 1 }}>{PAGINA_42.marca}</div>
          <div style={{ fontFamily: 'CZ', fontWeight: 600, fontSize: '10pt', color: OURO, letterSpacing: '.2em', marginTop: '2.4mm' }}>{PAGINA_42.submarca}</div>
        </div>
      </div>
      <div style={{ height: '.5pt', background: OURO, margin: '5mm 8mm 3.4mm' }} />
      <div style={{ textAlign: 'center', fontFamily: 'GA', fontSize: '8pt', letterSpacing: '.42em', color: '#CFC8BA' }}>
        {PAGINA_42.lema.split(' • ').join(' \u00a0•\u00a0 ')}
      </div>
      <div style={{ display: 'flex', gap: 0, marginTop: '8mm' }}>
        <div style={{ flex: 1, paddingRight: '7mm', borderRight: `.5pt solid ${OURO}` }}>
          <div style={TITULO}>{PAGINA_42.tituloQuemSomos}</div>
          <div style={TRACO} />
          {PAGINA_42.quemSomos.map((t) => (
            <p key={t} style={TEXTO}>{t}</p>
          ))}
          <div style={{ height: '3mm' }} />
          <div style={TITULO}>{PAGINA_42.tituloMissao}</div>
          <div style={TRACO} />
          <p style={TEXTO}>{PAGINA_42.missao}</p>
          <div style={{ height: '3mm' }} />
          <div style={TITULO}>{PAGINA_42.tituloVisao}</div>
          <div style={TRACO} />
          <p style={TEXTO}>{PAGINA_42.visao}</p>
        </div>
        <div style={{ flex: 1, paddingLeft: '8mm' }}>
          <div style={{ fontFamily: 'CZ', fontWeight: 700, fontSize: '25pt', lineHeight: 1.08, color: OURO, marginTop: '2mm' }}>{tituloContinua.join(' ')}</div>
          <div style={{ fontFamily: 'CZ', fontWeight: 800, fontSize: '40pt', lineHeight: 1, color: '#F4EFE6' }}>{ultimaPalavra}</div>
          <div style={{ width: '18mm', height: '.6mm', background: OURO, margin: '4mm 0 4mm' }} />
          <p style={{ fontFamily: 'GA', fontSize: '13pt', lineHeight: 1.4, color: '#EFEAE0' }}>{PAGINA_42.continua}</p>
          <div style={{ fontFamily: 'CZ', fontWeight: 700, fontSize: '16pt', color: OURO, margin: '6mm 0 1.6mm' }}>{PAGINA_42.tituloProximoPasso}</div>
          <div style={{ width: '14mm', height: '.5mm', background: OURO, marginBottom: '4mm' }} />
          {PAGINA_42.proximosPassos.map((passo) => (
            <div key={passo} style={PASSO}>
              <span style={{ width: '4.4mm', height: '4.4mm', border: '.9pt solid #EFEAE0', borderRadius: '.6mm', flex: 'none' }} />
              {passo}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '14mm', right: '14mm', bottom: '40mm', background: 'linear-gradient(90deg,#C99B45,#E7C57A 50%,#C99B45)', borderRadius: '1.6mm', padding: '3.6mm', textAlign: 'center', fontFamily: 'CZ', fontWeight: 700, fontSize: '13pt', color: '#171A1F', letterSpacing: '.01em' }}>
        {PAGINA_42.chamada}
      </div>
      <div style={{ position: 'absolute', left: '14mm', right: '14mm', bottom: '30mm', display: 'flex', alignItems: 'center', gap: '4mm' }}>
        <span style={LINHA_FINA()} />
        <span style={{ fontFamily: 'CZ', fontSize: '9.4pt', letterSpacing: '.2em', color: OURO }}>{PAGINA_42.tituloCanais}</span>
        <span style={LINHA_FINA()} />
      </div>
      <div style={{ position: 'absolute', left: '24mm', right: '14mm', bottom: '12mm', display: 'flex', gap: '7mm', fontFamily: 'GA' }}>
        <div style={{ paddingRight: '7mm', borderRight: `.5pt solid ${OURO}` }}>
          <div style={{ color: OURO, fontSize: '11pt' }}>WhatsApp</div>
          <div style={{ fontSize: '15pt', color: '#F4EFE6' }}>{CANAIS_OFICIAIS.whatsapp}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: OURO, fontSize: '11pt' }}>Instagram</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4mm 6mm', fontSize: '11pt', color: '#EFEAE0' }}>
            {CANAIS_OFICIAIS.instagram.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '14mm', right: '14mm', bottom: '5mm', display: 'flex', alignItems: 'center', gap: '4mm' }}>
        <span style={LINHA_FINA({ height: '.4pt', opacity: 0.6 })} />
        <span style={{ fontFamily: 'GA', fontSize: '7.4pt', letterSpacing: '.42em', color: '#CFC8BA' }}>{PAGINA_42.rodape}</span>
        <span style={LINHA_FINA({ height: '.4pt', opacity: 0.6 })} />
        <span style={{ fontFamily: 'GA', fontSize: '10pt', color: '#CFC8BA' }}>42</span>
      </div>
    </section>
  )
}
