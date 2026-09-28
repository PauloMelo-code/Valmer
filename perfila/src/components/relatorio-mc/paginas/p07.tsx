/**
 * Pagina 07 · A sua combinacao natural, com o arquetipo (D5, C06).
 *
 * - Subtitulo por tipo de perfil (C08): duplo, puro ou equilibrado.
 * - Titulo da coluna = nome do arquetipo; os quatro paragrafos sao de
 *   `sintese_combinacao_natural` (R1), com os rotulos do molde.
 * - Cartao da direita: os fatores predominantes (no equilibrado, os dois mais
 *   altos) e o arquetipo, abaixo das barras.
 * - Quatro cruzamentos por POSICAO na ordem natural (C07): o texto vem de
 *   `ia.cruzamentos[chave]`.
 */
import { Marcacao } from '../Marcacao'
import { Pagina } from '../Pagina'
import { TextoIA } from '../TextoIA'
import type { Fator } from '@/data/inventario-mc'
import { ROTULO_PONTO_DE_ATENCAO } from '@/data/relatorio-mc/arquetipos'
import { ROTULO_ARQUETIPO, SUBTITULO_07, TITULO_CARTAO_07, TITULO_CRUZAMENTOS_07 } from '@/data/relatorio-mc/variantes/p01-07'
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import type { PropsPagina } from './registro'

const ROTULOS_SINTESE = ['O que significa.', 'Como aparece no cotidiano.', 'Impacto que produz.', 'Como aplicar no trabalho.']

// Borda da pilula do fator baixo. S e C sao do molde; D e I seguem a mesma
// proporcao entre o fundo suave e a cor principal.
const BORDA_PILULA: Record<Fator, string> = { D: '#E3A1A1', I: '#EBC766', S: '#8DBEAA', C: '#93ABC3' }

/** "DOMINANTE muito alto": a zona real do fator, e nao "alto"/"baixo" pela posicao no par. */
const pilula = (d: DadosRelatorioMC, f: Fator) => `${d.fatores[f].rotulo} ${d.fatores[f].natural.zona.nome.toLocaleLowerCase('pt-BR')}`

/** Zonas A, MA e EA: escore a partir de 51. */
const predominante = (d: DadosRelatorioMC, f: Fator) => ['A', 'MA', 'EA'].includes(d.fatores[f].natural.zona.codigo)

function subtitulo(d: DadosRelatorioMC): string {
  const { perfis, ordemNatural, fatores } = d
  const [a, b] = ordemNatural.map((f) => ({ rotulo: fatores[f].rotulo, escore: fatores[f].natural.escore.texto }))
  if (perfis.natural.tipo === 'equilibrado') return SUBTITULO_07.equilibrado(a.rotulo, a.escore)
  if (perfis.natural.tipo === 'puro') return SUBTITULO_07.puro(a.rotulo, a.escore)
  const variante = ordemNatural.filter((f) => predominante(d, f)).length > 2 ? SUBTITULO_07.duploDeTres : SUBTITULO_07.duplo
  return variante(a.rotulo, a.escore, b.rotulo, b.escore)
}

function Barra({ d, f }: { d: DadosRelatorioMC; f: Fator }) {
  const fator = d.fatores[f]
  const escore = fator.natural.escore
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', marginBottom: '2mm' }}>
      {/* 17mm cabem dois digitos a 26pt; "87,5" pede fonte menor (C03). */}
      <span className="num" style={{ fontSize: escore.texto.length > 2 ? '19pt' : '26pt', color: fator.cor.texto, lineHeight: 1, width: '17mm' }}>{escore.texto}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '8pt', letterSpacing: '.1em' }}>{fator.rotulo}</div>
        <div style={{ height: '2.6mm', background: '#EDE7DB', borderRadius: '1mm', marginTop: '1mm' }}>
          <div style={{ width: `${escore.valor}%`, height: '100%', background: fator.cor.principal, borderRadius: '1mm' }} />
        </div>
      </div>
    </div>
  )
}

export default function Pagina07({ dados }: PropsPagina) {
  const { perfis, ordemNatural, arquetipo, fatores, ia } = dados
  const tipo = perfis.natural.tipo
  const noCartao = tipo === 'equilibrado' ? ordemNatural.slice(0, 2) : perfis.natural.fatores
  return (
    <Pagina dados={dados} numero={7} kicker="Quem você é quando ninguém pede nada" titulo="A sua combinação natural" subtitulo={subtitulo(dados)}>
      <div className="row" style={{ gap: '6mm', marginBottom: '4mm' }}>
        <div className="col" style={{ flex: 1.6 }}>
          <h2>{arquetipo.nome}</h2>
          {ROTULOS_SINTESE.map((rotulo, i) => (
            <TextoIA key={rotulo} className="sm" rotulo={rotulo} texto={ia.sinteseCombinacaoNatural[i]} />
          ))}
        </div>
        <div className="col">
          <div className="card">
            <span className="lab">{TITULO_CARTAO_07[tipo]}</span>
            {noCartao.map((f) => <Barra key={f} d={dados} f={f} />)}
            <div style={{ marginTop: '2.6mm', paddingTop: '2.4mm', borderTop: '.6pt solid #E3DDD0' }}>
              {/* O nome do arquetipo ja e o titulo da coluna ao lado. */}
              <span className="lab">{ROTULO_ARQUETIPO}</span>
              <p className="xs" style={{ marginBottom: '1.4mm' }}>{arquetipo.descricao}</p>
              <p className="xs"><b>{ROTULO_PONTO_DE_ATENCAO}</b> {arquetipo.pontoDeAtencao}</p>
            </div>
            <div style={{ marginTop: '2mm' }}>
              <Marcacao tipo="derivado-do-escore" />
            </div>
          </div>
        </div>
      </div>
      <span className="lab">
        {tipo === 'equilibrado' ? TITULO_CRUZAMENTOS_07.equilibrado(fatores[ordemNatural[0]].natural.escore.texto) : TITULO_CRUZAMENTOS_07.comPredominante}
      </span>
      <div className="g2" style={{ gap: '3mm' }}>
        {dados.cruzamentos.map(({ chave, alto, baixo }) => {
          const fa = fatores[alto]
          const fb = fatores[baixo]
          return (
            <div key={chave} className="card" style={{ padding: '3mm 3.4mm' }}>
              <div style={{ display: 'flex', gap: '1.4mm', marginBottom: '1.4mm' }}>
                {/* Nunca texto branco sobre o ambar (paleta, secao 02). */}
                <span className="pill" style={{ background: fa.cor.principal, color: alto === 'I' ? '#171A1F' : '#fff' }}>{pilula(dados, alto)}</span>
                <span className="pill" style={{ background: fb.cor.fundoSuave, color: fb.cor.texto, border: `.5pt solid ${BORDA_PILULA[baixo]}` }}>{pilula(dados, baixo)}</span>
              </div>
              <TextoIA como="div" className="xs" texto={ia.cruzamentos[chave]} />
            </div>
          )
        })}
      </div>
    </Pagina>
  )
}
