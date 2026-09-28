/**
 * O período do filtro da lista de grupos de mapeamento.
 *
 * A tela recebe a data JÁ FORMATADA em São Paulo pelo servidor
 * ("23/09/2026, 14:43") — é a única forma em que a data de criação existe no
 * cliente. Daqui sai o dia em `aaaa-mm-dd`, que é exatamente o que
 * `<input type="date">` devolve: a comparação é texto contra texto, os dois no
 * mesmo fuso. Comparar `Date` do navegador com data do servidor faria a mesma
 * linha entrar e sair do filtro conforme o fuso de quem abre a tela.
 *
 * Mora em `lib/` e não dentro do componente porque é a única lógica de verdade
 * do filtro, e é a que precisa de teste: o resto é `includes` e igualdade.
 */

/** "23/09/2026, 14:43" -> "2026-09-23". `null` quando não reconhece o texto. */
export function diaIso(dataBr: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dataBr.trim())
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : null
}

/**
 * A linha cabe no intervalo escolhido?
 *
 * Data que não casa com o formato NÃO sai da lista: esconder a linha por causa
 * de um formato inesperado seria o filtro apagando grupo do parceiro sem dizer
 * por quê. Intervalo vazio também não esconde nada.
 */
export function dentroDoPeriodo(dataBr: string, de: string, ate: string): boolean {
  if (de === '' && ate === '') return true

  const dia = diaIso(dataBr)
  if (dia === null) return true

  if (de !== '' && dia < de) return false
  if (ate !== '' && dia > ate) return false
  return true
}
