/**
 * Corpo das paginas 39 e 40 ("Liderando..."): um cartao por fator liderado e o
 * painel "O atrito previsivel". Os cartoes sao tabela fixa por fator; o atrito
 * depende de quem lidera, isto e, do fator mais alto do avaliado (C31): o
 * molde so tem o texto de um lider D.
 */
import type { CSSProperties } from 'react'
import type { Fator } from '@/data/inventario-mc'
import { LIDERANCA_POR_PERFIL, ROTULOS_COMUNICACAO_LIDERANCA as R } from '@/data/relatorio-mc/comunicacao-lideranca'
import { ATRITO_PREVISIVEL } from '@/data/relatorio-mc/variantes/p36-42'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { FaixaBase } from './conversa'

const CABECA = { borderRadius: '1.2mm', padding: '1.6mm 2.6mm', fontFamily: 'AR', fontWeight: 800, fontSize: '8.6pt', textTransform: 'uppercase', letterSpacing: '.04em' } as const
const CORPO = { flex: 1, borderRadius: '1.2mm', marginTop: '1.6mm', padding: '2.4mm 2.8mm' } as const

function Coluna({ titulo, cabeca, fundo, texto }: { titulo: string; cabeca: CSSProperties; fundo: string; texto: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...CABECA, ...cabeca }}>{titulo}</div>
      <div className="sm" style={{ ...CORPO, background: fundo }}>{texto}</div>
    </div>
  )
}

function CartaoLideranca({ fator, dados }: { fator: Fator; dados: DadosRelatorioMC }) {
  const p = LIDERANCA_POR_PERFIL[fator]
  const { cor, rotulo } = dados.fatores[fator]
  // Nunca texto branco sobre o ambar do I (regra da paleta, cores.ts).
  const sobrePrincipal = fator === 'I' ? '#171A1F' : '#FFFFFF'
  const secundaria = { background: '#fff', color: cor.texto, borderLeft: `1.2mm solid ${cor.principal}` }
  return (
    <div style={{ position: 'relative', background: '#fff', border: '.6pt solid #D8D2C5', borderTop: `1.6mm solid ${cor.principal}`, borderRadius: '1.6mm', padding: '3mm 3.6mm', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', right: '5mm', top: '50%', transform: 'translateY(-50%)', fontFamily: 'AR', fontWeight: 900, fontSize: '80pt', color: cor.fundoSuave, lineHeight: 0.8, zIndex: 0 }}>{fator}</div>
      <div style={{ display: 'flex', gap: '5mm', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ flex: 1.05 }}>
          <div style={{ fontFamily: 'AR', fontWeight: 900, fontSize: '19pt', color: cor.principal, lineHeight: 1, textTransform: 'uppercase' }}>{rotulo}</div>
          <div className="sm mut" style={{ marginTop: '1.2mm' }}>{p.descricao}</div>
        </div>
        <div style={{ flex: 1.25, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: cor.fundoSuave, borderRadius: '1.2mm', padding: '1.6mm 0' }}>
          <FaixaBase fator={fator} base={p} celula="0 3mm" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4mm', marginTop: '2.6mm', flex: 1, position: 'relative', zIndex: 1 }}>
        <Coluna titulo={R.comoLiderar} cabeca={{ background: cor.principal, color: sobrePrincipal }} fundo="#FBFAF7" texto={p.comoLiderar} />
        <Coluna titulo={R.aplicacao} cabeca={secundaria} fundo={cor.fundoSuave} texto={p.aplicacao} />
        <Coluna titulo={R.eviteEDesenvolva} cabeca={secundaria} fundo={cor.fundoSuave} texto={p.eviteEDesenvolva} />
      </div>
    </div>
  )
}

export function CorpoLideranca({ dados, par }: { dados: DadosRelatorioMC; par: readonly [Fator, Fator] }) {
  const lider = dados.ordemNatural[0]
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4mm' }}>
        {par.map((f) => (
          <CartaoLideranca key={f} fator={f} dados={dados} />
        ))}
      </div>
      <div style={{ background: '#17324D', borderRadius: '1.8mm', padding: '2.6mm 4mm 3.4mm', marginTop: '3.4mm' }}>
        <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '11.5pt', color: '#fff', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '2.4mm' }}>{R.atritoPrevisivel}</div>
        <div style={{ background: '#fff', borderRadius: '1.4mm', padding: '3mm 3.4mm', display: 'flex', gap: '5mm' }}>
          {par.map((f, i) => {
            const { cor, rotulo } = dados.fatores[f]
            return [
              i ? <div key={`fio-${f}`} style={{ width: '.5pt', background: '#D8D2C5' }} /> : null,
              <div key={f} style={{ flex: 1, display: 'flex', gap: '3mm', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'AR', fontWeight: 900, fontSize: '24pt', color: cor.principal, lineHeight: 0.9 }}>{f}</span>
                <div>
                  <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '9.4pt', color: cor.principal, textTransform: 'uppercase' }}>{rotulo}</div>
                  <div className="xs">{ATRITO_PREVISIVEL[lider][f].texto}</div>
                </div>
              </div>,
            ]
          })}
        </div>
      </div>
    </>
  )
}
