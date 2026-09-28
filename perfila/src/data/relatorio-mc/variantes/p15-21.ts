/**
 * Textos das paginas 15 a 21 que dependem do perfil e que o molde so traz para
 * o caso do Valmer (D principal, I complementar, POL como valor mais alto,
 * terciaria e inferior com escores proximos).
 *
 * O que e do molde fica com status 'transcrito' e com as palavras do molde.
 * O resto foi redigido aqui ('rascunho') ou e regra que a v2.2 nao tem
 * ('a confirmar'): nada disso vira texto do Valmer ate ele aprovar, mas a
 * pagina tambem nao pode imprimir o texto dele para quem nao e o caso dele.
 */
import type { Fator, Valor } from '../../inventario-mc'
import type { Status } from '../status'

type Texto = { texto: string; status: Status }

// ---------------------------------------------------------------- pagina 16

/**
 * Motivador de cada valor, na frase "O seu valor mais alto e X, com N pontos,
 * cujo motivador e ___." O molde so tem POL ("influencia"); os outros saem da
 * descricao da secao 13 do blueprint.
 */
export const MOTIVADOR_VALOR: Record<Valor, Texto> = {
  POL: { status: 'transcrito', texto: 'influência' },
  ECO: { status: 'rascunho', texto: 'resultado prático' },
  TEO: { status: 'rascunho', texto: 'conhecimento' },
  EST: { status: 'rascunho', texto: 'harmonia' },
  SOC: { status: 'rascunho', texto: 'contribuição' },
  PRI: { status: 'rascunho', texto: 'coerência com os próprios princípios' },
}

/**
 * Valores que "apontam para o mesmo lugar" que cada fator (C17). A v2.2 nao
 * tem essa tabela; o molde so mostra D com POL. Proposta: o motivador do
 * fator (secao 07) e o do valor (secao 13) falam da mesma coisa.
 * D desafio e poder -> POL, ECO; I reconhecimento -> SOC, POL;
 * S seguranca -> SOC, PRI; C padrao e informacao -> TEO, PRI.
 */
export const VALORES_AFINS: Record<Fator, readonly Valor[]> = {
  D: ['POL', 'ECO'],
  I: ['SOC', 'POL'],
  S: ['SOC', 'PRI'],
  C: ['TEO', 'PRI'],
}
export const STATUS_VALORES_AFINS: Status = 'a confirmar'

export type Alinhamento = 'principal' | 'complementar' | 'nenhum'

/** O valor conversa com o gatilho principal, com o complementar ou com nenhum dos dois. */
export function alinhamento(valor: Valor, principal: Fator, complementar: Fator): Alinhamento {
  if (VALORES_AFINS[principal].includes(valor)) return 'principal'
  if (VALORES_AFINS[complementar].includes(valor)) return 'complementar'
  return 'nenhum'
}

/** Continuacao da frase do motivador. So a de 'principal' e do molde. */
export const LEITURA_DO_ALINHAMENTO: Record<Alinhamento, Texto> = {
  principal: {
    status: 'transcrito',
    texto: 'Ele confirma e reforça o gatilho principal. Quando o fator comportamental e o valor apontam para o mesmo lugar, o gatilho se torna estrutural: ele não muda com a fase da vida.',
  },
  complementar: {
    status: 'rascunho',
    texto: 'Ele reforça o gatilho complementar, e não o principal. O que você valoriza sustenta a segunda força; a primeira depende mais do ambiente para se manter acesa.',
  },
  nenhum: {
    status: 'rascunho',
    texto: 'Ele aponta para um lugar diferente dos dois gatilhos. Quando fator e valor não coincidem, o gatilho depende mais do contexto: acende com a situação certa, mas não se sustenta sozinho onde aquilo que você valoriza está ausente.',
  },
}

/** "Aplicacao pratica." do cartao, pelo valor mais alto. So a de POL e do molde. */
export const APLICACAO_VALOR: Record<Valor, Texto> = {
  POL: {
    status: 'transcrito',
    texto: 'Ambientes que retiram influência e decisão de você custam mais do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pese a autonomia real oferecida com o mesmo peso que você daria à remuneração.',
  },
  ECO: {
    status: 'rascunho',
    texto: 'Ambientes em que o esforço não vira resultado visível custam mais a você do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pergunte como o retorno do seu trabalho será medido antes de perguntar quanto ele vai exigir.',
  },
  TEO: {
    status: 'rascunho',
    texto: 'Ambientes que não deixam tempo para entender antes de agir custam mais a você do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pese o que ela vai ensinar com o mesmo peso que você daria à remuneração.',
  },
  EST: {
    status: 'rascunho',
    texto: 'Ambientes desorganizados ou tensos custam mais a você do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pese a qualidade do lugar e das relações com o mesmo peso que você daria à remuneração.',
  },
  SOC: {
    status: 'rascunho',
    texto: 'Ambientes em que o trabalho não ajuda ninguém de forma visível custam mais a você do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pese quem será beneficiado por ela com o mesmo peso que você daria à remuneração.',
  },
  PRI: {
    status: 'rascunho',
    texto: 'Ambientes que pedem para contornar regras ou aceitar o que você considera errado custam mais a você do que custariam a outra pessoa no mesmo cargo. Ao avaliar uma nova responsabilidade, pese a coerência entre o que a empresa diz e o que ela faz com o mesmo peso que você daria à remuneração.',
  },
}

// ---------------------------------------------------------------- pagina 21

/**
 * Ate quantos pontos a inferior e a terciaria contam como "proximas". A frase
 * do molde ("a proximidade entre os numeros") so e verdadeira ai; acima disso
 * vale a variante. Proposta, a confirmar.
 */
export const LIMITE_PROXIMIDADE = 10

/** Fecho de "Uma regra de leitura", com a inferior e a terciaria ja formatadas ("Sensação 36"). */
export function regraDeLeituraPar(inferior: string, terciaria: string, proximas: boolean): Texto {
  return proximas
    ? { status: 'transcrito', texto: `${inferior} e ${terciaria} pertencem a escalas distintas, e a proximidade entre os números não os coloca em pé de igualdade.` }
    : { status: 'rascunho', texto: `${inferior} e ${terciaria} pertencem a escalas distintas, e a distância entre os números não diz qual das duas funções pesa mais.` }
}
