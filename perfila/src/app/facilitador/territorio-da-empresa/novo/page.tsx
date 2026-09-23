'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { AutoGrid } from '@/components/ui/Layout'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

export default function NovoDnaPage() {
  const { toast } = useToast()
  const router = useRouter()

  // A volta para a lista continua: o cliente já conhece esse caminho. O que
  // muda é o aviso, que não promete mais uma gravação que não existe.
  function salvar() {
    router.push('/facilitador/territorio-da-empresa')
    toast('Território ainda não é salvo: esta tela ainda não grava', 'aviso')
  }

  return (
    <>
      <BackLink href="/facilitador/territorio-da-empresa">Voltar para Território da Empresa</BackLink>

      <PageHeader
        title="Novo território"
        subtitle="Dê um nome à empresa e vincule grupos de mapeamento e inventários."
      />

      <AutoGrid min={300} alignStart>
        <div className={styles.coluna}>
          <Card padding="lg" className={styles.formulario}>
            <Field label="Nome">{(id) => <Input id={id} placeholder="Nome do território" />}</Field>
            <Field label="Descrição">
              {(id) => <Textarea id={id} rows={3} placeholder="Digite aqui…" />}
            </Field>
          </Card>

          <Card padding="none">
            <CardHeader
              title="Grupos de Mapeamento"
              actions={
                <Button
                  size="sm"
                  icon={<Icon name="plus" />}
                  onClick={() => toast('Vincular grupo ainda não disponível', 'aviso')}
                >
                  Adicionar grupo
                </Button>
              }
            />
            <EmptyState>Nenhum grupo vinculado.</EmptyState>
          </Card>

          <Card padding="none">
            <CardHeader
              title="Inventário"
              actions={
                <>
                  <IconButton
                    icon="refresh"
                    label="Atualizar"
                    variant="outline"
                    onClick={() => toast('Atualizar inventário ainda não disponível', 'aviso')}
                  />
                  <Button
                    size="sm"
                    icon={<Icon name="plus" />}
                    onClick={() => toast('Adicionar inventário ainda não disponível', 'aviso')}
                  >
                    Adicionar inventário
                  </Button>
                </>
              }
            />
            <EmptyState>Nenhum registro.</EmptyState>
          </Card>

          <div className={styles.acoes}>
            <Button href="/facilitador/territorio-da-empresa" variant="ghost">
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvar}>
              Salvar território
            </Button>
          </div>
        </div>

        <Card>
          <div className={styles.explicacaoTitulo}>O que é um Território da Empresa?</div>
          <p className={ui.prose}>
            O Território da Empresa consolida os perfis DISC de uma equipe e mostra o
            comportamento predominante dela. Vincule um grupo de mapeamento para importar os
            respondentes automaticamente.
          </p>
        </Card>
      </AutoGrid>
    </>
  )
}
