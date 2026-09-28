/**
 * Tipos psicologicos (Jung) — textos fixos da camada 2.
 *
 * Fontes: blueprint secao 12 (polos e eixos) e paginas 17-22 do molde (o que
 * nao depende do escore). Os percentuais, o tipo e a hierarquia saem do
 * motor; aqui fica so o que se le igual para qualquer pessoa. O texto
 * introdutorio da pagina 17 esta em `textos-fixos.ts`.
 */
import type { EixoJung } from '../inventario-mc'
import type { Status } from './status'

export type PoloJung = 'E' | 'I' | 'N' | 'S' | 'T' | 'F'
/** As quatro funcoes; E/I e atitude, nao funcao. */
export type FuncaoJung = 'N' | 'S' | 'T' | 'F'

export type DescricaoPolo = {
  polo: PoloJung
  eixo: EixoJung
  nome: string
  /** Frase curta da tabela da secao 12. */
  resumo: string
  /** Definicao do cartao das paginas 18-20. */
  definicao: string
  /** Os quatro marcadores do cartao das paginas 18-20. */
  caracteristicas: readonly [string, string, string, string]
}

export const POLOS_JUNG: Record<PoloJung, DescricaoPolo> = {
  E: {
    polo: 'E', eixo: 'EI', nome: 'Extroversão',
    resumo: 'Energia vem do contato externo. Pensa enquanto fala.',
    definicao: 'Preferência por direcionar energia para o mundo externo, para as pessoas e para a ação.',
    caracteristicas: [
      'Pensa enquanto fala e organiza ideias por meio da interação',
      'Busca estímulo, movimento e troca com outras pessoas',
      'Tende a agir com rapidez e aprender pela experiência',
      'Recupera energia em ambientes com contato e participação',
    ],
  },
  I: {
    polo: 'I', eixo: 'EI', nome: 'Introversão',
    resumo: 'Energia vem da elaboração interna. Pensa antes de falar.',
    definicao: 'Preferência por direcionar energia para o mundo interno, para a reflexão e para a elaboração pessoal.',
    caracteristicas: [
      'Pensa antes de falar e prefere organizar ideias internamente',
      'Valoriza profundidade, concentração e autonomia',
      'Tende a observar antes de agir',
      'Recupera energia em momentos de silêncio e menor estímulo',
    ],
  },
  N: {
    polo: 'N', eixo: 'NS', nome: 'Intuição',
    resumo: 'Capta padrões e possibilidades. Foca no futuro.',
    definicao: 'Preferência por perceber possibilidades, padrões, conexões e significados além do que está imediatamente visível.',
    caracteristicas: [
      'Foca no futuro e no que pode ser criado',
      'Conecta informações aparentemente distantes',
      'Valoriza conceitos, inovação e visão global',
      'Pode perder interesse em detalhes repetitivos ou muito operacionais',
    ],
  },
  S: {
    polo: 'S', eixo: 'NS', nome: 'Sensação',
    resumo: 'Capta fatos concretos. Foca no presente e no verificável.',
    definicao: 'Preferência por perceber fatos concretos, experiências observáveis e informações captadas de forma prática.',
    caracteristicas: [
      'Foca no presente e no que pode ser comprovado',
      'Valoriza detalhes, sequência e aplicabilidade',
      'Aprende melhor com exemplos e experiências reais',
      'Tende a confiar em procedimentos que já demonstraram resultado',
    ],
  },
  T: {
    polo: 'T', eixo: 'TF', nome: 'Pensamento',
    resumo: 'Decide por critério lógico e causa-efeito. Analítico.',
    definicao: 'Preferência por tomar decisões com base em critérios lógicos, coerência e análise objetiva.',
    caracteristicas: [
      'Compara alternativas por causa, efeito e resultado',
      'Busca justiça por meio de regras e critérios consistentes',
      'Consegue separar o problema da relação pessoal',
      'Pode parecer direto ou distante quando está concentrado na solução',
    ],
  },
  F: {
    polo: 'F', eixo: 'TF', nome: 'Sentimento',
    resumo: 'Decide por valores e impacto humano. Empático.',
    definicao: 'Preferência por tomar decisões considerando valores, impacto humano e harmonia nas relações.',
    caracteristicas: [
      'Avalia como a decisão afetará as pessoas envolvidas',
      'Busca coerência com princípios e valores pessoais',
      'Percebe nuances emocionais e relacionais',
      'Pode adiar conversas difíceis para preservar a harmonia',
    ],
  },
}

export type DescricaoEixo = {
  eixo: EixoJung
  numero: 1 | 2 | 3
  /** Atitude, Percepcao, Julgamento. */
  nome: string
  /** Coluna "O que mede" da secao 12. */
  oQueMede: string
  pagina: 18 | 19 | 20
  /** Cartao do eixo na pagina 17. */
  tituloPagina17: string
  textoPagina17: string
  /** Cabecalho da pagina do eixo. */
  sobretitulo: string
  titulo: string
  subtitulo: string
}

export const EIXOS_RELATORIO: Record<EixoJung, DescricaoEixo> = {
  EI: {
    eixo: 'EI', numero: 1, nome: 'Atitude', oQueMede: 'De onde vem a energia', pagina: 18,
    tituloPagina17: 'Extroversão ou introversão',
    textoPagina17: 'Atitude. De onde vem a energia: do contato com o mundo externo, ou do recolhimento e da elaboração interna.',
    sobretitulo: 'Eixo 1 · Atitude',
    titulo: 'Extroversão e Introversão',
    subtitulo: 'De onde vem a energia. Os dois polos existem em você, e o mais forte indica apenas o que a mente aciona primeiro.',
  },
  NS: {
    eixo: 'NS', numero: 2, nome: 'Percepção', oQueMede: 'Como a informação é captada', pagina: 19,
    tituloPagina17: 'Intuição ou sensação',
    textoPagina17: 'Percepção. Como a informação é captada: pelo padrão e pela possibilidade, ou pelo fato concreto e verificável.',
    sobretitulo: 'Eixo 2 · Percepção',
    titulo: 'Intuição e Sensação',
    subtitulo: 'Como a informação é captada antes de virar decisão.',
  },
  TF: {
    eixo: 'TF', numero: 3, nome: 'Julgamento', oQueMede: 'Como a decisão é tomada', pagina: 20,
    tituloPagina17: 'Pensamento ou sentimento',
    textoPagina17: 'Julgamento. Como a decisão é tomada: por critério lógico, ou por valor pessoal e impacto nas pessoas.',
    sobretitulo: 'Eixo 3 · Julgamento',
    titulo: 'Pensamento e Sentimento',
    subtitulo: 'Como a decisão é tomada depois que a informação foi captada.',
  },
}

/** Rotulos fixos das paginas 18-20. */
export const ROTULOS_PAGINA_EIXO = {
  poloPredominante: 'POLO PREDOMINANTE',
  poloComplementar: 'POLO COMPLEMENTAR',
  seuPoloPredominante: 'Seu polo predominante',
  poloComplementarCartao: 'Polo complementar',
  comoAparece: 'Como aparece em você',
  aplicacao: 'Aplicação no trabalho',
} as const

/** Pagina 21: o que cada posicao da hierarquia significa. */
export const POSICOES_HIERARQUIA = [
  { posicao: 1, nome: 'Dominante', texto: 'A mais consciente e mais usada. Opera com naturalidade e é reconhecida por quem convive com você.' },
  { posicao: 2, nome: 'Auxiliar', texto: 'Equilibra a dominante trazendo a outra metade do processo. Sem ela, a dominante opera sem contrapeso.' },
  { posicao: 3, nome: 'Terciária', texto: 'Menos desenvolvida. Aparece com esforço consciente e amadurece ao longo da vida adulta.' },
  { posicao: 4, nome: 'Inferior', texto: 'A menos consciente das quatro. Aparece de forma primitiva sob estresse, e está detalhada na página 22.' },
] as const

/**
 * Pagina 21, blocos fixos.
 *
 * `comoAOrdemEDeterminada` do molde descreve a regra antiga ("a de maior
 * escore dentro do seu par"). A v2.2 decide pela CLAREZA do eixo (|%N - 50|
 * contra |%T - 50|, empate vai para percepcao) e o motor segue a v2.2. O texto
 * do molde fica registrado, mas a pagina deve usar `comoAOrdemEDeterminadaV22`
 * (rascunho) ate o Valmer aprovar a redacao.
 */
export const PAGINA_21 = {
  sobretitulo: 'Estrutura',
  titulo: 'A sua hierarquia funcional',
  /** Vem depois de "Tipo <dominante>." */
  intro: 'A ordem abaixo não vem da comparação direta de escores, e sim da estrutura de opostos do modelo.',
  tituloOrdem: 'Como a ordem é determinada',
  comoAOrdemEDeterminadaMolde: 'A dominante é a de maior escore dentro do seu par. A auxiliar pertence obrigatoriamente ao par oposto, para que percepção e julgamento estejam ambos representados. A terciária é a oposta da auxiliar, e a inferior é a oposta da dominante.',
  comoAOrdemEDeterminadaV22: 'A dominante é a função do eixo mais nítido: entre percepção e julgamento, vence o que fica mais longe do meio da escala, e ela recebe a sua atitude. A auxiliar pertence obrigatoriamente ao outro eixo, com a atitude oposta, para que percepção e julgamento estejam ambos representados. A terciária é a oposta da auxiliar, e a inferior é a oposta da dominante.',
  statusV22: 'rascunho' as Status,
  fechoOrdem: 'A hierarquia decorre da estrutura de opostos proposta por Jung, e não do tamanho relativo dos números.',
  tituloRegraDeLeitura: 'Uma regra de leitura',
  regraDeLeitura: 'Cada par soma exatamente 100, o que significa que escores de eixos diferentes não são comparáveis entre si.',
  tituloGrauDeCerteza: 'Grau de certeza desta leitura.',
  grauDeCerteza: (nomeDaDominante: string) =>
    `A denominação ${nomeDaDominante} e a ordem das quatro funções são uma leitura derivada da regra interna do instrumento, e não uma classificação definitiva. Use a hierarquia como hipótese de trabalho e confirme na devolutiva se ela descreve a sua experiência.`,
} as const

/**
 * Pagina 22 — a funcao inferior sob pressao.
 *
 * O molde so mostra Sensacao como inferior (o Valmer e de dominante
 * Intuicao). As outras tres manifestacoes foram redigidas aqui.
 */
export const MANIFESTACAO_INFERIOR: Record<FuncaoJung, { texto: string; status: Status }> = {
  S: { status: 'transcrito', texto: 'A manifestação típica é a fixação em um detalhe concreto, com checagem repetida do mesmo ponto e apego ao literal.' },
  N: { status: 'rascunho', texto: 'A manifestação típica é a leitura sombria do futuro: pressentimento de que algo vai dar errado, suspeita sem base e conclusões tiradas de sinais soltos.' },
  T: { status: 'rascunho', texto: 'A manifestação típica é a crítica dura e fora de hora, com julgamento frio de si e dos outros e a necessidade de provar que tem razão.' },
  F: { status: 'rascunho', texto: 'A manifestação típica é a emoção que transborda: mágoa desproporcional, sensação de não ter sido considerado e leitura pessoal de fatos que não eram pessoais.' },
}

export const PAGINA_22 = {
  sobretitulo: 'Sob pressão',
  titulo: 'O lado que aparece sob pressão',
  rotuloFuncaoInferior: 'Função inferior',
  tituloOndeMora: 'Onde ela mora.',
  ondeMora: 'A função inferior é a oposta da dominante.',
  tituloOQueAtiva: 'O que a ativa.',
  /**
   * O molde diz "forma habitual de perceber" porque a dominante do exemplo e
   * de percepcao. Para dominante de julgamento a palavra vira "decidir"
   * (adaptacao minima, rascunho).
   */
  oQueAtiva: (dominanteDePercepcao: boolean) =>
    `Cansaço acumulado, pressão sustentada por semanas e, principalmente, situações em que a sua forma habitual de ${dominanteDePercepcao ? 'perceber' : 'decidir'} não resolve o problema.`,
  tituloComoAparece: 'Como aparece em você.',
  tituloSinais: 'Três sinais de que ela assumiu',
  sinais: [
    'Você está preso a um detalhe que, se alguém perguntasse, classificaria como irrelevante',
    'A intensidade da sua reação surpreende quem já conhece você bem',
    'Depois de passar, sobra um desconforto difuso',
  ],
  tituloCuidado: 'Um cuidado necessário.',
  cuidado: 'Cansaço persistente que não melhora com descanso não é assunto deste instrumento. Se for o caso, deve ser avaliado clinicamente.',
} as const
