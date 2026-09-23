'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar, RowActions, Table, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { dnas } from '@/data/dna'
import styles from './page.module.css'

/**
 * Os DNAs são lista fixa de `@/data`, sem tabela no banco. Abrir o detalhe é a
 * única ação que existe de verdade; as outras avisam o que ainda falta.
 */
export default function DnaPage() {
  const { toast } = useToast()

  return (
    <>
      <PageHeader
        title="Território da Empresa"
        subtitle="Mapeie o perfil coletivo das empresas a partir dos inventários respondidos."
        actions={
          <Button href="/facilitador/territorio-da-empresa/novo" variant="primary" icon={<Icon name="plus" />}>
            Adicionar território
          </Button>
        }
      />

      <Card padding="none" scrollX>
        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => <Input id={id} placeholder="Buscar por nome" />}
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
            onClick={() => toast('Busca de territórios ainda não disponível', 'aviso')}
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
            {dnas.map((dna) => (
              <Tr key={dna.slug}>
                <Td>
                  <Link href={`/facilitador/territorio-da-empresa/${dna.slug}`} className={tableStyles.linkCell}>
                    {dna.name}
                  </Link>
                  <div className={`${tableStyles.secondary} ${styles.idioma}`}>
                    <span className={styles.bandeira} aria-hidden />
                    Português (BR)
                  </div>
                </Td>
                <Td rotulo="Inventários">
                  <span className={styles.inventarios}>{dna.inventarios ?? '—'}</span>
                </Td>
                <Td muted rotulo="Criado por">{dna.by}</Td>
                <Td muted rotulo="Criado em">{dna.date}</Td>
                <Td align="right">
                  <RowActions>
                    <IconButton icon="eye" label="Abrir" href={`/facilitador/territorio-da-empresa/${dna.slug}`} />
                    <IconButton
                      icon="edit"
                      label="Editar"
                      onClick={() => toast('Edição do território ainda não disponível', 'aviso')}
                    />
                    <IconButton
                      icon="file"
                      label="Ver relatório"
                      onClick={() => toast('Relatório do território ainda não disponível', 'aviso')}
                    />
                    <IconButton
                      icon="chart"
                      label="Gráficos"
                      onClick={() => toast('Gráficos do território ainda não disponíveis', 'aviso')}
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
                      onClick={() =>
                        toast('Remover ainda não disponível: esta lista ainda não grava', 'aviso')
                      }
                    />
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  )
}
