import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { assessmentsVisiveis, contaAtual } from '@/lib/painel'
import { ListaAssessments } from './ListaAssessments'

/**
 * Assessments do facilitador, agora vindos do banco.
 *
 * Server Component: a consulta acontece aqui e a interatividade (filtros,
 * ações da linha) fica no componente cliente abaixo. Assim a lista não
 * precisa de rota de API nem de estado de carregamento.
 *
 * `q` chega da busca da barra superior, que manda o e-mail do avaliado
 * escolhido. A página só repassa: quem filtra é a lista, que já tinha o campo.
 */
export default async function AssessmentsFacilitadorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const [{ q }, meus, conta] = await Promise.all([
    searchParams,
    assessmentsVisiveis(),
    contaAtual(),
  ])
  const aguardando = meus.filter((item) => item.situacao !== 'concluido').length

  return (
    <>
      <PageHeader
        title="Acervo de Mapas"
        subtitle={`${meus.length} enviados · ${aguardando} aguardando resposta · ${conta.creditos} créditos disponíveis`}
        actions={
          <Button
            href="/facilitador/acervo-de-mapas/novo"
            variant="primary"
            icon={<Icon name="plus" />}
          >
            Novo mapa
          </Button>
        }
      />

      {/* A `key` remonta a lista quando o termo muda: sem ela, buscar duas
          vezes seguidas a partir desta mesma tela trocava a URL e mantinha o
          filtro da busca anterior, porque o campo e estado do cliente. */}
      <ListaAssessments key={q ?? ''} itens={meus} buscaInicial={q ?? ''} />
    </>
  )
}
