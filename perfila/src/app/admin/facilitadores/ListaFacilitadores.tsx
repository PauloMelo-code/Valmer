'use client'

import { useMemo, useState, useTransition } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Pill } from '@/components/ui/Pill'
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
import { definirSituacaoPelaTela, enviarAcessoPelaTela } from '@/lib/actions/facilitadores'
import type { Facilitador } from '@/data/facilitadores'
import ui from '@/styles/common.module.css'

/**
 * Tabela de parceiros, com busca no cliente.
 *
 * As linhas já vieram do servidor; os filtros só escondem o que está na tela.
 * A contagem de assessments chega pronta por parceiro — contar aqui exigiria
 * carregar todos os assessments da plataforma dentro do navegador só para
 * exibir um número por linha.
 */
export function ListaFacilitadores({
  itens,
  assessmentsPorFacilitador,
}: {
  itens: Facilitador[]
  assessmentsPorFacilitador: Record<string, number>
}) {
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [email, setEmail] = useState('')
  const [alterando, alterarSituacao] = useTransition()

  /** Reenvia o link de primeiro acesso; o erro mostrado é o motivo real. */
  function reenviar(facilitador: Facilitador) {
    alterarSituacao(async () => {
      const resposta = await enviarAcessoPelaTela(facilitador.id)
      if (resposta.ok) toast(`Acesso enviado para ${resposta.email}`)
      else toast(resposta.erro, 'aviso')
    })
  }

  /**
   * Ativar e desativar da própria lista.
   *
   * Manda a situação DESEJADA, e não "inverta": dois cliques vindos de abas que
   * leram a mesma lista se cancelariam. Sem `router.refresh()` — a action
   * invalida o layout de /admin e esta lista é renderizada no servidor, então
   * ela volta atualizada na resposta da própria Server Action.
   */
  function alternar(facilitador: Facilitador) {
    alterarSituacao(async () => {
      const resposta = await definirSituacaoPelaTela(facilitador.id, !facilitador.ativo)

      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }

      toast(
        facilitador.ativo
          ? `${facilitador.nome} desativado. O acesso dele está bloqueado.`
          : `${facilitador.nome} reativado.`,
      )
    })
  }

  function limpar() {
    setBusca('')
    setEmail('')
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const termoEmail = email.trim().toLowerCase()

    return itens.filter((facilitador) => {
      const casaTermo =
        termo === '' ||
        facilitador.nome.toLowerCase().includes(termo) ||
        facilitador.empresa.toLowerCase().includes(termo)

      const casaEmail = termoEmail === '' || facilitador.email.toLowerCase().includes(termoEmail)

      return casaTermo && casaEmail
    })
  }, [itens, busca, email])

  return (
    <Card padding="none" scrollX>
      <FilterBar>
        <Field label="Nome ou empresa" className={tableStyles.filterGrow}>
          {(id) => (
            <Input
              id={id}
              placeholder="Buscar"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          )}
        </Field>
        <Field label="E-mail" className={tableStyles.filterGrow}>
          {(id) => (
            <Input
              id={id}
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
          )}
        </Field>
        <Button variant="dark" size="lg" onClick={limpar}>
          Limpar
        </Button>
      </FilterBar>

      {/* Tabela vazia é tela sem resposta. Não haver parceiro nenhum e buscar
          sem achar são situações diferentes, e a mensagem precisa dizer qual das
          duas é — senão quem olha acha que os cadastros sumiram. O cabeçalho sai
          junto com as linhas: sozinho ele só força rolagem lateral numa tela
          estreita, sem nada para rotular. */}
      {filtrados.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Parceiro</Th>
              <Th>Empresa</Th>
              <Th align="right">Saldo</Th>
              <Th align="right">Mapas</Th>
              <Th>Criado em</Th>
              <Th>Situação</Th>
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {filtrados.map((facilitador) => (
              <Tr key={facilitador.id}>
                <Td dense>
                  <div className={ui.pessoa}>
                    <Avatar>{facilitador.iniciais}</Avatar>
                    <div>
                      <div className={ui.pessoaNome}>{facilitador.nome}</div>
                      <div className={ui.pessoaEmail}>{facilitador.email}</div>
                    </div>
                  </div>
                </Td>
                <Td dense muted rotulo="Empresa">
                  {facilitador.empresa}
                </Td>
                <Td dense align="right" rotulo="Saldo">
                  {facilitador.creditos}
                </Td>
                <Td dense align="right" muted rotulo="Mapas">
                  {assessmentsPorFacilitador[facilitador.id] ?? 0}
                </Td>
                <Td dense muted rotulo="Criado em">
                  {facilitador.criadoEm}
                </Td>
                <Td dense rotulo="Situação">
                  <Pill tone={facilitador.ativo ? 'success' : 'neutral'} dot>
                    {facilitador.ativo ? 'Ativo' : 'Inativo'}
                  </Pill>
                </Td>
                <Td dense align="right">
                  {/* Editar e ativar/desativar gravam de verdade, pela mesma
                      action — `definirSituacaoPelaTela` chama a edição com a
                      linha que acabou de ler. O cartão LEVA para /admin/creditos:
                      a venda existe e grava lá, e o aviso antigo dizendo que
                      "ainda não está disponível" era falso. O envelope
                      reenvia o link de acesso por e-mail e mostra o erro real
                      quando o SMTP falha. */}
                  <RowActions>
                    <IconButton
                      icon="card"
                      label={`Vender créditos para ${facilitador.nome}`}
                      href="/admin/creditos"
                    />
                    <IconButton
                      icon="mail"
                      label={`Reenviar acesso para ${facilitador.nome}`}
                      disabled={alterando}
                      onClick={() => reenviar(facilitador)}
                    />
                    <IconButton
                      icon="edit"
                      label={`Editar ${facilitador.nome}`}
                      href={`/admin/facilitadores/${facilitador.id}`}
                    />
                    <IconButton
                      icon={facilitador.ativo ? 'trash' : 'check'}
                      label={
                        facilitador.ativo
                          ? `Desativar ${facilitador.nome}`
                          : `Ativar ${facilitador.nome}`
                      }
                      tone={facilitador.ativo ? 'danger' : 'default'}
                      disabled={alterando}
                      onClick={() => alternar(facilitador)}
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : itens.length === 0 ? (
        <EmptyState>
          <p>Nenhum parceiro cadastrado ainda.</p>
          <Button href="/admin/facilitadores/novo" variant="primary" icon={<Icon name="plus" />}>
            Novo facilitador
          </Button>
        </EmptyState>
      ) : (
        <EmptyState>
          <p>Nenhum parceiro corresponde à busca. Os {itens.length} cadastrados continuam aqui.</p>
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
  )
}
