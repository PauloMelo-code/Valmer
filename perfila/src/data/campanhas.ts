/** Campanhas — agrupam os passaportes enviados. */

export type Campanha = {
  id: string
  name: string
  /** Tipo de relatório gerado pela campanha. */
  type: string
  /** Abrangência (Global, Pessoal, Profissional). */
  scope: string
  date: string
  by: string
  /** Passaportes enviados. */
  total: number
  /** Passaportes já respondidos. */
  respondidos: number
  /** Passaportes ainda pendentes. */
  pendentes: number
}

const TIPO_PADRAO = 'DISC + Tipos Psicológicos + Valores'

export const campanhas: Campanha[] = [
  {
    id: 'camara-maringa',
    name: 'Câmara de Maringá',
    date: '30/07/2026 19:32',
    total: 17,
    respondidos: 17,
    pendentes: 0,
    type: TIPO_PADRAO,
    scope: 'Global',
    by: 'Valmer Albuquerque',
  },
  {
    id: 'capacitacao-sarandi',
    name: 'Capacitação Sarandi',
    date: '15/06/2026 19:39',
    total: 19,
    respondidos: 19,
    pendentes: 0,
    type: TIPO_PADRAO,
    scope: 'Global',
    by: 'Valmer Albuquerque',
  },
  {
    id: 'capacitacao-lideranca-maringa',
    name: 'Capacitação Liderança Maringá',
    date: '09/06/2026 19:02',
    total: 15,
    respondidos: 15,
    pendentes: 0,
    type: TIPO_PADRAO,
    scope: 'Global',
    by: 'Valmer Albuquerque',
  },
  {
    id: 'capacitacao-lideranca-servico-publico',
    name: 'Capacitação Liderança Ser. Público',
    date: '02/06/2026 10:15',
    total: 9,
    respondidos: 9,
    pendentes: 0,
    type: TIPO_PADRAO,
    scope: 'Global',
    by: 'Valmer Albuquerque',
  },
]

/** Resumo exibido no subtítulo da tela de Grupos de Mapeamento. */
export const campanhasResumo = {
  quantidade: campanhas.length,
  passaportes: campanhas.reduce((soma, campanha) => soma + campanha.total, 0),
}
