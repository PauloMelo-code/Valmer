/**
 * Textos das paginas 08 a 14 que o molde nao tem para todo avaliado.
 *
 * O molde foi escrito para UMA pessoa (o Valmer: D alto, C baixo, dois
 * polarizados). Onde o texto dele so vale para aquele perfil, a pagina nao pode
 * repeti-lo para todo mundo: aqui ficam as variantes, originais e em
 * 'rascunho' ate o Valmer aprovar (ADR-0007, D11). Nenhuma inventa numero: o
 * que e escore entra pronto do view-model (`Medida.texto`).
 *
 * Trocar um texto aprovado e mudar uma linha aqui; a pagina so escolhe a
 * variante.
 */
import type { Fator } from '../../inventario-mc'
import type { Status } from '../status'

// ---------------------------------------------------------------- pagina 08

/**
 * Cartao "Fatores polarizados". O molde so tem o plural ("ESTÁVEL e CONFORME
 * atravessam..."); singular e zero sao redigidos.
 */
export function frasePolarizados(quantos: number, nomes: string): string {
  if (quantos === 0) return 'Nenhum fator atravessa a zona de flexibilidade de ponta a ponta: o ajuste ao ambiente acontece dentro dela.'
  return `${nomes} ${quantos === 1 ? 'atravessa' : 'atravessam'} a zona de flexibilidade de ponta a ponta.`
}

// ---------------------------------------------------------------- pagina 14

export type CartoesRelacionamento = {
  aproxima: string
  sustenta: string
  desgasta: string
  pressao: string
  status: Status
}

/**
 * Os quatro cartoes do topo da pagina 14, pelo fator natural mais alto (C15).
 * A v2.2 manda "tabela por perfil" e nao traz a tabela. Em D, "O que sustenta"
 * e "Sob pressao" partem das frases do molde, que ja eram do fator e nao da
 * pessoa; o resto e redigido.
 */
export const RELACIONAMENTO: Record<Fator, CartoesRelacionamento> = {
  D: {
    aproxima: 'Pelo assunto e pela conversa direta, mais do que pela convivência prévia. A relação começa quando existe algo a resolver junto.',
    sustenta: 'Clareza. As pessoas sabem onde você está, e isso costuma construir confiança rápido com quem também é direto.',
    desgasta: 'Rodeio e demora. Quem precisa de tempo lê a sua velocidade como pressa com a pessoa, quando ela é pressa com a tarefa.',
    pressao: 'A firmeza que organiza a conversa passa a chegar como imposição, e as pessoas recuam em vez de contribuir.',
    status: 'rascunho',
  },
  I: {
    aproxima: 'Pela conversa e pelo interesse genuíno na pessoa. Você abre a relação antes de abrir o assunto, e isso deixa o outro à vontade.',
    sustenta: 'Reconhecimento e troca. A relação se mantém viva enquanto há conversa, entusiasmo compartilhado e sinal de apreço dos dois lados.',
    desgasta: 'Frieza e crítica sem acolhimento. Um ambiente que só fala de erro e de prazo tira de você a energia que a convivência dá.',
    pressao: 'A fala acelera e a promessa cresce. Você tenta resolver pela persuasão o que pedia mais escuta e menos argumento.',
    status: 'rascunho',
  },
  S: {
    aproxima: 'Devagar e pela constância. Você observa antes de se abrir, e a confiança nasce da convivência repetida, não do primeiro encontro.',
    sustenta: 'Lealdade e previsibilidade. Quem convive com você sabe que pode contar com a mesma pessoa amanhã, e isso vira segurança para o grupo.',
    desgasta: 'Mudança sem aviso e conflito aberto. Ser pressionado a responder na hora cobra mais de você do que o conteúdo da conversa.',
    pressao: 'Você cede para preservar a harmonia e guarda o desconforto. O incômodo aparece depois, e muitas vezes longe de quem o causou.',
    status: 'rascunho',
  },
  C: {
    aproxima: 'Pela competência e pelo conteúdo. Você se aproxima de quem demonstra critério, e a relação cresce à medida que a confiança técnica se confirma.',
    sustenta: 'Coerência e respeito ao combinado. Palavra cumprida e informação correta valem mais para você do que proximidade pessoal.',
    desgasta: 'Improviso e imprecisão. Quem decide sem dado ou muda o combinado sem explicar perde a sua confiança com rapidez.',
    pressao: 'Você se recolhe no detalhe e na regra. A cautela que protege a qualidade passa a chegar como crítica ou distância.',
    status: 'rascunho',
  },
}

/**
 * Nota "O que o adaptado muda aqui.": parte do fator que MAIS mudou entre o
 * natural e o adaptado, e do sentido da mudanca. O molde tem so "C sobe"
 * (Valmer: CONFORME em 74); as outras sete e a de variacao baixa sao
 * redigidas. `rotulo` = "CONFORME"; `escore` = o adaptado ja formatado.
 */
export const ADAPTADO_P14 = {
  sobe: {
    D: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo que você decida mais rápido e assuma mais posição do que faz naturalmente. O desconforto que isso gera não é falta de capacidade: é o custo de agir com uma velocidade que não é a sua.`,
    I: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo mais exposição, mais conversa e mais convencimento do que o seu natural oferece. O cansaço depois de dias de muito contato vem desse esforço, e não de desinteresse pelas pessoas.`,
    S: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo paciência e constância acima do seu ritmo natural. Decidir hoje exige esperar mais e ouvir mais, e a impaciência que você sente nasce desse descompasso, e não da pessoa à sua frente.`,
    C: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo decisão mais lenta e mais fundamentada do que a sua. O atrito que você sente ao decidir hoje nasce desse descompasso de velocidade, e não de dúvida sobre o conteúdo da decisão.`,
  },
  desce: {
    D: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo que você segure a firmeza e divida a decisão. Nas relações isso aparece como cuidado extra antes de falar, e o esforço está em conter o que sairia sem pensar.`,
    I: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo menos conversa e mais foco. Você se aproxima menos do que gostaria, e as pessoas podem ler como distância o que é só economia de energia.`,
    S: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo mais velocidade e mais troca de frente do que o seu ritmo natural sustenta. Decidir rápido hoje custa mais a você do que parece para quem está de fora.`,
    C: (rotulo: string, escore: string) => `Com ${rotulo} em ${escore} no adaptado, o ambiente está pedindo que você decida com menos informação do que gostaria. O incômodo ao fechar uma decisão hoje vem da verificação que ficou para trás, e não de insegurança sobre o que você sabe.`,
  },
  estavel: 'A distância entre o seu natural e o adaptado é pequena nos quatro fatores. O jeito de se relacionar e de decidir descrito acima é, em boa parte, o mesmo que o ambiente vem pedindo de você.',
  status: 'rascunho' as Status,
} as const
