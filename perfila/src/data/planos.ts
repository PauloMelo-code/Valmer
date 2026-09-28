/**
 * Tipos de relatório e pacotes de crédito
 * ---------------------------------------
 * Valores da especificação. O facilitador gasta créditos por
 * assessment; o admin vende os créditos em pacotes.
 *
 * ESTE ARQUIVO NÃO É MAIS A FONTE DO PREÇO COBRADO.
 * Quem cobra lê `precos_relatorios` e `precos_pacotes` no banco, por
 * `lib/precos.ts` — preço mudou de código para dado, e o admin edita em
 * /admin/precos sem deploy. O que sobra aqui são duas coisas:
 *
 * 1. O DADO INICIAL do seed (`lib/db/seed.ts`), para o sistema não acordar sem
 *    tabela de preços.
 * 2. As telas que ainda montam a vitrine a partir desta lista, e que serão
 *    ligadas ao banco em seguida. Enquanto isso, elas mostram estes números e
 *    a cobrança usa os do banco — que o seed criou iguais.
 *
 * Os tipos e `moeda`/`custoPorCredito` continuam valendo para os dois lados.
 */

export type CodigoRelatorio = 'S1' | 'S2' | 'S3' | 'S4'

export type TipoRelatorio = {
  codigo: CodigoRelatorio
  nome: string
  /** Quantos créditos o assessment consome. */
  creditos: number
  /**
   * O que entra além do nível anterior, pelas páginas do relatório MC 3.1
   * (ADR-0007, D9: S1 = 01-16, S2 = 01-28, S3 = 01-36, S4 = 01-42). O
   * inventário é sempre o completo; o nível só recorta páginas. Os títulos
   * seguem o índice do molde (`data/relatorio-mc/textos-fixos.ts`). Nada de
   * "dashboard" ou "histórico": não existem, e a vitrine não promete o que a
   * plataforma não entrega.
   */
  conteudo: string
  /** Faixa sugerida de revenda ao cliente final, em reais. */
  revendaMin: number
  revendaMax: number
}

export const tiposRelatorio: TipoRelatorio[] = [
  {
    codigo: 'S1',
    nome: 'Perfil Essencial',
    creditos: 1,
    conteudo: 'Páginas 01 a 16: perfil DISC natural e adaptado, mapa de intensidade, combinação natural, custo da adaptação, os quatro fatores, forças, tensões e gatilhos',
    revendaMin: 97,
    revendaMax: 147,
  },
  {
    codigo: 'S2',
    nome: 'Perfil Completo',
    creditos: 2,
    conteudo: 'S1 + páginas 17 a 28: tipos psicológicos e hierarquia funcional, os seis valores, leitura integrada das três camadas e resumo do perfil',
    revendaMin: 147,
    revendaMax: 197,
  },
  {
    codigo: 'S3',
    nome: 'Perfil Executivo',
    creditos: 3,
    conteudo: 'S2 + páginas 29 a 36: estilo de liderança, mapa de competências, pontos a desenvolver e o início do guia de comunicação (perfis DOMINANTE e INFLUENTE)',
    revendaMin: 197,
    revendaMax: 297,
  },
  {
    codigo: 'S4',
    nome: 'Perfil Estratégico',
    creditos: 4,
    conteudo: 'Relatório completo, 42 páginas: S3 + comunicação com os perfis ESTÁVEL e CONFORME, como liderar cada perfil e o fechamento',
    revendaMin: 297,
    revendaMax: 497,
  },
]

export function getTipoRelatorio(codigo: CodigoRelatorio): TipoRelatorio {
  return tiposRelatorio.find((tipo) => tipo.codigo === codigo)!
}

export type PacoteCreditos = {
  nome: string
  creditos: number
  /** Preço do pacote, em reais. */
  preco: number
  publico: string
}

export const pacotesCreditos: PacoteCreditos[] = [
  {
    nome: 'Starter',
    creditos: 10,
    preco: 290,
    publico: 'Consultores iniciando, testando a ferramenta',
  },
  { nome: 'Pro', creditos: 50, preco: 990, publico: 'Consultores ativos, empresas médias' },
  {
    nome: 'Business',
    creditos: 100,
    preco: 1790,
    publico: 'Consultorias de RH, empresas maiores',
  },
  {
    nome: 'Enterprise',
    creditos: 500,
    preco: 6990,
    publico: 'Grandes empresas, contratos anuais',
  },
]

/**
 * Custo por crédito, derivado do pacote — nunca digitado à mão.
 *
 * Recebe a FORMA, e não o tipo `PacoteCreditos`: assim a linha de
 * `precos_pacotes` vinda do banco e o pacote fixo daqui passam pela mesma
 * conta. Duas versões desta divisão arredondariam diferente em telas vizinhas.
 *
 * (`getPacote` saiu: quem procura pacote pelo nome hoje é
 * `lib/precos.ts:pacotePorNome`, contra o banco.)
 */
export function custoPorCredito(pacote: { preco: number; creditos: number }): number {
  return pacote.preco / pacote.creditos
}

const REAL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

export function moeda(valor: number): string {
  return REAL.format(valor)
}
