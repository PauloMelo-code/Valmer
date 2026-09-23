import { listar } from '@/lib/actions/clientes'
import { initials } from '@/lib/text'
import { ListaClientes } from './ListaClientes'

/**
 * Carteira de clientes do parceiro, agora vinda do banco.
 *
 * Server Component: a consulta acontece aqui, com sessão e recorte por dono no
 * WHERE da action, e a interatividade fica no componente cliente ao lado.
 * Mesmo desenho da lista de turmas.
 *
 * As datas são formatadas aqui, e não no cliente: o servidor roda em UTC e o
 * navegador no fuso de quem abre a tela, então formatar dos dois lados faria a
 * mesma linha aparecer com dia diferente antes e depois da hidratação.
 */
const DATA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

export default async function ClientesPage() {
  const clientes = await listar()

  const itens = clientes.map((cliente) => ({
    id: cliente.id,
    nome: cliente.nome,
    email: cliente.email,
    celular: cliente.celular,
    iniciais: initials(cliente.nome),
    cadastradoEm: DATA_BR.format(cliente.created_at),
    dono: cliente.dono,
    // A tela devolve este valor no salvar: é ele que faz o optimistic locking
    // da action recusar a gravação quando outra aba alterou a linha antes.
    atualizadoEm: cliente.updated_at,
  }))

  return <ListaClientes itens={itens} />
}
