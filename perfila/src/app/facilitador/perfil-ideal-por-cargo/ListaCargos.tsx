'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { AutoGrid, Stack } from '@/components/ui/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
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
import { atualizarPelaTela, criarPelaTela, excluirPelaTela } from '@/lib/actions/cargos'
import ui from '@/styles/common.module.css'

export type ItemCargo = {
  id: string
  nome: string
  alvo_d: number | null
  alvo_i: number | null
  alvo_s: number | null
  alvo_c: number | null
  dono: string
  criadoEm: string
  /** Viaja até a action: é ele que recusa a gravação de duas abas ao mesmo tempo. */
  atualizadoEm: Date
}

/**
 * O formulário guarda TEXTO, e não número.
 *
 * Campo vazio e zero são coisas diferentes aqui — "sem alvo" é um cargo
 * válido, "0% de D" é outro cargo. Com `number | null` no estado, apagar o
 * campo viraria 0 no meio da digitação e a soma ao vivo saltaria sozinha.
 * A tradução de "" para nulo já existe no `preprocess` do zod, no servidor.
 */
type Rascunho = {
  /** Nulo em cargo novo — o que separa adicionar/duplicar de editar. */
  id: string | null
  atualizadoEm: Date | null
  nome: string
  d: string
  i: string
  s: string
  c: string
}

const NOVO: Rascunho = { id: null, atualizadoEm: null, nome: '', d: '', i: '', s: '', c: '' }

const texto = (valor: number | null) => (valor === null ? '' : String(valor))

const RECADO_ALVO =
  'Os quatro percentuais precisam somar 100%, ou ficar os quatro em branco.'

/**
 * Perfil Ideal por Cargo, lendo e gravando no banco.
 *
 * A lista chega pronta do servidor, já com o recorte por dono no WHERE, e as
 * actions invalidam esta rota depois de gravar — por isso a tela não guarda
 * cópia dos cargos. Estado aqui é só o do formulário.
 *
 * Um formulário só atende adicionar, editar e duplicar: as três terminam na
 * mesma gravação, e duplicar abre a cópia preenchida em vez de gravar calado,
 * porque dois cargos com o mesmo nome na lista é o que ninguém quer.
 */
export function ListaCargos({ itens }: { itens: ItemCargo[] }) {
  const { toast } = useToast()
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, iniciarGravacao] = useTransition()

  function abrir(rascunhoNovo: Rascunho) {
    setErro(null)
    setRascunho(rascunhoNovo)
  }

  const valores = rascunho
    ? [rascunho.d, rascunho.i, rascunho.s, rascunho.c].map((campo) =>
        campo.trim() === '' ? null : Number(campo),
      )
    : []
  const preenchidos = valores.filter((valor): valor is number => valor !== null)
  const soma = preenchidos.reduce((total, valor) => total + valor, 0)
  const semAlvo = preenchidos.length === 0
  // O banco tem o CHECK `ck_cargos_alvo` e o zod tem o mesmo refine; a conta
  // repetida aqui existe só para a soma aparecer ao vivo e o clique ser
  // recusado antes de virar viagem ao servidor. Quem manda continua sendo o
  // banco — esta cópia nunca é a única guarda.
  const alvoFechado = semAlvo || (preenchidos.length === 4 && soma === 100)

  function gravar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!rascunho) return
    setErro(null)

    if (!alvoFechado) {
      setErro(RECADO_ALVO)
      return
    }

    const dados = {
      nome: rascunho.nome,
      alvo_d: rascunho.d,
      alvo_i: rascunho.i,
      alvo_s: rascunho.s,
      alvo_c: rascunho.c,
    }

    iniciarGravacao(async () => {
      const resposta = rascunho.id
        ? await atualizarPelaTela(rascunho.id, dados, rascunho.atualizadoEm!)
        : await criarPelaTela(dados)

      // A recusa volta como objeto justamente para ser mostrada aqui, com o
      // formulário preenchido do lado: fechar antes de saber que gravou
      // apagaria o alvo na cara de quem acabou de digitá-lo.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      setRascunho(null)
      toast(rascunho.id ? 'Cargo alterado.' : `Cargo "${rascunho.nome.trim()}" cadastrado.`)
    })
  }

  function excluir(item: ItemCargo) {
    // Exclusão é lógica no banco, mas some da lista do parceiro na hora: sem a
    // pergunta, um clique errado na lixeira ao lado do lápis tira o cargo da
    // tela sem nenhum aviso.
    if (!window.confirm(`Excluir o cargo "${item.nome}"?`)) return

    iniciarGravacao(async () => {
      const resposta = await excluirPelaTela(item.id)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      if (rascunho?.id === item.id) setRascunho(null)
      toast(`Cargo "${item.nome}" removido.`)
    })
  }

  return (
    <>
      <PageHeader
        title="Perfil Ideal por Cargo"
        subtitle="Defina o perfil comportamental ideal para cada cargo e compare com candidatos."
        actions={
          <Button
            variant="primary"
            icon={<Icon name="plus" />}
            onClick={() => abrir(NOVO)}
            disabled={gravando}
          >
            Adicionar cargo
          </Button>
        }
      />

      {rascunho ? (
        <Card padding="none">
          <CardHeader title={rascunho.id ? 'Alterar cargo' : 'Novo cargo'} />
          <form onSubmit={gravar}>
            {/* Mesmo corpo de formulário das outras telas de criação, com o
                respiro do card vindo do token e não de um número solto. */}
            <div style={{ padding: 'var(--space-24)' }}>
              <Stack gap={16}>
                <Field label="Nome do cargo">
                  {(id) => (
                    <Input
                      id={id}
                      placeholder="Ex.: Consultora de Vendas de Maquiagem"
                      value={rascunho.nome}
                      onChange={(evento) =>
                        setRascunho({ ...rascunho, nome: evento.target.value })
                      }
                      required
                    />
                  )}
                </Field>

                <AutoGrid min={120} gap={12}>
                  {(['d', 'i', 's', 'c'] as const).map((letra) => (
                    <Field key={letra} label={`Alvo ${letra.toUpperCase()} (%)`}>
                      {(id) => (
                        <Input
                          id={id}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="numeric"
                          placeholder="—"
                          value={rascunho[letra]}
                          onChange={(evento) =>
                            setRascunho({ ...rascunho, [letra]: evento.target.value })
                          }
                        />
                      )}
                    </Field>
                  ))}
                </AutoGrid>

                {/* Região viva permanente: a soma muda a cada tecla e a recusa
                    chega depois do clique. Criadas junto com o texto, nenhuma
                    das duas seria anunciada por leitor de tela. */}
                <div role="status" aria-live="polite">
                  <div
                    className={`${ui.callout} ${alvoFechado ? ui.calloutInfo : ui.calloutWarning}`}
                  >
                    <span className={ui.calloutIcon}>
                      <Icon name={alvoFechado ? 'info' : 'alert'} />
                    </span>
                    <span>
                      {semAlvo
                        ? 'Sem alvo: o cargo é salvo assim mesmo, só não entra nas comparações.'
                        : `Soma: ${Number.isFinite(soma) ? soma : 0}%. ${
                            alvoFechado ? 'Alvo fechado.' : RECADO_ALVO
                          }`}
                    </span>
                  </div>

                  {erro ? (
                    <div className={`${ui.callout} ${ui.calloutWarning}`}>
                      <span className={ui.calloutIcon}>
                        <Icon name="alert" />
                      </span>
                      <span>{erro}</span>
                    </div>
                  ) : null}
                </div>
              </Stack>
            </div>

            <CardFooter>
              <Button
                type="submit"
                variant="primary"
                icon={<Icon name="check" />}
                disabled={gravando}
              >
                {gravando ? 'Salvando…' : rascunho.id ? 'Salvar alterações' : 'Criar cargo'}
              </Button>
              <Button variant="ghost" onClick={() => setRascunho(null)} disabled={gravando}>
                Cancelar
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : null}

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Buscar por cargo" />}
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
            onClick={() => toast('Busca por cargo ainda não disponível', 'aviso')}
          >
            Pesquisar
          </Button>
        </FilterBar>

        {itens.length === 0 ? (
          <EmptyState>
            Nenhum cargo cadastrado ainda. Cadastre o primeiro para comparar candidatos com o
            perfil ideal da posição.
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cargo</Th>
                <Th>Alvo</Th>
                <Th>Criado por</Th>
                <Th>Criado em</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {itens.map((cargo) => (
                <Tr key={cargo.id}>
                  <Td>
                    <span className={tableStyles.primary}>{cargo.nome}</span>
                  </Td>
                  <Td muted rotulo="Alvo">
                    {cargo.alvo_d === null
                      ? 'Sem alvo'
                      : `D ${cargo.alvo_d} · I ${cargo.alvo_i} · S ${cargo.alvo_s} · C ${cargo.alvo_c}`}
                  </Td>
                  <Td muted rotulo="Criado por">{cargo.dono}</Td>
                  <Td muted rotulo="Criado em">{cargo.criadoEm}</Td>
                  <Td align="right">
                    <RowActions>
                      <IconButton
                        icon="download"
                        label="Baixar"
                        onClick={() => toast('Download do PDF ainda não disponível', 'aviso')}
                      />
                      <IconButton
                        icon="edit"
                        label="Alterar"
                        disabled={gravando}
                        onClick={() =>
                          abrir({
                            id: cargo.id,
                            atualizadoEm: cargo.atualizadoEm,
                            nome: cargo.nome,
                            d: texto(cargo.alvo_d),
                            i: texto(cargo.alvo_i),
                            s: texto(cargo.alvo_s),
                            c: texto(cargo.alvo_c),
                          })
                        }
                      />
                      <IconButton
                        icon="copy"
                        label="Duplicar"
                        disabled={gravando}
                        onClick={() =>
                          abrir({
                            ...NOVO,
                            nome: `${cargo.nome} (cópia)`,
                            d: texto(cargo.alvo_d),
                            i: texto(cargo.alvo_i),
                            s: texto(cargo.alvo_s),
                            c: texto(cargo.alvo_c),
                          })
                        }
                      />
                      <IconButton
                        icon="trash"
                        label="Remover"
                        tone="danger"
                        disabled={gravando}
                        onClick={() => excluir(cargo)}
                      />
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}

        <TableFooter>Total: {itens.length}</TableFooter>
      </Card>
    </>
  )
}
