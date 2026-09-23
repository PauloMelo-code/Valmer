/** Niveis de Credenciamento — os niveis e a matriz de vantagens. */

export type Categoria = {
  name: string
  /** Regra para alcançar a categoria, como o parceiro lê na tela. */
  rule: string
  /**
   * A mesma regra em número, que é o que decide a categoria de fato.
   *
   * Basta bater UM dos dois — comprar 120 ou utilizar 80 dá Formador. Existe
   * separado de `rule` porque aquilo é texto de tela e pertence a quem escreve
   * a tela; ler número de dentro de frase para decidir benefício seria uma
   * regra de negócio refém de vírgula. Um teste confere que os dois contam a
   * mesma coisa, então mudar um sem o outro quebra na hora.
   */
  limite: { comprados: number; utilizados: number }
  bg: string
  fg: string
  sub: string
}

export const categorias: Categoria[] = [
  {
    name: 'Parceiro',
    rule: '0 créditos comprados ou 0 utilizados',
    limite: { comprados: 0, utilizados: 0 },
    bg: 'var(--color-bg)',
    fg: 'var(--color-text)',
    sub: 'var(--color-text-muted)',
  },
  {
    name: 'Formador',
    rule: '120 comprados ou 80 utilizados',
    limite: { comprados: 120, utilizados: 80 },
    bg: 'var(--color-warning-tint)',
    fg: 'var(--color-warning-text)',
    sub: 'var(--color-warning)',
  },
  {
    name: 'Multiplicador',
    rule: '300 comprados ou 150 utilizados',
    limite: { comprados: 300, utilizados: 150 },
    bg: 'var(--color-border-soft)',
    fg: 'var(--color-text)',
    sub: 'var(--color-text-muted)',
  },
  {
    name: 'Especialista',
    rule: '800 comprados ou 500 utilizados',
    limite: { comprados: 800, utilizados: 500 },
    bg: 'var(--color-info-tint)',
    fg: 'var(--color-info)',
    sub: 'var(--color-info-soft)',
  },
  {
    name: 'Embaixador',
    rule: '1800 comprados ou 1200 utilizados',
    limite: { comprados: 1800, utilizados: 1200 },
    bg: 'var(--color-ink)',
    fg: 'var(--color-on-ink)',
    sub: 'var(--color-on-ink-65)',
  },
]

/**
 * Valor de uma célula da matriz:
 * "yes" = incluído (check), "no" = não incluído (traço),
 * qualquer outro texto é exibido como está (ex.: "25%").
 */
export type ValorBeneficio = 'yes' | 'no' | (string & {})

export type Beneficio = {
  name: string
  /** Um valor por categoria, na mesma ordem de `categorias`. */
  cells: ValorBeneficio[]
}

/*
 * PENDENTE DE CONFIRMACAO DO CLIENTE.
 *
 * As linhas anteriores anunciavam produtos que NAO sao da Impacto Academy:
 * "Formacao em Analista de Percepcao Infantil (Mini Mega Assessment)",
 * "Formacao em Coaching de Carreira (FCC)", "Jornada do Coach de Carreira" e
 * "Assinatura White Label". Entraram porque o prototipo foi montado a partir
 * de prints da plataforma antiga, e ali eles fazem sentido. Aqui a tela
 * oferecia desconto no catalogo de um concorrente para o parceiro do Valmer.
 *
 * O que esta abaixo veio do que ele disse na reuniao de 04/09: formacao em
 * perfil comportamental, os cursos que ele vai hospedar aqui, mentoria e o
 * livro da editora. Os PERCENTUAIS sao os da regua antiga, mantidos so para a
 * tela nao ficar vazia. Nome e desconto de cada linha precisam do aval dele
 * antes de qualquer parceiro ver isso.
 */
export const beneficios: Beneficio[] = [
  { name: 'Credito avulso', cells: ['no', '5%', '10%', '15%', '20%'] },
  {
    name: 'Formacao em Perfil Comportamental',
    cells: ['no', '15%', '25%', '50%', 'yes'],
  },
  { name: 'Certificacoes da plataforma', cells: ['no', '15%', '25%', '40%', 'yes'] },
  { name: 'Sessao com Guia de Expedicao', cells: ['no', 'no', '25%', '50%', 'yes'] },
  { name: 'Livro Impacto Academy', cells: ['no', 'yes', 'yes', 'yes', 'yes'] },
  { name: 'Grupo de WhatsApp exclusivo', cells: ['no', 'yes', 'yes', 'yes', 'yes'] },
]

/*
 * A situação do parceiro no programa (categoria, ciclo, quanto falta) NÃO mora
 * aqui. Ela é derivada do extrato pelo `progressoDoPrograma()` de
 * `@/lib/painel`, com a régua acima como referência.
 *
 * Este arquivo guardava um `situacaoPrograma` fixo, e ele dizia "71 de 80
 * créditos utilizados" para todo parceiro que abrisse a tela — inclusive quem
 * nunca aplicou um assessment. O que sobrou aqui é o que é igual para todos:
 * as faixas, a régua de cada uma e a matriz de vantagens.
 */
