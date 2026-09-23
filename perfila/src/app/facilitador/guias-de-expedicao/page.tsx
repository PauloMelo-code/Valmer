import { and, eq, inArray } from 'drizzle-orm'

import { PageHeader } from '@/components/ui/PageHeader'
import { mentores } from '@/data/aprendizado'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema'
import { urlAssinadaOuNula } from '@/lib/storage'
import { Vitrine, type MentorNaVitrine } from './Vitrine'



/**
 * Vitrine de mentores.
 *
 * A lista continua vindo de `data/aprendizado.ts`, que é um arquivo fixo com
 * uma entrada — o Valmer. NÃO existe tabela de mentores, e este bloco não cria
 * uma: enquanto o mentor for o próprio dono da plataforma, a foto dele já está
 * gravada na conta de admin, e uma tabela nova seria uma segunda cópia do mesmo
 * nome e da mesma foto, para divergir na primeira edição.
 *
 * O casamento é por E-MAIL (`contaEmail` do mentor), e não por nome. Nome de
 * exibição falha calado: no banco o admin é "Valmer Albuquerque dos Santos" e
 * no card está "Valmer Albuquerque", então a versão por nome nunca mostraria
 * foto nenhuma — e o dia em que mostrasse, bastaria alguém encurtar o nome no
 * cadastro para ela sumir. E-mail tem índice único e não muda por gosto.
 *
 * Mentor sem `contaEmail`, ou com e-mail que não existe, mantém o retângulo.
 * Falhar para o lado do retângulo é deliberado: a alternativa é mostrar o
 * rosto de uma pessoa no card de outra.
 */
export default async function MentoresPage() {
  // Uma consulta só para todos os e-mails da lista, e não uma por mentor: a
  // vitrine cresce e uma consulta por card viraria N consultas por carga.
  const emails = mentores.map((mentor) => mentor.contaEmail).filter((e): e is string => Boolean(e))

  const contas = emails.length
    ? await db
        .select({ email: usuarios.email, imagem: usuarios.image })
        .from(usuarios)
        .where(and(inArray(usuarios.email, emails), eq(usuarios.is_deleted, false)))
    : []

  const porEmail = new Map(contas.map((conta) => [conta.email, conta.imagem]))

  const lista: MentorNaVitrine[] = await Promise.all(
    mentores.map(async (mentor) => ({
      ...mentor,
      foto: mentor.contaEmail
        ? await urlAssinadaOuNula(porEmail.get(mentor.contaEmail) ?? null)
        : null,
    })),
  )

  return (
    <>
      <PageHeader
        title="Guias de Expedição"
        subtitle="Conheça os profissionais que vão te guiar na jornada de sucesso."
      />

      <Vitrine mentores={lista} />
    </>
  )
}
