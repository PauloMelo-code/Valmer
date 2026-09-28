/**
 * Pagina 26 · Leitura integrada das tres camadas.
 *
 * Tabela: pilulas e frase curta de cada camada, do escore e de tabela.
 * Sintese e os tres quadros sao os 4 paragrafos de `leitura_integrada` (R1,
 * C24). "Contexto de melhor funcionamento" reusa
 * `resumo_perfil_8_blocos.ambiente_melhor_performance`, como propoe o mapa de
 * dados: nao ha chave propria para ele.
 */
import type { ReactNode } from 'react'
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import { FRASE_CURTA_POLO, FRASE_CURTA_VALOR } from '@/data/relatorio-mc/variantes/p22-28'
import { juntar, maiusculas } from '@/lib/relatorio-mc/formato'
import { COR_POLO, COR_VALOR } from './p22-28/cores'
import type { PropsPagina } from './registro'

const frase = (partes: string[]) => {
  const t = juntar(partes)
  return `${t.charAt(0).toLocaleUpperCase('pt-BR')}${t.slice(1)}.`
}

function Pilula({ fundo, texto, children }: { fundo: string; texto: string; children: ReactNode }) {
  return (
    <span className="pill" style={{ background: fundo, color: texto, margin: '0 1mm .8mm 0' }}>
      {children}
    </span>
  )
}

function Linha({ camada, pergunta, children }: { camada: string; pergunta: string; children: ReactNode }) {
  return (
    <tr>
      <td style={{ width: '30mm' }}><b style={{ fontFamily: 'AR' }}>{camada}</b></td>
      <td>{children}</td>
      <td style={{ width: '34mm' }} className="xs mut">{pergunta}</td>
    </tr>
  )
}

const QUADROS = [
  {
    titulo: 'Onde as camadas se confirmam', cor: '#267057', fundo: '#E4F3EC',
    icone: (c: string) => (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2.2" />
        <path d="m7.5 12.2 3 3 6-6.2" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    titulo: 'Onde se complementam', cor: '#315F8A', fundo: '#E7EEF7',
    icone: (c: string) => (
      <path d="M9 15 15 9M10 6.5l1.5-1.5a4 4 0 0 1 5.7 5.7L15.7 12M14 17.5l-1.5 1.5a4 4 0 0 1-5.7-5.7L8.3 12" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    ),
  },
  {
    titulo: 'Onde geram tensão', cor: '#9F3345', fundo: '#F5E7EA',
    icone: (c: string) => (
      <>
        <path d="M12 3 22 20H2z" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12 9.5v5M12 17.2v.3" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
]

export default function Pagina26({ dados }: PropsPagina) {
  const perfil = dados.perfis.natural
  // Equilibrado nao tem fator predominante: mostra os quatro, na ordem natural.
  const fatores = perfil.fatores.length ? perfil.fatores : dados.ordemNatural
  const polos = dados.jung.eixos.map((e) => e.predominante)
  const valores = dados.valores.predominantes
  const [sintese, ...quadros] = dados.ia.leituraIntegrada

  return (
    <Pagina
      dados={dados}
      numero={26}
      kicker="Integrar · nova leitura"
      titulo="Leitura integrada das três camadas"
      subtitulo="Comportamento, processamento e valores lidos em conjunto: onde as três camadas se confirmam, onde se complementam e onde geram tensão."
    >
      <table className="t" style={{ marginBottom: '4mm' }}>
        <tbody>
          <tr><th>Camada</th><th>Resultado predominante</th><th>Pergunta que responde</th></tr>
          <Linha camada="Comportamento" pergunta="Como esta pessoa age">
            {fatores.map((f) => {
              const d = dados.fatores[f]
              // Nunca texto branco sobre o ambar (cores.ts).
              return <Pilula key={f} fundo={d.cor.principal} texto={f === 'I' ? '#171A1F' : '#FFFFFF'}>{d.rotulo} {d.natural.escore.texto}</Pilula>
            })}
            <div className="xs" style={{ marginTop: '.6mm' }}>Perfil natural {perfil.tipo}. {dados.arquetipo.descricao}</div>
          </Linha>
          <Linha camada="Processamento" pergunta="Como percebe e decide">
            {polos.map((p) => (
              <Pilula key={p.polo} fundo={COR_POLO[p.polo].principal} texto="#fff">{maiusculas(p.nome)} {p.percentual.texto}</Pilula>
            ))}
            <div className="xs" style={{ marginTop: '.6mm' }}>{frase(polos.map((p) => FRASE_CURTA_POLO[p.polo].texto))}</div>
          </Linha>
          <Linha camada="Valores" pergunta="Por que se mobiliza">
            {valores.map((v) => (
              <Pilula key={v.valor} fundo={COR_VALOR[v.valor].cheio} texto="#fff">{v.nomeMaiusculo} {v.escore.texto}</Pilula>
            ))}
            <div className="xs" style={{ marginTop: '.6mm' }}>{frase(valores.map((v) => FRASE_CURTA_VALOR[v.valor].texto))}</div>
          </Linha>
        </tbody>
      </table>
      <div className="soft" style={{ background: '#fff', borderColor: '#6B4E8A', borderLeft: '1.6mm solid #6B4E8A', padding: '4mm 5mm', marginBottom: '4mm' }}>
        <span className="lab" style={{ color: '#171A1F' }}>Síntese integrada</span>
        <TextoIA texto={sintese} style={{ fontFamily: 'AR', fontWeight: 600, fontSize: '10.4pt', lineHeight: 1.55, color: '#171A1F', margin: 0 }} />
      </div>
      <div className="g3" style={{ marginBottom: '3.5mm' }}>
        {QUADROS.map((q, i) => (
          <div key={q.titulo} className="soft" style={{ background: q.fundo, borderColor: q.cor, borderTop: `1.2mm solid ${q.cor}` }}>
            <div className="bt" style={{ color: q.cor }}>
              <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>{q.icone(q.cor)}</svg>
              <span style={{ color: '#171A1F' }}>{q.titulo}</span>
            </div>
            <TextoIA como="div" className="xs" texto={quadros[i]} />
          </div>
        ))}
      </div>
      <TextoIA como="div" className="card sm" rotulo="Contexto de melhor funcionamento." texto={dados.ia.resumo?.ambiente_melhor_performance} />
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore', 'a-confirmar']} />
    </Pagina>
  )
}
