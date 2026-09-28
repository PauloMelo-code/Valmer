'use client'

import { useMemo, useState } from 'react'

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
import { getTipoRelatorio, tiposRelatorio, type CodigoRelatorio } from '@/data/planos'
import { dentroDoPeriodo } from '@/lib/filtro-grupos'
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

/** O mesmo texto que a linha mostra — é o que o filtro precisa casar. */
function rotuloTipo(codigo: CodigoRelatorio) {
  return `${codigo} · ${getTipoRelatorio(codigo).nome}`
}

/**
 * As opções do filtro de tipo saem dos níveis que EXISTEM (S1..S4), e não de
 * `opcoes.relatorioFiltro`: aquela lista fala "DISC" e "DISC + Tipos
 * Psicológicos + Valores", nomes que nenhum grupo tem gravado. Filtrar por eles
 * devolveria zero linha sempre — um filtro que esconde tudo é pior que nenhum,
 * porque parece que o parceiro não tem grupo.
 */
const TIPOS = ['Todos', ...tiposRelatorio.map((tipo) => rotuloTipo(tipo.codigo))]

const AREAS = ['Todas', ...Object.values(ROTULO_AREA)]

/**
 * A lista em si. As linhas já vieram do servidor com o recorte por dono
 * aplicado — aqui só há a interatividade, que é o que exige o cliente.
 *
 * O filtro é no cliente, como na lista de mapas e na de territórios: esconder
 * linha que já é da pessoa não precisa de ida nova ao banco, e uma consulta por
 * tecla digitada não melhoraria nada numa lista deste tamanho.
 *
 * "Experimente Grátis" continua avisando em vez de filtrar: não existe o campo
 * no cadastro do grupo nem tabela de degustação (ver `schema/turmas.ts`), então
 * ele só poderia esconder linha por engano. Aviso honesto vale mais.
 */
export function ListaTurmas({ itens }: { itens: ItemTurma[] }) {
  const { toast } = useToast()

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0]!)
  const [area, setArea] = useState(AREAS[0]!)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  function limpar() {
    setBusca('')
    setTipo(TIPOS[0]!)
    setArea(AREAS[0]!)
    setDe('')
    setAte('')
  }

  const filtrando =
    busca.trim() !== '' || tipo !== TIPOS[0] || area !== AREAS[0] || de !== '' || ate !== ''

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return itens.filter((turma) => {
      if (termo !== '' && !turma.nome.toLowerCase().includes(termo)) return false
      if (tipo !== TIPOS[0] && rotuloTipo(turma.tipo) !== tipo) return false
      if (area !== AREAS[0] && ROTULO_AREA[turma.area] !== area) return false
      return dentroDoPeriodo(turma.criadaEm, de, ate)
    })
  }, [itens, busca, tipo, area, de, ate])

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
            {/* Não existe "link do grupo": o link é do avaliado, um por
                passaporte, com o token que é a única credencial dele. A lista
                de todos os links do parceiro, com o copiar que já funciona em
                cada linha, é o acervo de mapas — este botão leva até lá em vez
                de prometer uma tela que seria a mesma. */}
            <Button href="/facilitador/acervo-de-mapas" icon={<Icon name="link" />}>
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
            {(id) => (
              <Input
                id={id}
                placeholder="Buscar por nome"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            )}
          </Field>
          {/* O campo fica, e continua dizendo a verdade: a escolha volta para
              "Todos" e o aviso explica que o dado não existe. Deixá-lo mudar de
              rótulo sem filtrar seria a tela mentindo em silêncio. */}
          <Field label="Experimente Grátis" className={tableStyles.filterLg}>
            {(id) => (
              <Select
                id={id}
                options={opcoes.degustacao}
                label="Experimente Grátis"
                value={opcoes.degustacao[0]}
                onChange={() =>
                  toast(
                    'Filtrar por Experimente Grátis ainda não é possível: o cadastro do grupo não tem esse campo.',
                    'aviso',
                  )
                }
              />
            )}
          </Field>
          <Field label="Tipo de relatório" className={tableStyles.filterXl}>
            {(id) => (
              <Select id={id} options={TIPOS} label="Tipo de relatório" value={tipo} onChange={setTipo} />
            )}
          </Field>
          <Field label="Finalidade" className={tableStyles.filterMd}>
            {(id) => <Select id={id} options={AREAS} label="Finalidade" value={area} onChange={setArea} />}
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
          {/* A lista filtra a cada tecla, como a de mapas e a de territórios:
              não sobrou nada para um "Pesquisar" fazer depois disso, e por isso
              ele saiu em vez de virar um clique sem efeito. Este devolve os
              campos — sem ele a lista continuaria filtrada por uma data que
              ninguém lembra de ter preenchido. */}
          <Button variant="dark" size="lg" onClick={limpar} disabled={!filtrando}>
            Limpar
          </Button>
        </FilterBar>

        {/* Tabela vazia é tela sem resposta: quem chega não sabe se ainda não
            criou grupo nenhum ou se o filtro escondeu tudo. Os dois casos têm
            mensagens diferentes de propósito, cada uma levando à ação que
            resolve o seu. */}
        {filtrados.length > 0 ? (
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
              {filtrados.map((turma) => {
                const pendentes = turma.total - turma.respondidos
                const completa = turma.total > 0 && pendentes === 0
                return (
                  <Tr key={turma.id}>
                    <Td>
                      <div className={tableStyles.primary}>{turma.nome}</div>
                      <div className={tableStyles.secondary}>{rotuloTipo(turma.tipo)}</div>
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
        ) : itens.length === 0 ? (
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
          <EmptyState>
            <p>
              Nenhum grupo corresponde ao filtro.{' '}
              {itens.length === 1
                ? 'Seu único grupo continua aqui.'
                : `Seus ${itens.length} grupos continuam aqui.`}
            </p>
            <Button variant="secondary" onClick={limpar}>
              Limpar filtros
            </Button>
          </EmptyState>
        )}

        <TableFooter
          actions={
            <>
              <IconButton icon="chevL" label="Página anterior" variant="pager" disabled />
              <IconButton icon="chevR" label="Próxima página" variant="pager" disabled />
            </>
          }
        >
          Mostrando {filtrados.length} de {itens.length}
        </TableFooter>
      </Card>
    </>
  )
}
