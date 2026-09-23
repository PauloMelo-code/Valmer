'use client'

import { useMemo, useState } from 'react'
import { TabelaAssessments } from '@/components/assessments/TabelaAssessments'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/Select'
import { FilterBar, TableFooter, tableStyles } from '@/components/ui/Table'
import { ROTULO_SITUACAO, type Assessment, type SituacaoAssessment } from '@/data/facilitadores'

/** "Todas" primeiro, e depois os rótulos que a tabela já usa. */
const SITUACOES = ['Todas', ...Object.values(ROTULO_SITUACAO)]

/**
 * Filtro da lista, no cliente.
 *
 * As linhas já vieram do servidor com o recorte por dono aplicado, então
 * filtrar aqui é só esconder o que já é da pessoa. Buscar de novo no servidor
 * a cada tecla renderia uma consulta por caractere digitado, sem melhorar nada
 * numa lista deste tamanho.
 */
export function ListaAssessments({
  itens,
  buscaInicial = '',
}: {
  itens: Assessment[]
  /** Termo vindo da busca da barra superior, pela query `q`. */
  buscaInicial?: string
}) {
  const [busca, setBusca] = useState(buscaInicial)
  const [situacao, setSituacao] = useState(SITUACOES[0]!)

  function limpar() {
    setBusca('')
    setSituacao(SITUACOES[0]!)
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return itens.filter((item) => {
      const casaTermo =
        termo === '' ||
        item.avaliadoNome.toLowerCase().includes(termo) ||
        item.avaliadoEmail.toLowerCase().includes(termo)

      const casaSituacao =
        situacao === 'Todas' ||
        ROTULO_SITUACAO[item.situacao as SituacaoAssessment] === situacao

      return casaTermo && casaSituacao
    })
  }, [itens, busca, situacao])

  return (
    <Card padding="none" scrollX>
      <FilterBar>
        <Field label="Avaliado" className={tableStyles.filterGrow}>
          {(id) => (
            <Input
              id={id}
              placeholder="Nome ou e-mail"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          )}
        </Field>
        <Field label="Situação" className={tableStyles.filterMd}>
          {(id) => (
            <Select
              id={id}
              label="Situação"
              options={SITUACOES}
              value={situacao}
              onChange={setSituacao}
            />
          )}
        </Field>
        {/* O Select é controlado justamente para que este botão devolva o campo
            a "Todas". Antes ele nem tocava na situação: a lista continuava
            filtrada depois de "Limpar", e o rótulo dizia por qual. */}
        <Button variant="dark" size="lg" onClick={limpar}>
          Limpar
        </Button>
      </FilterBar>

      {/* Tabela vazia é tela sem resposta: quem chega não sabe se ainda não
          enviou nada, se o filtro escondeu tudo ou se perdeu os dados. Os dois
          casos têm mensagens diferentes de propósito, e cada uma leva à ação
          que resolve o seu. */}
      {filtrados.length > 0 ? (
        <TabelaAssessments itens={filtrados} />
      ) : itens.length === 0 ? (
        <EmptyState>
          <p>
            Você ainda não enviou nenhum mapa comportamental. Cada envio gera um link único, que o
            avaliado responde sem criar conta.
          </p>
          <Button href="/facilitador/acervo-de-mapas/novo" variant="primary" icon={<Icon name="plus" />}>
            Novo mapa
          </Button>
        </EmptyState>
      ) : (
        <EmptyState>
          <p>
            Nenhum mapa corresponde ao filtro.{' '}
            {itens.length === 1
              ? 'Seu único mapa continua aqui.'
              : `Seus ${itens.length} mapas continuam aqui.`}
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
  )
}
