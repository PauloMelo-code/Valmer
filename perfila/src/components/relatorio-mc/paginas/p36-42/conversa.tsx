/**
 * Corpo das paginas 36 e 37 ("Comunicar com..."): dois perfis lado a lado e a
 * nota do pe. Os cartoes sao tabela fixa por fator; a nota muda com a ordem
 * natural do avaliado (C31), porque "os dois perfis mais proximos do seu modo
 * natural" so e verdade para quem tem esses dois fatores no topo.
 */
import type { Fator } from '@/data/inventario-mc'
import { COMUNICACAO_POR_PERFIL, ROTULOS_COMUNICACAO_LIDERANCA as R } from '@/data/relatorio-mc/comunicacao-lideranca'
import { notaDaConversa, type PaginaConversa } from '@/data/relatorio-mc/variantes/p36-42'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { DIVISOR_FATOR } from './cores'

type Base = { foco: string; comunicacao: string; decisao: string; perguntaCentral: string }

/**
 * Foco, Comunicacao, Decisao, Pergunta central: a faixa de quatro colunas do
 * topo de cada cartao. Recebe a tabela da pagina porque a "Decisao" de S e C
 * difere entre a 37 ("ponderada") e a 40 ("demorada") no molde (C38).
 */
export function FaixaBase({ fator, base: p, celula }: { fator: Fator; base: Base; celula: string }) {
  const itens = [
    [R.foco, p.foco],
    [R.comunicacao, p.comunicacao],
    [R.decisao, p.decisao],
    [R.perguntaCentral, p.perguntaCentral],
  ] as const
  return itens.map(([rotulo, valor], i) => (
    <div key={rotulo} style={{ padding: celula, borderLeft: i ? `.5pt solid ${DIVISOR_FATOR[fator]}` : undefined }}>
      <div className="lab" style={{ margin: '0 0 .4mm', fontSize: '5.8pt' }}>{rotulo}</div>
      <div className="xs" style={{ fontWeight: 700 }}>{valor}</div>
    </div>
  ))
}

function Linha({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <div style={{ padding: '2mm 0', borderTop: '.5pt solid #E3DDD0' }}>
      <div className="lab" style={{ margin: '0 0 .6mm', color: '#5B6573' }}>{rotulo}</div>
      <div className="sm">{texto}</div>
    </div>
  )
}

function CartaoComunicacao({ fator, dados }: { fator: Fator; dados: DadosRelatorioMC }) {
  const p = COMUNICACAO_POR_PERFIL[fator]
  const { cor, rotulo } = dados.fatores[fator]
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: `1.6mm solid ${cor.principal}`, paddingLeft: '4mm' }}>
      <div style={{ fontFamily: 'AR', fontWeight: 900, fontSize: '19pt', color: cor.principal, lineHeight: 1, textTransform: 'uppercase' }}>{rotulo}</div>
      <div className="sm mut" style={{ margin: '1.4mm 0 2.4mm' }}>{p.preferencia}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: cor.fundoSuave, borderRadius: '1.2mm', marginBottom: '1mm' }}>
        <FaixaBase fator={fator} base={p} celula="1.6mm 2mm" />
      </div>
      <Linha rotulo={R.comoConduzir} texto={p.comoConduzir} />
      <div style={{ background: cor.fundoSuave, borderLeft: `1mm solid ${cor.principal}`, borderRadius: '0 1.2mm 1.2mm 0', padding: '2mm 2.6mm', margin: '2mm 0' }}>
        <div className="lab" style={{ margin: '0 0 .6mm', color: cor.texto }}>{R.abertura}</div>
        <div className="sm"><i>{p.abertura}</i></div>
      </div>
      <Linha rotulo={R.aplicacao} texto={p.aplicacao} />
      <Linha rotulo={R.evite} texto={p.evite} />
      <Linha rotulo={R.feedback} texto={p.feedback} />
      <div className="spacer" />
      <div style={{ background: cor.fundoSuave, borderRadius: '1.2mm', padding: '2.2mm 2.6mm', marginTop: '2mm' }}>
        <div className="lab" style={{ margin: '0 0 1mm', color: cor.texto }}>{R.comoConfirmar}</div>
        <div style={{ display: 'flex', gap: '2mm', color: cor.texto }}>
          <span className="chk" />
          <span className="sm" style={{ color: '#171A1F' }}>{p.comoConfirmar}</span>
        </div>
      </div>
    </div>
  )
}

export function CorpoConversa({ dados, pagina, par }: { dados: DadosRelatorioMC; pagina: PaginaConversa; par: readonly [Fator, Fator] }) {
  const nota = notaDaConversa(pagina, par, dados.ordemNatural, dados.ordemAdaptado)
  return (
    <>
      <div style={{ flex: 1, display: 'flex', gap: '6mm', marginBottom: '3.4mm' }}>
        {par.map((f) => (
          <CartaoComunicacao key={f} fator={f} dados={dados} />
        ))}
      </div>
      <div style={{ background: '#fff', border: '.6pt solid #D8D2C5', borderLeft: '1.6mm solid #1F7A6D', borderRadius: '0 1.6mm 1.6mm 0', padding: '3mm 4mm' }}>
        <div style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '11pt', color: '#17324D', textTransform: 'uppercase', marginBottom: '1.2mm' }}>{nota.titulo}</div>
        <div className="sm">{nota.texto}</div>
      </div>
    </>
  )
}
