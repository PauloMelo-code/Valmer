/**
 * Arredondamento do motor: uma casa, meio para longe do zero (secao 5.0).
 *
 * A referencia faz `Decimal(repr(x)).quantize(Decimal("0.1"), ROUND_HALF_UP)`:
 * arredonda o numero *como ele se escreve*, e nao o binario que o representa.
 * 66.65 em binario e 66.6499999..., entao `Math.round(x * 10) / 10` da 66.6 e o
 * relatorio erra a primeira casa. `String(x)` do JavaScript e `repr` do Python
 * produzem os mesmos digitos (o menor texto que volta ao mesmo double), entao
 * olhar a segunda casa decimal desse texto reproduz a referencia exatamente.
 *
 * A sugestao da secao 16 do blueprint (`toPrecision(12)`) quase serve, mas
 * diverge em numeros como 0.04999999999999999 e troca -0 por 0 — e o gabarito
 * de paridade guarda -0.0.
 */
export function r1(x: number): number {
  if (!Number.isFinite(x)) throw new RangeError(`r1 recebeu ${x}`)
  const negativo = x < 0 || Object.is(x, -0)
  const texto = String(Math.abs(x))
  let decimos: number
  if (texto.includes('e')) {
    // Notacao exponencial so aparece abaixo de 1e-6 (vira zero) ou acima de
    // 1e21 (ja e inteiro). Nenhum escore chega perto de nenhum dos dois.
    if (texto.includes('e-')) decimos = 0
    else return x
  } else {
    const [inteira, fracao = ''] = texto.split('.')
    // ponytail: exato ate 2^53 decimos (~9e14); escores vao de -100 a 100.
    decimos = Number(inteira + (fracao[0] ?? '0')) + (fracao.length > 1 && fracao[1] >= '5' ? 1 : 0)
  }
  // Inteiro / 10 em IEEE e o double mais proximo do decimal, que e o que o
  // `float(Decimal)` do Python devolve.
  const a = decimos / 10
  return negativo ? -a : a
}
