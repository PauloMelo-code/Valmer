/**
 * Niveis de relatorio S1-S4 — ADR-0007 D9, blueprint secao 21.
 *
 * O inventario e sempre o completo (69 telas); o nivel so decide ate que
 * pagina o relatorio vai. Por isso cada nivel e um corte 1..N, e nao uma lista
 * de paginas escolhidas: subir de nivel nunca tira pagina que o anterior tinha.
 */
export const TOTAL_PAGINAS = 42

export const CODIGOS_NIVEL = ['S1', 'S2', 'S3', 'S4'] as const
export type CodigoNivel = (typeof CODIGOS_NIVEL)[number]

export type NivelRelatorio = {
  codigo: CodigoNivel
  nome: string
  /**
   * Coluna "Conteudo" da secao 21, transcrita. Ela poe Espectro, Tensoes e
   * Gatilhos no S2, mas essas paginas (14-16) caem no corte do S1: vale o
   * corte por pagina (D9), e o texto e so descricao comercial.
   */
  conteudo: string
  /** Ultima pagina incluida; a primeira e sempre a 01. */
  ultimaPagina: number
}

export const NIVEIS: Record<CodigoNivel, NivelRelatorio> = {
  S1: { codigo: 'S1', nome: 'Essencial', ultimaPagina: 16, conteudo: 'DISC completo + narrativa IA básica' },
  S2: { codigo: 'S2', nome: 'Completo', ultimaPagina: 28, conteudo: 'S1 + Jung + Espectro + Tensões + Gatilhos' },
  S3: { codigo: 'S3', nome: 'Executivo', ultimaPagina: 36, conteudo: 'S2 + Spranger + Integração + Liderança + Competências' },
  S4: { codigo: 'S4', nome: 'Estratégico', ultimaPagina: TOTAL_PAGINAS, conteudo: 'Relatório completo de 42 páginas + dashboard online' },
}

/** [1, 2, ..., ultimaPagina]. */
export function paginasDoNivel(nivel: CodigoNivel): number[] {
  return Array.from({ length: NIVEIS[nivel].ultimaPagina }, (_, i) => i + 1)
}
