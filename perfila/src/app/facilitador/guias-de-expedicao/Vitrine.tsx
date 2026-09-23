'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.css'

export type MentorNaVitrine = {
  name: string
  role: string
  /** URL assinada da foto, quando o mentor tem conta na plataforma. */
  foto: string | null
}

/**
 * Os cards de mentor.
 *
 * Separado do `page.tsx` porque o botão de agendar precisa de estado no
 * navegador (o toast) e a foto precisa do servidor (a URL assinada nasce lá,
 * depois da checagem de sessão). São os dois lados da mesma tela: o servidor
 * decide o que mostrar, o cliente reage ao clique.
 */
export function Vitrine({ mentores }: { mentores: MentorNaVitrine[] }) {
  const { toast } = useToast()

  return (
    <AutoGrid min={240} max="320px" fill>
      {mentores.map((mentor) => (
        <Card key={mentor.name} padding="none" clip>
          {mentor.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.retrato} src={mentor.foto} alt={`Foto de ${mentor.name}`} />
          ) : (
            <div className={styles.foto}>Foto · {mentor.name}</div>
          )}
          <div className={styles.corpo}>
            <div className={styles.nome}>{mentor.name}</div>
            <p className={styles.especialidade}>{mentor.role}</p>
            <Button
              variant="dark"
              block
              className={styles.agendar}
              iconRight={<Icon name="chevR" />}
              onClick={() => toast('Agendamento com o guia ainda não disponível', 'aviso')}
            >
              Agendar com o guia
            </Button>
          </div>
        </Card>
      ))}
    </AutoGrid>
  )
}
