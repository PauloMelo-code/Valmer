import { notFound } from 'next/navigation'

import { TabelaAssessments } from '@/components/assessments/TabelaAssessments'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { TableFooter } from '@/components/ui/Table'
import { getTipoRelatorio } from '@/data/planos'
import { obter } from '@/lib/actions/turmas'
import { assessmentsDaTurma } from '@/lib/painel'
import { AcoesTurma } from './AcoesTurma'

/**
 * Detalhe de uma turma: os mapas dela, com situação e link de cada um.
 *
 * A rota é por UUID, e nunca por apelido derivado do nome — "Turma 2026" de
 * dois parceiros daria o mesmo apelido, e uma colisão dessas é caminho de
 * vazamento, não inconveniência de URL (ver schema/turmas.ts).
 *
 * Server Component: as duas leituras já vêm com o recorte por dono no WHERE, e
 * o `notFound()` trata a turma de outro parceiro exatamente como a turma que
 * não existe. Esconder a diferença é o ponto: um 403 confirmaria que aquele
 * uuid é de alguém.
 *
 * A tabela é a MESMA da lista de mapas (`TabelaAssessments`), com o copiar
 * link e o ver relatório que já funcionam ali. Uma segunda tabela só para esta
 * tela teria a própria versão de "o que é um mapa concluído".
 */
export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const turma = await obter(id)
  if (!turma) notFound()

  const mapas = await assessmentsDaTurma(turma.id)
  const respondidos = mapas.filter((mapa) => mapa.situacao === 'concluido').length
  const pendentes = mapas.filter((mapa) => mapa.situacao !== 'concluido')

  // O que volta ao saldo é o que foi cobrado de cada mapa, e não o preço de
  // hoje do nível: a action estorna por `creditos_usados`, e a confirmação
  // precisa prometer o mesmo número que ela vai devolver.
  const creditosAVoltar = pendentes.reduce((soma, mapa) => soma + mapa.creditosUsados, 0)

  // Quem COMECOU a responder entra na conta de "pendente", porque nao concluiu.
  // Mas remover um mapa com 27 das 28 questoes respondidas joga fora trabalho
  // de uma pessoa real, e ela nao tem como refazer: o link some junto. A
  // confirmacao separa os dois numeros para o operador decidir sabendo — o
  // pedido normal e limpar quem nunca abriu, e nao quem parou no fim.
  const emAndamento = mapas.filter((mapa) => mapa.situacao === 'em_andamento').length

  return (
    <>
      <BackLink href="/facilitador/grupos-de-mapeamento">Voltar para grupos de mapeamento</BackLink>

      <PageHeader
        title={turma.nome}
        subtitle={`${respondidos} de ${mapas.length} respondidos · ${turma.tipo_relatorio} ${getTipoRelatorio(turma.tipo_relatorio).nome}`}
        actions={
          <>
            <Button
              href={`/api/exportar/turma?turma=${turma.id}`}
              download
              icon={<Icon name="download" />}
            >
              Baixar respostas
            </Button>
            <AcoesTurma
              turmaId={turma.id}
              nome={turma.nome}
              pendentes={pendentes.length}
              emAndamento={emAndamento}
              creditos={creditosAVoltar}
            />
            <Button
              href="/facilitador/envio-expresso"
              variant="primary"
              icon={<Icon name="plus" />}
            >
              Enviar passaportes
            </Button>
          </>
        }
      />

      <Card padding="none" scrollX>
        {mapas.length > 0 ? (
          <TabelaAssessments itens={mapas} />
        ) : (
          <EmptyState>
            <p>
              Este grupo ainda não recebeu passaportes. O Envio Expresso cria vários de uma vez,
              todos ligados a ele.
            </p>
            <Button href="/facilitador/envio-expresso" variant="primary" icon={<Icon name="plus" />}>
              Enviar passaportes
            </Button>
          </EmptyState>
        )}

        <TableFooter>
          {mapas.length === 0
            ? 'Nenhum passaporte'
            : `${mapas.length} passaporte(s) · ${pendentes.length} aguardando resposta`}
        </TableFooter>
      </Card>
    </>
  )
}
