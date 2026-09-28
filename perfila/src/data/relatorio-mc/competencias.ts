/**
 * As 16 competencias da v2.2 — nome, descricao curta, niveis e radar.
 *
 * Fontes: blueprint secao 14 e paginas 30-32 do molde. Na v2.2 cada
 * competencia e medida por 4 adjetivos do inventario (a lista esta em
 * `../inventario-mc`, campo `competencia` dos itens) e nao mais derivada do
 * fator com uma constante.
 *
 * As descricoes de 12 competencias sao as da pagina 32. O molde ainda traz os
 * nomes antigos em S e C (Persistencia, Concentracao, Planejamento,
 * Prudencia), que as 64 palavras oficiais nao medem. Constancia, Cooperacao,
 * Analise e Investigacao entram no lugar (pendencia T4, ADR-0007 D7) e
 * tiveram a descricao redigida aqui.
 */
import { COMPETENCIAS_POR_FATOR, FATORES, type Competencia, type Fator } from '../inventario-mc'
import type { Status } from './status'

export type DescricaoCompetencia = {
  competencia: Competencia
  fator: Fator
  nome: string
  descricao: string
  status: Status
}

function c(competencia: Competencia, fator: Fator, nome: string, descricao: string, status: Status = 'transcrito'): DescricaoCompetencia {
  return { competencia, fator, nome, descricao, status }
}

export const COMPETENCIAS: Record<Competencia, DescricaoCompetencia> = {
  ousadia: c('ousadia', 'D', 'Ousadia', 'Ímpeto à ação em busca dos objetivos, encarando os acontecimentos como desafios'),
  comando: c('comando', 'D', 'Comando', 'Predisposição a assumir a liderança das situações em vez de se subordinar'),
  objetividade: c('objetividade', 'D', 'Objetividade', 'Ser direto e reagir rapidamente a novos acontecimentos, mantendo o foco'),
  assertividade: c('assertividade', 'D', 'Assertividade', 'Agir com exatidão e confiança, tomando posição de forma clara e firme'),

  persuasao: c('persuasao', 'I', 'Persuasão', 'Capacidade de influenciar outros à decisão favorável às suas ideias'),
  extroversao: c('extroversao', 'I', 'Extroversão', 'Ser expansivo, comunicativo e sociável, com facilidade para se relacionar'),
  entusiasmo: c('entusiasmo', 'I', 'Entusiasmo', 'Energia e animação com capacidade de motivar outras pessoas'),
  sociabilidade: c('sociabilidade', 'I', 'Sociabilidade', 'Tendência à busca por relacionamento social, de forma expansiva e amigável'),

  empatia: c('empatia', 'S', 'Empatia', 'Compreender o sentimento do outro, imaginando-se nas mesmas circunstâncias'),
  paciencia: c('paciencia', 'S', 'Paciência', 'Manter calma e serenidade diante de situações de estresse'),
  constancia: c('constancia', 'S', 'Constância', 'Manter o ritmo e a qualidade ao longo do tempo, sem oscilar com a pressão do momento', 'rascunho'),
  cooperacao: c('cooperacao', 'S', 'Cooperação', 'Somar esforço ao do grupo, oferecendo ajuda e construindo acordo em vez de disputa', 'rascunho'),

  organizacao: c('organizacao', 'C', 'Organização', 'Atenção minuciosa em busca da ordem de sistemas e ambientes'),
  detalhismo: c('detalhismo', 'C', 'Detalhismo', 'Exposição minuciosa de fatos e projetos, prezando pela qualidade'),
  analise: c('analise', 'C', 'Análise', 'Examinar dados e situações com lógica, separando fato de opinião antes de concluir', 'rascunho'),
  investigacao: c('investigacao', 'C', 'Investigação', 'Buscar a causa antes da solução, observando com critério o que os outros deixam passar', 'rascunho'),
}

/** Todas as 16, na ordem de fator (D, I, S, C) e de cadastro — a das barras da pagina 32. */
export const ORDEM_COMPETENCIAS: readonly Competencia[] = FATORES.flatMap((f) => COMPETENCIAS_POR_FATOR[f])

/**
 * As 12 do radar da pagina 31 (secao 14, ADR-0007 D7): fora Assertividade,
 * Sociabilidade, Constancia e Detalhismo. Tres por fator, para o radar nao
 * pender para um lado so.
 */
const FORA_DO_RADAR: readonly Competencia[] = ['assertividade', 'sociabilidade', 'constancia', 'detalhismo']
export const COMPETENCIAS_RADAR: readonly Competencia[] = ORDEM_COMPETENCIAS.filter((k) => !FORA_DO_RADAR.includes(k))

export type CodigoNivelCompetencia = 'potencializar' | 'consolidar' | 'desenvolver'

/** Os tres niveis da pagina 30. Limites da secao 14: > 70, 40 a 70, < 40. */
export const NIVEIS_COMPETENCIA: readonly { codigo: CodigoNivelCompetencia; nome: string; faixa: string; texto: string }[] = [
  { codigo: 'potencializar', nome: 'Potencializar', faixa: 'acima de 70', texto: 'Competência acima de 70 no natural. Recurso disponível com facilidade, que rende mais quando usado com intenção deliberada.' },
  { codigo: 'consolidar', nome: 'Consolidar', faixa: 'entre 40 e 70', texto: 'Competência entre 40 e 70. Aparece conforme o contexto e o nível de segurança, e se estabiliza com prática recorrente.' },
  { codigo: 'desenvolver', nome: 'Desenvolver', faixa: 'abaixo de 40', texto: 'Competência abaixo de 40. Exige repertório, acompanhamento ou, quando o custo for alto demais, complemento por outra pessoa.' },
]

/** 70 ainda e Consolidar e 40 tambem: os extremos da faixa do meio sao inclusivos. */
export function nivelDaCompetencia(escore: number): CodigoNivelCompetencia {
  if (escore > 70) return 'potencializar'
  if (escore >= 40) return 'consolidar'
  return 'desenvolver'
}

/** Rotulos fixos das paginas 31-32. */
export const ROTULOS_COMPETENCIAS = {
  tituloResultado: 'Mapa de Competências, resultado',
  subtituloResultado: 'Doze competências lidas no perfil natural e no perfil adaptado.',
  legendaNatural: 'PERFIL NATURAL · LINHA CONTÍNUA',
  legendaAdaptado: 'PERFIL ADAPTADO · LINHA TRACEJADA',
  escalaRadar: 'Escala 0 a 100 · rótulo: natural · adaptado · ponto colorido indica o fator de origem',
  tituloDetalhe: 'Competências em detalhe',
  subtituloDetalhe: 'Quatro competências por fator. O primeiro número é o natural, o segundo é o adaptado.',
  legendaBarras: 'Em cada barra, a faixa superior sólida é o natural e a faixa inferior hachurada é o adaptado.',
} as const
