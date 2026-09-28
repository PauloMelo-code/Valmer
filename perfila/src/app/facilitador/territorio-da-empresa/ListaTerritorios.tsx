'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Stack } from '@/components/ui/Layout'
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
import { atualizarPelaTela, excluirPelaTela } from '@/lib/actions/territorios'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

export type ItemTerritorio = {
  id: string
  nome: string
  slug: string
  descricao: string | null
  inventarios: number
  dono: string
  criadoEm: string
  /** `aaaa-mm-dd` no fuso de São Paulo: é com ele que o filtro de data compara. */
  dia: string
  /** Viaja até a action: é ele que recusa a gravação de duas abas ao mesmo tempo. */
  atualizadoEm: Date
}

type Rascunho = {
  id: string
  slug: string
  atualizadoEm: Date
  nome: string
  descricao: string
}

/**
 * Territórios do parceiro, lendo e gravando no banco.
 *
 * A lista chega pronta do servidor, já com o recorte por dono no WHERE, e as
 * actions invalidam esta rota depois de gravar — por isso a tela não guarda
 * cópia dos territórios. Estado aqui é só o do formulário e o dos filtros.
 *
 * Criar continua em `/novo`, onde o parceiro já esperava uma tela; editar abre
 * no lugar, porque trocar de tela para mudar duas linhas de texto perde a lista
 * de vista. Mesmo desenho do Perfil Ideal por Cargo.
 */
export function ListaTerritorios({ itens }: { itens: ItemTerritorio[] }) {
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, iniciarGravacao] = useTransition()

  function limpar() {
    setBusca('')
    setDe('')
    setAte('')
  }

  /**
   * Filtro no cliente: as linhas já vieram do servidor com o recorte por dono,
   * então filtrar aqui é só esconder o que já é da pessoa. Uma consulta por
   * tecla digitada não melhoraria nada numa lista deste tamanho.
   *
   * A data compara texto com texto, os dois em `aaaa-mm-dd` e no mesmo fuso:
   * `<input type="date">` devolve exatamente esse formato, e é o mesmo que a
   * página formatou em São Paulo. Comparar `Date` do navegador com data do
   * servidor faria a linha entrar ou sair do filtro conforme o fuso de quem
   * abre a tela.
   */
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return itens.filter((item) => {
      if (termo !== '' && !item.nome.toLowerCase().includes(termo)) return false
      if (de !== '' && item.dia < de) return false
      if (ate !== '' && item.dia > ate) return false
      return true
    })
  }, [itens, busca, de, ate])

  const filtrando = busca.trim() !== '' || de !== '' || ate !== ''

  function gravar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!rascunho) return
    setErro(null)

    iniciarGravacao(async () => {
      const resposta = await atualizarPelaTela(
        rascunho.id,
        { nome: rascunho.nome, descricao: rascunho.descricao },
        rascunho.atualizadoEm,
      )

      // A recusa volta como objeto justamente para ser mostrada aqui, com o
      // formulário preenchido do lado: fechar antes de saber que gravou
      // apagaria o texto na cara de quem acabou de digitá-lo.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      setRascunho(null)
      toast(`Território "${resposta.dado.nome}" alterado.`)
    })
  }

  function excluir(item: ItemTerritorio) {
    // A exclusão é lógica no banco, mas some da lista na hora. A pergunta diz o
    // que acontece com os inventários porque é a dúvida real: eles são
    // desvinculados, e não apagados — quem clica precisa saber disso ANTES.
    const pergunta =
      `Excluir o território "${item.nome}"?\n\n` +
      (item.inventarios > 0
        ? `Os ${item.inventarios} inventário(s) vinculados são desvinculados. Os mapas continuam no acervo, com relatório e devolutiva.`
        : 'Ele ainda não tem inventário vinculado.')

    if (!window.confirm(pergunta)) return

    iniciarGravacao(async () => {
      const resposta = await excluirPelaTela(item.id)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      if (rascunho?.id === item.id) setRascunho(null)
      toast(`Território "${item.nome}" removido.`)
    })
  }

  return (
    <>
      <PageHeader
        title="Território da Empresa"
        subtitle="Mapeie o perfil coletivo das empresas a partir dos inventários respondidos."
        actions={
          <Button
            href="/facilitador/territorio-da-empresa/novo"
            variant="primary"
            icon={<Icon name="plus" />}
          >
            Adicionar território
          </Button>
        }
      />

      {rascunho ? (
        <Card padding="none">
          <CardHeader title="Alterar território" />
          <form onSubmit={gravar}>
            <div className={styles.formulario}>
              <Stack gap={16}>
                <Field label="Nome">
                  {(id) => (
                    <Input
                      id={id}
                      value={rascunho.nome}
                      onChange={(evento) =>
                        setRascunho({ ...rascunho, nome: evento.target.value })
                      }
                      required
                    />
                  )}
                </Field>
                <Field label="Descrição">
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={3}
                      placeholder="Digite aqui…"
                      value={rascunho.descricao}
                      onChange={(evento) =>
                        setRascunho({ ...rascunho, descricao: evento.target.value })
                      }
                    />
                  )}
                </Field>

                {/* O endereço NÃO muda ao renomear (ver o comentário do
                    `atualizarTerritorioSchema`), e quem edita precisa saber:
                    o link deste território já pode estar com o cliente. */}
                <div className={`${ui.callout} ${ui.calloutInfo}`}>
                  <span className={ui.calloutIcon}>
                    <Icon name="info" />
                  </span>
                  <span>
                    O endereço continua <code>/{rascunho.slug}</code> depois de renomear: um link
                    já enviado ao cliente continua abrindo.
                  </span>
                </div>

                {/* Região viva permanente: a recusa chega depois do clique,
                    longe de onde se olha, e criada junto com o texto nenhum
                    leitor de tela a anunciaria. */}
                <div role="status" aria-live="polite">
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
                {gravando ? 'Salvando…' : 'Salvar alterações'}
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
            {(id) => (
              <Input
                id={id}
                placeholder="Buscar por nome"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            )}
          </Field>
          {/* `type="date"` em vez de máscara própria: o campo nativo já traz
              calendário, teclado numérico no celular e o formato do idioma de
              quem abre, e devolve `aaaa-mm-dd` — que é o que o filtro compara.
              O `min`/`max` cruzado impede o intervalo invertido, que esconderia
              a lista inteira sem dizer por quê. */}
          <Field label="Data inicial" className={tableStyles.filterDate}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(evento) => setDe(evento.target.value)}
              />
            )}
          </Field>
          <Field label="Data final" className={tableStyles.filterDate}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(evento) => setAte(evento.target.value)}
              />
            )}
          </Field>
          {/* A lista filtra a cada tecla, como a de mapas: não sobrou nada para
              um "Pesquisar" fazer depois disso. Este botão devolve os campos —
              sem ele a lista continuaria filtrada por uma data que ninguém
              lembra de ter preenchido. */}
          <Button variant="dark" size="lg" onClick={limpar} disabled={!filtrando}>
            Limpar
          </Button>
        </FilterBar>

        {filtrados.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Empresa</Th>
                <Th>Inventários</Th>
                <Th>Criado por</Th>
                <Th>Criado em</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filtrados.map((territorio) => (
                <Tr key={territorio.id}>
                  <Td>
                    <Link
                      href={`/facilitador/territorio-da-empresa/${territorio.slug}`}
                      className={tableStyles.linkCell}
                    >
                      {territorio.nome}
                    </Link>
                    <div className={`${tableStyles.secondary} ${styles.idioma}`}>
                      <span className={styles.bandeira} aria-hidden />
                      Português (BR)
                    </div>
                  </Td>
                  <Td rotulo="Inventários">
                    <span className={styles.inventarios}>
                      {territorio.inventarios === 0 ? '—' : territorio.inventarios}
                    </span>
                  </Td>
                  <Td muted rotulo="Criado por">
                    {territorio.dono}
                  </Td>
                  <Td muted rotulo="Criado em">
                    {territorio.criadoEm}
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <IconButton
                        icon="eye"
                        label="Abrir"
                        href={`/facilitador/territorio-da-empresa/${territorio.slug}`}
                      />
                      <IconButton
                        icon="edit"
                        label="Editar"
                        disabled={gravando}
                        onClick={() => {
                          setErro(null)
                          setRascunho({
                            id: territorio.id,
                            slug: territorio.slug,
                            atualizadoEm: territorio.atualizadoEm,
                            nome: territorio.nome,
                            descricao: territorio.descricao ?? '',
                          })
                        }}
                      />
                      {/* Relatório coletivo, gráficos e PDF do território não
                          existem: não há gerador de narrativa de GRUPO (o de
                          `lib/relatorio` escreve sobre UMA pessoa) nem página
                          de impressão do território. O aviso fica até existir —
                          tela vazia é pior que botão que avisa. */}
                      <IconButton
                        icon="file"
                        label="Ver relatório"
                        onClick={() =>
                          toast('Relatório do território ainda não disponível', 'aviso')
                        }
                      />
                      <IconButton
                        icon="chart"
                        label="Gráficos"
                        onClick={() =>
                          toast('Gráficos do território ainda não disponíveis', 'aviso')
                        }
                      />
                      <IconButton
                        icon="download"
                        label="Baixar PDF"
                        onClick={() => toast('Download do PDF ainda não disponível', 'aviso')}
                      />
                      <IconButton
                        icon="trash"
                        label="Remover"
                        tone="danger"
                        disabled={gravando}
                        onClick={() => excluir(territorio)}
                      />
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : itens.length === 0 ? (
          <EmptyState>
            <p>
              Nenhum território cadastrado ainda. Um território reúne os inventários de uma empresa
              e mostra o perfil médio dela.
            </p>
            <Button
              href="/facilitador/territorio-da-empresa/novo"
              variant="primary"
              icon={<Icon name="plus" />}
            >
              Adicionar território
            </Button>
          </EmptyState>
        ) : (
          /* Tabela vazia é tela sem resposta: quem chega não sabe se ainda não
             cadastrou nada, se o filtro escondeu tudo ou se perdeu os dados. As
             duas mensagens são diferentes de propósito. */
          <EmptyState>
            <p>
              Nenhum território corresponde ao filtro.{' '}
              {itens.length === 1
                ? 'Seu único território continua aqui.'
                : `Seus ${itens.length} territórios continuam aqui.`}
            </p>
            <Button variant="secondary" onClick={limpar}>
              Limpar filtros
            </Button>
          </EmptyState>
        )}

        <TableFooter>
          {filtrados.length === itens.length
            ? `Total: ${itens.length}`
            : `${filtrados.length} de ${itens.length}`}
        </TableFooter>
      </Card>
    </>
  )
}
