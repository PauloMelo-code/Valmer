/** Preferências de notificação do analista. */

export type Notificacao = {
  id: string
  title: string
  desc: string
  /** Estado inicial de cada canal. */
  email: boolean
  whatsapp: boolean
}

export const notificacoes: Notificacao[] = [
  {
    id: 'questionario',
    title: 'Questionário respondido',
    desc: 'Notificação quando um cliente finaliza o questionário',
    email: false,
    whatsapp: false,
  },
  {
    id: 'relatorio',
    title: 'Relatório mensal de uso da plataforma',
    desc: 'Resumo das informações de uso de créditos, inventário e outros dados',
    email: false,
    whatsapp: false,
  },
  {
    id: 'recarga',
    title: 'Compra de créditos recorrente',
    desc: 'Notificação de compra de créditos pelo método de recarga automática',
    email: true,
    whatsapp: true,
  },
]

/** Canais de contato exibidos na tela de Suporte. */
export const canaisSuporte = [
  {
    icon: 'mail',
    label: 'E-mail',
    valor: 'contato@perfila.app',
    destaque: false,
  },
  {
    icon: 'chat',
    label: 'Suporte comercial · Beatriz Nunes',
    valor: '+55 (11) 90000-0001',
    destaque: true,
  },
  {
    icon: 'headset',
    label: 'Suporte técnico',
    valor: '+55 (11) 90000-0001',
    destaque: true,
  },
] as const

export const horarioAtendimento =
  'Horário de atendimento (Brasília): segunda a quinta das 08h às 18h, sexta até 17h.'
