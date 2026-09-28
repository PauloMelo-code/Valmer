/**
 * Indicadores de validade da resposta (secao 6). Nenhum bloqueia o relatorio:
 * viram "Confiabilidade da aplicacao: alta, media ou baixa" para o facilitador
 * e deixam o texto da IA mais cauteloso quando a confiabilidade e baixa.
 *
 * A entrada sao as telas como foram gravadas, uma por (etapa, tela), com o
 * carimbo de entrada e saida. Este arquivo nao le banco: quem chama entrega a
 * lista.
 */

export type TelaGravada = {
  /** 1 DISC natural · 2 DISC adaptado · 3 Jung · 4 valores. */
  etapa: number
  /** "G07" (etapas 1 e 2) · "EI04" (etapa 3) · "V03" (etapa 4). */
  tela: string
  /** Etapas 1, 2 e 4: ids na ordem escolhida, o 1o e o que mais combina. */
  ordem_final?: readonly string[] | null
  /** Etapa 3: o botao clicado, 0..3 da esquerda para a direita. */
  resposta_exibida?: number | null
  /** Etapa 3: a resposta ja convertida ao polo A (3 = muito A ... 0 = muito B). */
  resposta_polo_a?: number | null
  /** Falso se a tela foi enviada na ordem inicial sorteada. */
  moveu_item: boolean
  entrou_em: Date | string
  saiu_em: Date | string
}

export type CodigoAlerta = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'
export type PesoAlerta = 'alto' | 'medio' | 'baixo' | 'informativo'
export type Alerta = { codigo: CodigoAlerta; peso: PesoAlerta }
export type Confiabilidade = 'alta' | 'media' | 'baixa'

export type Validade = {
  alertas: Alerta[]
  confiabilidade: Confiabilidade
  /** Tempo de resposta em segundos, ja sem as pausas longas. */
  tempo_total_s: number
}

const MIN = 60_000
const PAUSA_MS = 10 * MIN

function instante(x: Date | string, tela: string): number {
  const t = new Date(x).getTime()
  if (Number.isNaN(t)) throw new RangeError(`tela ${tela} com carimbo de tempo invalido: ${String(x)}`)
  return t
}

/**
 * Tempo ativo: da primeira entrada a ultima saida, sem as pausas longas.
 * Pausa e qualquer trecho parado acima de 10 minutos — entre uma tela e outra
 * (fechou o link e voltou depois) ou dentro de uma tela so (deixou a aba
 * aberta). Telas sobrepostas (voltou para refazer) contam o tempo uma vez so.
 */
function tempoAtivoMs(telas: readonly TelaGravada[]): number {
  const trechos = telas
    .map((t) => ({ ini: instante(t.entrou_em, t.tela), fim: instante(t.saiu_em, t.tela) }))
    .sort((a, b) => a.ini - b.ini)
  let total = 0
  let ate = -Infinity
  for (const { ini, fim } of trechos) {
    const lacuna = ini - ate
    if (lacuna > 0 && lacuna <= PAUSA_MS) total += lacuna
    const dentro = fim - Math.max(ini, ate)
    if (dentro > 0 && dentro <= PAUSA_MS) total += dentro
    ate = Math.max(ate, fim)
  }
  return total
}

export function confiabilidade(alertas: readonly Alerta[]): Confiabilidade {
  const medios = alertas.filter((a) => a.peso === 'medio').length
  if (alertas.some((a) => a.peso === 'alto') || medios >= 2) return 'baixa'
  if (medios === 1) return 'media'
  return 'alta'
}

export function validade(telas: readonly TelaGravada[]): Validade {
  const alertas: Alerta[] = []
  const ms = tempoAtivoMs(telas)
  const disc = telas.filter((t) => t.etapa === 1 || t.etapa === 2)
  const grupos = telas.filter((t) => t.etapa === 1 || t.etapa === 2 || t.etapa === 4)
  const jung = telas.filter((t) => t.etapa === 3)

  // V1 · tempo total fora de 7 a 60 minutos.
  if (ms < 7 * MIN || ms > 60 * MIN) alertas.push({ codigo: 'V1', peso: 'medio' })

  // V2 · mais de 30% das telas DISC em menos de 2,5 s.
  const rapidas = disc.filter((t) => instante(t.saiu_em, t.tela) - instante(t.entrou_em, t.tela) < 2500).length
  if (disc.length && rapidas > disc.length * 0.3) alertas.push({ codigo: 'V2', peso: 'alto' })

  // V3 · mais de 25% dos grupos enviados na ordem sorteada, sem mover nada.
  const parados = grupos.filter((t) => !t.moveu_item).length
  if (grupos.length && parados > grupos.length * 0.25) alertas.push({ codigo: 'V3', peso: 'alto' })

  // V4 · natural e adaptado identicos em 14 ou mais dos 16 grupos. Informativo:
  // ha quem viva num ambiente que pede exatamente o que ela e.
  const natural = new Map(telas.filter((t) => t.etapa === 1).map((t) => [t.tela, (t.ordem_final ?? []).join()]))
  const iguais = telas.filter((t) => t.etapa === 2 && t.ordem_final?.length && natural.get(t.tela) === t.ordem_final.join()).length
  if (iguais >= 14) alertas.push({ codigo: 'V4', peso: 'informativo' })

  // V5 · o mesmo botao em 24 ou mais dos 27 pares. Conta o botao exibido, nao
  // o polo: quem clica sempre na ponta esquerda nao esta escolhendo nada, e o
  // lado sorteado espalha isso entre os dois polos.
  const porBotao = new Map<number, number>()
  for (const t of jung) {
    if (t.resposta_exibida == null) continue
    porBotao.set(t.resposta_exibida, (porBotao.get(t.resposta_exibida) ?? 0) + 1)
  }
  if (Math.max(0, ...porBotao.values()) >= 24) alertas.push({ codigo: 'V5', peso: 'alto' })

  // V6 · so "Muito" (as pontas, botao 0 ou 3) em 26 ou mais pares.
  const extremos = jung.filter((t) => t.resposta_exibida === 0 || t.resposta_exibida === 3).length
  if (extremos >= 26) alertas.push({ codigo: 'V6', peso: 'baixo' })

  return { alertas, confiabilidade: confiabilidade(alertas), tempo_total_s: Math.round(ms / 1000) }
}
