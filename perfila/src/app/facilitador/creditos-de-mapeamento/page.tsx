import { TabelaExtrato } from '@/components/creditos/TabelaExtrato'
import { BotaoAviso } from '@/components/ui/BotaoAviso'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AutoGrid } from '@/components/ui/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { TableFooter } from '@/components/ui/Table'
import { contaAtual, transacoesDaConta } from '@/lib/painel'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Créditos do parceiro: saldo e extrato que o explica.
 *
 * Server Component: as duas leituras acontecem aqui, e `transacoesDaConta()`
 * já aplica o recorte por dono no WHERE — esta tela nunca chega a carregar o
 * movimento de outro parceiro para depois escondê-lo.
 *
 * Os números dos cartões são DERIVADOS do extrato exibido logo abaixo, e não
 * lidos de outra fonte. É isso que torna a tela verificável a olho: entradas
 * menos saídas dá o saldo, e o saldo é o mesmo `usuarios.creditos` que a barra
 * lateral mostra. Um saldo que não fecha com a soma das linhas embaixo dele
 * transforma a tela num palpite.
 */
export default async function CreditosPage() {
  // ponytail: extrato inteiro de uma vez, sem paginação. Hoje são poucas
  // linhas por parceiro. Quem for paginar precisa mexer aqui primeiro, e vale
  // saber ONDE o estrago aparece, porque os dois lugares se comportam ao
  // contrário do que a intuição sugere.
  //
  // `entradas` e `saidas` sairiam da página; `conta.creditos` não, porque
  // `contaAtual()` lê `usuarios` e nunca encosta no extrato. Então o rodapé
  // exibiria "recebidos 20 · consumidos 5 · saldo 200" e a subtração não
  // fecharia na cara de quem olha. Isso é BOM: ele grita, e o grito é
  // legítimo, porque a constraint `saldo_bate_com_extrato` garante que a
  // igualdade vale no banco — se ela não aparece na tela, é a tela que está
  // parcial.
  //
  // O perigo mora na nota do card "Saldo atual": ela diz "resultado de N
  // movimentos no extrato" com N = linhas carregadas. Aí o número grande
  // continua certo e só a frase debaixo dele passa a descrever a página em vez
  // do extrato — falso sem nenhum sinal, e ninguém percebe. É essa nota que
  // precisa mudar junto com a paginação, não o rodapé.
  //
  // Duas saídas: ou os totais viram SUM no banco, ou os dois textos assumem
  // que são parciais.
  const [conta, extrato] = await Promise.all([contaAtual(), transacoesDaConta()])

  const entradas = extrato
    .filter((movimento) => movimento.quantidade > 0)
    .reduce((soma, movimento) => soma + movimento.quantidade, 0)

  const saidas = extrato
    .filter((movimento) => movimento.quantidade < 0)
    .reduce((soma, movimento) => soma + Math.abs(movimento.quantidade), 0)

  return (
    <>
      <PageHeader
        title="Créditos de Mapeamento"
        subtitle="Saldo, extrato e compra de créditos da plataforma."
      />

      <AutoGrid min={240}>
        <Card>
          <div className={styles.rotulo}>Saldo atual</div>
          <div className={`${ui.metricLg} ${styles.valor}`}>
            {conta.creditos} <span className={styles.unidade}>créditos</span>
          </div>
          <div className={ui.note}>
            {extrato.length === 1
              ? 'Resultado de 1 movimento no extrato'
              : `Resultado de ${extrato.length} movimentos no extrato`}
          </div>
        </Card>

        <Card>
          <div className={styles.rotulo}>Recebidos</div>
          <div className={`${ui.metricLg} ${styles.valor}`}>
            {entradas} <span className={styles.unidade}>créditos</span>
          </div>
          <div className={ui.note}>Compras, bônus e estornos</div>
        </Card>

        <Card>
          <div className={styles.rotulo}>Consumidos</div>
          <div className={`${ui.metricLg} ${styles.valor}`}>
            {saidas} <span className={styles.unidade}>créditos</span>
          </div>
          <div className={ui.note}>Mapas aplicados</div>
        </Card>

        <Card tone="accent" className={styles.recarga}>
          <div>
            <div className={styles.recargaTitulo}>Recarga automática</div>
            <div className={styles.recargaTexto}>
              Nunca fique sem créditos: compre automaticamente quando o saldo chegar a zero.
            </div>
          </div>
          <BotaoAviso
            variant="primary"
            className={styles.recargaBotao}
            aviso="Compra de créditos ainda não disponível"
          >
            Comprar créditos
          </BotaoAviso>
        </Card>
      </AutoGrid>

      <Card padding="none" clip scrollX>
        <div className={ui.sectionHead} style={{ padding: 'var(--space-16) var(--space-20)' }}>
          <div className={ui.cardTitle}>Extrato de créditos</div>
        </div>

        {extrato.length === 0 ? (
          <EmptyState>
            Nenhum movimento ainda. Compras, bônus e o consumo de cada mapa aparecem aqui.
          </EmptyState>
        ) : (
          <>
            <TabelaExtrato itens={extrato} />
            {/* A conta fechando, escrita: é o que autoriza o número lá em cima.
                O banco garante a igualdade (constraint saldo_bate_com_extrato),
                então mostrar as três parcelas não é redundância — é a prova
                ficando visível para quem confere. */}
            <TableFooter>
              {`Recebidos ${entradas} · consumidos ${saidas} · saldo ${conta.creditos}`}
            </TableFooter>
          </>
        )}
      </Card>
    </>
  )
}
