'use client'

import { useState, useTransition } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar, RowActions, Table, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { atualizarPelaTela, criarPelaTela, excluirPelaTela } from '@/lib/actions/clientes'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

export type ItemCliente = {
  id: string
  nome: string
  email: string
  celular: string | null
  iniciais: string
  cadastradoEm: string
  dono: string
  atualizadoEm: Date
}

/** Qual painel está aberto acima da tabela — nenhum, na maior parte do tempo. */
type Painel = { modo: 'novo' } | { modo: 'editar' | 'ver'; cliente: ItemCliente }

const FORMULARIO_VAZIO = { nome: '', email: '', celular: '' }

/**
 * A lista da carteira. As linhas já vieram do servidor com o recorte por dono
 * aplicado — aqui só há a interatividade, que é o que exige o cliente.
 *
 * Quem decide o que pode ser gravado é a action, não esta tela: ela é a
 * conveniência, e o POST direto na Server Action passa pelas mesmas guardas.
 *
 * Os filtros continuam avisando que ainda não filtram, e Importar também:
 * aviso honesto vale mais que um campo que esconde linha por engano. Exportar
 * baixa de verdade, pela rota /api/exportar/clientes, com a mesma lista que
 * está na tela.
 * O e-mail não tem como sair daqui — não existe provedor de envio no projeto.
 */
export function ListaClientes({ itens }: { itens: ItemCliente[] }) {
  const { toast } = useToast()
  const [painel, setPainel] = useState<Painel | null>(null)
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, gravar] = useTransition()

  function abrir(proximo: Painel) {
    setErro(null)
    setPainel(proximo)
    setFormulario(
      proximo.modo === 'novo'
        ? FORMULARIO_VAZIO
        : {
            nome: proximo.cliente.nome,
            email: proximo.cliente.email,
            celular: proximo.cliente.celular ?? '',
          },
    )
  }

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    const alvo = painel

    gravar(async () => {
      // Na edição vai junto o `updated_at` que esta tela leu: é ele que faz a
      // action recusar a gravação quando outra aba mexeu na linha nesse meio
      // tempo, em vez de sobrescrever o trabalho alheio calada.
      const resposta =
        alvo?.modo === 'editar'
          ? await atualizarPelaTela(alvo.cliente.id, formulario, alvo.cliente.atualizadoEm)
          : await criarPelaTela(formulario)

      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      setPainel(null)
      toast(alvo?.modo === 'editar' ? 'Cliente atualizado.' : 'Cliente cadastrado.')
    })
  }

  function excluir(cliente: ItemCliente) {
    // Confirmação nativa de propósito: a exclusão é lógica, a linha continua no
    // banco, e o projeto não tem componente de diálogo. Um modal só para esta
    // pergunta seria mais código que a regra que ele protege.
    if (!window.confirm(`Remover ${cliente.nome} da sua carteira?`)) return

    gravar(async () => {
      const resposta = await excluirPelaTela(cliente.id)
      setPainel(null)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      toast(`${cliente.nome} foi removido da sua carteira.`)
    })
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${itens.length} ${itens.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
        actions={
          <>
            <Button
              icon={<Icon name="upload" />}
              onClick={() => toast('Importação de clientes ainda não disponível', 'aviso')}
            >
              Importar
            </Button>
            <Button href="/api/exportar/clientes" download icon={<Icon name="download" />}>
              Exportar
            </Button>
            <Button
              variant="primary"
              icon={<Icon name="plus" />}
              onClick={() => abrir({ modo: 'novo' })}
            >
              Adicionar cliente
            </Button>
          </>
        }
      />

      {painel?.modo === 'ver' ? (
        <Card padding="none">
          <div className={styles.corpo}>
            <div className={ui.cardTitle}>{painel.cliente.nome}</div>
            <div className={styles.dados}>
              <Dado rotulo="E-mail" valor={painel.cliente.email} />
              <Dado rotulo="Celular" valor={painel.cliente.celular ?? '—'} />
              <Dado rotulo="Cadastrado em" valor={painel.cliente.cadastradoEm} />
              <Dado rotulo="Responsável" valor={painel.cliente.dono} />
            </div>
          </div>
          <CardFooter>
            <Button onClick={() => setPainel(null)}>Fechar</Button>
            <Button
              variant="primary"
              icon={<Icon name="edit" />}
              onClick={() => abrir({ modo: 'editar', cliente: painel.cliente })}
            >
              Editar
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {painel && painel.modo !== 'ver' ? (
        <Card padding="none">
          <form onSubmit={salvar}>
            <div className={styles.corpo}>
              <div className={ui.cardTitle}>
                {painel.modo === 'novo' ? 'Novo cliente' : 'Editar cliente'}
              </div>

              <Field label="Nome">
                {(id) => (
                  <Input
                    id={id}
                    value={formulario.nome}
                    onChange={(evento) =>
                      setFormulario({ ...formulario, nome: evento.target.value })
                    }
                    required
                  />
                )}
              </Field>

              <div className={styles.dupla}>
                <Field label="E-mail">
                  {(id) => (
                    <Input
                      id={id}
                      type="email"
                      value={formulario.email}
                      onChange={(evento) =>
                        setFormulario({ ...formulario, email: evento.target.value })
                      }
                      required
                    />
                  )}
                </Field>
                <Field label="Celular">
                  {(id) => (
                    <Input
                      id={id}
                      type="tel"
                      placeholder="Opcional"
                      value={formulario.celular}
                      onChange={(evento) =>
                        setFormulario({ ...formulario, celular: evento.target.value })
                      }
                    />
                  )}
                </Field>
              </div>

              <p className={ui.note}>
                O e-mail identifica a pessoa dentro da sua carteira: dois clientes seus não podem
                ter o mesmo.
              </p>

              <Aviso mensagem={erro} />
            </div>

            <CardFooter>
              <Button onClick={() => setPainel(null)} disabled={gravando}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={gravando}>
                {gravando ? 'Salvando…' : 'Salvar cliente'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : null}

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Nome" />}
          </Field>
          <Field label="E-mail" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} type="email" placeholder="E-mail" />}
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
            onClick={() => toast('Busca de clientes ainda não disponível', 'aviso')}
          >
            Pesquisar
          </Button>
        </FilterBar>

        {itens.length === 0 ? (
          <EmptyState>
            <p>
              Sua carteira está vazia. O cliente cadastrado aqui é a pessoa avaliada nos mapas
              que você envia.
            </p>
            <Button
              variant="primary"
              icon={<Icon name="plus" />}
              onClick={() => abrir({ modo: 'novo' })}
            >
              Adicionar cliente
            </Button>
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Celular</Th>
                {/* Cliente não faz login na plataforma: quem responde entra pelo
                    link do passaporte. A coluna honesta é a data do cadastro. */}
                <Th>Cadastrado em</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {itens.map((cliente) => (
                <Tr key={cliente.id}>
                  <Td dense>
                    <div className={ui.pessoa}>
                      <Avatar>{cliente.iniciais}</Avatar>
                      <div>
                        <div className={ui.pessoaNome}>{cliente.nome}</div>
                        <div className={ui.pessoaEmail}>{cliente.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td dense muted rotulo="Celular">
                    {cliente.celular ?? '—'}
                  </Td>
                  <Td dense muted rotulo="Cadastrado em">
                    {cliente.cadastradoEm}
                  </Td>
                  <Td dense align="right">
                    <RowActions>
                      <IconButton
                        icon="eye"
                        label="Detalhes"
                        onClick={() => abrir({ modo: 'ver', cliente })}
                      />
                      <IconButton
                        icon="edit"
                        label="Editar"
                        onClick={() => abrir({ modo: 'editar', cliente })}
                      />
                      {/* O e-mail já está na linha, ao lado do nome: é ele o
                          caminho manual enquanto não houver provedor. */}
                      <IconButton
                        icon="mail"
                        label="Enviar e-mail"
                        onClick={() =>
                          toast(
                            `Copie o e-mail da linha (${cliente.email}) e escreva por fora: o envio automático depende do provedor de e-mail, ainda não contratado.`,
                            'aviso',
                          )
                        }
                      />
                      <IconButton
                        icon="trash"
                        label="Remover"
                        tone="danger"
                        disabled={gravando}
                        onClick={() => excluir(cliente)}
                      />
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

/** Par rótulo/valor do detalhe, no bloco rebaixado padrão. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={ui.dataRow}>
      <span className={ui.dataRowLabel}>{rotulo}</span>
      <span className={ui.dataRowValue}>{valor}</span>
    </div>
  )
}

/**
 * Região viva permanente: a recusa do servidor chega depois do clique, longe de
 * onde se olha, e criada junto com o texto o leitor de tela não a anuncia.
 * Mesmo padrão de perfil/FormPerfil.tsx.
 */
function Aviso({ mensagem }: { mensagem: string | null }) {
  return (
    <div role="status" aria-live="polite">
      {mensagem ? (
        <div className={`${ui.callout} ${ui.calloutWarning}`}>
          <span className={ui.calloutIcon}>
            <Icon name="alert" />
          </span>
          <span>{mensagem}</span>
        </div>
      ) : null}
    </div>
  )
}
