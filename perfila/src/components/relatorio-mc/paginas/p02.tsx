/**
 * Pagina 02 · Indice. As etapas e paginas vem de `dados.indice`, ja recortado
 * pelo nivel (D9, C35): o indice so lista o que esta no documento, e etapa
 * sem pagina some. O quadro de identificacao e as tres marcacoes sao do molde.
 */
import { Marcacao } from '../Marcacao'
import { Pagina, idPagina } from '../Pagina'
import { MARCACOES, TITULO_MARCACOES_INDICE, type CodigoMarcacao } from '@/data/relatorio-mc/marcacoes'
import { PAGINA_02 } from '@/data/relatorio-mc/textos-fixos'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import type { PropsPagina } from './registro'

type EtapaIndice = DadosRelatorioMC['indice'][number]

const MARCACOES_INDICE: CodigoMarcacao[] = ['fato-do-modelo', 'derivado-do-escore', 'a-confirmar']

function Etapa({ etapa }: { etapa: EtapaIndice }) {
  // No molde os numeros da etapa 02 saem em preto: o dourado dela e fraco
  // demais para 20 linhas de numero pequeno.
  const corNumero = etapa.numero === '02' ? '#171A1F' : etapa.cor
  return (
    <div style={{ marginBottom: '3.6mm' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4mm', borderBottom: `1.4pt solid ${etapa.cor}`, paddingBottom: '1mm', marginBottom: '.6mm' }}>
        <span className="num" style={{ fontSize: '13pt', color: etapa.cor }}>{etapa.numero}</span>
        <span style={{ fontFamily: 'AR', fontWeight: 800, fontSize: '11pt', color: '#171A1F', textTransform: 'uppercase', letterSpacing: '.03em' }}>{etapa.nome}</span>
        <span className="xs mut">{etapa.descricao}</span>
      </div>
      {etapa.paginas.map((p) => (
        <a key={p.numero} href={`#${idPagina(p.numero)}`} style={{ display: 'flex', gap: '3mm', padding: '.9mm 0', borderBottom: '.5pt solid #E3DDD0', fontSize: '8.2pt' }}>
          <span className="num" style={{ width: '6mm', color: corNumero }}>{String(p.numero).padStart(2, '0')}</span>
          <span>{p.titulo}</span>
        </a>
      ))}
    </div>
  )
}

export default function Pagina02({ dados }: PropsPagina) {
  const { identificacao: id, nivel } = dados
  const rotulos = PAGINA_02.identificacao
  // Mesma divisao do molde: Compreender e Interpretar a esquerda, o resto a direita.
  const esquerda = dados.indice.filter((e) => e.numero === '01' || e.numero === '02')
  const direita = dados.indice.filter((e) => e.numero !== '01' && e.numero !== '02')
  return (
    <Pagina dados={dados} numero={2} kicker={PAGINA_02.sobretitulo} titulo={PAGINA_02.titulo} subtitulo={PAGINA_02.subtitulo}>
      <div className="row" style={{ gap: '8mm' }}>
        <div className="col">
          {esquerda.map((e) => <Etapa key={e.numero} etapa={e} />)}
        </div>
        <div className="col">
          {direita.map((e) => <Etapa key={e.numero} etapa={e} />)}
          <div className="card xs" style={{ marginTop: '3mm' }}>
            <span className="lab">{rotulos.titulo}</span>
            <div className="kv"><span>{rotulos.avaliado}</span><span>{id.nome}</span></div>
            <div className="kv"><span>{rotulos.instrumento}</span><span>{id.instrumento}</span></div>
            <div className="kv"><span>{rotulos.emissao}</span><span>{id.emissao}</span></div>
            <div className="kv"><span>{rotulos.relatorio}</span><span>{id.relatorio}</span></div>
            {/* Fora do S4 faltam etapas no indice; o nivel diz ao leitor por que. */}
            {nivel.codigo !== 'S4' ? (
              <div className="kv"><span>Nível</span><span>{`${nivel.codigo} · ${nivel.nome}`}</span></div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="spacer" />
      <div className="card" style={{ padding: '2.6mm 3.4mm', marginTop: '1mm' }}>
        <span className="lab">{TITULO_MARCACOES_INDICE}</span>
        <div className="g3" style={{ gap: '3mm' }}>
          {MARCACOES_INDICE.map((m) => (
            <div key={m}>
              <Marcacao tipo={m} />
              <div className="xs" style={{ marginTop: '1.2mm' }}>{MARCACOES[m].textoIndice}</div>
            </div>
          ))}
        </div>
      </div>
    </Pagina>
  )
}
