/** Os cursos das Certificações e os guias de expedição. */

/**
 * Paleta de capas. São tons do próprio sistema (nunca cores avulsas),
 * aplicados em rodízio para diferenciar os cards sem poluir a tela.
 */
const CAPAS = [
  'var(--color-ink)',
  'var(--color-accent)',
  'var(--color-text-secondary)',
  'var(--color-accent-hover)',
  'var(--color-text-muted)',
  'var(--color-info)',
]

export type Curso = {
  title: string
  desc: string
  /** Sigla exibida na miniatura do Painel de Comando. */
  abbr: string
  capa: string
}

/**
 * Quatro cursos, e não seis. "Masterclass Anual" e "Curso de Relacionamentos"
 * saíram a pedido do Valmer em 23/09/2026 — o primeiro anunciava Iane Parente,
 * pessoa real que já tinha saído da lista de mentores pelo mesmo motivo, e o
 * segundo veio junto no mesmo pedido. Os outros quatro ficam até o catálogo
 * próprio da Impacto ser entregue. Ninguém volta para esta lista sem o aval dele.
 */
const cursosBase: Omit<Curso, 'capa'>[] = [
  {
    title: 'Curso de Liderança',
    desc: 'Treinamento baseado no best-seller Decifre e Influencie Pessoas, para extrair o máximo do seu time.',
    abbr: 'CL',
  },
  {
    title: 'Manual do Vendedor',
    desc: 'Método prático para vender mais com base no perfil comportamental do cliente.',
    abbr: 'MV',
  },
  {
    title: 'Contratação Estratégica',
    desc: 'Como usar o DISC para contratar as pessoas certas para os cargos certos.',
    abbr: 'CE',
  },
  {
    title: 'Coach de Carreira',
    desc: 'Entenda o comportamento do seu coachee e crie novas oportunidades de negócios.',
    abbr: 'CC',
  },
]

export const cursos: Curso[] = cursosBase.map((curso, index) => ({
  ...curso,
  capa: CAPAS[index % CAPAS.length]!,
}))

/** Os três primeiros cursos aparecem resumidos no Painel de Comando. */
export const cursosDestaque = cursos.slice(0, 3)

export type Mentor = {
  name: string
  role: string
  /**
   * O e-mail da conta dele na plataforma, quando existe.
   *
   * E por ele que a vitrine acha a foto, e nao pelo `name`. Casar pessoa por
   * nome de exibicao falha calado: no banco esta "Valmer Albuquerque dos
   * Santos" e no card esta "Valmer Albuquerque", entao a foto nunca apareceria
   * — e no dia em que aparecesse, bastaria alguem encurtar o nome no cadastro
   * para ela sumir de novo. E-mail e unico por indice e nao muda por gosto.
   */
  contaEmail?: string
}

/**
 * Só o Valmer. Os três nomes anteriores — Iane Parente, Elyano Veras e Dani
 * Pires — vieram da plataforma antiga e saíram a pedido dele em 10/09/2026:
 * eram pessoas reais anunciadas como mentoras da Impacto Academy sem que isso
 * tivesse sido combinado. Ninguém volta para esta lista sem o aval dele.
 */
export const mentores: Mentor[] = [
  {
    name: 'Valmer Albuquerque',
    role: 'Impacto Academy · Perfil Comportamental',
    contaEmail: 'valmersantos1@gmail.com',
  },
]

/**
 * NAO EXISTE MAIS `aulasEad` NEM `eadProgresso` AQUI.
 *
 * Eram sete titulos num array literal, com a aula 1 marcada como concluida no
 * proprio codigo (`concluida: index === 0`). O contador "1 de 7 concluidos" era
 * constante de build: o mesmo numero para todo parceiro, para sempre — e a
 * duracao "07:05 · Vimeo" estava escrita a mao.
 *
 * O programa agora e tabela (`db/schema/ead.ts`): o admin cadastra modulo e
 * aula em /admin/cursos e /facilitador/biblioteca-gravada le o que foi PUBLICADO, por
 * `lib/ead.ts`. Nada de EAD volta para este arquivo.
 */
