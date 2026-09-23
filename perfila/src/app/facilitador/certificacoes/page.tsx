'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { cursos } from '@/data/aprendizado'
import styles from './page.module.css'

export default function CursosPage() {
  const { toast } = useToast()

  return (
    <>
      <PageHeader
        title="Certificações"
        subtitle="Formações para analistas, líderes e equipes."
      />

      <AutoGrid min={260} fill>
        {cursos.map((curso) => (
          <Card key={curso.title} padding="none" clip className={styles.curso}>
            <div className={styles.capa} style={{ background: curso.capa }}>
              <span className={styles.selo}>Curso online</span>
            </div>
            <div className={styles.corpo}>
              <div className={styles.titulo}>{curso.title}</div>
              <p className={styles.descricao}>{curso.desc}</p>
              <Button
                block
                className={styles.acessar}
                iconRight={<Icon name="ext" />}
                onClick={() => toast('Acesso ao curso ainda não disponível', 'aviso')}
              >
                Acessar
              </Button>
            </div>
          </Card>
        ))}
      </AutoGrid>
    </>
  )
}
