/**
 * O que as etapas de ordenacao (DISC e valores) tem em comum: o formato da
 * resposta e a recusa de resposta corrompida.
 *
 * Resposta de uma etapa: `{ [grupo]: { [idItem]: posicao } }`, posicao 1 = o
 * que mais combina. A chave do grupo pode chegar como "7" (JSON) ou 7 — num
 * objeto JavaScript e a mesma chave.
 */
export type RespostasGrupos = Record<number, Record<string, number>>

/**
 * Resposta que o motor se recusa a calcular. E erro do dado, nao do codigo: a
 * rota que chama pode devolver 422 com a mensagem, em vez de 500.
 */
export class RespostaInvalida extends Error {
  override name = 'RespostaInvalida'
}

/**
 * Posicoes de um grupo, conferidas: cada item do grupo com uma posicao, e as
 * posicoes formando exatamente 1..n (a `validar_ordenacao` da referencia).
 * Item a mais tambem e recusado — so aparece se a tela gravou o grupo errado.
 */
export function posicoesDoGrupo(
  respostas: RespostasGrupos,
  grupo: number,
  ids: readonly string[],
): Record<string, number> {
  const pos = respostas[grupo]
  if (!pos || typeof pos !== 'object') throw new RespostaInvalida(`grupo ${grupo} sem resposta`)
  const ordenadas = ids.map((id) => pos[id]).sort((a, b) => a - b)
  const completa = ordenadas.every((p, i) => p === i + 1)
  if (!completa || Object.keys(pos).length !== ids.length) {
    throw new RespostaInvalida(`ordenacao invalida no grupo ${grupo}: ${JSON.stringify(pos)}`)
  }
  return pos
}

/**
 * Soma de escores de uma casa, conferida em decimos inteiros: somar os
 * doubles direto da 200.20000000000002 num caso legitimo de 200,2 e recusaria
 * uma resposta boa.
 */
export function conferirSoma(escores: readonly number[], esperado: number, tolerancia: number, etapa: string) {
  const soma = escores.reduce((s, e) => s + Math.round(e * 10), 0)
  if (Math.abs(soma - esperado * 10) > Math.round(tolerancia * 10)) {
    throw new RespostaInvalida(`${etapa}: escores somam ${soma / 10}, o esperado e ${esperado}`)
  }
}
