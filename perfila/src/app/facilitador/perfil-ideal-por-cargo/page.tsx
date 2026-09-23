import { listar } from '@/lib/actions/cargos'
import { ListaCargos } from './ListaCargos'

/**
 * Perfil Ideal por Cargo do parceiro, agora vindo do banco.
 *
 * Server Component: a consulta acontece aqui, com sessão e escopo do dono no
 * WHERE, e a interatividade (formulário, ações da linha) fica no componente
 * cliente ao lado. Mesmo desenho da lista de grupos de mapeamento.
 *
 * A data é formatada aqui, e não no cliente: o servidor roda em UTC e o
 * navegador no fuso de quem abre a tela, então formatar dos dois lados faria a
 * mesma linha aparecer com horas diferentes antes e depois da hidratação.
 */
const DATA_HORA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export default async function ArquiteturaPage() {
  const cargos = await listar()

  const itens = cargos.map((cargo) => ({
    id: cargo.id,
    nome: cargo.nome,
    alvo_d: cargo.alvo_d,
    alvo_i: cargo.alvo_i,
    alvo_s: cargo.alvo_s,
    alvo_c: cargo.alvo_c,
    dono: cargo.dono,
    criadoEm: DATA_HORA_BR.format(cargo.created_at),
    atualizadoEm: cargo.updated_at,
  }))

  return <ListaCargos itens={itens} />
}
