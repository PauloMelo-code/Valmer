/**
 * Painel do respondente
 * ---------------------
 * Os valores abaixo são os do relatório de exemplo (Adriana Prado,
 * realizado em 02/09/2026) e batem com o PDF de 56 páginas.
 */

import type { FatorDisc } from './dna'

/** Situação do respondente: muda o que o painel oferece. */
export type SituacaoInventario = 'pendente' | 'concluido'

export type RelatorioRespondente = {
  id: string
  campanha: string
  analista: string
  data: string
  situacao: SituacaoInventario
}

export const relatorios: RelatorioRespondente[] = [
  {
    id: 'curso-lideranca',
    campanha: 'Curso Liderança',
    analista: 'Valmer Albuquerque dos Santos',
    data: '02/09/2026 às 07:30',
    situacao: 'concluido',
  },
]

/** Analista responsável, exibido no agradecimento. */
export const analistaResponsavel = {
  nome: 'Valmer Albuquerque dos Santos',
  telefone: '+55 (44) 99159-5998',
}

export type Medida = {
  rotulo: string
  valor: number
}

/** Perfil natural: como a pessoa é. */
export const perfilNatural: { fator: FatorDisc; rotulo: string; valor: number }[] = [
  { fator: 'D', rotulo: 'Dominante', valor: 41 },
  { fator: 'I', rotulo: 'Influente', valor: 70 },
  { fator: 'S', rotulo: 'Estável', valor: 39 },
  { fator: 'C', rotulo: 'Conforme', valor: 50 },
]

/** Perfil adaptado: como a pessoa acredita que esperam que ela seja. */
export const perfilAdaptado: { fator: FatorDisc; rotulo: string; valor: number }[] = [
  { fator: 'D', rotulo: 'Dominante', valor: 61 },
  { fator: 'I', rotulo: 'Influente', valor: 54 },
  { fator: 'S', rotulo: 'Estável', valor: 23 },
  { fator: 'C', rotulo: 'Conforme', valor: 62 },
]

export const meusValores: Medida[] = [
  { rotulo: 'Teórico / Conhecimento', valor: 64 },
  { rotulo: 'Econômico / Utilidade', valor: 50 },
  { rotulo: 'Estético / Harmonia', valor: 60 },
  { rotulo: 'Social / Altruísmo', valor: 37 },
  { rotulo: 'Político / Poder', valor: 66 },
  { rotulo: 'Religioso / Princípios', valor: 33 },
]

export const competencias: Medida[] = [
  { rotulo: 'Ousadia', valor: 62 },
  { rotulo: 'Comando', valor: 47 },
  { rotulo: 'Objetividade', valor: 53 },
  { rotulo: 'Assertividade', valor: 51 },
  { rotulo: 'Persuasão', valor: 80 },
  { rotulo: 'Extroversão', valor: 78 },
  { rotulo: 'Entusiasmo', valor: 71 },
  { rotulo: 'Sociabilidade', valor: 61 },
  { rotulo: 'Empatia', valor: 58 },
  { rotulo: 'Paciência', valor: 45 },
  { rotulo: 'Persistência', valor: 43 },
  { rotulo: 'Planejamento', valor: 48 },
  { rotulo: 'Organização', valor: 50 },
  { rotulo: 'Detalhismo', valor: 52 },
  { rotulo: 'Prudência', valor: 46 },
  { rotulo: 'Concentração', valor: 53 },
]

/* ------------------------------------------------------------------
   Mapa de Autoavaliação — as onze áreas (pilares) da vida.
   A ordem é a da roda, começando no topo e seguindo o sentido
   horário.
   ------------------------------------------------------------------ */

export type AreaMapa = {
  id: string
  nome: string
  /** Texto que explica o pilar e orienta a nota. */
  descricao: string
}

export const areasMapa: AreaMapa[] = [
  {
    id: 'emocional',
    nome: 'Emocional',
    descricao:
      'Este pilar trata do seu equilíbrio interno: como você reconhece, sustenta e regula as próprias emoções no dia a dia.',
  },
  {
    id: 'espiritual',
    nome: 'Espiritual',
    descricao:
      'Este pilar refere-se ao relacionamento pleno e saudável com o seu Deus, com a qualidade e quantidade de fé que você possui e com a capacidade de descansar suas inquietações e temores em uma figura perfeita e superior. No caso dos ateus e agnósticos, a nota também é zero, pois não há essa crença. A importância de ter esse pilar em plenitude se justifica à medida em que pesquisadores comprovam, diariamente, os benefícios da crença em um deus. 1 - Você dedica tempo para o pilar espiritual? De que forma você avalia a quantidade e a qualidade desse tempo? 2 - O quanto você tem se dedicado para trabalhar o seu espiritual? 3 - Você está satisfeito com seus resultados neste pilar?',
  },
  {
    id: 'parentes',
    nome: 'Parentes',
    descricao:
      'Este pilar trata da sua relação com a família de origem: pais, irmãos e demais parentes próximos.',
  },
  {
    id: 'conjugal',
    nome: 'Conjugal',
    descricao:
      'Este pilar trata da qualidade da sua relação afetiva com o cônjuge ou companheiro(a).',
  },
  {
    id: 'filhos',
    nome: 'Filhos',
    descricao:
      'Este pilar trata da sua relação com os filhos: presença, qualidade do tempo e participação na formação deles.',
  },
  {
    id: 'social',
    nome: 'Social',
    descricao:
      'Este pilar trata da sua vida em sociedade: amizades, convívio e as redes de apoio que você mantém.',
  },
  {
    id: 'saude',
    nome: 'Saúde',
    descricao:
      'Este pilar trata do cuidado com o corpo: alimentação, sono, atividade física e acompanhamento médico.',
  },
  {
    id: 'servir',
    nome: 'Servir',
    descricao:
      'Este pilar trata da sua contribuição para o outro: voluntariado, causas e o que você devolve à comunidade.',
  },
  {
    id: 'intelectual',
    nome: 'Intelectual',
    descricao:
      'Este pilar trata do seu desenvolvimento intelectual: estudo, leitura e a busca contínua por conhecimento.',
  },
  {
    id: 'financeiro',
    nome: 'Financeiro',
    descricao:
      'Este pilar trata da sua saúde financeira: renda, reserva, dívidas e planejamento de longo prazo.',
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    descricao:
      'Este pilar trata da sua realização no trabalho: propósito, reconhecimento e perspectiva de carreira.',
  },
]

/**
 * ⚠️ Só o texto do pilar Espiritual veio do sistema original. Os
 * outros dez são resumos provisórios — substitua pelos textos
 * oficiais, que trazem as perguntas de apoio de cada pilar.
 */

/** Notas de 0 a 10 por área. Vazio enquanto o mapa não é preenchido. */
export const notasMapa: Record<string, number> = {}

export const textoMapa = {
  introducao:
    'O Mapa de Autoavaliação permite uma avaliação e compreensão do estado atual em que a pessoa se encontra, no momento em que ele é feito, considerando cada área (pilar) da sua vida. Com isso, será possível avaliar quais áreas precisam de mais atenção e que, portanto, requerem ações para que haja melhoras.',
  instrucoes:
    'Para cada área descrita no mapa há uma régua de zero a dez. Nela, você deverá assinalar uma nota que represente o estado atual daquela área — ou seja, na sua própria avaliação, qual a nota que você atribui a si mesmo na área correspondente. Faça isso para as onze áreas.',
}

export const textoVisao360 = {
  descricao:
    'Caso queira, a seguir você pode convidar pessoas do seu convívio para entender melhor a visão que elas têm a seu respeito e, principalmente, compreender a real exigência proposta pelo seu ambiente global, pessoal e profissional para que você tenha melhores resultados.',
  requisito:
    'É necessário que pelo menos 2 convidados de cada área de atuação respondam ao seu convite para que seu relatório seja atualizado.',
  avisoModal:
    'Você precisa que pelo menos 2 convidados do mesmo ambiente respondam para atualizar seu relatório.',
}

export const textoAgradecimento = {
  titulo: 'Nossos agradecimentos',
  corpo:
    'A Impacto Academy e {analista} agradecem a sua disponibilidade! O seu Relatório de Análise de Perfil Comportamental permite conhecer os seus talentos mais desenvolvidos, assim como os pontos que precisam de mais atenção.',
  contato: 'Caso deseje mais informações, procure {analista} nos contatos a seguir:',
}

/** Ambientes de convívio de onde vêm os convidados da Visão 360º. */
export const ambientesConvite = ['Pessoal', 'Profissional', 'Familiar']
