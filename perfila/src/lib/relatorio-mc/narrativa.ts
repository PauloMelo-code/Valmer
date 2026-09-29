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
 * narrativa nao ser paga duas vezes. Tres diferencas:
 *
 * - CHAMADAS EM PARALELO (`PARTES`), e nao uma. O JSON inteiro passa
 *   de 4 mil palavras, e a IA escreve uma atras da outra: numa chamada so, o
 *   relatorio levava minutos.
 * - STREAMING. Com o pensamento do modelo, o `max_tokens` que cabe nao cabe
 *   numa chamada sem streaming (o SDK recusa por risco de timeout).
 *   `finalMessage()` devolve a mesma mensagem ja validada que o `parse`
 *   devolveria.
 * - SEM `fallbacks` de servidor. Os modelos-alvo documentados sao Opus
 *   (4.8 e 5) atras de um Opus ou Fable; para o Sonnet 5 nao ha lista de
 *   substitutos publicada, e um 400 em toda chamada seria pior que tratar a
 *   recusa rara como falha legivel. Ver o relatorio da frente.
 *
 * COMO o texto e escrito (partes, tentativas juntas, conferencia, esquema da
 * API) mora em `narrativa-escrita.ts`; aqui fica o que grava: arrendamento,
 * banco e auditoria. O que o resto do app usa de la sai reexportado daqui.
 */
import Anthropic from '@anthropic-ai/sdk'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assessments, assessmentsResultados } from '@/lib/db/schema'
import { registrarAuditoria } from '@/lib/audit/logger'
import type { ResultadoMotor } from '@/lib/motor'
import type { NarrativaMC } from './narrativa-esquema'
import { montarPedido } from './narrativa-prompt'
import { escreverNarrativa, FalhaNaNarrativaMC, type ClienteIA } from './narrativa-escrita'

export {
  conferirNarrativa,
  escreverNarrativa,
  FalhaNaNarrativaMC,
  MODELO_NARRATIVA_MC,
  PARTES,
  type ClienteIA,
  type ParametrosIA,
} from './narrativa-escrita'

/** Assina as linhas escritas pelo gerador; nao ha pessoa por tras delas. */
const GERADOR = '00000000-0000-0000-0000-000000000000'

/**
 * Maior que o de persistir.ts (10 min, UMA chamada): aqui cada parte pode fazer
 * DUAS rodadas em streaming, uma depois da outra (as tentativas juntas e, se
 * nenhuma servir, mais uma), cada uma com o timeout padrao de 10 min do SDK.
 * As partes correm juntas, entao o teto nao soma.
 * Vencido o prazo, um clique arrenda de novo e paga outra narrativa.
 */
export const PRAZO_DA_GERACAO_MS = 25 * 60 * 1000

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

  // O tempo real de cada relatorio no log do servidor, deu certo ou nao: e por
  // ele que se sabe se a geracao esta lenta, qual parte precisou de nova
  // tentativa e por que uma falhou (o botao so mostra "tente de novo").
  const inicio = Date.now()
  const segundos = () => Math.round((Date.now() - inicio) / 1000)
  try {
    // O SDK respeita o retry-after; num lote, 429 e o regime normal (gerar.ts).
    const cliente = opcoes.cliente ?? new Anthropic({ maxRetries: 5 })
    const pedido = montarPedido(alvo.resultado as ResultadoMotor, { emitidoEm: alvo.concluidoEm ?? alvo.criadoEm })
    const { narrativa, avisos, chamadas, refeitas } = await escreverNarrativa(cliente, pedido)
    console.info(
      `[relatorio-mc] narrativa de ${assessmentId} escrita em ${segundos()}s, ${chamadas} chamada(s)` +
        (refeitas.length ? `, parte(s) refeita(s): ${refeitas.join(', ')}` : '') +
        (avisos.length ? `, ${avisos.length} aviso(s)` : ''),
    )

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
  } catch (erro) {
    console.error(`[relatorio-mc] narrativa de ${assessmentId} falhou em ${segundos()}s`, erro)
    throw erro
  } finally {
    // Falha da API libera o mapa na hora. So devolve o PROPRIO carimbo: se o
    // prazo venceu e outro processo arrendou, o arrendamento e dele.
    await db
      .update(assessmentsResultados)
      .set({ narrativa_gerando_em: null })
      .where(and(eq(assessmentsResultados.id, alvo.id), eq(assessmentsResultados.narrativa_gerando_em, arrendamento)))
  }
}
