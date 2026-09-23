/**
 * Facilitadores e assessments
 * ---------------------------
 * Espelha as tabelas `users`, `assessments` e `credit_transactions`
 * da especificação, com dados de exemplo.
 */

import { initials } from '@/lib/text'
import type { FatorDisc } from './dna'
import type { CodigoRelatorio } from './planos'

export type Facilitador = {
  id: string
  nome: string
  email: string
  empresa: string
  /**
   * Contato que vai impresso na capa e no rodapé do relatório. É o do
   * facilitador, e não o da plataforma: o relatório chega ao cliente
   * final através dele, e é ele quem atende.
   */
  telefone: string
  /** Saldo de créditos disponível. */
  creditos: number
  ativo: boolean
  criadoEm: string
  iniciais: string
}

const base: Omit<Facilitador, 'iniciais'>[] = [
  {
    id: 'valmer',
    nome: 'Valmer Albuquerque dos Santos',
    email: 'valmersantos1@gmail.com',
    empresa: 'Impacto Academy',
    telefone: '+55 (44) 99159-5998',
    creditos: 182,
    ativo: true,
    criadoEm: '06/01/2026',
  },
  {
    id: 'beatriz-nunes',
    nome: 'Beatriz Nunes',
    email: 'beatriz.nunes@example.com',
    empresa: 'Nunes Desenvolvimento Humano',
    telefone: '+55 (11) 90000-0002',
    creditos: 34,
    ativo: true,
    criadoEm: '18/03/2026',
  },
  {
    id: 'rogerio-lima',
    nome: 'Rogerio Lima',
    email: 'rogerio.lima@example.com',
    empresa: 'Lima Gestao de Pessoas',
    telefone: '+55 (41) 90000-0003',
    creditos: 7,
    ativo: true,
    criadoEm: '02/05/2026',
  },
  {
    id: 'carla-menezes',
    nome: 'Carla Menezes',
    email: 'carla.menezes@example.com',
    empresa: 'Menezes Consultoria',
    telefone: '+55 (48) 90000-0004',
    creditos: 0,
    ativo: false,
    criadoEm: '21/07/2026',
  },
]

export const facilitadores: Facilitador[] = base.map((item) => ({
  ...item,
  iniciais: initials(item.nome),
}))

/** Facilitador logado no ambiente do parceiro. */
export const facilitadorAtual = facilitadores[0]!

export type SituacaoAssessment = 'pendente' | 'em_andamento' | 'concluido' | 'expirado'

export type Assessment = {
  id: string
  token: string
  facilitadorId: string
  avaliadoNome: string
  avaliadoEmail: string
  tipoRelatorio: CodigoRelatorio
  situacao: SituacaoAssessment
  creditosUsados: number
  criadoEm: string
  expiraEm: string
  concluidoEm?: string
  /**
   * Quantas das 28 respostas caíram em cada fator. Somam 28, então os
   * percentuais derivados somam 100 — é assim que o instrumento novo
   * funciona, e é isso que o relatório afirma ao leitor.
   *
   * Guardar os contadores em vez do perfil pronto evita que a lista e
   * o relatório discordem: os dois derivam do mesmo número.
   */
  contadores?: Record<FatorDisc, number>
  /**
   * Ja existe narrativa gravada para este mapa?
   *
   * Falso num mapa concluido significa relatorio sem as secoes escritas, e e
   * o que decide se a linha oferece "Gerar relatorio" ou ver e baixar.
   * Opcional porque os dados de prototipo deste arquivo nao tem relatorio
   * gravado nenhum.
   */
  temNarrativa?: boolean
}

/**
 * Os mapas do seed. Sem `token`, e isso e a guarda, nao um esquecimento.
 *
 * Este array ja trouxe tokens escritos a mao — "demo" e "expirado" entre eles.
 * O token e a UNICA credencial do avaliado (`lib/actions/avaliacao.ts`), entao
 * palavra curta em arquivo versionado e link secreto publicado: quem digitar
 * /avaliacao/demo no endereco de homologacao responde e conclui o mapa de uma
 * pessoa real. Trocar por doze hexadecimais fixos nao resolveria — continuaria
 * publicado aqui.
 *
 * Quem sorteia o token e `lib/db/seed.ts`, com o MESMO `novoToken()` da criacao
 * de verdade, e os imprime no fim da execucao. Sem o campo aqui, nao ha como
 * alguem reintroduzir um token adivinhavel sem o compilador reclamar.
 */
export const assessments: Omit<Assessment, 'token'>[] = [
  {
    id: 'a1',
    facilitadorId: 'valmer',
    avaliadoNome: 'Adriana Prado',
    avaliadoEmail: 'adriana.prado@example.com',
    tipoRelatorio: 'S2',
    situacao: 'pendente',
    creditosUsados: 2,
    criadoEm: '02/09/2026',
    expiraEm: '09/09/2026',
  },
  {
    id: 'a2',
    facilitadorId: 'valmer',
    avaliadoNome: 'Bruno Carvalho',
    avaliadoEmail: 'bruno.carvalho@example.com',
    tipoRelatorio: 'S3',
    situacao: 'concluido',
    creditosUsados: 3,
    criadoEm: '28/08/2026',
    expiraEm: '04/09/2026',
    concluidoEm: '29/08/2026',
    contadores: { D: 8, I: 12, S: 3, C: 5 },
  },
  {
    id: 'a3',
    facilitadorId: 'valmer',
    avaliadoNome: 'Camila Ferraz',
    avaliadoEmail: 'camila.ferraz@example.com',
    tipoRelatorio: 'S1',
    situacao: 'em_andamento',
    creditosUsados: 1,
    criadoEm: '30/08/2026',
    expiraEm: '06/09/2026',
  },
  {
    id: 'a4',
    facilitadorId: 'valmer',
    avaliadoNome: 'Diego Antunes',
    avaliadoEmail: 'diego.antunes@example.com',
    tipoRelatorio: 'S1',
    situacao: 'expirado',
    creditosUsados: 1,
    criadoEm: '13/08/2026',
    expiraEm: '20/08/2026',
  },
  {
    id: 'a5',
    facilitadorId: 'beatriz-nunes',
    avaliadoNome: 'Eduardo Salles',
    avaliadoEmail: 'eduardo.salles@example.com',
    tipoRelatorio: 'S4',
    situacao: 'concluido',
    creditosUsados: 4,
    criadoEm: '25/08/2026',
    expiraEm: '01/09/2026',
    concluidoEm: '26/08/2026',
    contadores: { D: 4, I: 5, S: 8, C: 11 },
  },
]

export const ROTULO_SITUACAO: Record<SituacaoAssessment, string> = {
  pendente: 'Aguardando resposta',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  expirado: 'Expirado',
}

export type TipoTransacao = 'compra' | 'uso' | 'estorno' | 'bonus'

/**
 * Nome de cada movimento do extrato, ao lado do tipo que ele nomeia.
 *
 * Morava dentro de `components/creditos/TabelaExtrato.tsx` e subiu para cá
 * quando a exportação em CSV passou a precisar dos mesmos rótulos: a tabela e
 * o arquivo lêem daqui, então um tipo novo de movimento não aparece nomeado
 * numa e cru no outro. Mesmo lugar de `ROTULO_SITUACAO`, logo acima.
 */
export const ROTULO_TIPO: Record<TipoTransacao, string> = {
  compra: 'Compra',
  uso: 'Uso',
  estorno: 'Estorno',
  bonus: 'Bônus',
}

export type Transacao = {
  id: string
  facilitadorId: string
  tipo: TipoTransacao
  /** Positivo em compras e bônus, negativo em uso. */
  quantidade: number
  /**
   * O que a plataforma cobrou nesta compra, em reais. Nulo em movimento que
   * não é compra e nas compras anteriores à coluna que o grava — ver
   * `db/schema/creditos.ts`. Opcional porque os dados de protótipo deste
   * arquivo não têm valor gravado nenhum.
   */
  valorCobrado?: number | null
  descricao: string
  data: string
}

export const transacoes: Transacao[] = [
  {
    id: 't1',
    facilitadorId: 'valmer',
    tipo: 'compra',
    quantidade: 100,
    descricao: 'Pacote Business',
    data: '06/01/2026',
  },
  {
    id: 't2',
    facilitadorId: 'valmer',
    tipo: 'compra',
    quantidade: 100,
    descricao: 'Pacote Business',
    data: '14/06/2026',
  },
  {
    id: 't3',
    facilitadorId: 'valmer',
    tipo: 'uso',
    quantidade: -3,
    descricao: 'Mapa S3 · Bruno Carvalho',
    data: '28/08/2026',
  },
  {
    id: 't4',
    facilitadorId: 'valmer',
    tipo: 'uso',
    quantidade: -1,
    descricao: 'Mapa S1 · Camila Ferraz',
    data: '30/08/2026',
  },
  {
    id: 't5',
    facilitadorId: 'valmer',
    tipo: 'uso',
    quantidade: -2,
    descricao: 'Mapa S2 · Adriana Prado',
    data: '02/09/2026',
  },
  {
    id: 't6',
    facilitadorId: 'beatriz-nunes',
    tipo: 'compra',
    quantidade: 50,
    descricao: 'Pacote Pro',
    data: '18/03/2026',
  },
  {
    id: 't7',
    facilitadorId: 'rogerio-lima',
    tipo: 'compra',
    quantidade: 10,
    descricao: 'Pacote Starter',
    data: '02/05/2026',
  },
  {
    id: 't8',
    facilitadorId: 'rogerio-lima',
    tipo: 'bonus',
    quantidade: 2,
    descricao: 'Bônus de indicação',
    data: '10/05/2026',
  },
]

// `transacoesDe` e `assessmentsDe` sairam: recortavam o array de prototipo por
// dono e nao tinham um unico chamador desde que as telas passaram a ler o banco
// por `lib/painel.ts`, que faz o mesmo recorte no WHERE.
