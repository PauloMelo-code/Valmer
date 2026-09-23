import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import ui from '@/styles/common.module.css'

export default function NaoEncontrado() {
  return (
    <>
      <PageHeader
        title="Página não encontrada"
        subtitle="O endereço acessado não existe ou o registro foi removido."
        actions={
          <Button href="/facilitador" variant="primary">
            Ir para o Painel de Comando
          </Button>
        }
      />
      <Card>
        <p className={ui.prose}>
          Confira o link ou use o menu lateral para voltar a uma área da plataforma.
        </p>
      </Card>
    </>
  )
}
