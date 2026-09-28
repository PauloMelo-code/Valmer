/**
 * O que a IA devolve para o relatorio MC 3.1 — o contrato da secao 18 do
 * blueprint v2.2.
 *
 * Os nomes das chaves sao os da especificacao, literalmente: cada uma vai para
 * uma pagina fixa (mapa na secao 23, etapa 5), e renomear aqui sem renomear la
 * seria a mesma chave com dois nomes. A IA e chamada UMA vez por relatorio e
 * devolve tudo junto; o que e calculo ou tabela nunca passa por ela.
 *
 * DUAS DIVERGENCIAS DELIBERADAS DA SECAO 18, as duas pela mesma razao — a
 * especificacao foi escrita olhando o relatorio de UMA pessoa (a do relatorio de referencia, perfil DI):
 *
 * 1. `quatro_cruzamentos` tinha as chaves `alto_d_baixo_s`, `alto_d_baixo_c`,
 *    `alto_i_baixo_s`, `alto_i_baixo_c`. Isso so existe para quem e DI. Para um
 *    CS os cruzamentos sao C e S altos contra D e I baixos. As chaves aqui sao
 *    por POSICAO na ordem natural (`alto1_baixo1` = fator mais alto x fator mais
 *    baixo), o prompt diz a IA quais fatores sao, e a pagina 07 le os rotulos da
 *    mesma ordem (`disc.natural.ordem`). Ver mapa de dados, C07.
 * 2. PARAGRAFOS. Varias paginas do molde tem mais de um bloco alimentado pela
 *    mesma chave (a 07 tem quatro rotulos: O que significa, Como aparece, Impacto,
 *    Como aplicar). A chave continua uma so; o texto vem em paragrafos separados
 *    por linha em branco, na quantidade exata que a pagina tem, e o componente
 *    divide com `paragrafos()`. A quantidade de cada chave esta no `.describe()` e em
 *    PARAGRAFOS, abaixo — os dois lados leem daqui.
 *
 * O `.describe()` de cada campo nao e comentario: ele vai para o modelo como
 * descricao do esquema na saida estruturada, e e ele que diz o tamanho e o
 * foco de cada bloco. As quantidades de itens estao em `.length()` porque a
 * pagina tem lugar para exatamente aquilo — seis cartoes de forca, tres sinais,
 * cinco livros — e um setimo item nao teria onde cair.
 */
import { z } from 'zod'

const forca = z.object({
  fator: z.string().describe('Fator de origem e escore, ex.: "DOMINANTE 89" ou "CONFORME 24 · INTUIÇÃO 64"'),
  nome: z.string().describe('Nome da força em 3 a 6 palavras'),
  descricao: z.string().describe('1 a 2 frases: onde esta força se converte em resultado para esta pessoa'),
})

const pontoDesenvolver = z.object({
  num: z.number().int().min(1).max(6),
  titulo: z.string().describe('Nome do ponto, 4 a 6 palavras'),
  como_aparece: z.string().describe('1 frase derivada dos escores'),
  impacto_possivel: z.string().describe('1 a 2 frases sobre o custo de não desenvolver'),
  pratica_recomendada: z.string().describe('1 frase: ação específica e imediata'),
})

const leitura = z.object({
  titulo: z.string(),
  autor: z.string(),
  por_que_para_voce: z.string().describe('1 a 2 frases específicas para esta pessoa, não para o perfil em geral'),
})

/**
 * Quantos paragrafos cada chave de texto corrido traz, separados por linha em
 * branco. A pagina tem exatamente esse numero de blocos para ela.
 */
export const PARAGRAFOS = {
  sintese_combinacao_natural: 4,
  custo_adaptacao_narrativa: 3,
  fator_d_narrativa: 3,
  fator_i_narrativa: 3,
  fator_s_narrativa: 3,
  fator_c_narrativa: 3,
  jung_e_i_narrativa: 2,
  jung_n_s_narrativa: 2,
  jung_t_f_narrativa: 2,
  hierarquia_funcional_narrativa: 1,
  dois_valores_narrativa: 3,
  leitura_integrada: 4,
  mensagem_final: 2,
} as const

/** Divide o texto da IA nos blocos da pagina. Sobrou paragrafo: cola no ultimo. Faltou: bloco vazio. */
export function paragrafos(texto: string | undefined | null, quantos: number): string[] {
  const partes = (texto ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (partes.length > quantos) partes.splice(quantos - 1, partes.length, partes.slice(quantos - 1).join(' '))
  while (partes.length < quantos) partes.push('')
  return partes
}

export const esquemaNarrativaMC = z.object({
  sintese_combinacao_natural: z
    .string()
    .describe('300 a 400 palavras em EXATAMENTE 4 parágrafos separados por linha em branco, sem rótulo no início: (1) o que a combinação natural significa, começando pelos fatores predominantes; (2) como aparece no cotidiano; (3) o impacto que produz, incluindo o risco simétrico; (4) como aplicar no trabalho. Específico para estes escores exatos.'),
  quatro_cruzamentos: z
    .object({
      alto1_baixo1: z.string().describe('3 a 4 frases: o fator mais alto cruzado com o mais baixo da ordem natural'),
      alto1_baixo2: z.string().describe('3 a 4 frases: o fator mais alto cruzado com o segundo mais baixo'),
      alto2_baixo1: z.string().describe('3 a 4 frases: o segundo fator mais alto cruzado com o mais baixo'),
      alto2_baixo2: z.string().describe('3 a 4 frases: o segundo mais alto cruzado com o segundo mais baixo'),
    })
    .describe('Os quatro cruzamentos entre os dois fatores mais altos e os dois mais baixos da ordem natural informada no pedido. Cada texto descreve o efeito comportamental daquele par específico nesta pessoa.'),
  custo_adaptacao_narrativa: z
    .string()
    .describe('180 a 240 palavras em EXATAMENTE 3 parágrafos: (1) o que a distância entre natural e adaptado e as polarizações significam no mapa desta pessoa; (2) o que reduz o custo dessa adaptação; (3) por que isso muda a leitura do restante do relatório.'),
  fator_d_narrativa: z.string().describe('200 palavras em EXATAMENTE 3 parágrafos: (1) e (2) como o fator D se manifesta nesta intensidade e o que a variação no adaptado significa; (3) uma a duas frases de aplicação no trabalho, começando pela ação'),
  fator_i_narrativa: z.string().describe('200 palavras em EXATAMENTE 3 parágrafos: (1) e (2) idem para I; (3) uma a duas frases de aplicação no trabalho, começando pela ação'),
  fator_s_narrativa: z.string().describe('200 palavras em EXATAMENTE 3 parágrafos: (1) e (2) idem para S; se polarizado, o que isso significa no dia a dia; (3) uma a duas frases de aplicação no trabalho, começando pela ação'),
  fator_c_narrativa: z.string().describe('200 palavras em EXATAMENTE 3 parágrafos: (1) e (2) idem para C; se for a maior variação, enfatizar o custo; (3) uma a duas frases de aplicação no trabalho, começando pela ação'),
  seis_forcas: z.array(forca).length(6),
  jung_e_i_narrativa: z.string().describe('120 palavras em EXATAMENTE 2 parágrafos sobre o eixo de atitude: (1) como o polo predominante aparece nesta pessoa, com o percentual exato; (2) uma aplicação no trabalho, começando pela ação'),
  jung_n_s_narrativa: z.string().describe('120 palavras em EXATAMENTE 2 parágrafos sobre o eixo de percepção: (1) como o polo predominante aparece nesta pessoa, com o percentual exato; (2) uma aplicação no trabalho, começando pela ação'),
  jung_t_f_narrativa: z.string().describe('120 palavras em EXATAMENTE 2 parágrafos sobre o eixo de julgamento, incluindo a diferença de pontos entre os polos: (1) como o polo predominante aparece nesta pessoa, com o percentual exato; (2) uma aplicação no trabalho, começando pela ação'),
  hierarquia_funcional_narrativa: z
    .string()
    .describe('150 palavras sobre a dominante e a auxiliar, e o que a inferior gera sob pressão'),
  funcao_inferior_sinais: z.array(z.string()).length(3).describe('Três sinais de que a função inferior assumiu'),
  dois_valores_narrativa: z
    .string()
    .describe('200 palavras em EXATAMENTE 3 parágrafos: (1) como os dois valores mais altos conversam quando apontam para o mesmo lado; (2) o que acontece quando divergem e qual tende a ganhar, pela diferença de pontos; (3) o que move esta pessoa agora, nesta fase.'),
  leitura_integrada: z
    .string()
    .describe('250 palavras em EXATAMENTE 4 parágrafos: (1) síntese integrada das três camadas; (2) onde as camadas se confirmam; (3) onde se complementam; (4) onde geram tensão.'),
  resumo_perfil_8_blocos: z.object({
    essencia: z.string().describe('2 frases diretas'),
    contribuicao_maior_valor: z.string().describe('2 frases'),
    ambiente_melhor_performance: z.string().describe('2 frases'),
    estilo_comunicacao: z.string().describe('2 frases'),
    motivadores: z.string().describe('2 frases'),
    riscos_excesso: z.string().describe('2 frases'),
    prioridades_desenvolvimento: z.string().describe('2 frases'),
    direcao_recomendada: z.string().describe('2 frases'),
  }),
  seis_pontos_desenvolver: z
    .array(pontoDesenvolver)
    .length(6)
    .describe('Ponto 1 é a alavanca principal (a causa); os pontos 2 a 6 são condutas e consequências'),
  leituras_recomendadas: z
    .array(leitura)
    .length(5)
    .describe('Cinco livros, preferencialmente do banco de referência por perfil, adaptados ao perfil combinado desta pessoa'),
  pdi: z.object({
    prioridade_principal: z.string().describe('1 frase: o ponto de desenvolvimento mais impactante agora'),
    acoes_semanais: z.array(z.string()).length(3).describe('Três ações práticas, imediatas e observáveis, diferentes entre si'),
    desafio_30_dias: z.string().describe('1 a 2 frases: desafio concreto com evidência observável de cumprimento'),
    como_medir: z.string().describe('1 frase: como a pessoa sabe que está avançando'),
  }),
  mensagem_final: z
    .string()
    .describe('100 a 130 palavras em 2 parágrafos, tom pessoal, humano e direto, sem clichê motivacional'),
})

export type NarrativaMC = z.infer<typeof esquemaNarrativaMC>
