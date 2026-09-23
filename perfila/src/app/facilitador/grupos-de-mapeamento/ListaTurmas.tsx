'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Progress } from '@/components/ui/Progress'
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
import { opcoes } from '@/data/opcoes'
import { getTipoRelatorio, type CodigoRelatorio } from '@/data/planos'
import styles from './page.module.css'

export type ItemTurma = {
  id: string
  nome: string
  tipo: CodigoRelatorio
  area: 'global' | 'pessoal' | 'profissional'
  criadaEm: string
  por: string
  total: number
  respondidos: number
  permiteDownload: boolean
}

/** Os três valores do enum, com a inicial maiúscula que a tela usa. */
const ROTULO_AREA: Record<ItemTurma['area'], string> = {
  global: 'Global',
  pessoal: 'Pessoal',
  profissional: 'Profissional',
}

/**
 * A lista em si. As linhas já vieram do servidor com o recorte por dono
 * aplicado — aqui só há a interatividade, que é o que exige o cliente.
 *
 * Os filtros continuam avisando que ainda não filtram: eles pedem busca por
 * data e por degustação, e nenhuma das duas existe no banco. Aviso honesto
 * vale mais que um filtro que esconde linha por engano.
 */
export function ListaTurmas({ itens }: { itens: ItemTurma[] }) {
  const { toast } = useToast()

  const passaportes = itens.reduce((soma, turma) => soma + turma.total, 0)

  return (
    <>
      <PageHeader
        title="Grupos de Mapeamento"
        subtitle={`${itens.length} grupos de mapeamento · ${passaportes} passaportes enviados`}
        actions={
          <>
            <Button href="/api/exportar/turmas" download icon={<Icon name="download" />}>
              Exportar
            </Button>
            <Button
              icon={<Icon name="link" />}
              onClick={() => toast('Meus links ainda não disponíveis', 'aviso')}
            >
              Meus links
            </Button>
            {/* Remover pendentes EXISTE e funciona — mas por turma, e não
                daqui: é uma exclusão que estorna crédito, e a confirmação
                precisa dizer quantos mapas somem e quantos créditos voltam.
                Deste cabeçalho não há turma escolhida, e varrer todas de uma
                vez seria a versão da ação em que ninguém consegue conferir o
                que apagou. O aviso leva ao lugar onde ela roda. */}
            <Button
              variant="danger"
              icon={<Icon name="trash" />}
              onClick={() =>
                toast(
                  'Remover pendentes é por grupo: abra o grupo no olho e use o botão de lá.',
                  'aviso',
                )
              }
            >
              Remover pendentes
            </Button>
            <Button href="/facilitador/grupos-de-mapeamento/nova" variant="primary" icon={<Icon name="plus" />}>
              Novo grupo
            </Button>
          </>
        }
      />

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Buscar por nome" />}
          </Field>
          <Field label="Experimente Grátis" className={tableStyles.filterLg}>
            {(id) => <Select id={id} options={opcoes.degustacao} label="Experimente Grátis" />}
          </Field>
          <Field label="Tipo de relatório" className={tableStyles.filterXl}>
            {(id) => (
              <Select id={id} options={opcoes.relatorioFiltro} label="Tipo de relatório" />
            )}
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
            onClick={() => toast('Busca de grupos ainda não disponível', 'aviso')}
          >
            Pesquisar
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => toast('Limpar filtros ainda não disponível', 'aviso')}
          >
            Limpar
          </Button>
        </FilterBar>

        {itens.length === 0 ? (
          <EmptyState>
            <p>
              Você ainda não tem grupos de mapeamento. Um grupo reúne os passaportes enviados e
              define o tipo de relatório gerado.
            </p>
            <Button href="/facilitador/grupos-de-mapeamento/nova" variant="primary" icon={<Icon name="plus" />}>
              Novo grupo
            </Button>
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th style={{ minWidth: 240 }}>Grupo</Th>
                <Th>Finalidade</Th>
                <Th>Criado em</Th>
                <Th style={{ width: 260 }}>Respostas</Th>
                <Th align="center">Download</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {itens.map((turma) => {
                const pendentes = turma.total - turma.respondidos
                const completa = turma.total > 0 && pendentes === 0
                return (
                  <Tr key={turma.id}>
                    <Td>
                      <div className={tableStyles.primary}>{turma.nome}</div>
                      <div className={tableStyles.secondary}>
                        {turma.tipo} · {getTipoRelatorio(turma.tipo).nome}
                      </div>
                    </Td>
                    <Td rotulo="Finalidade">
                      <Pill>{ROTULO_AREA[turma.area]}</Pill>
                    </Td>
                    <Td muted rotulo="Criado em">
                      <div>{turma.criadaEm}</div>
                      <div className={tableStyles.secondary}>por {turma.por}</div>
                    </Td>
                    <Td rotulo="Respostas">
                      <div className={styles.respostasLabel}>
                        <span className={styles.respostasTotal}>
                          {turma.respondidos} de {turma.total} respondidos
                        </span>
                        <span className={completa ? styles.completa : styles.pendentes}>
                          {completa ? 'Completo' : `${pendentes} pendentes`}
                        </span>
                      </div>
                      {/* Grupo sem passaporte tem barra vazia, e não uma
                          divisão por zero: 0 de 0 é o estado normal de um
                          grupo recém-criado, e o envio ainda não existe. */}
                      <Progress
                        value={turma.total === 0 ? 0 : (turma.respondidos / turma.total) * 100}
                        label={`Respostas de ${turma.nome}`}
                      />
                    </Td>
                    <Td align="center" rotulo="Download">
                      {turma.permiteDownload ? (
                        <span className={styles.download} title="Download liberado ao respondente">
                          <Icon name="check" />
                        </span>
                      ) : (
                        <span className={tableStyles.secondary}>—</span>
                      )}
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {/* Rota por id, e nunca por apelido derivado do nome:
                            "Turma 2026" de dois parceiros daria o mesmo apelido,
                            e uma colisão dessas é caminho de vazamento, não
                            inconveniência de URL. */}
                        <IconButton
                          icon="eye"
                          label={`Abrir o grupo ${turma.nome}`}
                          href={`/facilitador/grupos-de-mapeamento/${turma.id}`}
                        />
                        {/* Não há link público de turma: o link é do avaliado,
                            um por mapa, e sai na tela de detalhe. Um endereço
                            de turma que aceitasse qualquer pessoa seria um
                            passaporte sem dono — ninguém saberia quem
                            respondeu o quê. */}
                        <IconButton
                          icon="link"
                          label="Gerar link"
                          onClick={() =>
                            toast(
                              'O link é de cada avaliado: abra o grupo no olho para copiá-los.',
                              'aviso',
                            )
                          }
                        />
                        {/* Rótulo diferente do "Exportar" do cabeçalho DE
                            PROPÓSITO: aquele baixa a lista de turmas, este
                            baixa as respostas DESTA turma. Mesmo gerador de
                            CSV, recorte diferente. `download` evita o prefetch
                            do <Link>, que geraria um CSV por linha visível. */}
                        <IconButton
                          icon="download"
                          label={`Baixar respostas do grupo ${turma.nome}`}
                          href={`/api/exportar/turma?turma=${turma.id}`}
                          download
                        />
                      </RowActions>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}

        <TableFooter
          actions={
            <>
              <IconButton icon="chevL" label="Página anterior" variant="pager" disabled />
              <IconButton icon="chevR" label="Próxima página" variant="pager" disabled />
            </>
          }
        >
          Mostrando {itens.length} de {itens.length}
        </TableFooter>
      </Card>
    </>
  )
}
