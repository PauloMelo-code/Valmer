import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { contaAtual } from '@/lib/painel'
import { FormNovoAssessment } from './FormNovoAssessment'

/**
 * Novo assessment.
 *
 * Server Component só para ler o saldo de quem está logado: é o banco que diz
 * quantos créditos existem, não uma constante do protótipo. O formulário fica
 * no componente cliente ao lado, que é onde há estado.
 */
export default async function NovoAssessmentPage() {
  const conta = await contaAtual()

  return (
    <>
      <BackLink href="/facilitador/acervo-de-mapas">Voltar para o acervo de mapas</BackLink>

      <PageHeader
        title="Novo mapa comportamental"
        // Não promete e-mail: não existe envio no sistema. Quem entrega o link
        // é o facilitador, copiando da lista.
        subtitle="Cria um link único para o avaliado responder sem criar conta. O link vale por 7 dias e o crédito é consumido agora."
      />

      <FormNovoAssessment creditos={conta.creditos} />
    </>
  )
}
