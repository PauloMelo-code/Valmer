/**
 * As marcacoes metodologicas — blueprint secao 04, pagina 02 do molde.
 *
 * Existem para o leitor saber, em qualquer bloco, se esta lendo teoria,
 * resultado pessoal, hipotese ou orientacao. Uma pagina sem marcacao obriga o
 * leitor a adivinhar, e a hipotese acaba lida como fato.
 *
 * A secao 04 fala em "3 marcacoes" e lista 4; a pagina 02 do molde mostra so
 * as tres primeiras. 'aplicacao-pratica' aparece a partir da pagina 35, por
 * isso nao tem `textoIndice`.
 */
export type CodigoMarcacao = 'fato-do-modelo' | 'derivado-do-escore' | 'a-confirmar' | 'aplicacao-pratica'

export type Marcacao = {
  codigo: CodigoMarcacao
  /** Nome como o blueprint escreve. */
  nome: string
  /** Selo como aparece impresso no molde. */
  selo: string
  cor: string
  /** Definicao completa (blueprint secao 04). */
  texto: string
  /** Versao curta da pagina 02 do molde; null onde o molde nao traz. */
  textoIndice: string | null
}

export const MARCACOES: Record<CodigoMarcacao, Marcacao> = {
  'fato-do-modelo': {
    codigo: 'fato-do-modelo',
    nome: 'Fato do Modelo',
    selo: 'FATO DO MODELO',
    cor: '#17324D',
    texto: 'Base teórica, definição ou regra de cálculo. Vale para qualquer pessoa avaliada. Não muda de pessoa para pessoa.',
    textoIndice: 'Base teórica, definição ou regra de cálculo. Vale para qualquer pessoa avaliada.',
  },
  'derivado-do-escore': {
    codigo: 'derivado-do-escore',
    nome: 'Derivado do Escore',
    selo: 'DERIVADO DO SEU ESCORE',
    cor: '#9A711E',
    texto: 'Leitura produzida a partir dos números do avaliado, segundo as regras do instrumento. Muda para cada pessoa.',
    textoIndice: 'Leitura produzida a partir dos seus números, segundo as regras do instrumento.',
  },
  'a-confirmar': {
    codigo: 'a-confirmar',
    nome: 'A Confirmar na Devolutiva',
    selo: 'A CONFIRMAR NA DEVOLUTIVA',
    cor: '#6B4E8A',
    texto: 'Hipótese ainda não verificada por observação externa. O facilitador usa como pergunta na sessão de devolutiva.',
    textoIndice: 'Hipótese ainda não verificada por observação externa. Use como pergunta.',
  },
  'aplicacao-pratica': {
    codigo: 'aplicacao-pratica',
    nome: 'Aplicação Prática',
    selo: 'APLICAÇÃO PRÁTICA',
    cor: '#1F7A6D',
    texto: 'Orientação de uso direta, ação concreta que o avaliado pode executar com base no resultado.',
    textoIndice: null,
  },
}

/** Titulo do quadro da pagina 02 do molde. */
export const TITULO_MARCACOES_INDICE = 'Três marcações acompanham a leitura'
