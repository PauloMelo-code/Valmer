/**
 * Escreve a narrativa da IA do relatorio MC 3.1 e grava em
 * `assessments_resultados.narrativa`.
 *
 * Roda SOMENTE no servidor (a chave da API nunca chega ao navegador) e NAO e
 * "use server": gasta dinheiro a cada chamada, e exposta como Server Action
 * viraria endpoint POST publico. Quem chama traz a propria autorizacao
 * (`actions/relatorio-mc.ts` confere sessao, permissao e dono).
 *
 * Segue o padrao de lib/relatorio/gerar.ts e persistir.ts, que ja roda em
 * homologacao: saida estruturada com o esquema zod, system em cache, retry do
 * SDK alto, recusa lida pelo stop_reason, e ARRENDAMENTO para a mesma
 * narrativa nao ser paga duas vezes. Duas diferencas:
 *
 * - STREAMING. O JSON inteiro passa de 4 mil palavras; com o pensamento do
 *   modelo, o `max_tokens` que cabe nao cabe numa chamada sem streaming (o SDK
 *   recusa por risco de timeout). `finalMessage()` devolve a mesma mensagem
 *   ja validada que o `parse` devolveria.
 * - SEM `fallbacks` de servidor. Os modelos-alvo documentados sao Opus
 *   (4.8 e 5) atras de um Opus ou Fable; para o Sonnet 5 nao ha lista de
 *   substitutos publicada, e um 400 em toda chamada seria pior que tratar a
 *   recusa rara como falha legivel. Ver o relatorio da frente.
 */
import Anthropic, { AnthropicError, APIError } from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assessments, assessmentsResultados } from '@/lib/db/schema'
import { registrarAuditoria } from '@/lib/audit/logger'
import type { ResultadoMotor } from '@/lib/motor'
import { esquemaNarrativaMC, PARAGRAFOS, type NarrativaMC } from './narrativa-esquema'
import { montarPedido, SISTEMA } from './narrativa-prompt'

/** Secao 18 do blueprint e ADR-0007 D10. Trocar o modelo e mudar esta linha. */
export const MODELO_NARRATIVA_MC = 'claude-sonnet-5'

/**
 * O JSON tem ~4.100 palavras de texto (~9 mil tokens em portugues) mais o
 * pensamento adaptativo. Os 8.000 da secao 18 truncariam o JSON no meio, e
 * JSON truncado nao e narrativa: e uma chamada paga jogada fora.
 */
const MAX_TOKENS = 32000

/** Assina as linhas escritas pelo gerador; nao ha pessoa por tras delas. */
const GERADOR = '00000000-0000-0000-0000-000000000000'

/**
 * Maior que o de persistir.ts (10 min, UMA chamada): aqui a geracao pode fazer
 * DUAS chamadas em streaming, cada uma com o timeout padrao de 10 min do SDK.
 * Vencido o prazo, um clique arrenda de novo e paga outra narrativa.
 */
export const PRAZO_DA_GERACAO_MS = 25 * 60 * 1000

/** Erro de negocio: a API respondeu, mas nao com a narrativa (ou nem foi chamada). */
export class FalhaNaNarrativaMC extends Error {
  constructor(
    message: string,
    readonly causa: 'recusa' | 'formato' | 'configuracao',
  ) {
    super(message)
    this.name = 'FalhaNaNarrativaMC'
  }
}

function parametros(pedido: string) {
  return {
    model: MODELO_NARRATIVA_MC,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' as const },
    system: [{ type: 'text' as const, text: SISTEMA, cache_control: { type: 'ephemeral' as const } }],
    messages: [{ role: 'user' as const, content: pedido }],
    output_config: { format: betaZodOutputFormat(esquemaNarrativaMC) },
  }
}

export type ParametrosIA = ReturnType<typeof parametros>

type Parada = { stop_reason: string | null; stop_details?: { category?: string | null } | null }

/** O pedaco do SDK que este modulo usa. O teste injeta um simulado com esta forma. */
export type ClienteIA = {
  beta: {
    messages: {
      stream(params: ParametrosIA): {
        finalMessage(): Promise<Parada & { parsed_output?: NarrativaMC | null }>
        /** A mensagem parcial, que continua ai quando o parse do esquema falha no fim do stream. */
        readonly currentMessage?: Parada | undefined
      }
    }
  }
}

/**
 * Tamanho pedido de cada texto corrido, em palavras (os `.describe()` do
 * esquema). Manter em sincronia com eles.
 */
const PALAVRAS: Partial<Record<keyof NarrativaMC, readonly [number, number]>> = {
  sintese_combinacao_natural: [300, 400],
  custo_adaptacao_narrativa: [180, 240],
  fator_d_narrativa: [200, 200],
  fator_i_narrativa: [200, 200],
  fator_s_narrativa: [200, 200],
  fator_c_narrativa: [200, 200],
  jung_e_i_narrativa: [120, 120],
  jung_n_s_narrativa: [120, 120],
  jung_t_f_narrativa: [120, 120],
  hierarquia_funcional_narrativa: [150, 150],
  dois_valores_narrativa: [200, 200],
  leitura_integrada: [250, 250],
  mensagem_final: [100, 130],
}

// ponytail: faixa fixa de 60% a 140% do pedido. O limite que importa e o de
// cima (o .zw corta o que transborda, C39); se o encaixe real das paginas
// pedir outro teto, vira numero por chave aqui.
const MINIMO = 0.6
const MAXIMO = 1.4

const contarPalavras = (t: string) => t.split(/\s+/).filter(Boolean).length
const contarParagrafos = (t: string) => t.split(/\n\s*\n/).filter((p) => p.trim()).length

/**
 * O que a narrativa tem fora do pedido: paragrafos na quantidade errada ou
 * tamanho longe do pedido. Lista vazia = pronta para as paginas.
 *
 * So conta as chaves de PARAGRAFOS que sao numero: o que nao for numero la
 * nao e contrato de quantidade.
 */
export function conferirNarrativa(n: NarrativaMC): string[] {
  const problemas: string[] = []
  for (const [chave, quantos] of Object.entries(PARAGRAFOS)) {
    if (typeof quantos !== 'number') continue
    const tem = contarParagrafos(n[chave as keyof NarrativaMC] as string)
    if (tem !== quantos) problemas.push(`${chave} veio com ${tem} parágrafo(s); o pedido é ${quantos}`)
  }
  for (const [chave, faixa] of Object.entries(PALAVRAS)) {
    const [min, max] = faixa!
    const tem = contarPalavras(n[chave as keyof NarrativaMC] as string)
    if (tem < min * MINIMO || tem > max * MAXIMO) {
      problemas.push(`${chave} veio com ${tem} palavras; o pedido é ${min === max ? min : `${min} a ${max}`}`)
    }
  }
  return problemas
}

const FORA_DO_FORMATO = 'a resposta não veio no formato pedido'
const TRUNCADA = 'a resposta foi cortada no limite de tamanho (max_tokens) antes de fechar o JSON'

/** Recusa chega com HTTP 200: olhar o motivo antes do conteudo. */
function conferirRecusa(m: Parada | undefined) {
  if (m?.stop_reason === 'refusal') {
    throw new FalhaNaNarrativaMC(`O modelo recusou gerar a narrativa (${m.stop_details?.category ?? 'sem categoria'}).`, 'recusa')
  }
}

/** Uma chamada. Devolve o motivo, em texto, quando o JSON nao veio no esquema (truncado ou invalido). */
async function chamar(cliente: ClienteIA, pedido: string): Promise<NarrativaMC | string> {
  const stream = cliente.beta.messages.stream(parametros(pedido))
  let resposta
  try {
    resposta = await stream.finalMessage()
  } catch (erro) {
    // O SDK lanca AnthropicError puro quando o texto nao passa no esquema, e o
    // parse roda no fim do stream, ANTES de a resposta chegar aqui: recusa ou
    // max_tokens com texto parcial caem neste catch, e o motivo so esta na
    // mensagem parcial. Erro de API (APIError, subclasse) e de rede sobem.
    if (!(erro instanceof AnthropicError) || erro instanceof APIError) throw erro
    conferirRecusa(stream.currentMessage)
    return stream.currentMessage?.stop_reason === 'max_tokens' ? TRUNCADA : FORA_DO_FORMATO
  }
  conferirRecusa(resposta)
  return resposta.parsed_output ?? (resposta.stop_reason === 'max_tokens' ? TRUNCADA : FORA_DO_FORMATO)
}

/**
 * Escreve a narrativa. Fora do pedido (paragrafos, tamanho, esquema): UMA nova
 * tentativa, dizendo o que corrigir. A segunda vale mesmo imperfeita, com os
 * problemas em `avisos`: `paragrafos()` divide o que vier, e pagar uma
 * terceira sem garantia de acerto e decisao de quem clica em "gerar de novo".
 */
export async function escreverNarrativa(
  cliente: ClienteIA,
  pedido: string,
): Promise<{ narrativa: NarrativaMC; avisos: string[] }> {
  const primeira = await chamar(cliente, pedido)
  const problemas = typeof primeira === 'string' ? [primeira] : conferirNarrativa(primeira)
  if (typeof primeira !== 'string' && problemas.length === 0) return { narrativa: primeira, avisos: [] }

  const correcao = `\n\nUma tentativa anterior saiu fora do pedido:\n${problemas.map((p) => `- ${p}`).join('\n')}\nRespeite as quantidades de parágrafos e os tamanhos pedidos.`
  const segunda = await chamar(cliente, pedido + correcao)
  if (typeof segunda !== 'string') return { narrativa: segunda, avisos: conferirNarrativa(segunda) }
  if (typeof primeira !== 'string') return { narrativa: primeira, avisos: problemas }
  throw new FalhaNaNarrativaMC('A resposta não veio no formato esperado da narrativa.', 'formato')
}

export type FalhaGeracaoMC = 'sem_resultado' | 'em_geracao'

export type NarrativaMCGravada = {
  ok: true
  /** Verdadeiro quando ja havia narrativa e a geracao foi dispensada. */
  reaproveitada: boolean
  narrativa: NarrativaMC
  /** O que a narrativa gravada tem fora do pedido. Vazio no caso normal. */
  avisos: string[]
}

/**
 * Toma o arrendamento, com a linha travada numa transacao CURTA (ler e
 * regravar em passos separados deixaria dois processos lerem "livre").
 * Confere a narrativa DENTRO da trava: outro processo pode ter terminado
 * entre a primeira leitura e esta.
 */
async function arrendar(resultadoId: string, forcar: boolean): Promise<Date | 'em_geracao' | 'pronta'> {
  return db.transaction(async (tx) => {
    const [linha] = await tx
      .select({ narrativa: assessmentsResultados.narrativa, desde: assessmentsResultados.narrativa_gerando_em })
      .from(assessmentsResultados)
      .where(eq(assessmentsResultados.id, resultadoId))
      .limit(1)
      .for('update')
    if (!linha) return 'em_geracao'
    if (!forcar && linha.narrativa !== null) return 'pronta'
    const agora = new Date()
    if (linha.desde && agora.getTime() - linha.desde.getTime() < PRAZO_DA_GERACAO_MS) return 'em_geracao'
    // `updated_at` NAO entra: o arrendamento e controle interno (persistir.ts).
    await tx
      .update(assessmentsResultados)
      .set({ narrativa_gerando_em: agora })
      .where(eq(assessmentsResultados.id, resultadoId))
    return agora
  })
}

/**
 * Gera e grava a narrativa do resultado vivo deste mapa.
 *
 * Idempotente: com narrativa gravada, devolve a gravada sem chamar a API, a
 * nao ser com `forcar` ("gerar de novo"). `forcar` RESPEITA o arrendamento,
 * ao contrario de persistir.ts: la ele vem do CLI; aqui vem de um botao, e
 * clique duplo nao pode pagar duas vezes. A narrativa anterior vai para
 * `dados_anteriores` da auditoria, porque a coluna guarda so a atual.
 *
 * `cliente` existe para o teste simular a API; em producao fica vazio.
 */
export async function gerarNarrativaMC(
  assessmentId: string,
  opcoes: { forcar?: boolean; cliente?: ClienteIA } = {},
): Promise<NarrativaMCGravada | { ok: false; erro: FalhaGeracaoMC }> {
  const forcar = opcoes.forcar ?? false
  const [alvo] = await db
    .select({
      id: assessmentsResultados.id,
      resultado: assessmentsResultados.resultado,
      narrativa: assessmentsResultados.narrativa,
      nome: assessments.avaliado_nome,
      concluidoEm: assessments.concluido_em,
      criadoEm: assessments.created_at,
    })
    .from(assessmentsResultados)
    .innerJoin(assessments, eq(assessments.id, assessmentsResultados.assessment_id))
    .where(
      and(
        eq(assessmentsResultados.assessment_id, assessmentId),
        eq(assessmentsResultados.is_deleted, false),
        eq(assessments.is_deleted, false),
      ),
    )
    .limit(1)

  if (!alvo) return { ok: false, erro: 'sem_resultado' }
  if (!forcar && alvo.narrativa !== null) {
    return { ok: true, reaproveitada: true, narrativa: alvo.narrativa as NarrativaMC, avisos: [] }
  }

  // Antes do arrendamento: sem chave nada e travado, e a mensagem diz o que falta.
  if (!opcoes.cliente && !process.env.ANTHROPIC_API_KEY) {
    throw new FalhaNaNarrativaMC('ANTHROPIC_API_KEY não está definida no servidor.', 'configuracao')
  }

  const arrendamento = await arrendar(alvo.id, forcar)
  if (arrendamento === 'em_geracao') return { ok: false, erro: 'em_geracao' }
  if (arrendamento === 'pronta') {
    const [pronta] = await db
      .select({ narrativa: assessmentsResultados.narrativa })
      .from(assessmentsResultados)
      .where(eq(assessmentsResultados.id, alvo.id))
    return { ok: true, reaproveitada: true, narrativa: pronta!.narrativa as NarrativaMC, avisos: [] }
  }

  try {
    // O SDK respeita o retry-after; num lote, 429 e o regime normal (gerar.ts).
    const cliente = opcoes.cliente ?? new Anthropic({ maxRetries: 5 })
    const pedido = montarPedido(alvo.resultado as ResultadoMotor, { emitidoEm: alvo.concluidoEm ?? alvo.criadoEm })
    const { narrativa, avisos } = await escreverNarrativa(cliente, pedido)

    await db.transaction(async (tx) => {
      await tx
        .update(assessmentsResultados)
        .set({ narrativa, narrativa_gerando_em: null, updated_at: new Date(), modified_by: GERADOR })
        .where(eq(assessmentsResultados.id, alvo.id))
      await registrarAuditoria(
        {
          userId: GERADOR,
          acao: 'atualizar',
          tabela: 'assessments_resultados',
          registroId: assessmentId,
          detalhes: `Gravou a narrativa MC 3.1 de ${alvo.nome}${avisos.length ? ` com ${avisos.length} aviso(s)` : ''}`,
          dadosAnteriores: alvo.narrativa ?? undefined,
        },
        tx,
      )
    })
    return { ok: true, reaproveitada: false, narrativa, avisos }
  } finally {
    // Falha da API libera o mapa na hora. So devolve o PROPRIO carimbo: se o
    // prazo venceu e outro processo arrendou, o arrendamento e dele.
    await db
      .update(assessmentsResultados)
      .set({ narrativa_gerando_em: null })
      .where(and(eq(assessmentsResultados.id, alvo.id), eq(assessmentsResultados.narrativa_gerando_em, arrendamento)))
  }
}
