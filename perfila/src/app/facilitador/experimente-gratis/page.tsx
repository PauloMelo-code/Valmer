import { PageHeader } from '@/components/ui/PageHeader'
import { degustacaoDaConta } from '@/lib/painel'
import { listarPrecosRelatorios } from '@/lib/precos'
import { FormDegustacao } from './FormDegustacao'

/**
 * Experimente Grátis: o teste grátis que o parceiro manda para converter cliente.
 *
 * Server Component só para ler — o saldo de amostras e o nível configurado
 * saem do banco (`usuarios.creditos_degustacao` e
 * `usuarios.degustacao_relatorio`), e a lista de níveis sai da tabela de
 * preços, que é quem sabe o nome e a faixa de revenda de cada um. Nada aqui é
 * número de protótipo: o saldo fixo do arquivo de dados saiu junto com o
 * botão que avisava não gravar.
 *
 * O formulário fica no componente cliente ao lado, que é onde há estado.
 */
export default async function DegustacaoPage() {
  const [conta, precos] = await Promise.all([degustacaoDaConta(), listarPrecosRelatorios()])

  return (
    <>
      <PageHeader
        title="Experimente Grátis"
        // Não promete e-mail: não existe envio por e-mail no sistema. Quem
        // entrega o link é o parceiro, copiando da lista de mapas — mesma
        // regra da tela de novo mapa.
        subtitle="Ofereça um teste grátis do relatório e converta em clientes. Cada envio consome 1 teste grátis do seu saldo e nenhum crédito."
      />

      <FormDegustacao
        saldo={conta.saldo}
        concedidas={conta.concedidas}
        utilizadas={conta.utilizadas}
        relatorio={conta.relatorio}
        niveis={precos.map((preco) => ({
          codigo: preco.codigo,
          nome: preco.nome,
          revendaMin: preco.revenda_min,
          revendaMax: preco.revenda_max,
        }))}
      />
    </>
  )
}
