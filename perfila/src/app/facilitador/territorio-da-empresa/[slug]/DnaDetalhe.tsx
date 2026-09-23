'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { FilterBar, Table, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { FATORES_DISC, mediasDisc, respondentes, type Dna, type FatorDisc } from '@/data/dna'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/** Classe de cor por fator, tanto no cartão quanto no chip da tabela. */
const CLASSE_FATOR: Record<FatorDisc, string> = {
  D: styles.fatorD!,
  I: styles.fatorI!,
  S: styles.fatorS!,
  C: styles.fatorC!,
}

const CLASSE_CHIP: Record<FatorDisc, string> = {
  D: styles.chipD!,
  I: styles.chipI!,
  S: styles.chipS!,
  C: styles.chipC!,
}

export function DnaDetalhe({ dna }: { dna: Dna }) {
  const { toast } = useToast()

  return (
    <>
      <BackLink href="/facilitador/territorio-da-empresa">Voltar para Território da Empresa</BackLink>

      <PageHeader
        title={dna.name}
        subtitle={`${dna.inventarios ?? 0} inventários · criado em ${dna.date.split(' ')[0]} por ${dna.by}`}
        actions={
          <>
            <Button
              icon={<Icon name="file" />}
              onClick={() => toast('Relatório do território ainda não disponível', 'aviso')}
            >
              Visualizar relatório
            </Button>
            <Button
              variant="primary"
              icon={<Icon name="download" />}
              onClick={() => toast('Download do PDF ainda não disponível', 'aviso')}
            >
              Baixar PDF
            </Button>
          </>
        }
      />

      {/* Médias do grupo em cada fator comportamental */}
      <AutoGrid min={200} gap={12}>
        {FATORES_DISC.map(({ fator, nome }) => (
          <Card key={fator} padding="sm" className={styles.fator}>
            <span className={`${styles.fatorLetra} ${CLASSE_FATOR[fator]}`}>{fator}</span>
            <div>
              <div className={styles.fatorNome}>{nome}</div>
              <div className={ui.metricSm}>{mediasDisc[fator]}</div>
            </div>
          </Card>
        ))}
      </AutoGrid>

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Buscar respondente" />}
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
            onClick={() => toast('Busca de respondentes ainda não disponível', 'aviso')}
          >
            Pesquisar
          </Button>
        </FilterBar>

        <Table>
          <thead>
            <tr>
              <Th>Respondente</Th>
              <Th>Perfil</Th>
              <Th>D · I · S · C</Th>
              <Th align="right">Respondido em</Th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {respondentes.map((pessoa) => (
              <Tr key={pessoa.email}>
                <Td dense>
                  <div className={ui.pessoa}>
                    <Avatar>{pessoa.iniciais}</Avatar>
                    <div>
                      <div className={ui.pessoaNome}>{pessoa.name}</div>
                      <div className={ui.pessoaEmail}>{pessoa.email}</div>
                    </div>
                  </div>
                </Td>
                <Td dense rotulo="Perfil">
                  <Pill tone="strong">{pessoa.perfil}</Pill>
                </Td>
                <Td dense rotulo="D · I · S · C">
                  <div className={styles.chips}>
                    <span className={`${styles.chip} ${CLASSE_CHIP.D}`} title="Dominância">
                      {pessoa.d}
                    </span>
                    <span className={`${styles.chip} ${CLASSE_CHIP.I}`} title="Influência">
                      {pessoa.i}
                    </span>
                    <span className={`${styles.chip} ${CLASSE_CHIP.S}`} title="Estabilidade">
                      {pessoa.s}
                    </span>
                    <span className={`${styles.chip} ${CLASSE_CHIP.C}`} title="Conformidade">
                      {pessoa.c}
                    </span>
                  </div>
                </Td>
                <Td dense align="right" muted rotulo="Respondido em">
                  {pessoa.date}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
