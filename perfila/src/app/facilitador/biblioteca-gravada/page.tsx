import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { trilhaPublicada } from '@/lib/ead'
import { PRAZO_VIDEO_SEGUNDOS, urlAssinadaOuNula } from '@/lib/storage'
import { duracaoLegivel } from '@/lib/text'
import { Trilha } from './Trilha'

/**
 * Treinamento: o ESPELHO do que o admin publicou.
 *
 * Até aqui esta tela era 100% falsa. Os sete títulos vinham de um array em
 * `data/aprendizado.ts`, a aula 1 estava marcada como concluída NO CÓDIGO
 * (`concluida: index === 0`), e por isso o "1 de 7 concluídos" era constante de
 * build: o mesmo número para todo parceiro, para sempre. A duração "07:05 ·
 * Vimeo" estava escrita à mão, e cada linha era um botão que só mostrava um
 * toast. Agora tudo sai de `curso_modulos` e `curso_aulas`, e só de curso
 * publicado — o recorte vive em `lib/ead.ts:trilhaPublicada`.
 *
 * Server Component: a leitura e a assinatura das URLs acontecem aqui, depois da
 * guarda de sessão do layout de /facilitador. O banco guarda a CHAVE do objeto;
 * a URL nasce nesta renderização e morre no prazo — ver `lib/storage.ts`.
 *
 * NÃO HÁ PROGRESSO POR PESSOA, e por isso o contador mostra o total real em vez
 * de um número inventado. Marcar aula como concluída é dado DO PARCEIRO, com
 * tabela e dono próprios, e é uma segunda entrega.
 *
 * ponytail: assina a URL de todas as aulas de uma vez. Com o catálogo de hoje
 * (dezenas de aulas) é barato; se ele crescer para centenas, o caminho é assinar
 * sob demanda, no clique, por uma action de uma linha.
 */
export default async function EadPage() {
  const trilha = await trilhaPublicada()

  const itens = trilha.flatMap((curso) =>
    curso.modulos.flatMap((modulo, indiceModulo) =>
      modulo.aulas.map((aula) => ({
        id: aula.id,
        curso: curso.titulo,
        modulo: `Módulo ${String(indiceModulo + 1).padStart(2, '0')} · ${modulo.titulo}`,
        titulo: aula.titulo,
        duracao: duracaoLegivel(aula.duracao_segundos),
        chave: aula.video_chave,
      })),
    ),
  )

  // Aula sem `video_chave` é aula ainda não gravada, e ela CONTINUA na lista,
  // marcada como pendente: sumir faria o parceiro não saber que ela existe.
  //
  // "Sem gravação" e "gravação existe mas o armazenamento não respondeu" são
  // ESTADOS DIFERENTES, e antes caíam os dois em "Pendente". Com o MinIO fora
  // do ar a trilha inteira aparecia como não gravada — o parceiro concluía que
  // a Impacto Academy não publicou nada, quando o problema era temporário e do
  // nosso lado.
  const aulas = await Promise.all(
    itens.map(async ({ chave, ...item }) => {
      if (!chave) return { ...item, video: null, estado: 'pendente' as const }
      const video = await urlAssinadaOuNula(chave, PRAZO_VIDEO_SEGUNDOS)
      return { ...item, video, estado: video ? ('no-ar' as const) : ('indisponivel' as const) }
    }),
  )

  return (
    <>
      <PageHeader
        title="Biblioteca Gravada"
        subtitle="Capacitação oficial para analistas Impacto Academy."
      />

      {aulas.length === 0 ? (
        <Card padding="none">
          <EmptyState>
            Nenhuma aula publicada ainda. Assim que a Impacto Academy publicar um curso, o
            programa aparece aqui.
          </EmptyState>
        </Card>
      ) : (
        <Trilha aulas={aulas} />
      )}
    </>
  )
}
