/**
 * Espectro comportamental — pagina 14 do molde.
 *
 * Sete pares de tendencias opostas, cada um originado por um fator. O
 * marcador fica numa regua de 0 (polo da esquerda pleno) a 100 (polo da
 * direita pleno), com o neutro em 50, e o polo do lado do marcador sai em
 * negrito.
 *
 * REGRA DE POSICAO — 'a confirmar'. O molde nao declara a regra. Os numeros
 * dele (D 89, C 24, T 58) mostram:
 *   - os tres pares de C caem em 24, 22 e 26, isto e, no proprio escore de C;
 *   - os de D caem em 20, 16 e 72 (espelho de 80, 84, 72), suavizados em
 *     relacao ao 89;
 *   - "Decide por criterio logico" cai em 42 = 100 - 58, o %T de Jung, embora
 *     o rotulo diga DOMINANTE.
 * Nao da para reproduzir isso com uma regra so sem inventar pesos. A proposta
 * deterministica: posicao = escore NATURAL do fator de origem, medido a partir
 * do polo que representa o fator alto. Reproduz o C do molde exatamente e
 * preserva o lado de todos os sete pares.
 */
import type { Fator } from '../inventario-mc'
import type { Status } from './status'

export type ParEspectro = {
  esquerda: string
  direita: string
  /** Fator que origina o par (pilula da coluna FATOR). */
  fator: Fator
  /** Qual lado descreve o fator ALTO. */
  ladoDoFatorAlto: 'esquerda' | 'direita'
}

export const PARES_ESPECTRO: readonly ParEspectro[] = [
  { esquerda: 'Orientação a resultado', direita: 'Orientação a processo', fator: 'D', ladoDoFatorAlto: 'esquerda' },
  { esquerda: 'Age com velocidade', direita: 'Age com planejamento', fator: 'D', ladoDoFatorAlto: 'esquerda' },
  { esquerda: 'Decide por critério lógico', direita: 'Decide por impacto humano', fator: 'D', ladoDoFatorAlto: 'esquerda' },
  { esquerda: 'Assume risco', direita: 'Prudente', fator: 'C', ladoDoFatorAlto: 'direita' },
  { esquerda: 'Delega a decisão', direita: 'Centraliza a decisão', fator: 'D', ladoDoFatorAlto: 'direita' },
  { esquerda: 'Cria do zero', direita: 'Aprimora o existente', fator: 'C', ladoDoFatorAlto: 'direita' },
  { esquerda: 'Decide com informação incompleta', direita: 'Espera o dado completo', fator: 'C', ladoDoFatorAlto: 'direita' },
]

export const STATUS_REGRA_ESPECTRO: Status = 'a confirmar'

/**
 * Posicao do marcador (0-100, 0 = esquerda) e o lado predominante. Em 50
 * exato nenhum polo vai para negrito: o marcador fica no neutro.
 */
export function posicaoNoEspectro(
  par: ParEspectro,
  escoreNatural: Record<Fator, number>,
): { posicao: number; predominante: 'esquerda' | 'direita' | 'neutro' } {
  const escore = escoreNatural[par.fator]
  const posicao = par.ladoDoFatorAlto === 'direita' ? escore : Math.round((100 - escore) * 10) / 10
  const predominante = posicao < 50 ? 'esquerda' : posicao > 50 ? 'direita' : 'neutro'
  return { posicao, predominante }
}

/** Textos fixos da pagina 14. Os quatro cartoes de cima tem rotulo fixo e texto da IA. */
export const PAGINA_14 = {
  sobretitulo: 'O seu resultado',
  titulo: 'Relacionamento, decisão e espectro comportamental',
  subtitulo: 'Como você se aproxima das pessoas e onde você se posiciona entre pares de tendências opostas.',
  cartoes: ['Como você se aproxima', 'O que sustenta a relação', 'O que desgasta', 'Sob pressão'],
  tituloEspectro: 'Espectro comportamental',
  legenda: 'O lado em destaque, em negrito, é o predominante. O marcador indica a sua posição no eixo, e o rótulo à direita indica o fator que origina o par.',
  colunas: ['POLO À ESQUERDA', 'PONTO NEUTRO AO CENTRO', 'POLO À DIREITA', 'FATOR'],
  tituloAdaptado: 'O que o adaptado muda aqui.',
} as const
