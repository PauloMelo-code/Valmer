/** Pequenos utilitários de texto usados na apresentação dos dados. */

/**
 * Iniciais para avatar: primeira letra do primeiro e do último nome.
 * "Bruno Carvalho" → "BC"
 */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ''
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Percentual inteiro formatado para largura de barra de progresso. */
export function percent(value: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/**
 * Duração de aula em `mm:ss` (ou `h:mm:ss` quando passa da hora).
 *
 * `null` entra e `null` sai: o banco guarda a duração lida do próprio arquivo,
 * e quando o navegador não soube dizer a coluna fica nula. A tela então não
 * mostra duração nenhuma — melhor que o "07:05" que estava escrito à mão na
 * tela antiga, e que nunca foi conferido contra vídeo nenhum.
 */
export function duracaoLegivel(segundos: number | null): string | null {
  if (segundos === null || segundos <= 0) return null

  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const doisDigitos = (valor: number) => String(valor).padStart(2, '0')

  return h > 0 ? `${h}:${doisDigitos(m)}:${doisDigitos(s)}` : `${doisDigitos(m)}:${doisDigitos(s)}`
}
