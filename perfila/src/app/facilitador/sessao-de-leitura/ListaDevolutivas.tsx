'use client'

import { useMemo, useState, useTransition, type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Select } from '@/components/ui/Select'
import {
  FilterBar,
  RowActions,
  Table,
  TableFooter,
  Td,
  Th,
  Tr,
  tableStyles,
} from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { atualizarPelaTela, criarPelaTela } from '@/lib/actions/devolutivas'
import { tokenDoRelatorioDaSessao } from '@/lib/actions/sessao-relatorio'
import {
  erroDoFiltro,
  filtrarSessoes,
  filtroAtivo,
  FILTRO_VAZIO,
  type FiltroSessoes,
} from '@/lib/filtro-sessoes'
import { opcoes } from '@/data/opcoes'
import { getTipoRelatorio, type CodigoRelatorio } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

export type ItemDevolutiva = {
  id: string
  nome: string
  email: string
  tipo: CodigoRelatorio | null
  finalizada: boolean
  /** hh:mm:ss, ou vazio enquanto a sessão não foi finalizada. */
  tempo: string
  criadaEm: string
  /** Instante de abertura, em ms — é daqui que sai a duração gravada. */
  abertaEm: number
  /** Valor lido pela tela, devolvido ao servidor no optimistic locking. */
  atualizadaEm: Date
}

export type MapaConcluido = { id: string; rotulo: string }

const SEM_ESCOLHA = 'Selecione o mapa concluído'

/**
 * Empilhamento dos pares rótulo/valor do painel de detalhe.
 *
 * Fica em `style` porque `page.module.css` é o CSS de outra tarefa em curso, e
 * o valor é um `gap` só. Se o painel crescer, ele desce para o módulo.
 */
const DETALHE: CSSProperties = { display: 'grid', gap: 'var(--space-8)' }

/** Quando o mapa não está mais ao alcance, não há documento a abrir. */
const SEM_RELATORIO =
  'Não há relatório para abrir: o mapa desta sessão foi excluído ou não está mais concluído.'

/**
 * A lista em si. As linhas já vieram do servidor com o recorte por dono
 * aplicado — aqui só há a interatividade, que é o que exige o cliente.
 *
 * A busca filtra o que a tela JÁ tem em mãos, sem ida nova ao banco: a lista de
 * sessões de um parceiro é pequena e chegou inteira. As regras dela (fuso da
 * data, dia que não existe) moram em `lib/filtro-sessoes.ts`, com teste.
 *
 * Ver e imprimir levam ao relatório do mapa que a sessão discute — a mesma
 * página `/relatorio/<token>` que a lista de mapas abre, e a mesma que o
 * Puppeteer do CLI imprime. Não existe PDF de servidor nesta rota, por isso o
 * rótulo fala em imprimir: prometer "baixar" faz o clique parecer quebrado,
 * porque o que abre é o diálogo do navegador.
 *
 * Enviar por e-mail continua avisando que não existe: não há provedor de e-mail
 * contratado. Aviso honesto vale mais que um botão que não faz nada calado.
 */
export function ListaDevolutivas({
  itens,
  concluidos,
}: {
  itens: ItemDevolutiva[]
  concluidos: MapaConcluido[]
}) {
  const { toast } = useToast()
  const [escolhido, setEscolhido] = useState(SEM_ESCOLHA)
  const [gravando, iniciarGravacao] = useTransition()

  // Dois estados, e não um: o rascunho é o que está digitado na barra, o filtro
  // é o que a lista obedece. Filtrar a cada tecla deixaria o botão Pesquisar
  // sem função nenhuma, e um botão que não faz nada é o que esta tela está
  // deixando de ter.
  const [rascunho, setRascunho] = useState<FiltroSessoes>(FILTRO_VAZIO)
  const [filtro, setFiltro] = useState<FiltroSessoes>(FILTRO_VAZIO)
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const opcoesMapas = [SEM_ESCOLHA, ...concluidos.map((mapa) => mapa.rotulo)]
  const mapaEscolhido = concluidos.find((mapa) => mapa.rotulo === escolhido)

  const visiveis = useMemo(() => filtrarSessoes(itens, filtro), [itens, filtro])
  const filtrando = filtroAtivo(filtro)
  // Pelo id, e não pelo objeto: depois de gravar, o servidor manda a lista nova
  // e as linhas são outros objetos — guardar a linha deixaria o painel exibindo
  // o estado de antes da gravação. Sessão que saiu da lista fecha o painel.
  const detalhe = visiveis.find((item) => item.id === detalheId)

  function pesquisar() {
    const erro = erroDoFiltro(rascunho)
    if (erro) {
      toast(erro, 'aviso')
      return
    }
    setFiltro(rascunho)
  }

  function limpar() {
    setRascunho(FILTRO_VAZIO)
    setFiltro(FILTRO_VAZIO)
  }

  function abrir() {
    if (!mapaEscolhido) return

    iniciarGravacao(async () => {
      const resposta = await criarPelaTela({ assessment_id: mapaEscolhido.id })

      // A recusa vem como objeto justamente para ser mostrada aqui: "mapa não
      // encontrado" e "o banco caiu" são coisas diferentes, e só a primeira o
      // facilitador resolve sozinho.
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }

      // O mapa escolhido acabou de sair da lista de disponíveis; deixar o
      // rótulo no campo faria o próximo clique mirar uma sessão que já existe.
      setEscolhido(SEM_ESCOLHA)
      toast('Sessão de leitura aberta. O tempo começa a contar agora.')
    })
  }

  function finalizar(item: ItemDevolutiva) {
    iniciarGravacao(async () => {
      const resposta = await atualizarPelaTela(
        item.id,
        {
          // A duração é o tempo desde a abertura da sessão: não há cronômetro
          // com pausa, e não há coluna onde guardar um. O piso em zero existe
          // porque o relógio de quem clica pode estar atrasado em relação ao
          // do servidor, e duração negativa é recusada pelo banco
          // (`ck_devolutivas_duracao`) — o que chegaria à tela como texto de
          // driver, e não como frase.
          duracao_segundos: Math.max(0, Math.round((Date.now() - item.abertaEm) / 1000)),
          finalizada: true,
        },
        item.atualizadaEm,
      )

      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }

      toast(`Sessão de leitura de ${item.nome} finalizada.`)
    })
  }

  /**
   * Abre o relatório do mapa em aba nova. Com `imprimir`, a própria página do
   * relatório chama a caixa de impressão ao terminar de carregar — é dela que
   * sai o PDF.
   *
   * A aba é aberta ANTES de falar com o servidor: aberta depois da resposta,
   * ela não está mais ligada ao clique e o navegador a trata como pop-up.
   * Quando mesmo assim vier bloqueada, a navegação acontece na aba atual — o
   * filtro se perde, e é melhor que o botão não levar a lugar nenhum.
   */
  async function abrirRelatorio(item: ItemDevolutiva, imprimir: boolean) {
    const aba = window.open('', '_blank')
    const token = await tokenDoRelatorioDaSessao(item.id)

    if (!token) {
      aba?.close()
      toast(SEM_RELATORIO, 'aviso')
      return
    }

    const url = `/relatorio/${encodeURIComponent(token)}${imprimir ? '?imprimir=1' : ''}`
    if (aba) aba.location.href = url
    else window.location.href = url
  }

  return (
    <>
      <PageHeader
        title="Sessão de Leitura"
        subtitle="Sessões de leitura com os respondentes dos seus passaportes."
      />

      <Card>
        <div className={styles.abertura}>
          <Field label="Mapa concluído" className={styles.aberturaCampo}>
            {(id) => (
              <Select
                id={id}
                options={opcoesMapas}
                value={escolhido}
                onChange={setEscolhido}
                label="Mapa concluído"
              />
            )}
          </Field>
          <Button
            variant="primary"
            icon={<Icon name="play" />}
            disabled={!mapaEscolhido || gravando}
            onClick={abrir}
          >
            Abrir sessão de leitura
          </Button>
        </div>
        {concluidos.length === 0 ? (
          <p className={ui.note}>
            Nenhum mapa concluído sem sessão de leitura. A sessão abre a partir de um mapa
            que o respondente já terminou.
          </p>
        ) : null}
      </Card>

      {detalhe ? (
        <Card>
          <CardHeader
            title={`Sessão de leitura de ${detalhe.nome}`}
            actions={
              <IconButton
                icon="fechar"
                label="Fechar detalhe"
                onClick={() => setDetalheId(null)}
              />
            }
          />
          <div style={DETALHE}>
            <div className={ui.dataRow}>
              <span className={ui.dataRowLabel}>Respondente</span>
              <span className={ui.dataRowValue}>
                {detalhe.nome} <span className={ui.dataRowExtra}>{detalhe.email}</span>
              </span>
            </div>
            <div className={ui.dataRow}>
              <span className={ui.dataRowLabel}>Passaporte</span>
              <span className={ui.dataRowValue}>
                {detalhe.tipo ? getTipoRelatorio(detalhe.tipo).nome : 'Mapa excluído'}
              </span>
            </div>
            <div className={ui.dataRow}>
              <span className={ui.dataRowLabel}>Situação</span>
              <span className={ui.dataRowValue}>
                {detalhe.finalizada ? 'Finalizada' : 'Pausada'}
              </span>
            </div>
            <div className={ui.dataRow}>
              <span className={ui.dataRowLabel}>Tempo de sessão</span>
              <span className={ui.dataRowValue}>
                {detalhe.tempo || (
                  <span className={ui.dataRowExtra}>
                    o relógio só para quando a sessão é finalizada
                  </span>
                )}
              </span>
            </div>
            <div className={ui.dataRow}>
              <span className={ui.dataRowLabel}>Aberta em</span>
              <span className={ui.dataRowValue}>{detalhe.criadaEm}</span>
            </div>
          </div>
          <div className={styles.abertura}>
            <Button
              icon={<Icon name="eye" size={14} />}
              onClick={() => abrirRelatorio(detalhe, false)}
            >
              Ver relatório do mapa
            </Button>
            <Button
              variant="primary"
              icon={<Icon name="printer" size={14} />}
              onClick={() => abrirRelatorio(detalhe, true)}
            >
              Imprimir ou salvar PDF
            </Button>
          </div>
        </Card>
      ) : null}

      <Card padding="none" scrollX>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            pesquisar()
          }}
        >
          <FilterBar>
            <Field label="Nome" className={tableStyles.filterGrow}>
              {(id) => (
                <Input
                  id={id}
                  placeholder="Nome"
                  value={rascunho.nome}
                  onChange={(evento) =>
                    setRascunho({ ...rascunho, nome: evento.target.value })
                  }
                />
              )}
            </Field>
            <Field label="E-mail" className={tableStyles.filterGrow}>
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  placeholder="E-mail"
                  value={rascunho.email}
                  onChange={(evento) =>
                    setRascunho({ ...rascunho, email: evento.target.value })
                  }
                />
              )}
            </Field>
            <Field label="Status" className={tableStyles.filterMd}>
              {(id) => (
                <Select
                  id={id}
                  options={opcoes.status}
                  label="Status"
                  value={rascunho.status}
                  onChange={(status) => setRascunho({ ...rascunho, status })}
                />
              )}
            </Field>
            <Field label="Data inicial" className={tableStyles.filterDate}>
              {(id) => (
                <Input
                  id={id}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  value={rascunho.de}
                  onChange={(evento) => setRascunho({ ...rascunho, de: evento.target.value })}
                />
              )}
            </Field>
            <Field label="Data final" className={tableStyles.filterDate}>
              {(id) => (
                <Input
                  id={id}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  value={rascunho.ate}
                  onChange={(evento) => setRascunho({ ...rascunho, ate: evento.target.value })}
                />
              )}
            </Field>
            <Button variant="dark" size="lg" type="submit">
              Pesquisar
            </Button>
            {filtrando ? (
              <Button variant="ghost" size="lg" type="button" onClick={limpar}>
                Limpar
              </Button>
            ) : null}
          </FilterBar>
        </form>

        {itens.length === 0 ? (
          <EmptyState>
            <p>
              Você ainda não tem sessões de leitura. Escolha um mapa concluído acima para abrir
              a primeira.
            </p>
          </EmptyState>
        ) : visiveis.length === 0 ? (
          <EmptyState>
            <p>Nenhuma sessão de leitura corresponde à busca. Limpe o filtro para ver todas.</p>
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Respondente</Th>
                  <Th>Passaporte</Th>
                  <Th>Status</Th>
                  <Th>Criado em</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {visiveis.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <div className={tableStyles.primary}>{item.nome}</div>
                      <div className={tableStyles.secondary}>{item.email}</div>
                    </Td>
                    <Td rotulo="Passaporte">
                      <div className={styles.passaporte}>{item.tipo ?? '—'}</div>
                      <div className={tableStyles.secondary}>
                        {item.tipo ? getTipoRelatorio(item.tipo).nome : 'Mapa excluído'}
                      </div>
                    </Td>
                    <Td rotulo="Status">
                      <Pill tone={item.finalizada ? 'success' : 'warning'} dot>
                        {item.finalizada ? 'Finalizada' : 'Pausada'}
                      </Pill>
                      {item.tempo ? <div className={styles.tempo}>Tempo: {item.tempo}</div> : null}
                    </Td>
                    <Td muted rotulo="Criado em">{item.criadaEm}</Td>
                    <Td align="right">
                      <RowActions>
                        <IconButton
                          icon="eye"
                          label={`Ver os dados da sessão de ${item.nome}`}
                          aria-expanded={detalheId === item.id}
                          onClick={() =>
                            setDetalheId(detalheId === item.id ? null : item.id)
                          }
                        />
                        {item.finalizada ? (
                          <>
                            {/* `imprimir=1` faz a própria página do relatório
                                abrir a caixa de impressão ao terminar de
                                carregar, e é dela que sai o PDF. */}
                            <IconButton
                              icon="printer"
                              label={`Imprimir ou salvar em PDF o relatório de ${item.nome}`}
                              onClick={() => abrirRelatorio(item, true)}
                            />
                            <IconButton
                              icon="mail"
                              label="Enviar por e-mail"
                              onClick={() =>
                                toast(
                                  'O envio automático depende do provedor de e-mail, ainda não contratado. Combine a entrega direto com a pessoa.',
                                  'aviso',
                                )
                              }
                            />
                          </>
                        ) : (
                          <IconButton
                            icon="check"
                            label="Finalizar sessão"
                            disabled={gravando}
                            onClick={() => finalizar(item)}
                          />
                        )}
                      </RowActions>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {/* Região viva: quando o filtro muda o número de linhas, a tabela
                se altera longe do foco e um leitor de tela não teria como
                saber. */}
            <TableFooter>
              {filtrando
                ? `Mostrando ${visiveis.length} de ${itens.length}`
                : `Total: ${itens.length}`}
            </TableFooter>
          </>
        )}
      </Card>
    </>
  )
}
