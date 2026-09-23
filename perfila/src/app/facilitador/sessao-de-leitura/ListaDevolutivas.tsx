'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Select } from '@/components/ui/Select'
import { FilterBar, RowActions, Table, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { atualizarPelaTela, criarPelaTela } from '@/lib/actions/devolutivas'
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
 * A lista em si. As linhas já vieram do servidor com o recorte por dono
 * aplicado — aqui só há a interatividade, que é o que exige o cliente.
 *
 * Os filtros continuam avisando que ainda não filtram, e Baixar e Enviar por
 * e-mail continuam avisando que não existem: não há geração de arquivo nem
 * provedor de e-mail no projeto. Aviso honesto vale mais que um botão que
 * não faz nada calado.
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

  const opcoesMapas = [SEM_ESCOLHA, ...concluidos.map((mapa) => mapa.rotulo)]
  const mapaEscolhido = concluidos.find((mapa) => mapa.rotulo === escolhido)

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

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Nome" />}
          </Field>
          <Field label="E-mail" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} type="email" placeholder="E-mail" />}
          </Field>
          <Field label="Status" className={tableStyles.filterMd}>
            {(id) => <Select id={id} options={opcoes.status} label="Status" />}
          </Field>
          <Field label="Data inicial" className={tableStyles.filterDate}>
            {(id) => <Input id={id} placeholder="dd/mm/aaaa" inputMode="numeric" />}
          </Field>
          <Field label="Data final" className={tableStyles.filterDate}>
            {(id) => <Input id={id} placeholder="dd/mm/aaaa" inputMode="numeric" />}
          </Field>
          <Button
            variant="dark"
            size="lg"
            onClick={() => toast('Busca de sessões de leitura ainda não disponível', 'aviso')}
          >
            Pesquisar
          </Button>
        </FilterBar>

        {itens.length === 0 ? (
          <EmptyState>
            <p>
              Você ainda não tem sessões de leitura. Escolha um mapa concluído acima para abrir
              a primeira.
            </p>
          </EmptyState>
        ) : (
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
              {itens.map((item) => (
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
                        label="Visualizar"
                        onClick={() =>
                          toast(
                            'Visualização da sessão de leitura ainda não disponível',
                            'aviso',
                          )
                        }
                      />
                      {item.finalizada ? (
                        <>
                          <IconButton
                            icon="download"
                            label="Baixar PDF"
                            onClick={() => toast('Download do PDF ainda não disponível', 'aviso')}
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
        )}
      </Card>
    </>
  )
}
