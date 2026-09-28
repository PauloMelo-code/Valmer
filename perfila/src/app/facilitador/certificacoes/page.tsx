import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { capaDoCurso } from '@/data/aprendizado'
import { cursosPublicados } from '@/lib/ead'
import styles from './page.module.css'

/**
 * Certificações: o ESPELHO do que o Valmer publicou.
 *
 * Até aqui esta tela era 100% falsa, o mesmo defeito que a Biblioteca Gravada
 * já tinha corrigido. Os quatro cursos vinham de um array em
 * `data/aprendizado.ts` — herdados da plataforma de referência, um deles
 * vendendo o livro de terceiro "Decifre e Influencie Pessoas" — e o botão
 * "Acessar" de cada card só abria um toast dizendo que o acesso não estava
 * disponível. Não estava porque curso nenhum daquela lista existia.
 *
 * Agora sai de `cursos`, e só de curso publicado: o recorte mora em
 * `lib/ead.cursosPublicados()`, e não aqui, senão um rascunho vaza pela próxima
 * tela que alguém escrever com pressa.
 *
 * Server Component: com a lista vindo do banco, o toast morreu e com ele a
 * necessidade de `'use client'`. O botão virou o que sempre deveria ter sido —
 * o caminho para as aulas, que moram na Biblioteca Gravada.
 */
export default async function CertificacoesPage() {
  const cursos = await cursosPublicados()

  return (
    <>
      <PageHeader
        title="Certificações"
        subtitle="Formações da Impacto Academy para analistas, líderes e equipes."
      />

      {cursos.length === 0 ? (
        <Card padding="none">
          <EmptyState>
            Nenhuma certificação publicada ainda. Assim que a Impacto Academy publicar um
            curso, ele aparece aqui.
          </EmptyState>
        </Card>
      ) : (
        <AutoGrid min={260} fill>
          {cursos.map((curso, indice) => (
            <Card key={curso.id} padding="none" clip className={styles.curso}>
              <div className={styles.capa} style={{ background: capaDoCurso(indice) }}>
                <span className={styles.selo}>Curso online</span>
              </div>
              <div className={styles.corpo}>
                <div className={styles.titulo}>{curso.titulo}</div>
                <p className={styles.descricao}>{curso.descricao}</p>
                {/* As aulas moram na Biblioteca Gravada, que é onde o vídeo é
                    servido por URL assinada. Um segundo player aqui seria a
                    mesma tela duas vezes. */}
                <Button
                  block
                  href="/facilitador/biblioteca-gravada"
                  className={styles.acessar}
                  iconRight={<Icon name="chevR" />}
                >
                  Ver as aulas
                </Button>
              </div>
            </Card>
          ))}
        </AutoGrid>
      )}
    </>
  )
}
