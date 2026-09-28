/**
 * Pagina 13 · Forcas de maior impacto. Os 6 cartoes sao `seis_forcas` da IA
 * (rotulo, titulo e texto); o rotulo ja vem no formato do molde, "DOMINANTE
 * 87,5" ou "CONFORME 20,8 · INTUIÇÃO 63" (C14). A cor do cartao e a do fator
 * que abre o rotulo; rotulo sem fator conhecido fica no azul neutro.
 */
import { FATORES } from '@/data/inventario-mc'
import { PALETA } from '@/data/relatorio-mc/cores'
import { Pagina } from '../Pagina'
import { Marcacao } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import type { PropsPagina } from './registro'

export default function Pagina13({ dados }: PropsPagina) {
  const forcas = dados.ia.seisForcas
  const corDo = (rotulo: string) => {
    const f = FATORES.find((x) => rotulo.toLocaleUpperCase('pt-BR').startsWith(dados.fatores[x].rotulo))
    return f ? dados.fatores[f].cor : { principal: PALETA.azulPetroleo, texto: PALETA.azulPetroleo }
  }

  return (
    <Pagina
      dados={dados}
      numero={13}
      kicker="O seu resultado"
      titulo="Forças de maior impacto"
      subtitulo="Os pontos fortes que este perfil produz com naturalidade, e onde cada um se converte em resultado."
    >
      {forcas ? (
        <div className="g3" style={{ gap: '3.5mm', marginBottom: '4.5mm' }}>
          {forcas.map((forca, i) => {
            const cor = corDo(forca.fator)
            return (
              <div key={i} className="card" style={{ borderTop: `1.2mm solid ${cor.principal}`, display: 'flex', flexDirection: 'column' }}>
                <span className="lab" style={{ color: cor.texto }}>{forca.fator}</span>
                <h2 style={{ fontSize: '11pt' }}>{forca.nome}</h2>
                <div className="sm">{forca.descricao}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <TextoIA texto={null} como="div" className="sm" style={{ marginBottom: '4.5mm' }} />
      )}
      <div className="note" style={{ borderLeftColor: '#1F7A6D' }}>
        <b>Como usar esta página.</b> Estas são tendências que aparecem com facilidade, e não garantias de resultado. Facilidade para acionar um
        comportamento é uma coisa; produzir resultado com ele é outra, e depende de contexto, prática e escolha. Escolha duas destas seis para usar
        com mais intenção nos próximos meses, e observe onde elas mudam o desfecho de uma situação concreta.
      </div>
      <div className="spacer" />
      <div>
        <Marcacao tipo="derivado-do-escore" />
      </div>
    </Pagina>
  )
}
