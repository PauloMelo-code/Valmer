/**
 * O que vai para a IA no relatorio MC 3.1: o prompt de sistema (fixo) e o
 * pedido de cada avaliado (montado do ResultadoMotor).
 *
 * Funcao pura, sem banco nem rede, para o teste conferir o texto exato que sai.
 *
 * O SISTEMA e a secao 18 do blueprint v2.2, mais as regras de estilo que o
 * relatorio antigo ja segue (lib/relatorio/gerar.ts) e que o texto do Valmer
 * segue, mais o banco de leituras da secao 19. Das regras de gerar.ts NAO
 * entram "nunca mencione percentuais" e "nunca cite os nomes dos fatores": o
 * relatorio novo pede o contrario (percentual exato nos eixos de Jung, rotulo
 * "DOMINANTE 89" nas forcas), e a secao 18 vence onde as duas divergem.
 *
 * O SISTEMA e identico em toda chamada e vai marcado para cache. Nada que
 * mude por avaliado pode entrar nele, ou o cache para de valer sem aviso.
 */
import { FATORES, VALORES, type Fator } from '@/data/inventario-mc'
import { COMPETENCIAS, ORDEM_COMPETENCIAS } from '@/data/relatorio-mc/competencias'
import { FATORES_RELATORIO } from '@/data/relatorio-mc/fatores'
import { POLOS_JUNG } from '@/data/relatorio-mc/jung'
import { LEITURAS } from '@/data/relatorio-mc/leituras'
import { VALORES_RELATORIO } from '@/data/relatorio-mc/spranger'
import { ZONAS } from '@/data/relatorio-mc/zonas'
import type { ResultadoMotor } from '@/lib/motor'
import { PARAGRAFOS } from './narrativa-esquema'

const bancoDeLeituras = FATORES.map(
  (f) =>
    `${FATORES_RELATORIO[f].nome.toUpperCase()} (${f})\n` +
    LEITURAS[f].map((l) => `- ${l.titulo} (${l.autor}): ${l.motivo}`).join('\n'),
).join('\n\n')

export const SISTEMA = `Você é o especialista em comportamento humano da plataforma Mapa Comportamental.
Sua função é gerar análises precisas baseadas nos scores do inventário comportamental.

METODOLOGIA
3 camadas: DISC (Marston 1928) + Tipos Psicológicos (Jung 1921) + Valores (Spranger 1914).
NUNCA mencione: CIS, FEBRACIS, Sólides, TTI, Wiley, DiSC® ou qualquer concorrente.
Use "DISC" sem símbolo. Nunca "DiSC®".
Os escores DISC são ipsativos (somam 200): compare fatores dentro da pessoa, nunca com outras pessoas.
Se a confiabilidade da aplicação for baixa, use linguagem mais cautelosa e sugira confirmar na conversa de devolutiva com o analista.

LINGUAGEM E TOM
- Escreva SEMPRE em segunda pessoa: "você", "seu", "sua".
- Tom: direto, claro, humano, como especialista falando com precisão.
- Nunca julgamento de valor (bom, ruim, melhor, pior, certo, errado).
- Nunca linguagem clínica ou diagnóstica.
- Sempre comece pelos pontos fortes antes dos desafios.
- Desafios são "potencial a ampliar" ou "padrão a desenvolver", nunca "fraqueza".
- Use os scores exatos para calibrar a profundidade. D=89 é radicalmente diferente de D=52.
- A pessoa DEVE se reconhecer com precisão. Textos genéricos são o pior erro.
- Cada texto deve ser único para este avaliado e não poderia ser dito de outra pessoa.
- Use só os números que o pedido traz, escritos como o pedido escreve (vírgula decimal). Não calcule número novo nem arredonde de outro jeito.

ESTILO (vale para todos os campos e prevalece sobre qualquer exemplo)
- Nunca use travessão nem meia-risca, nenhum traço longo no meio da frase. Não troque por hífen nem por reticências: reescreva a frase. Um aposto vira vírgula ou parênteses; um reforço vira frase nova; um contraste pede "mas", "porém", "já" ou "enquanto".
- Fuja da fórmula antitética, que é negar uma coisa para afirmar outra: "X, e não Y", "X, não Y", "não A, mas B", "não é X, é Y", "isso não significa A, significa B", e as variantes com "em vez de", "sem precisar", "mais pelo A do que pelo B", "longe de ser". O teste: apague o pedaço que descarta a alternativa; se a frase continua dizendo a mesma coisa, o pedaço sai. Se a parte negada carrega informação, ela vira frase própria. No máximo uma ocorrência na resposta inteira, somando todos os campos. Zero é o alvo.
- Nada de máxima de efeito nem aforismo de palestra, em nenhuma posição da frase. Se a frase caberia num cartaz e serviria para qualquer pessoa, ela não entra. Encerre no fato: o que a pessoa faz, quando e com quem.
- Nada de jargão de consultoria. Estão proibidos "sinergia", "mindset", "protagonismo", "fora da caixa", "alta performance", "jornada", "empoderar", "alavancar" e os parentes deles.
- Evite a cadência de tercetos. No máximo uma frase com três itens por parágrafo, e a vizinha tem outro formato.
- Um adjetivo basta. Nada de "claro e objetivo" nem "sólido e consistente".
- Frases curtas, voz ativa, uma ideia por frase. Não comece frase com gerúndio. Corte muleta ("é importante notar que", "vale destacar") e superlativo vazio ("extremamente", "incrivelmente").
- NUNCA nomeie o documento por dentro dele. Não escreva "este relatório", "este mapa", "este documento", "este assessment", "este laudo" nem "nesta página". Quem lê é a pessoa avaliada, e para ela o documento não precisa de nome. Escreva direto o que ela vai ver.

FORMATO DA RESPOSTA
Responda com o JSON pedido, completo, sem texto fora dele e sem markdown.
Onde o pedido indica uma quantidade de parágrafos, separe os parágrafos com uma linha em branco e entregue exatamente essa quantidade, sem rótulo no início de cada um.
Respeite as quantidades exatas de itens das listas.

BANCO DE LEITURAS (referência para "leituras_recomendadas")
Selecione desta lista e adapte o motivo ao perfil combinado desta pessoa. Pode incluir outro livro quando for pertinente ao perfil específico. Os motivos abaixo servem só como referência de conteúdo. O "por_que_para_voce" segue as regras de ESTILO acima e fala desta pessoa específica.

${bancoDeLeituras}`

/** Dados do cadastro que o pedido cita; o resto sai do resultado. */
export type AvaliadoPedido = {
  nome: string
  codigo: string | null
  /** Data da conclusao do questionario. */
  emitidoEm: Date
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const comSinal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/** "87,5". Uma casa, virgula decimal, como o relatorio imprime. */
export function num(n: number): string {
  return decimal.format(n)
}

function fator(f: Fator): string {
  return `${f} (${FATORES_RELATORIO[f].nomeTabela})`
}

/**
 * O pedido de um avaliado: o user prompt da secao 23, com os numeros do
 * ResultadoMotor, mais tres coisas que o blueprint nao tinha e o esquema
 * precisa:
 * - a ordem natural e quem sao os dois mais altos e os dois mais baixos,
 *   porque as chaves de `quatro_cruzamentos` sao por posicao (C07);
 * - a traducao de cada chave de cruzamento para os fatores desta pessoa;
 * - quantos paragrafos cada chave de texto corrido traz (R1).
 *
 * "Tipo completo" e "Pronome" da secao 23 nao entram: nao existem no resultado
 * nem no cadastro, e inventar valor para eles seria dado falso no prompt.
 */
export function montarPedido(r: ResultadoMotor, avaliado: AvaliadoPedido): string {
  const nat = r.disc.natural
  const ada = r.disc.adaptado
  const ix = r.disc.indices
  const [alto1, alto2] = nat.ordem as [Fator, Fator, Fator, Fator]
  const baixo1 = nat.ordem[3] as Fator
  const baixo2 = nat.ordem[2] as Fator
  const pj = r.jung.percentuais
  const polo = (a: 'E' | 'N' | 'T', b: 'I' | 'S' | 'F') => (pj[a] > pj[b] ? POLOS_JUNG[a].nome : POLOS_JUNG[b].nome)

  const linhaDisc = (f: Fator, c: typeof nat, rotulo: string) =>
    `${rotulo}: ${num(c.escore[f])}% · Zona: ${ZONAS[c.zona[f]].nome}`

  const competencias = ORDEM_COMPETENCIAS.map(
    (k) => `${COMPETENCIAS[k].nome}: ${num(nat.competencias[k])} → ${num(ada.competencias[k])}`,
  ).join(' | ')

  // So as entradas que sao numero: o resto nao e contrato de quantidade.
  const paragrafos = Object.entries(PARAGRAFOS as Record<string, unknown>)
    .filter(([, n]) => typeof n === 'number')
    .map(([chave, n]) => `- ${chave}: ${n}`)
    .join('\n')

  return `Gere as análises personalizadas para o Mapa Comportamental de:

IDENTIFICAÇÃO
Nome: ${avaliado.nome}
Data de emissão: ${avaliado.emitidoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Código: ${avaliado.codigo ?? 'sem código'}

DISC · PERFIL NATURAL
${FATORES.map((f) => linhaDisc(f, nat, fator(f))).join('\n')}
Perfil natural: ${nat.perfil}
Ordem natural dos fatores, do mais alto ao mais baixo: ${nat.ordem.join(' > ')}
Dois fatores mais altos: ${fator(alto1)} ${num(nat.escore[alto1])} e ${fator(alto2)} ${num(nat.escore[alto2])}
Dois fatores mais baixos: ${fator(baixo1)} ${num(nat.escore[baixo1])} (o mais baixo) e ${fator(baixo2)} ${num(nat.escore[baixo2])}

DISC · PERFIL ADAPTADO
${FATORES.map((f) => linhaDisc(f, ada, `${f} adaptado`)).join('\n')}
Perfil adaptado: ${ada.perfil}

ÍNDICES
Índice de adaptação: ${num(ix.indice_adaptacao)} (${ix.classe})
Amplitude natural: ${num(ix.amplitude_natural)}
Fatores polarizados: ${ix.polarizados.join(', ') || 'nenhum'}
Variações D/I/S/C (adaptado menos natural): ${FATORES.map((f) => comSinal.format(ix.variacao[f])).join(' / ')}

COMPETÊNCIAS (natural → adaptado)
${competencias}

VALIDADE
Confiabilidade da aplicação: ${r.validade.confiabilidade}

JUNG
Extroversão: ${num(pj.E)}% | Introversão: ${num(pj.I)}% → polo: ${polo('E', 'I')}
Intuição: ${num(pj.N)}% | Sensação: ${num(pj.S)}% → polo: ${polo('N', 'S')}
Pensamento: ${num(pj.T)}% | Sentimento: ${num(pj.F)}% → polo: ${polo('T', 'F')}
Tipo Jung: ${r.jung.tipo}
Hierarquia: 1ª ${r.jung.hierarquia[0]} | 2ª ${r.jung.hierarquia[1]} | 3ª ${r.jung.hierarquia[2]} | 4ª (Inferior) ${r.jung.hierarquia[3]}

VALORES SPRANGER
${VALORES.map((v) => `${VALORES_RELATORIO[v].nome}: ${num(r.valores.escore[v])} (${r.valores.nivel[v]})`).join('\n')}
Hierarquia Spranger: ${r.valores.ranking.map((v) => VALORES_RELATORIO[v].nome).join(' > ')}

CRUZAMENTOS (chaves de "quatro_cruzamentos", pela ordem natural acima)
- alto1_baixo1: ${fator(alto1)} alto × ${fator(baixo1)} baixo
- alto1_baixo2: ${fator(alto1)} alto × ${fator(baixo2)} baixo
- alto2_baixo1: ${fator(alto2)} alto × ${fator(baixo1)} baixo
- alto2_baixo2: ${fator(alto2)} alto × ${fator(baixo2)} baixo

PARÁGRAFOS POR CHAVE (separados por uma linha em branco, exatamente esta quantidade)
${paragrafos}

No campo "fator" de "seis_forcas", use o rótulo em maiúsculas seguido do escore natural como está acima (ex.: "${FATORES_RELATORIO[alto1].rotulo} ${num(nat.escore[alto1])}").

Gere o JSON com exatamente as chaves pedidas.`
}
