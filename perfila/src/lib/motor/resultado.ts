/**
 * O resultado de uma aplicacao, no formato da secao 7 do AGENTE: e exatamente
 * o que o gerador do relatorio e o prompt da IA recebem. Os nomes dos campos
 * nao mudam sem subir VERSAO_MOTOR.
 */
import {
  EIXOS_JUNG,
  FATORES,
  PARES_JUNG,
  VERSAO_INSTRUMENTO,
  numeroDoGrupo,
  type Competencia,
  type EixoJung,
  type Fator,
} from '@/data/inventario-mc'
import { pontuarDisc, zona, type PontuacaoDisc, type Zona } from './disc'
import { indices, type Indices } from './indices'
import { pontuarJung, type PontuacaoJung, type RespostasJung } from './jung'
import { lideranca, type Lideranca } from './lideranca'
import { RespostaInvalida, type RespostasGrupos } from './ordenacao'
import { perfil } from './perfil'
import { validade, type TelaGravada, type Validade } from './validade'
import { pontuarValores, type PontuacaoValores } from './valores'

export const VERSAO_MOTOR = '2.2.0'

export type RespostasInventario = {
  natural: RespostasGrupos
  adaptado: RespostasGrupos
  jung: RespostasJung
  valores: RespostasGrupos
}

export type DiscCondicao = {
  escore: Record<Fator, number>
  zona: Record<Fator, Zona>
  competencias: Record<Competencia, number>
  perfil: string
  /**
   * Os quatro fatores do mais alto ao mais baixo, com o desempate do motor
   * (mais vezes em 1o lugar, depois D, I, S, C).
   *
   * Fora do contrato da secao 7 do AGENTE, e entra de proposito: as paginas
   * 07, 15, 16 e 36-40 precisam saber quem e o segundo e o ultimo fator, e o
   * desempate por "mais vezes em 1o" nao se recupera depois — os escores
   * gravados podem empatar e "primeiros" nao e guardado. Sem isto, dois
   * leitores do mesmo resultado poderiam ordenar diferente um empate.
   */
  ordem: Fator[]
}

export type ResultadoMotor = {
  versao_instrumento: string
  versao_motor: string
  disc: { natural: DiscCondicao; adaptado: DiscCondicao; indices: Indices; lideranca: Lideranca }
  jung: PontuacaoJung
  valores: Omit<PontuacaoValores, 'bruto'>
  validade: Validade
}

function condicao(p: PontuacaoDisc): DiscCondicao {
  const zonas = { D: 'EB', I: 'EB', S: 'EB', C: 'EB' } as Record<Fator, Zona>
  for (const f of FATORES) zonas[f] = zona(p.escore[f])
  const { sigla, ordem } = perfil(p.escore, p.primeiros)
  return { escore: p.escore, zona: zonas, competencias: p.competencias, perfil: sigla, ordem }
}

/**
 * Calcula tudo. Lanca RespostaInvalida se alguma etapa estiver incompleta ou
 * corrompida (DISC que nao soma 200, valores que nao somam 300, eixo de Jung
 * sem 9 respostas). `telas` alimenta so a validade.
 */
export function calcularResultado(respostas: RespostasInventario, telas: readonly TelaGravada[]): ResultadoMotor {
  const nat = pontuarDisc(respostas.natural)
  const ada = pontuarDisc(respostas.adaptado)
  const { bruto: _bruto, ...valores } = pontuarValores(respostas.valores)
  return {
    versao_instrumento: VERSAO_INSTRUMENTO,
    versao_motor: VERSAO_MOTOR,
    disc: {
      natural: condicao(nat),
      adaptado: condicao(ada),
      indices: indices(nat.escore, ada.escore),
      lideranca: lideranca(nat.escore),
    },
    jung: pontuarJung(respostas.jung),
    valores,
    validade: validade(telas),
  }
}

const EIXO_DA_TELA = /^(EI|NS|TF)(\d{2})$/

/**
 * Remonta as respostas a partir das telas gravadas: `ordem_final` vira
 * `{ idItem: posicao }` e a etapa 3 vira as 9 respostas de cada eixo, na
 * posicao do par. Nao confere completude — o motor recusa o que faltar.
 */
export function respostasDasTelas(telas: readonly TelaGravada[]): RespostasInventario {
  const porEtapa: Record<1 | 2 | 4, RespostasGrupos> = { 1: {}, 2: {}, 4: {} }
  const jung = { EI: [], NS: [], TF: [] } as Record<EixoJung, number[]>
  const paresPorEixo = PARES_JUNG.length / EIXOS_JUNG.length
  for (const t of telas) {
    if (t.etapa === 1 || t.etapa === 2 || t.etapa === 4) {
      if (!t.ordem_final) throw new RespostaInvalida(`tela ${t.tela} da etapa ${t.etapa} sem ordem_final`)
      if (!t.tela.startsWith(t.etapa === 4 ? 'V' : 'G')) throw new RespostaInvalida(`tela ${t.tela} nao e da etapa ${t.etapa}`)
      porEtapa[t.etapa][numeroDoGrupo(t.tela)] = Object.fromEntries(t.ordem_final.map((id, i) => [id, i + 1]))
    } else if (t.etapa === 3) {
      const casou = EIXO_DA_TELA.exec(t.tela)
      const indice = casou ? Number(casou[2]) - 1 : -1
      if (!casou || indice < 0 || indice >= paresPorEixo) throw new RespostaInvalida(`par de Jung invalido: ${t.tela}`)
      if (t.resposta_polo_a == null) throw new RespostaInvalida(`par ${t.tela} sem resposta_polo_a`)
      jung[casou[1] as EixoJung][indice] = t.resposta_polo_a
    } else {
      throw new RespostaInvalida(`etapa desconhecida: ${t.etapa}`)
    }
  }
  return { natural: porEtapa[1], adaptado: porEtapa[2], jung, valores: porEtapa[4] }
}
