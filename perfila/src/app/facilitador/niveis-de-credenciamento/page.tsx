import { BotaoAviso } from '@/components/ui/BotaoAviso'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { beneficios, categorias } from '@/data/beneficios'
import { progressoDoPrograma } from '@/lib/painel'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/** Percentual arredondado para baixo: só mostra a meta batida. */
function progresso(atual: number, meta: number) {
  return Math.min(100, Math.floor((atual / meta) * 100))
}

/**
 * Níveis de credenciamento do parceiro.
 *
 * Server Component: a situação vem de `progressoDoPrograma()`, a mesma leitura
 * que alimenta o cartão do dashboard. Antes as duas telas liam um objeto fixo
 * que dizia "71 de 80 utilizados" para todo mundo; agora, se discordarem, é
 * porque discordam do banco — não uma da outra.
 *
 * A régua (faixas, limites, matriz de vantagens) continua vindo do arquivo:
 * aquilo é o contrato do programa, igual para todos os parceiros.
 */
export default async function BeneficiosPage() {
  const programa = await progressoDoPrograma()

  const pctUtilizados = progresso(programa.utilizados.atual, programa.utilizados.meta)
  const pctComprados = progresso(programa.comprados.atual, programa.comprados.meta)

  // Onde ele esta na trilha. -1 nunca acontece com dado do banco, mas se a
  // regua mudar sem a leitura acompanhar, o 0 mantem a tela de pe.
  const indiceAtual = Math.max(
    0,
    categorias.findIndex((categoria) => categoria.name === programa.categoria),
  )

  return (
    <>
      <PageHeader
        title="Níveis de Credenciamento"
        subtitle="Cada nível de credenciamento abre uma vantagem nova. Você sobe comprando ou aplicando créditos."
        actions={
          <BotaoAviso
            icon={<Icon name="chat" />}
            aviso="Contato pelo WhatsApp ainda não disponível"
          >
            Falar com o consultor
          </BotaoAviso>
        }
      />

      {/* A trilha, e nao tres cartoes lado a lado. A plataforma antiga mostra
          categoria e metas como caixas independentes, e o parceiro nao ve que
          uma leva a outra. Aqui os cinco niveis sao uma linha so, com o dele
          marcado, entao a proxima parada e a leitura principal da tela. */}
      <Card tone="ink" className={styles.trilha}>
        <div className={`${ui.eyebrow} ${ui.eyebrowOnInk}`}>Seu nível</div>
        <div className={styles.nivelNome}>{programa.categoria}</div>

        <ol className={styles.passos}>
          {categorias.map((categoria, indice) => {
            const estado =
              indice < indiceAtual ? styles.feito : indice === indiceAtual ? styles.atual : ''
            return (
              <li key={categoria.name} className={`${styles.passo} ${estado}`}>
                <span className={styles.marco} aria-hidden />
                <span className={styles.passoNome}>{categoria.name}</span>
                <span className={styles.passoRegra}>{categoria.rule}</span>
              </li>
            )
          })}
        </ol>

        <div className={styles.medidores}>
          <div className={styles.medidor}>
            <div className={styles.medidorTopo}>
              <span>Créditos utilizados</span>
              <span className={styles.medidorNumero}>
                {programa.utilizados.atual} de {programa.utilizados.meta}
              </span>
            </div>
            <Progress value={pctUtilizados} tone="onInk" label="Créditos utilizados no ciclo" />
          </div>

          <div className={styles.medidor}>
            <div className={styles.medidorTopo}>
              <span>Créditos comprados</span>
              <span className={styles.medidorNumero}>
                {programa.comprados.atual} de {programa.comprados.meta}
              </span>
            </div>
            <Progress value={pctComprados} tone="onInk" label="Créditos comprados no ciclo" />
          </div>
        </div>

        <div className={styles.rodape}>
          {programa.proximaCategoria ? (
            <>
              Faltam {programa.faltam.utilizados} utilizados ou {programa.faltam.comprados}{' '}
              comprados para <b>{programa.proximaCategoria}</b>.
            </>
          ) : (
            <>Você está no último nível de credenciamento.</>
          )}{' '}
          Ciclo de {programa.cicloIniciadoEm} a {programa.expiraEm}.
        </div>
      </Card>

      {/* Matriz: uma linha por benefício, uma coluna por categoria. */}
      <Card padding="none" clip scrollX>
        <table className={styles.matriz}>
          <thead>
            <tr>
              <th scope="col" className={styles.matrizCabecalho}>
                Vantagem
              </th>
              {categorias.map((categoria) => (
                <th
                  key={categoria.name}
                  scope="col"
                  className={styles.matrizCategoria}
                  style={{ background: categoria.bg }}
                >
                  <div className={styles.matrizCategoriaNome} style={{ color: categoria.fg }}>
                    {categoria.name}
                  </div>
                  <div className={styles.matrizCategoriaRegra} style={{ color: categoria.sub }}>
                    {categoria.rule}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {beneficios.map((beneficio) => (
              <tr key={beneficio.name} className={styles.matrizLinha}>
                <th scope="row" className={styles.matrizNome}>
                  {beneficio.name}
                </th>
                {beneficio.cells.map((valor, indice) => (
                  <td key={categorias[indice]?.name ?? indice} className={styles.matrizValor}>
                    {valor === 'yes' ? (
                      <span className={styles.incluso} title="Incluído">
                        <Icon name="check" />
                      </span>
                    ) : valor === 'no' ? (
                      <span className={styles.ausente} title="Não incluído">
                        —
                      </span>
                    ) : (
                      valor
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
