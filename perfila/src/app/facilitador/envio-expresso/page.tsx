import { getTipoRelatorio } from '@/data/planos'
import { listar } from '@/lib/actions/turmas'
import { contaAtual } from '@/lib/painel'
import { FormEnvioRapido, type TurmaDestino } from './FormEnvioRapido'

/**
 * Envio expresso, agora ligado ao banco.
 *
 * Server Component: as turmas e o saldo são lidos aqui, com o recorte por dono
 * já no WHERE de `turmas.listar`, e a interatividade fica no formulário ao
 * lado. Assim a tela não precisa de rota de API nem de estado de carregamento
 * — mesmo desenho da lista de turmas e da de mapas.
 *
 * O rótulo de cada turma é montado aqui porque o `Select` do sistema escolhe
 * por TEXTO, e nada impede um parceiro de ter duas turmas com o mesmo nome:
 * sem o desempate, escolher a segunda mandaria os passaportes para a primeira.
 * O id continua sendo o que viaja para a action.
 */
export default async function EnvioRapidoPage() {
  const [turmas, conta] = await Promise.all([listar(), contaAtual()])

  const usados = new Set<string>()
  const destinos: TurmaDestino[] = turmas.map((turma) => {
    const base = `${turma.nome} · ${turma.tipo_relatorio}`
    let rotulo = base
    for (let repeticao = 2; usados.has(rotulo); repeticao++) rotulo = `${base} (${repeticao})`
    usados.add(rotulo)

    return {
      id: turma.id,
      rotulo,
      nome: turma.nome,
      tipo: turma.tipo_relatorio,
      // O custo do passaporte é o do nível DA TURMA: é ela que define o que
      // cada pessoa recebe, então é ela que define o preço. A action recalcula
      // do mesmo lugar — aqui o número existe para a conta aparecer antes do
      // clique, não para ser a fonte da cobrança.
      custo: getTipoRelatorio(turma.tipo_relatorio).creditos,
    }
  })

  return <FormEnvioRapido turmas={destinos} saldo={conta.creditos} />
}
