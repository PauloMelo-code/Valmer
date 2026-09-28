/**
 * Teoria de valores (Spranger) — textos fixos da camada 3.
 *
 * Fontes: blueprint secao 13 (os seis valores e as faixas) e paginas 23-25 do
 * molde. O escore, o nivel e o ranking saem do motor. O texto da pagina 23
 * esta em `textos-fixos.ts`; as faixas, aqui.
 *
 * O sexto valor e sempre PRI no codigo. O nome exibido e a pendencia T2
 * (Principios, Regulatorio ou Proposito e sentido) e mora numa constante so
 * (ADR-0007, D8). O molde ainda escreve REGULATORIO na pagina 24; a pagina
 * deve montar a frase com a constante, nunca com a palavra do molde.
 */
import type { Valor } from '../inventario-mc'

/** Pendencia T2. Trocar o nome exibido e mudar esta linha. */
export const NOME_EXIBIDO_PRI = 'Princípios'

export type DescricaoValor = {
  valor: Valor
  nome: string
  /** Segunda palavra da secao 15.4 ("Teorico · Conhecimento"); PRI nao tem. */
  tema: string | null
  /** Secao 13. */
  descricao: string
  /** Complemento da frase da pagina 24: "<NOME> <descricaoPagina24>." */
  descricaoPagina24: string
  /** Cartao da pagina 25 (so os dois valores predominantes aparecem). */
  subtituloPagina25: string
  oQueRepresenta: string
  risco: string
  /** Campos redigidos aqui; o molde so traz POL e ECO na pagina 25. */
  redigidos: readonly ('subtituloPagina25' | 'oQueRepresenta' | 'risco')[]
}

const CARTAO_25_REDIGIDO = ['subtituloPagina25', 'oQueRepresenta', 'risco'] as const

export const VALORES_RELATORIO: Record<Valor, DescricaoValor> = {
  TEO: {
    valor: 'TEO', nome: 'Teórico', tema: 'Conhecimento',
    descricao: 'Motivado por descoberta, aprendizado e verdade. Prazer intelectual e busca por conhecimento.',
    descricaoPagina24: 'busca conhecimento e compreensão',
    subtituloPagina25: 'CONHECIMENTO E COMPREENSÃO',
    oQueRepresenta: 'Entender como as coisas funcionam, aprender de forma contínua e decidir com base no que é verdadeiro.',
    risco: 'Adiar a ação enquanto ainda há algo a estudar, e valorizar a ideia mais do que a entrega.',
    redigidos: CARTAO_25_REDIGIDO,
  },
  ECO: {
    valor: 'ECO', nome: 'Econômico', tema: 'Utilidade',
    descricao: 'Motivado por resultado prático, eficiência e retorno. Avalia custo-benefício de cada ação.',
    descricaoPagina24: 'valoriza utilidade, retorno e resultados concretos',
    subtituloPagina25: 'UTILIDADE E RETORNO',
    oQueRepresenta: 'Obter retorno concreto sobre o investimento de tempo, energia e recursos empregados.',
    risco: 'A busca incessante por retorno pode levar ao excesso de trabalho.',
    redigidos: [],
  },
  EST: {
    valor: 'EST', nome: 'Estético', tema: 'Harmonia',
    descricao: 'Motivado por harmonia, beleza e equilíbrio. Sensível à forma, ao ambiente e à estética.',
    descricaoPagina24: 'busca harmonia, equilíbrio e qualidade da experiência',
    subtituloPagina25: 'HARMONIA E EXPERIÊNCIA',
    oQueRepresenta: 'Viver e trabalhar em ambientes equilibrados, com forma, beleza e qualidade na experiência de cada dia.',
    risco: 'Afastar-se do que é necessário mas desagradável, e perder energia em contextos caóticos.',
    redigidos: CARTAO_25_REDIGIDO,
  },
  SOC: {
    valor: 'SOC', nome: 'Social', tema: 'Altruísmo',
    descricao: 'Motivado por contribuição, altruísmo e cuidado com o outro. Realizado quando serve.',
    descricaoPagina24: 'valoriza contribuição, cuidado e impacto sobre as pessoas',
    subtituloPagina25: 'CONTRIBUIÇÃO E CUIDADO',
    oQueRepresenta: 'Ser útil às pessoas, contribuir para o crescimento de alguém e ver o próprio trabalho melhorar a vida de outros.',
    risco: 'Assumir o problema dos outros como se fosse seu, e deixar as próprias necessidades para depois.',
    redigidos: CARTAO_25_REDIGIDO,
  },
  POL: {
    valor: 'POL', nome: 'Político', tema: 'Poder',
    descricao: 'Motivado por influência, poder e liderança. Quer impactar decisões e mover grupos.',
    descricaoPagina24: 'busca influência, liderança e capacidade de direcionar',
    subtituloPagina25: 'INFLUÊNCIA E DIREÇÃO',
    oQueRepresenta: 'Destacar-se, conquistar influência e ter capacidade real de direcionar pessoas e decisões.',
    risco: 'Colocar a influência à frente das pessoas, e enxergar adversários onde não existem.',
    redigidos: [],
  },
  PRI: {
    valor: 'PRI', nome: NOME_EXIBIDO_PRI, tema: null,
    descricao: 'Motivado por ordem, regras, princípios, fé e propósito. Respeita e defende normas e sistemas de crença.',
    descricaoPagina24: 'valoriza princípios, estrutura, ordem e coerência',
    subtituloPagina25: 'PRINCÍPIOS E COERÊNCIA',
    oQueRepresenta: 'Agir de acordo com aquilo em que acredita, sustentando ordem, ética e propósito em cada escolha.',
    risco: 'Julgar com rigidez quem pensa diferente, e ter dificuldade de rever uma regra que já não serve.',
    redigidos: CARTAO_25_REDIGIDO,
  },
}

export type CodigoFaixaValor = 'significativo' | 'circunstancial' | 'indiferente'

/**
 * As tres faixas. Limites da v2.2 (secao 13 e motor): >= 66, 31 a 65,9,
 * <= 30,9. O molde escreve "31 a 65" e "1 a 30" na pagina 23 e marca 30 e 65
 * no grafico; com uma casa decimal isso deixaria 65,5 sem faixa, por isso os
 * numeros aqui sao os da v2.2 e o rotulo impresso sai deles.
 *
 * `textoPagina24` concorda com mais de um valor ("Direcionam") ou com um so
 * ("Gera"), como no molde; a pagina ajusta a concordancia se precisar.
 */
export const FAIXAS_VALOR: readonly {
  codigo: CodigoFaixaValor
  nome: string
  minimo: number
  maximo: number
  textoPagina23: string
  textoPagina24: string
}[] = [
  {
    codigo: 'significativo', nome: 'Significativo', minimo: 66, maximo: 100,
    textoPagina23: 'Presença marcante. Precisa ser estimulado no dia a dia e direciona as decisões mais íntimas.',
    textoPagina24: 'Direcionam as suas escolhas mesmo quando você não percebe.',
  },
  {
    codigo: 'circunstancial', nome: 'Circunstancial', minimo: 31, maximo: 65.9,
    textoPagina23: 'Varia conforme o momento de vida. Ganha força à medida que os significativos são atendidos.',
    textoPagina24: 'Ativam conforme o momento de vida, sem constância.',
  },
  {
    codigo: 'indiferente', nome: 'Indiferente', minimo: 0, maximo: 30.9,
    textoPagina23: 'Baixo interesse e pouca necessidade de estímulo. Costuma ser mal compreendido nos outros.',
    textoPagina24: 'Gera pouca energia em você e pouca compreensão nos outros que o priorizam.',
  },
]

export const PAGINA_24 = {
  sobretitulo: 'Seu resultado',
  titulo: 'Os seus seis valores',
  subtitulo: 'Seis orientações, uma combinação própria.',
  /** Seguido das seis frases "<NOME> <descricaoPagina24>." na ordem TEO..PRI. */
  intro: 'Cada valor descreve uma orientação diferente.',
  legenda: 'Linhas tracejadas marcam os limites de 30 e 65 pontos. A intensidade da cor acompanha a classificação: cor cheia para significativo, tom reduzido para circunstancial e tom mais claro para indiferente.',
} as const

export const PAGINA_25 = {
  sobretitulo: 'Seu resultado',
  titulo: 'Os seus dois valores predominantes',
  intro: 'Seus dois valores mais significativos indicam as forças motivacionais que exercem maior influência sobre suas escolhas neste momento. O primeiro orienta as suas prioridades; o segundo complementa, equilibra ou potencializa essa direção.',
  rotuloRepresenta: 'O que representa.',
  rotuloOndeAparece: 'Onde aparece hoje.',
  rotuloRisco: 'Risco.',
  tituloConversa: 'Como estes dois conversam',
  tituloMoveAgora: 'O que move você agora',
  fecho: 'Valores não são rótulos permanentes. Eles podem ganhar ou perder intensidade conforme experiências, responsabilidades e objetivos mudam, e por isso esta leitura deve ser interpretada considerando a fase atual da vida, o papel profissional exercido e os desafios presentes.',
} as const
