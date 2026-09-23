import { listar } from '@/lib/actions/turmas'
import { ListaTurmas } from './ListaTurmas'

/**
 * Grupos de mapeamento do parceiro, agora vindos do banco.
 *
 * Server Component: a consulta acontece aqui, com sessão e escopo do dono no
 * WHERE, e a interatividade (filtros, ações da linha) fica no componente
 * cliente ao lado. Mesmo desenho do acervo de mapas.
 *
 * As datas são formatadas aqui, e não no cliente: o servidor roda em UTC e o
 * navegador no fuso de quem abre a tela, então formatar dos dois lados faria a
 * mesma linha aparecer com horas diferentes antes e depois da hidratação.
 */
const DATA_HORA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export default async function CampanhasPage() {
  const turmas = await listar()

  const itens = turmas.map((turma) => ({
    id: turma.id,
    nome: turma.nome,
    tipo: turma.tipo_relatorio,
    area: turma.area,
    criadaEm: DATA_HORA_BR.format(turma.created_at),
    por: turma.criada_por,
    total: turma.total,
    respondidos: turma.respondidos,
    permiteDownload: turma.permite_download,
  }))

  return <ListaTurmas itens={itens} />
}
