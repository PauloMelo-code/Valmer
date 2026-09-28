/**
 * Variantes de texto das paginas 01 a 07 que o molde nao traz.
 *
 * O molde foi escrito para um avaliado so (natural DI, adaptado CS). Onde a
 * frase muda com o perfil, a versao do molde vira uma das variantes e as
 * outras foram redigidas aqui, originais, no tom do Valmer. Tudo que nao e
 * copia do molde esta em `rascunho` e espera aprovacao (ADR-0007, D11).
 *
 * Funcoes puras sobre texto ja formatado: quem chama passa o rotulo do fator
 * ("DOMINANTE") e o escore ja escrito ("87,5"). Nenhuma faz conta de escore.
 */
import type { Fator } from '../../inventario-mc'
import type { Status } from '../status'

// ---------------------------------------------------------------- pagina 06

/**
 * "Leitura rapida" do painel escuro (C05): o que o ambiente pede a mais e a
 * menos, pelo que sobe e desce do natural para o adaptado. Sem IA: a frase e
 * um molde e os substantivos sao fixos por fator.
 *
 * S e C sao do molde ("metodo, cautela, estabilidade e acompanhamento");
 * D e I foram redigidos aqui.
 */
export const SUBSTANTIVOS_LEITURA_RAPIDA: Record<Fator, readonly string[]> = {
  D: ['ousadia', 'rapidez de decisão'],
  I: ['exposição', 'articulação com pessoas'],
  S: ['estabilidade', 'acompanhamento'],
  C: ['método', 'cautela'],
}

/**
 * `mais` e `menos` sao os substantivos ja juntados ("método, cautela e ...");
 * string vazia quando nenhum fator mudou naquele sentido. Variacao de classe
 * "baixa" (ate 10 pontos) nao entra: dizer que o ambiente "pede mais" por 4
 * pontos transformaria ruido em recado.
 */
export function leituraRapida(mais: string, menos: string): string {
  if (mais && menos) return `O ambiente atual pede mais ${mais} do que o seu padrão natural costuma entregar, e menos ${menos}.`
  if (mais) return `O ambiente atual pede mais ${mais} do que o seu padrão natural costuma entregar.`
  if (menos) return `O ambiente atual pede menos ${menos} do que o seu padrão natural costuma entregar.`
  return 'O ambiente atual pede praticamente o que o seu padrão natural já entrega: nenhum fator muda mais de 10 pontos entre o natural e o adaptado.'
}

/** Linha de apoio do painel quando nenhum fator e predominante (C08). */
export const SEM_FATOR_PREDOMINANTE = 'Nenhum fator a partir de 51'

// ---------------------------------------------------------------- pagina 07

/**
 * Subtitulo da pagina 07 (C08). O duplo e o do molde, com "acima de 50"
 * trocado por "a partir de 51", que e o limiar do motor (C41): 50,5 esta
 * acima de 50 e nao e predominante.
 */
export const SUBTITULO_07 = {
  duplo: (a: string, na: string, b: string, nb: string) =>
    `${a} em ${na} e ${b} em ${nb}. Dois fatores a partir de 51 caracterizam perfil duplo, e é este o repertório que você aciona sem esforço.`,
  /** Tres fatores passam de 51; o motor fica com os dois primeiros. */
  duploDeTres: (a: string, na: string, b: string, nb: string) =>
    `${a} em ${na} e ${b} em ${nb}, os dois mais altos entre três fatores a partir de 51. A combinação dos dois primeiros caracteriza o perfil duplo, e é este o repertório que você aciona sem esforço.`,
  puro: (a: string, na: string) =>
    `${a} em ${na}. Um único fator a partir de 51 caracteriza perfil puro, e é este o repertório que você aciona sem esforço.`,
  equilibrado: (a: string, na: string) =>
    `Nenhum fator chega a 51; o mais alto é ${a}, em ${na}. Sem um fator que se imponha, o repertório que você aciona sem esforço se distribui entre os quatro.`,
} as const

/** Titulo do cartao da direita, pelo numero de fatores que ele mostra. */
export const TITULO_CARTAO_07 = {
  duplo: 'Os dois fatores',
  puro: 'O fator predominante',
  equilibrado: 'Os dois mais altos',
} as const

/** Rotulo do arquetipo no cartao (D5, C06): o nome ja e o titulo da coluna. */
export const ROTULO_ARQUETIPO = 'Arquétipo'

/** Onde cada texto acima veio. */
export const STATUS_VARIANTES_01_07: Record<string, Status> = {
  'SUBSTANTIVOS_LEITURA_RAPIDA.S': 'transcrito',
  'SUBSTANTIVOS_LEITURA_RAPIDA.C': 'transcrito',
  'SUBSTANTIVOS_LEITURA_RAPIDA.D': 'rascunho',
  'SUBSTANTIVOS_LEITURA_RAPIDA.I': 'rascunho',
  leituraRapida: 'rascunho',
  SEM_FATOR_PREDOMINANTE: 'rascunho',
  'SUBTITULO_07.duplo': 'a confirmar',
  'SUBTITULO_07.duploDeTres': 'rascunho',
  'SUBTITULO_07.puro': 'rascunho',
  'SUBTITULO_07.equilibrado': 'rascunho',
  TITULO_CARTAO_07: 'rascunho',
  ROTULO_ARQUETIPO: 'rascunho',
}
