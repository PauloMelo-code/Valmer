/**
 * Como o relatorio MC 3.1 escreve numero, sinal, data e nome.
 *
 * Um lugar so, porque o mesmo escore aparece em ate seis paginas (barra,
 * tabela, painel, texto) e o leitor confere de uma para a outra: "87,5" numa e
 * "87.5" ou "88" noutra parece erro de conta, nao de formatacao.
 */

/** U+2212. O hifen do teclado e mais curto e desalinha a coluna de variacao. */
export const MENOS = '−'

const FUSO = 'America/Sao_Paulo'

/**
 * 88 -> "88", 87.5 -> "87,5", -48 -> "−48". O motor ja entrega uma casa;
 * inteiro sai sem ",0" porque o molde so tem inteiros e "88,0" chamaria
 * atencao para uma precisao que nao existe (mapa de dados, C03).
 */
export function numero(x: number): string {
  const r = Math.round(Math.abs(x) * 10) / 10
  if (r === 0) return '0'
  const texto = Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',')
  return x < 0 ? MENOS + texto : texto
}

/** Variacao: "+47,9", "−72,9", "0". Zero sem sinal: nao subiu nem desceu. */
export function comSinal(x: number): string {
  const texto = numero(x)
  return texto === '0' || texto.startsWith(MENOS) ? texto : `+${texto}`
}

/** "Setembro de 2026", no fuso de Brasilia (a data nao muda com o servidor). */
export function mesAnoPorExtenso(data: Date): string {
  const texto = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, month: 'long', year: 'numeric' }).format(data)
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

/** Caixa alta com as regras do portugues (acento fica). */
export function maiusculas(texto: string): string {
  return texto.toLocaleUpperCase('pt-BR')
}

/** ["A", "B", "C"] -> "A, B e C". */
export function juntar(itens: readonly string[]): string {
  return new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(itens)
}
