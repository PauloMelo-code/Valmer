/**
 * Textos das paginas 22 a 28 que o molde nao tem para todo avaliado.
 *
 * O molde foi escrito para UMA pessoa (o Valmer: dominante Intuicao, inferior
 * Sensacao, valores POL e ECO no topo). Onde o texto so vale para aquele
 * perfil, a pagina nao pode repeti-lo para todo mundo: aqui ficam as
 * variantes. O que veio do molde e 'transcrito'; o resto e original, em
 * 'rascunho' ate o Valmer aprovar (ADR-0007, D11). Nenhum texto traz numero:
 * escore entra pronto do view-model (`Medida.texto`).
 */
import type { Valor } from '../../inventario-mc'
import type { CodigoFaixaValor } from '../spranger'
import type { FuncaoJung, PoloJung } from '../jung'
import type { Status } from '../status'

export type TextoComStatus = { texto: string; status: Status }

// ---------------------------------------------------------------- pagina 22

/**
 * Resto do "Onde ela mora." depois de `PAGINA_22.ondeMora`. E a frase do
 * molde com os nomes trocados: a inferior e sempre a oposta da dominante no
 * mesmo eixo, entao a frase vale para os quatro casos sem mudar o sentido.
 */
export const ondeMoraComplemento = (dominante: string, inferior: string) =>
  `Como ${dominante} ocupa o comando do seu processo consciente, ${inferior} fica na região menos acessível. Ela não desapareceu: permanece pouco desenvolvida, e por isso opera de forma bruta quando é acionada.`

/** A terceira regulacao do molde nao depende da funcao: vale para as quatro. */
const REGULACAO_03 = 'Ter alguém com autorização explícita para dizer que você está reagindo além do evento. Autorização dada antes vale mais do que percepção oferecida depois.'

/**
 * Regulacoes 01-03 por funcao inferior (C20). O molde so tem Sensacao
 * inferior (dominante Intuicao). As outras tres seguem a mesma forma: nomear e
 * devolver o processo a dominante; entregar a funcao a quem a tem desenvolvida.
 */
export const REGULACOES_INFERIOR: Record<FuncaoJung, { itens: readonly [string, string, string]; status: Status }> = {
  S: {
    status: 'transcrito',
    itens: [
      'Nomear em voz alta que o assunto está grande demais para o tamanho dele. Nomear devolve o processo para a Intuição, que é onde você tem repertório.',
      'Devolver a checagem para quem tem essa função desenvolvida, em vez de tentar fazê-la você mesmo sob pressão.',
      REGULACAO_03,
    ],
  },
  N: {
    status: 'rascunho',
    itens: [
      'Separar em voz alta o que é fato do que é suposição. Voltar ao que pode ser verificado devolve o processo para a Sensação, que é onde você tem repertório.',
      'Pedir a quem tem essa função desenvolvida que leia os cenários com você, em vez de tentar prever sozinho, sob pressão, tudo o que pode dar errado.',
      REGULACAO_03,
    ],
  },
  T: {
    status: 'rascunho',
    itens: [
      'Nomear em voz alta que o julgamento está mais duro do que o fato pede. Nomear devolve o processo para o Sentimento, que é onde você tem repertório.',
      'Levar a análise fria para quem tem essa função desenvolvida, em vez de montar sozinho, sob pressão, a prova de que tem razão.',
      REGULACAO_03,
    ],
  },
  F: {
    status: 'rascunho',
    itens: [
      'Nomear em voz alta que a reação está maior do que o fato. Nomear devolve o processo para o Pensamento, que é onde você tem repertório.',
      'Levar a conversa sobre o impacto nas pessoas para quem tem essa função desenvolvida, em vez de resolvê-la sozinho sob pressão.',
      REGULACAO_03,
    ],
  },
}

// ---------------------------------------------------------------- pagina 24

/**
 * Legenda do grafico. A do molde (`PAGINA_24.legenda`) marca 30 e 65; na v2.2
 * as tracejadas ficam no inicio de cada faixa, 31 e 66 (C21), e o numero entra
 * de `FAIXAS_VALOR`.
 */
export const legendaPagina24 = (circunstancial: string, significativo: string) =>
  `Linhas tracejadas marcam os limites de ${circunstancial} e ${significativo} pontos. A intensidade da cor acompanha a classificação: cor cheia para significativo, tom reduzido para circunstancial e tom mais claro para indiferente.`

/**
 * Frase de cada faixa com a concordancia pelo numero de valores. O molde tem
 * uma forma so por faixa (a do Valmer: 2, 3 e 1 valores); a outra forma e o
 * mesmo texto com o verbo ajustado.
 */
export const FRASE_FAIXA_24: Record<CodigoFaixaValor, { um: string; varios: string; status: Status }> = {
  significativo: { status: 'rascunho', um: 'Direciona as suas escolhas mesmo quando você não percebe.', varios: 'Direcionam as suas escolhas mesmo quando você não percebe.' },
  circunstancial: { status: 'rascunho', um: 'Ativa conforme o momento de vida, sem constância.', varios: 'Ativam conforme o momento de vida, sem constância.' },
  indiferente: { status: 'rascunho', um: 'Gera pouca energia em você e pouca compreensão nos outros que o priorizam.', varios: 'Geram pouca energia em você e pouca compreensão nos outros que os priorizam.' },
}

export const FAIXA_VAZIA_24: TextoComStatus = { status: 'rascunho', texto: 'Nenhum valor nesta faixa.' }

// ---------------------------------------------------------------- pagina 25

/** "Onde aparece hoje." do cartao de valor (C23). `VALORES_RELATORIO` nao tem este campo; o molde so traz POL e ECO. */
export const ONDE_APARECE_VALOR: Record<Valor, TextoComStatus> = {
  POL: { status: 'transcrito', texto: 'Na escolha de projetos em que você tem autoridade para decidir e na resistência a arranjos em que a decisão precisa passar por muitas mãos.' },
  ECO: { status: 'transcrito', texto: 'Na impaciência com processos longos sem impacto visível e na preferência por ciclos com marco de conclusão mensurável.' },
  TEO: { status: 'rascunho', texto: 'Na vontade de entender a causa antes de aceitar a solução e na preferência por trabalhos em que ainda há algo novo a aprender.' },
  EST: { status: 'rascunho', texto: 'No cuidado com a forma do que entrega e com o ambiente em que trabalha, e no incômodo com o que é feito de qualquer jeito.' },
  SOC: { status: 'rascunho', texto: 'Na disponibilidade para ajudar quem está travado e na escolha de trabalhos em que o resultado melhora a vida de alguém.' },
  PRI: { status: 'rascunho', texto: 'Na atenção à coerência entre o que se diz e o que se faz, e na resistência a atalhos que contornam uma regra combinada.' },
}

// ---------------------------------------------------------------- pagina 26

/**
 * Frase curta por polo, para a linha "Processamento" (mapa de dados, TAB:polos
 * frase curta). A pagina junta as tres do tipo: "Pensa enquanto fala, capta
 * padrão antes do dado completo e decide por critério lógico." (molde).
 */
export const FRASE_CURTA_POLO: Record<PoloJung, TextoComStatus> = {
  E: { status: 'transcrito', texto: 'pensa enquanto fala' },
  N: { status: 'transcrito', texto: 'capta padrão antes do dado completo' },
  T: { status: 'transcrito', texto: 'decide por critério lógico' },
  I: { status: 'rascunho', texto: 'pensa antes de falar' },
  S: { status: 'rascunho', texto: 'confia no fato que pode ser verificado' },
  F: { status: 'rascunho', texto: 'decide pelo impacto nas pessoas' },
}

/** Frase curta por valor, para a linha "Valores": "Influência real sobre decisões e retorno concreto do esforço." (molde). */
export const FRASE_CURTA_VALOR: Record<Valor, TextoComStatus> = {
  POL: { status: 'transcrito', texto: 'influência real sobre decisões' },
  ECO: { status: 'transcrito', texto: 'retorno concreto do esforço' },
  TEO: { status: 'rascunho', texto: 'compreensão profunda do que faz' },
  EST: { status: 'rascunho', texto: 'harmonia e qualidade na experiência' },
  SOC: { status: 'rascunho', texto: 'contribuição real para as pessoas' },
  PRI: { status: 'rascunho', texto: 'coerência com os próprios princípios' },
}

// ---------------------------------------------------------------- pagina 27

/**
 * Legenda do cartao de lideranca. A do molde nomeava os quatro fatores
 * ("Direção e resultado · ..."), que a D6 trocou por estilos da v2.2; as
 * definicoes dos estilos sao pendencia do Valmer (C26), entao a legenda so diz
 * o que o numero e.
 */
export const LEGENDA_LIDERANCA: TextoComStatus = {
  status: 'rascunho',
  texto: 'Peso de cada estilo no perfil natural, em percentual do total dos quatro.',
}

/** Amplitude sem faixa qualitativa na v2.2 (C10): no lugar de "perfil de contorno nítido", a definicao do numero. */
export const DEFINICAO_AMPLITUDE: TextoComStatus = {
  status: 'rascunho',
  texto: 'distância entre o fator mais alto e o mais baixo',
}
