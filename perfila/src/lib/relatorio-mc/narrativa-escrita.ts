/**
 * Como a narrativa da IA do relatorio MC 3.1 e ESCRITA: as partes em paralelo,
 * as tentativas juntas, a conferencia de tamanho e o esquema que vai para a
 * API. Sem banco: quem grava, com o arrendamento, e `narrativa.ts`, que
 * reexporta daqui o que o resto do app usa. O porque de cada numero esta no
 * ADR-0007 D10 (medicoes de 29/09/2026).
 */
import { AnthropicError, APIError } from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { esquemaNarrativaMC, PARAGRAFOS, type NarrativaMC } from './narrativa-esquema'
import { SISTEMA } from './narrativa-prompt'

/** Secao 18 do blueprint e ADR-0007 D10. Trocar o modelo e mudar esta linha. */
export const MODELO_NARRATIVA_MC = 'claude-sonnet-5'

/**
 * Teto de cada chamada, e nao tamanho pedido: cada parte tem ~1.000 palavras
 * (~2,5 mil tokens em portugues) mais o pensamento adaptativo. Folga de sobra,
 * porque JSON truncado nao e narrativa: e uma chamada paga jogada fora.
 */
const MAX_TOKENS = 32000

/**
 * As partes da narrativa, escritas AO MESMO TEMPO, uma chamada cada.
 *
 * Numa chamada so, a IA escrevia as ~4.000 palavras uma atras da outra, e uma
 * chave fora do pedido refazia TUDO. Em paralelo, o tempo e o da parte mais
 * longa, e a nova tentativa refaz so a parte que saiu fora. O texto escrito, o
 * grosso da conta, e o mesmo; o que se repete e a entrada, uma vez por parte e
 * SEM cache entre elas (chamadas simultaneas nao leem o cache umas das outras,
 * e cada parte manda outro esquema): uns centavos por relatorio. Cada parte
 * recebe o pedido inteiro, com os mesmos numeros, entao nenhuma escreve sem
 * saber do resto do perfil.
 *
 * Medido em 29/09/2026 com o caso de demonstracao: com raciocinio baixo, a
 * parte leva ~1s a cada 70 tokens escritos. Sete partes de ~1.400 tokens
 * (~550 palavras; JSON de lista pesa mais por palavra) ficam na casa dos 20s,
 * e o relatorio sai no tempo da mais lenta. O que conversa fica junto: o PDI
 * com os seis pontos (a prioridade do PDI e o ponto 1), a mensagem final com a
 * leitura integrada. Toda chave do esquema esta em exatamente uma parte (o
 * teste confere).
 */
export const PARTES = [
  ['sintese_combinacao_natural', 'quatro_cruzamentos'],
  ['custo_adaptacao_narrativa', 'fator_d_narrativa', 'fator_i_narrativa'],
  ['fator_s_narrativa', 'fator_c_narrativa', 'seis_forcas'],
  ['jung_e_i_narrativa', 'jung_n_s_narrativa', 'jung_t_f_narrativa', 'hierarquia_funcional_narrativa', 'funcao_inferior_sinais'],
  ['dois_valores_narrativa', 'leitura_integrada', 'mensagem_final'],
  ['resumo_perfil_8_blocos', 'leituras_recomendadas'],
  ['seis_pontos_desenvolver', 'pdi'],
] as const satisfies readonly (readonly (keyof NarrativaMC)[])[]

/**
 * Quanto a IA raciocina antes de escrever. No padrao (alto), cada parte gastava
 * 10 a 16 mil tokens pensando para escrever ~2 mil: 80% do tempo e do custo, e
 * o relatorio levava ~2,5 min. Em "low" caiu para ~40s com 4 partes, sem nova
 * tentativa e com texto do mesmo nivel na leitura lado a lado. Sem raciocinio
 * nenhum a velocidade foi a mesma, mas uma parte saiu fora do pedido e foi
 * refeita: "low" e o ponto certo.
 */
const ESFORCO = 'low' as const

type Chaves = readonly (keyof NarrativaMC)[]

/** So as chaves desta parte: o que vier a mais nao e dela. */
function recorte(n: Partial<NarrativaMC>, chaves: Chaves): Partial<NarrativaMC> {
  return Object.fromEntries(chaves.filter((k) => k in n).map((k) => [k, n[k]])) as Partial<NarrativaMC>
}

const paragrafosDe = (chave: string) => (PARAGRAFOS as Record<string, unknown>)[chave]

/**
 * O esquema que a IA recebe: cada chave de mais de um paragrafo vira LISTA,
 * um paragrafo por item. Contar paragrafos dentro de um texto corrido foi onde
 * a IA mais errou na medicao de 29/09 (2 onde a pagina tem 3 blocos). Na volta,
 * `emTexto` junta a lista com linha em branco, o formato que o banco e as
 * paginas ja usam: nada fora deste arquivo muda.
 *
 * SEM `.length(n)`: a API nao impoe tamanho de lista, e o parse do SDK recusava
 * a resposta INTEIRA por um item a menos (medido), perdendo o texto que a
 * nova tentativa podia aproveitar. A quantidade e cobrada depois, por
 * `conferirNarrativa`, sobre o texto juntado.
 */
const esquemaDaIA = z.object(
  Object.fromEntries(
    Object.entries(esquemaNarrativaMC.shape).map(([chave, tipo]) => {
      const n = paragrafosDe(chave)
      if (typeof n !== 'number' || n < 2) return [chave, tipo]
      const descricao = `Lista com exatamente ${n} itens, um parágrafo por item. ${tipo.description ?? ''}`
      return [chave, z.array(z.string()).describe(descricao)]
    }),
  ),
)

/** A resposta da IA no formato do banco: as listas de paragrafos viram texto. */
function emTexto(saida: Record<string, unknown>): Partial<NarrativaMC> {
  return Object.fromEntries(
    Object.entries(saida).map(([k, v]) => [k, Array.isArray(v) && typeof paragrafosDe(k) === 'number' ? v.join('\n\n') : v]),
  ) as Partial<NarrativaMC>
}

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

function parametros(pedido: string, chaves: Chaves) {
  // O esquema da saida estruturada e o recorte da parte: a IA nao tem como
  // devolver chave de outra parte, nem esquecer uma desta.
  const esquema = esquemaDaIA.pick(Object.fromEntries(chaves.map((k) => [k, true])))
  return {
    model: MODELO_NARRATIVA_MC,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' as const },
    system: [{ type: 'text' as const, text: SISTEMA, cache_control: { type: 'ephemeral' as const } }],
    messages: [{ role: 'user' as const, content: pedido }],
    output_config: { format: betaZodOutputFormat(esquema), effort: ESFORCO },
  }
}

export type ParametrosIA = ReturnType<typeof parametros>

type Parada = { stop_reason: string | null; stop_details?: { category?: string | null } | null }

/** O pedaco do SDK que este modulo usa. O teste injeta um simulado com esta forma. */
export type ClienteIA = {
  beta: {
    messages: {
      stream(params: ParametrosIA, opcoes?: { signal?: AbortSignal }): {
        finalMessage(): Promise<Parada & { parsed_output?: Record<string, unknown> | null }>
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
 * nao e contrato de quantidade. Confere so as chaves presentes, porque cada
 * parte traz as suas; a narrativa inteira e conferida inteira.
 */
export function conferirNarrativa(n: Partial<NarrativaMC>): string[] {
  const problemas: string[] = []
  for (const [chave, quantos] of Object.entries(PARAGRAFOS)) {
    if (typeof quantos !== 'number' || !(chave in n)) continue
    const tem = contarParagrafos(n[chave as keyof NarrativaMC] as string)
    if (tem !== quantos) problemas.push(`${chave} veio com ${tem} parágrafo(s); o pedido é ${quantos}`)
  }
  for (const [chave, faixa] of Object.entries(PALAVRAS)) {
    if (!(chave in n)) continue
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
async function chamar(
  cliente: ClienteIA,
  pedido: string,
  chaves: Chaves,
  sinal: AbortSignal,
): Promise<Partial<NarrativaMC> | string> {
  const stream = cliente.beta.messages.stream(parametros(pedido, chaves), { signal: sinal })
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
  if (resposta.parsed_output) return recorte(emTexto(resposta.parsed_output), chaves)
  return resposta.stop_reason === 'max_tokens' ? TRUNCADA : FORA_DO_FORMATO
}

type ParteEscrita = { texto: Partial<NarrativaMC>; avisos: string[]; chamadas: number }

/**
 * O tamanho de cada chave da parte, por extenso, no fim do pedido: o mesmo que
 * `conferirNarrativa` cobra depois. Com raciocinio baixo, o `.describe()` do
 * esquema sozinho nao bastou: na medicao de 29/09 um eixo de Jung voltou com
 * 44 palavras onde o pedido e 120, e a parte foi refeita.
 */
function tamanhosDaParte(chaves: Chaves): string {
  const linhas = chaves.flatMap((k) => {
    const n = (PARAGRAFOS as Record<string, unknown>)[k]
    const faixa = PALAVRAS[k]
    const partes = [
      typeof n === 'number' ? `${n} parágrafo${n > 1 ? 's' : ''}` : null,
      faixa ? (faixa[0] === faixa[1] ? `cerca de ${faixa[0]} palavras` : `${faixa[0]} a ${faixa[1]} palavras`) : null,
    ].filter(Boolean)
    return partes.length ? [`- ${k}: ${partes.join(', ')}`] : []
  })
  return linhas.length
    ? `\nTamanho de cada chave desta chamada (conferido na volta; fora disso a chamada é refeita). Onde há mais de um parágrafo, o esquema pede uma lista: um parágrafo por item, sem linha em branco dentro do item.\n${linhas.join('\n')}`
    : ''
}

/**
 * Quantas tentativas de cada parte correm AO MESMO TEMPO. Na medicao de 29/09,
 * ~12% das partes voltavam fora do pedido, e refazer depois somava ~17s: mais
 * da metade dos relatorios passava dos 35s. Com duas juntas, vale a primeira
 * que voltar dentro do pedido e a outra e cancelada; esperar uma terceira fica
 * raro. Custa o dobro de chamadas, e ainda sai mais barato que a chamada unica
 * com raciocinio alto que isto substituiu.
 */
const TENTATIVAS_JUNTAS = 2

type Tentativa = { r: Partial<NarrativaMC> | string; problemas: string[] }

async function tentar(cliente: ClienteIA, pedido: string, chaves: Chaves, sinal: AbortSignal): Promise<Tentativa> {
  const r = await chamar(cliente, pedido, chaves, sinal)
  return { r, problemas: typeof r === 'string' ? [r] : conferirNarrativa(r) }
}

/** A primeira tentativa que voltar dentro do pedido, ou nula. O erro de uma nao derruba a outra. */
function primeiraDentroDoPedido(tentativas: Promise<Tentativa>[]): Promise<Tentativa | null> {
  return new Promise((resolver) => {
    let faltam = tentativas.length
    for (const t of tentativas) {
      t.then(
        (x) => {
          if (x.problemas.length === 0) resolver(x)
        },
        () => undefined,
      ).finally(() => {
        if (--faltam === 0) resolver(null)
      })
    }
  })
}

/**
 * Escreve UMA parte: `TENTATIVAS_JUNTAS` ao mesmo tempo, vale a primeira
 * dentro do pedido. Nenhuma dentro: UMA nova tentativa dizendo o que corrigir,
 * e ela vale mesmo imperfeita, com os problemas em `avisos` (`paragrafos()`
 * divide o que vier; pagar outra sem garantia de acerto e decisao de quem clica
 * em "gerar de novo"). Todas falharam de vez (recusa, API): o erro sobe.
 */
async function escreverParte(
  cliente: ClienteIA,
  pedido: string,
  chaves: Chaves,
  sinal: AbortSignal,
): Promise<ParteEscrita> {
  // A regra do SISTEMA ("no maximo uma formula antitetica na resposta inteira")
  // foi escrita para uma resposta so. Cada parte nao ve as outras, entao a cota
  // de cada uma e zero; sem isto, a narrativa juntada chegaria a uma por parte.
  // As variantes vao por extenso: com raciocinio baixo, a medicao de 29/09 teve
  // seis "em vez de" numa narrativa so.
  const daParte = `${pedido}\n\nNESTA CHAMADA\nGere somente estas chaves do JSON: ${chaves.join(', ')}. As outras chaves são escritas à parte, com os mesmos dados.\nNesta chamada, a fórmula antitética não entra nenhuma vez: o limite de uma ocorrência vale para a narrativa inteira, somando as outras partes. Isso inclui "em vez de", "e não", "não A, mas B" e "não é X, é Y": diga só o que a pessoa faz.${tamanhosDaParte(chaves)}`
  const perdedora = new AbortController()
  const sinalDaParte = AbortSignal.any([sinal, perdedora.signal])
  const tentativas = Array.from({ length: TENTATIVAS_JUNTAS }, () => tentar(cliente, daParte, chaves, sinalDaParte))
  const boa = await primeiraDentroDoPedido(tentativas)
  if (boa) {
    perdedora.abort() // a outra para de escrever, e de cobrar
    return { texto: boa.r as Partial<NarrativaMC>, avisos: [], chamadas: TENTATIVAS_JUNTAS }
  }

  const voltas = await Promise.allSettled(tentativas)
  const feitas = voltas.flatMap((v) => (v.status === 'fulfilled' ? [v.value] : []))
  if (feitas.length === 0) throw (voltas[0] as PromiseRejectedResult).reason
  const melhor = feitas
    .filter((t): t is { r: Partial<NarrativaMC>; problemas: string[] } => typeof t.r !== 'string')
    .sort((a, b) => a.problemas.length - b.problemas.length)[0]
  const problemas = (melhor ?? feitas[0]!).problemas

  // Outra parte ja falhou de vez: a narrativa nao sai, e a nova chamada seria paga a toa.
  sinal.throwIfAborted()
  const correcao = `\n\nUma tentativa anterior saiu fora do pedido:\n${problemas.map((p) => `- ${p}`).join('\n')}\nRespeite as quantidades de parágrafos e os tamanhos pedidos.`
  const ultima = await chamar(cliente, daParte + correcao, chaves, sinal)
  const chamadas = TENTATIVAS_JUNTAS + 1
  if (typeof ultima !== 'string') return { texto: ultima, avisos: conferirNarrativa(ultima), chamadas }
  if (melhor) return { texto: melhor.r, avisos: melhor.problemas, chamadas }
  throw new FalhaNaNarrativaMC('A resposta não veio no formato esperado da narrativa.', 'formato')
}

/**
 * Escreve a narrativa: as `PARTES` em paralelo, juntas e conferidas contra o
 * esquema inteiro. Uma parte que falha de vez derruba a narrativa, porque
 * relatorio com metade do texto nao sai, e as irmas param NA HORA: sem isso
 * elas seguiam escrevendo e pagando, ate a segunda tentativa, com o
 * arrendamento ja solto e um novo "gerar" correndo do lado.
 *
 * `refeitas`: o numero (a partir de 1) das partes em que nenhuma das tentativas
 * juntas voltou dentro do pedido e foi preciso pedir de novo.
 */
export async function escreverNarrativa(
  cliente: ClienteIA,
  pedido: string,
): Promise<{ narrativa: NarrativaMC; avisos: string[]; chamadas: number; refeitas: number[] }> {
  const parar = new AbortController()
  try {
    const partes = await Promise.all(PARTES.map((chaves) => escreverParte(cliente, pedido, chaves, parar.signal)))
    return {
      narrativa: esquemaNarrativaMC.parse(Object.assign({}, ...partes.map((p) => p.texto))),
      avisos: partes.flatMap((p) => p.avisos),
      chamadas: partes.reduce((soma, p) => soma + p.chamadas, 0),
      refeitas: partes.flatMap((p, i) => (p.chamadas > TENTATIVAS_JUNTAS ? [i + 1] : [])),
    }
  } catch (erro) {
    parar.abort()
    throw erro
  }
}
