/**
 * Paleta do MC 3.1 — blueprint secao 02 (hex exatos) e secao 03 (texto).
 *
 * As quatro cores de fator sao fixas e imutaveis: o leitor aprende "vermelho
 * e D" na pagina 05 e reconhece o fator pelo resto do relatorio. Trocar uma
 * delas quebra essa leitura em 42 paginas de uma vez.
 */
import type { Fator } from '../inventario-mc'

export const PALETA = {
  /** Cabecalhos, rodape, painel de sintese, fundo de tabelas. Texto branco sobre ele. */
  azulPetroleo: '#17324D',
  /** Fundo geral de todas as paginas do relatorio e da plataforma. */
  marfimQuente: '#F7F3EC',
  /** Destaques e bordas douradas. NUNCA como texto sobre branco: ai vai `douradoTexto`. */
  douradoSobrio: '#C39A42',
  /** O dourado legivel sobre fundo claro. Tambem e a cor de "Derivado do escore". */
  douradoTexto: '#9A711E',
  /** Cartoes e caixas de conteudo sobre o marfim. */
  brancoCartao: '#FFFFFF',
  /** Corpo do texto narrativo (secao 03). */
  textoCorpo: '#171A1F',
  /** Legendas, texto secundario e rodape (secao 03). */
  textoSecundario: '#5B6573',
} as const

export type CorFator = {
  /** Barra, marcador, borda. Natural = solido; adaptado = MESMA cor com hachura diagonal. */
  principal: string
  /** Fundo de cartao e de pilula. */
  fundoSuave: string
  /** Texto do fator sobre fundo claro. */
  texto: string
}

/**
 * Regras da secao 02 que o CSS precisa respeitar: vermelho (D) e ambar (I)
 * precisam ser distintos; nunca texto branco sobre o ambar; a diferenca
 * natural x adaptado tem de sobreviver a impressao monocromatica — por isso e
 * hachura, e nao opacidade nem outra cor.
 */
export const CORES_FATOR: Record<Fator, CorFator> = {
  D: { principal: '#C62828', fundoSuave: '#FBE9E9', texto: '#A51F1F' },
  I: { principal: '#E6A000', fundoSuave: '#FFF4D6', texto: '#9A6500' },
  S: { principal: '#267057', fundoSuave: '#E5F2ED', texto: '#1F604B' },
  C: { principal: '#315F8A', fundoSuave: '#E8F0F8', texto: '#284F75' },
}
