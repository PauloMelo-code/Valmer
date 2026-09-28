/**
 * Pagina 28 · Resumo do Perfil Comportamental. Oito cartoes, um por campo de
 * `resumo_perfil_8_blocos`, na ordem do molde; o oitavo e o bloco escuro.
 */
import { Pagina } from '../Pagina'
import { Marcacoes } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import type { NarrativaMC } from '@/lib/relatorio-mc/narrativa-esquema'
import type { PropsPagina } from './registro'

type Bloco = keyof NarrativaMC['resumo_perfil_8_blocos']

const CARTOES: { bloco: Bloco; titulo: string; cor: string }[] = [
  { bloco: 'essencia', titulo: 'Essência do perfil', cor: '#6B4E8A' },
  { bloco: 'contribuicao_maior_valor', titulo: 'Contribuição de maior valor', cor: '#6B4E8A' },
  { bloco: 'ambiente_melhor_performance', titulo: 'Ambiente de melhor performance', cor: '#6B4E8A' },
  { bloco: 'estilo_comunicacao', titulo: 'Estilo de comunicação e relacionamento', cor: '#6B4E8A' },
  { bloco: 'motivadores', titulo: 'Motivadores predominantes', cor: '#6B4E8A' },
  { bloco: 'riscos_excesso', titulo: 'Riscos de excesso', cor: '#9F3345' },
  { bloco: 'prioridades_desenvolvimento', titulo: 'Prioridades de desenvolvimento', cor: '#1F7A6D' },
]

const TEXTO = { fontSize: '8.7pt' } as const

export default function Pagina28({ dados }: PropsPagina) {
  const resumo = dados.ia.resumo
  return (
    <Pagina
      dados={dados}
      numero={28}
      kicker="Leitura integrada"
      titulo="Resumo do Perfil Comportamental"
      subtitulo="Seu perfil revela uma combinação própria de energia, percepção, decisão e relacionamento. Você tende a contribuir com mais força quando pode usar suas características predominantes em um ambiente compatível com seus valores e objetivos. Ao mesmo tempo, sua evolução depende de reconhecer os momentos em que essas mesmas características se tornam automáticas, excessivas ou insuficientes para o contexto."
    >
      <div className="g2" style={{ gap: '3mm', marginBottom: '3mm' }}>
        {CARTOES.map((c) => (
          <div key={c.bloco} className="card" style={{ borderLeft: `1.2mm solid ${c.cor}`, padding: '3mm 3.6mm' }}>
            <span className="lab" style={{ color: '#171A1F' }}>{c.titulo}</span>
            <TextoIA como="div" className="sm" style={TEXTO} texto={resumo?.[c.bloco]} />
          </div>
        ))}
        <div className="soft" style={{ background: '#17324D', borderColor: '#17324D', color: '#fff', padding: '3mm 3.6mm' }}>
          <span className="lab" style={{ color: '#C39A42' }}>Direção recomendada</span>
          <TextoIA como="div" className="sm" style={TEXTO} texto={resumo?.direcao_recomendada} />
        </div>
      </div>
      <div className="spacer" />
      <Marcacoes tipos={['derivado-do-escore']} />
    </Pagina>
  )
}
