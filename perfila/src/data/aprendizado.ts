/** Capas dos cursos e a vitrine de guias de expedicao. */

/**
 * Paleta de capas. Sao tons do proprio sistema (nunca cores avulsas),
 * aplicados em rodizio para diferenciar os cards sem poluir a tela.
 *
 * Fica aqui, e nao no banco: cor de capa e apresentacao, e pedir ao Valmer que
 * escolha um hexadecimal ao publicar um curso seria transformar decisao de
 * design em campo de formulario.
 */
const CAPAS = [
  'var(--color-ink)',
  'var(--color-accent)',
  'var(--color-text-secondary)',
  'var(--color-accent-hover)',
  'var(--color-text-muted)',
  'var(--color-info)',
]

/** A capa do enesimo curso da lista, em rodizio. */
export function capaDoCurso(indice: number): string {
  return CAPAS[indice % CAPAS.length]!
}

/*
 * NAO EXISTE MAIS `cursos` NEM `cursosDestaque` AQUI.
 *
 * Eram seis, depois quatro, titulos escritos no codigo: "Curso de Lideranca",
 * "Manual do Vendedor", "Contratacao Estrategica" e "Coach de Carreira" — todos
 * herdados da plataforma de referencia, um deles vendendo o livro de terceiro
 * "Decifre e Influencie Pessoas" na tela do parceiro. A tela de Certificacoes
 * era 100%% falsa: cada botao "Acessar" so abria um toast dizendo que o acesso
 * nao estava disponivel, porque curso nenhum daquela lista existia.
 *
 * O curso agora e o do Valmer e mora em tabela (`db/schema/cursos.ts`): ele
 * publica em /admin/cursos e /facilitador/certificacoes le o que foi PUBLICADO,
 * por `lib/ead.cursosPublicados()`. Mesmo caminho que o EAD ja tinha feito.
 * Nenhum curso de terceiro volta para este arquivo — saiu a pedido dele em
 * 23/09/2026.
 */

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
