/**
 * O view-model do relatorio MC 3.1: tudo o que as 42 paginas leem, pronto.
 *
 * Por que um objeto so, montado antes da primeira pagina: o mesmo numero
 * aparece em varias paginas (o D natural esta na 06, 07, 08, 09, 13, 26, 27 e
 * 29), e se cada pagina fizesse a propria conta — ordenar, arredondar, escolher
 * rotulo — bastaria uma divergir para o leitor achar dois resultados no mesmo
 * documento. Aqui a conta acontece uma vez; a pagina so desenha.
 *
 * Regras do objeto (valem para quem consome):
 * - E JSON puro: sem funcao, sem Date, sem classe. Uma pagina pode virar
 *   'use client' sem quebrar a serializacao das props.
 * - Numero exibido vem em `Medida` ({ valor, texto }): `valor` para largura de
 *   barra e coordenada, `texto` para imprimir ("87,5", "−72,9").
 * - Todo texto de IA esta em `ia`, e so la. `null` = a narrativa ainda nao
 *   existe (a pagina mostra <TextoIA> pendente); `''` = a narrativa existe mas
 *   nao trouxe aquele bloco (a pagina esconde o bloco, R1).
 * - Nome exibido de fator e de valor sai das constantes de D8
 *   (`FATORES_RELATORIO[f].nome`, `VALORES_RELATORIO[v].nome`), nunca do molde.
 */
import { COMPETENCIAS_POR_FATOR, EIXOS_JUNG, FATORES, POLOS, type Competencia, type EixoJung, type Fator, type Valor } from '@/data/inventario-mc'
import { ARQUETIPOS, type Arquetipo, type SiglaPerfil } from '@/data/relatorio-mc/arquetipos'
import { COMPETENCIAS, COMPETENCIAS_RADAR, NIVEIS_COMPETENCIA, ORDEM_COMPETENCIAS, nivelDaCompetencia, type CodigoNivelCompetencia } from '@/data/relatorio-mc/competencias'
import { CORES_FATOR, type CorFator } from '@/data/relatorio-mc/cores'
import { descritoresDe } from '@/data/relatorio-mc/descritores'
import { PARES_ESPECTRO, posicaoNoEspectro, type ParEspectro } from '@/data/relatorio-mc/espectro'
import { FATORES_RELATORIO, ROTULOS_PAGINA_FATOR, adjetivosDaCondicao, type FichaFator } from '@/data/relatorio-mc/fatores'
import { EIXOS_RELATORIO, MANIFESTACAO_INFERIOR, PAGINA_21, POLOS_JUNG, POSICOES_HIERARQUIA, type DescricaoEixo, type DescricaoPolo, type FuncaoJung, type PoloJung } from '@/data/relatorio-mc/jung'
import { NIVEIS, paginasDoNivel, TOTAL_PAGINAS, type CodigoNivel } from '@/data/relatorio-mc/niveis'
import { VALORES_RELATORIO, type CodigoFaixaValor, type DescricaoValor } from '@/data/relatorio-mc/spranger'
import type { Status } from '@/data/relatorio-mc/status'
import { GATILHOS, PAGINA_16, TENSOES, type GatilhoFator, type TensaoFator } from '@/data/relatorio-mc/tensoes-gatilhos'
import { ETAPAS, INDICE, PAGINA_02, RODAPE, cabecalho } from '@/data/relatorio-mc/textos-fixos'
import { ZONAS, type CodigoZona } from '@/data/relatorio-mc/zonas'
import { r1, type ClasseAdaptacao, type Lideranca, type NivelValor, type ResultadoMotor } from '@/lib/motor'
import { comSinal, juntar, maiusculas, mesAnoPorExtenso, numero } from './formato'
import { PARAGRAFOS, paragrafos, type NarrativaMC } from './narrativa-esquema'

// ---------------------------------------------------------------- etapas

export type CodigoEtapa = 'capa' | 'indice' | '01' | '02' | '03' | '04' | '05'
/** Selo do cabecalho, cor do quadradinho/kicker e posicao da aba lateral, como no molde. */
export type VisualEtapa = { codigo: CodigoEtapa; selo: string; cor: string; abaTopo: string | null }

const COR_ETAPA: Record<Exclude<CodigoEtapa, 'capa' | 'indice'>, { cor: string; abaTopo: string }> = {
  '01': { cor: '#17324D', abaTopo: '34mm' },
  '02': { cor: '#9A711E', abaTopo: '68mm' },
  '03': { cor: '#6B4E8A', abaTopo: '102mm' },
  '04': { cor: '#1F7A6D', abaTopo: '136mm' },
  '05': { cor: '#344454', abaTopo: '170mm' },
}

export function etapaDaPagina(pagina: number): VisualEtapa {
  if (pagina === 1) return { codigo: 'capa', selo: '', cor: '#17324D', abaTopo: null }
  // O indice nao tem aba lateral no molde: ele nao pertence a nenhuma etapa.
  if (pagina === 2) return { codigo: 'indice', selo: PAGINA_02.etapa, cor: '#C39A42', abaTopo: null }
  const etapa = ETAPAS.find((e) => pagina >= e.primeira && pagina <= e.ultima)
  if (!etapa) throw new RangeError(`pagina fora do relatorio: ${pagina}`)
  const codigo = etapa.numero as keyof typeof COR_ETAPA
  return { codigo, selo: etapa.selo, ...COR_ETAPA[codigo] }
}

// ---------------------------------------------------------------- tipos

export type Medida = { valor: number; texto: string }
/** Blocos de um texto de IA, na quantidade de PARAGRAFOS. `null` = pendente; `''` = bloco que nao veio. */
export type Paragrafos = readonly (string | null)[]
export type ZonaDados = { codigo: CodigoZona; nome: string; atencao: boolean }
export type CondicaoDados = {
  escore: Medida
  zona: ZonaDados
  /** Os 4 adjetivos da zona (bp§09); `zona.atencao` pede a marca de EA/EB. */ descritores: readonly string[]
  /** A lista longa do molde para "No natural"/"No adaptado" (`adjetivosDaCondicao`). */ adjetivos: string
}
export type Direcao = 'sobe' | 'desce' | 'mantem'
export type FatorDados = {
  fator: Fator
  /** "Dominância" (D8). */ nome: string
  /** "DOMINANTE", como o molde escreve no texto corrido (C36). */ rotulo: string
  cor: CorFator
  /** 1 a 4 na ordem natural (`resultado.disc.natural.ordem`). */ posicao: number
  natural: CondicaoDados
  adaptado: CondicaoDados
  /** adaptado - natural; `texto` com sinal ("−72,9", "+47,9"). */ variacao: Medida
  direcao: Direcao
  /** "desce no adaptado" / "sobe no adaptado" / "se mantém no adaptado". */ textoDirecao: string
  classeVariacao: ClasseAdaptacao
  polarizado: boolean
  ficha: FichaFator
}
export type PerfilDados = {
  /** "DI", "C" ou "EQUILIBRADO". */ sigla: string
  tipo: 'duplo' | 'puro' | 'equilibrado'
  /** Fatores predominantes (>= 51), na ordem: 0, 1 ou 2. */ fatores: Fator[]
  /** "DOMINANTE + INFLUENTE" ou "EQUILIBRADO". */ rotulo: string
}
export type ChaveCruzamento = keyof NarrativaMC['quatro_cruzamentos']
export type CruzamentoDados = { chave: ChaveCruzamento; alto: Fator; baixo: Fator }
export type PoloDados = { polo: PoloJung; nome: string; percentual: Medida; ficha: DescricaoPolo }
export type EixoDados = {
  eixo: EixoJung
  ficha: DescricaoEixo
  /** Polo A (E, N, T) fica sempre a esquerda da barra. */ poloA: PoloDados
  poloB: PoloDados
  predominante: PoloDados
  complementar: PoloDados
  /** Pontos entre os dois polos. */ diferenca: Medida
}
export type FuncaoDados = {
  posicao: number
  /** "Dominante" · "Auxiliar" · "Terciária" · "Inferior". */ rotulo: string
  definicao: string
  /** Com atitude, como o motor: "Intuição Extrovertida". */ nome: string
  funcao: FuncaoJung
  /** Sem atitude: "Intuição". */ nomeFuncao: string
  atitude: 'E' | 'I'
  /** Percentual da letra da funcao (Intuição -> N). */ percentual: Medida
}
export type ValorDados = {
  valor: Valor
  nome: string
  nomeMaiusculo: string
  escore: Medida
  nivel: NivelValor
  faixa: CodigoFaixaValor
  /** 1 a 6 no ranking. */ posicao: number
  ficha: DescricaoValor
}
export type EstiloDados = { estilo: keyof Lideranca; nome: string; percentual: Medida; posicao: number; rotuloPosicao: string }
export type CompetenciaDados = {
  competencia: Competencia
  nome: string
  fator: Fator
  descricao: string
  status: Status
  natural: Medida
  adaptado: Medida
  /** Nivel pelo natural (bp§14). */ nivel: CodigoNivelCompetencia
  nomeNivel: string
}
export type EspectroDados = ParEspectro & { posicao: number; predominante: 'esquerda' | 'direita' | 'neutro' }

export type DadosRelatorioMC = {
  identificacao: {
    nome: string
    nomeMaiusculo: string
    /** "Mapa Comportamental · ADRIANA PRADO" (cabecalho de toda pagina). */ cabecalho: string
    codigo: string | null
    instrutor: string
    instrutorMaiusculo: string
    /** "Setembro de 2026". */ emissao: string
    /** "SETEMBRO DE 2026" (capa). */ emissaoMaiuscula: string
    /** "MC-INV 2.2 · MC-2026-0928-AP" (indice, C34). */ instrumento: string
    versaoInstrumento: string
    versaoMotor: string
    /** "MC 3.1 · REL 1.0". */ relatorio: string
  }
  nivel: {
    codigo: CodigoNivel
    nome: string
    /** Paginas que entram, em ordem (D9). */ paginas: number[]
    /** `inclui[33]`: uma pagina so cita outra se ela estiver no documento (C35). */ inclui: Record<number, boolean>
  }
  /** Indice da pagina 02, ja recortado pelo nivel; etapa sem pagina nao aparece. */
  indice: { numero: string; nome: string; descricao: string; cor: string; paginas: { numero: number; titulo: string }[] }[]
  fatores: Record<Fator, FatorDados>
  /** Do mais alto ao mais baixo, com o desempate do motor. */ ordemNatural: Fator[]
  ordemAdaptado: Fator[]
  perfis: { natural: PerfilDados; adaptado: PerfilDados }
  /** Cartao da pagina 07 (D5), pela sigla natural. */ arquetipo: Arquetipo
  /** Na ordem do molde da 07: alto1×baixo2, alto1×baixo1, alto2×baixo2, alto2×baixo1. Texto em `ia.cruzamentos[chave]`. */
  cruzamentos: CruzamentoDados[]
  indices: {
    adaptacao: Medida
    classe: ClasseAdaptacao
    amplitude: Medida
    polarizados: Fator[]
    /** "DOMINANTE, ESTÁVEL e CONFORME"; '' sem polarizado. */ polarizadosTexto: string
    sobem: Fator[]
    descem: Fator[]
  }
  espectro: EspectroDados[]
  /** Pagina 15: fator mais alto e segundo. */ tensoes: { fator: Fator; posicao: 'primeiro' | 'segundo'; tensao: TensaoFator }[]
  /** Pagina 16: principal e complementar, com a frase "Deriva do seu fator..." pronta. */
  gatilhos: { fator: Fator; posicao: 'principal' | 'complementar'; gatilho: GatilhoFator; deriva: string }[]
  jung: {
    tipo: string
    /** EI, NS, TF. */ eixos: EixoDados[]
    hierarquia: FuncaoDados[]
    dominanteDePercepcao: boolean
    inferior: FuncaoDados & { manifestacao: string; statusManifestacao: Status }
    grauDeCerteza: string
  }
  valores: {
    ranking: ValorDados[]
    porValor: Record<Valor, ValorDados>
    /** Na ordem do ranking; grupo vazio e lista vazia. */ grupos: Record<CodigoFaixaValor, ValorDados[]>
    predominantes: [ValorDados, ValorDados]
    diferencaPredominantes: Medida
  }
  /** Ordenados por percentual (D6). */ lideranca: EstiloDados[]
  competencias: {
    /** As 16, ordem D, I, S, C (pagina 32). */ todas: CompetenciaDados[]
    porFator: Record<Fator, CompetenciaDados[]>
    /** As 12 do radar (D7), na ordem dos eixos. */ radar: CompetenciaDados[]
    /** Pagina 31: ate 3 por nivel, das 12, pelo natural. Decrescente, decrescente, crescente. */
    destaques: Record<CodigoNivelCompetencia, CompetenciaDados[]>
  }
  ia: {
    disponivel: boolean
    sinteseCombinacaoNatural: Paragrafos
    cruzamentos: Record<ChaveCruzamento, string | null>
    custoAdaptacao: Paragrafos
    fatores: Record<Fator, Paragrafos>
    seisForcas: NarrativaMC['seis_forcas'] | null
    jung: Record<EixoJung, Paragrafos>
    hierarquia: Paragrafos
    sinaisFuncaoInferior: NarrativaMC['funcao_inferior_sinais'] | null
    doisValores: Paragrafos
    leituraIntegrada: Paragrafos
    resumo: NarrativaMC['resumo_perfil_8_blocos'] | null
    pontosDesenvolver: NarrativaMC['seis_pontos_desenvolver'] | null
    pdi: NarrativaMC['pdi'] | null
    leituras: NarrativaMC['leituras_recomendadas'] | null
    mensagemFinal: Paragrafos
  }
}

export type EntradaRelatorioMC = {
  assessment: { nome: string; codigo: string | null; emitidoEm: Date }
  resultado: ResultadoMotor
  narrativa: NarrativaMC | null
  facilitador: { nome: string }
  nivel: CodigoNivel
}

// ---------------------------------------------------------------- regras

const medida = (valor: number): Medida => ({ valor, texto: numero(valor) })

/** Mesma regua do indice de adaptacao (AGENTE 5.5), aplicada a um fator. O motor so classifica o indice. */
export function classeVariacao(variacao: number): ClasseAdaptacao {
  const v = Math.abs(variacao)
  if (v <= 10) return 'baixa'
  if (v <= 20) return 'moderada'
  if (v <= 25) return 'alta'
  if (v <= 35) return 'muito alta'
  return 'extremamente alta'
}

const NOMES_ESTILO: Record<keyof Lideranca, string> = {
  executivo: 'Executivo', metodico: 'Metódico', motivador: 'Motivador', sistematico: 'Sistemático',
}
const POSICOES_ESTILO = ['Predominante', 'Secundário', 'De apoio', 'Residual']
const LETRA_DA_FUNCAO: Record<string, FuncaoJung> = { Intuição: 'N', Sensação: 'S', Pensamento: 'T', Sentimento: 'F' }
const FAIXA_DO_NIVEL: Record<NivelValor, CodigoFaixaValor> = {
  Significativo: 'significativo', Circunstancial: 'circunstancial', Indiferente: 'indiferente',
}

function perfilDados(sigla: string): PerfilDados {
  const fatores = sigla === 'EQUILIBRADO' ? [] : ([...sigla] as Fator[])
  return {
    sigla,
    tipo: fatores.length === 2 ? 'duplo' : fatores.length === 1 ? 'puro' : 'equilibrado',
    fatores,
    rotulo: fatores.length ? fatores.map((f) => FATORES_RELATORIO[f].rotulo).join(' + ') : 'EQUILIBRADO',
  }
}

function funcaoDados(nome: string, indice: number, pct: Record<PoloJung, number>): FuncaoDados {
  const [nomeFuncao, atitude] = nome.split(' ')
  const funcao = LETRA_DA_FUNCAO[nomeFuncao]
  if (!funcao) throw new Error(`funcao de Jung desconhecida: ${nome}`)
  const posicao = POSICOES_HIERARQUIA[indice]
  return {
    posicao: posicao.posicao,
    rotulo: posicao.nome,
    definicao: posicao.texto,
    nome,
    funcao,
    nomeFuncao,
    atitude: atitude.startsWith('Extrovertid') ? 'E' : 'I',
    percentual: medida(pct[funcao]),
  }
}

function competenciaDados(c: Competencia, r: ResultadoMotor): CompetenciaDados {
  const ficha = COMPETENCIAS[c]
  const natural = r.disc.natural.competencias[c]
  const nivel = nivelDaCompetencia(natural)
  return {
    competencia: c, nome: ficha.nome, fator: ficha.fator, descricao: ficha.descricao, status: ficha.status,
    natural: medida(natural), adaptado: medida(r.disc.adaptado.competencias[c]),
    nivel, nomeNivel: NIVEIS_COMPETENCIA.find((n) => n.codigo === nivel)!.nome,
  }
}

// ---------------------------------------------------------------- montagem

export function montarDadosRelatorio({ assessment, resultado: r, narrativa: n, facilitador, nivel }: EntradaRelatorioMC): DadosRelatorioMC {
  const { natural, adaptado, indices } = r.disc
  const ordem = natural.ordem

  const fatores = Object.fromEntries(FATORES.map((f) => {
    const ficha = FATORES_RELATORIO[f]
    const condicao = (c: typeof natural): CondicaoDados => ({
      escore: medida(c.escore[f]),
      zona: { codigo: c.zona[f], nome: ZONAS[c.zona[f]].nome, atencao: ZONAS[c.zona[f]].atencao },
      descritores: descritoresDe(f, c.zona[f]).adjetivos,
      adjetivos: adjetivosDaCondicao(f, c.escore[f]),
    })
    const v = indices.variacao[f]
    const direcao: Direcao = v > 0 ? 'sobe' : v < 0 ? 'desce' : 'mantem'
    const dados: FatorDados = {
      fator: f, nome: ficha.nome, rotulo: ficha.rotulo, cor: CORES_FATOR[f], posicao: ordem.indexOf(f) + 1,
      natural: condicao(natural), adaptado: condicao(adaptado),
      variacao: { valor: v, texto: comSinal(v) },
      direcao,
      textoDirecao: direcao === 'sobe' ? ROTULOS_PAGINA_FATOR.sobe : direcao === 'desce' ? ROTULOS_PAGINA_FATOR.desce : 'se mantém no adaptado',
      classeVariacao: classeVariacao(v),
      polarizado: indices.polarizados.includes(f),
      ficha,
    }
    return [f, dados]
  })) as Record<Fator, FatorDados>

  const [alto1, alto2, baixo2, baixo1] = ordem
  const rotulo = (f: Fator) => FATORES_RELATORIO[f].rotulo

  // --- Jung
  const pct = r.jung.percentuais as Record<PoloJung, number>
  const polo = (p: PoloJung): PoloDados => ({ polo: p, nome: POLOS_JUNG[p].nome, percentual: medida(pct[p]), ficha: POLOS_JUNG[p] })
  const eixos = EIXOS_JUNG.map((eixo): EixoDados => {
    const [a, b] = POLOS[eixo] as readonly [PoloJung, PoloJung]
    // 27 respostas: %A nunca e 50, o eixo nunca empata.
    const [pred, comp] = pct[a] > 50 ? [a, b] : [b, a]
    return {
      eixo, ficha: EIXOS_RELATORIO[eixo], poloA: polo(a), poloB: polo(b),
      predominante: polo(pred), complementar: polo(comp), diferenca: medida(r1(Math.abs(pct[a] - pct[b]))),
    }
  })
  const hierarquia = r.jung.hierarquia.map((nome, i) => funcaoDados(nome, i, pct))
  const inferior = hierarquia[3]

  // --- Valores
  const valorDados = (v: Valor, i: number): ValorDados => ({
    valor: v, nome: VALORES_RELATORIO[v].nome, nomeMaiusculo: maiusculas(VALORES_RELATORIO[v].nome),
    escore: medida(r.valores.escore[v]), nivel: r.valores.nivel[v], faixa: FAIXA_DO_NIVEL[r.valores.nivel[v]],
    posicao: i + 1, ficha: VALORES_RELATORIO[v],
  })
  const ranking = r.valores.ranking.map(valorDados)
  const porValor = Object.fromEntries(ranking.map((v) => [v.valor, v])) as Record<Valor, ValorDados>
  const grupo = (faixa: CodigoFaixaValor) => ranking.filter((v) => v.faixa === faixa)

  // --- Lideranca (D6): desempate na ordem fixa dos estilos, para o cartao nao trocar de lugar entre leituras.
  const estilos = Object.keys(NOMES_ESTILO) as (keyof Lideranca)[]
  const lideranca = [...estilos]
    .sort((a, b) => r.disc.lideranca[b] - r.disc.lideranca[a] || estilos.indexOf(a) - estilos.indexOf(b))
    .map((estilo, i): EstiloDados => ({
      estilo, nome: NOMES_ESTILO[estilo], percentual: medida(r.disc.lideranca[estilo]), posicao: i + 1, rotuloPosicao: POSICOES_ESTILO[i],
    }))

  // --- Competencias
  const todas = ORDEM_COMPETENCIAS.map((c) => competenciaDados(c, r))
  const porCompetencia = Object.fromEntries(todas.map((c) => [c.competencia, c])) as Record<Competencia, CompetenciaDados>
  const radar = COMPETENCIAS_RADAR.map((c) => porCompetencia[c])
  // sort e estavel: empate de escore fica na ordem do radar.
  const doNivel = (nivelComp: CodigoNivelCompetencia, sentido: 1 | -1) =>
    radar.filter((c) => c.nivel === nivelComp).sort((a, b) => sentido * (a.natural.valor - b.natural.valor)).slice(0, 3)

  // --- Nivel (D9) e indice
  const paginas = paginasDoNivel(nivel)
  const inclui = Object.fromEntries(Array.from({ length: TOTAL_PAGINAS }, (_, i) => [i + 1, paginas.includes(i + 1)]))
  const indice = ETAPAS.map((e) => ({
    numero: e.numero, nome: e.nome, descricao: e.descricao, cor: etapaDaPagina(e.primeira).cor,
    paginas: paginas.filter((p) => p >= e.primeira && p <= e.ultima).map((p) => ({ numero: p, titulo: INDICE[p] })),
  })).filter((e) => e.paginas.length > 0)

  // --- IA
  const blocos = (texto: string | undefined, quantos: number): Paragrafos =>
    n ? paragrafos(texto, quantos) : Array<null>(quantos).fill(null)
  const cruz = n?.quatro_cruzamentos

  const emissao = mesAnoPorExtenso(assessment.emitidoEm)
  const codigo = assessment.codigo

  return {
    identificacao: {
      nome: assessment.nome,
      nomeMaiusculo: maiusculas(assessment.nome),
      cabecalho: cabecalho(assessment.nome),
      codigo,
      instrutor: facilitador.nome,
      instrutorMaiusculo: maiusculas(facilitador.nome),
      emissao,
      emissaoMaiuscula: maiusculas(emissao),
      instrumento: codigo ? `${r.versao_instrumento} · ${codigo}` : r.versao_instrumento,
      versaoInstrumento: r.versao_instrumento,
      versaoMotor: r.versao_motor,
      relatorio: RODAPE,
    },
    nivel: { codigo: nivel, nome: NIVEIS[nivel].nome, paginas, inclui },
    indice,
    fatores,
    ordemNatural: [...ordem],
    ordemAdaptado: [...adaptado.ordem],
    perfis: { natural: perfilDados(natural.perfil), adaptado: perfilDados(adaptado.perfil) },
    arquetipo: ARQUETIPOS[natural.perfil as SiglaPerfil],
    cruzamentos: [
      { chave: 'alto1_baixo2', alto: alto1, baixo: baixo2 },
      { chave: 'alto1_baixo1', alto: alto1, baixo: baixo1 },
      { chave: 'alto2_baixo2', alto: alto2, baixo: baixo2 },
      { chave: 'alto2_baixo1', alto: alto2, baixo: baixo1 },
    ],
    indices: {
      adaptacao: medida(indices.indice_adaptacao),
      classe: indices.classe,
      amplitude: medida(indices.amplitude_natural),
      polarizados: [...indices.polarizados],
      polarizadosTexto: juntar(indices.polarizados.map(rotulo)),
      sobem: FATORES.filter((f) => indices.variacao[f] > 0),
      descem: FATORES.filter((f) => indices.variacao[f] < 0),
    },
    espectro: PARES_ESPECTRO.map((par) => ({ ...par, ...posicaoNoEspectro(par, natural.escore) })),
    tensoes: [
      { fator: alto1, posicao: 'primeiro', tensao: TENSOES[alto1] },
      { fator: alto2, posicao: 'segundo', tensao: TENSOES[alto2] },
    ],
    gatilhos: (['principal', 'complementar'] as const).map((posicao, i) => {
      const f = ordem[i]
      return { fator: f, posicao, gatilho: GATILHOS[f], deriva: PAGINA_16.derivaDoFator(posicao, rotulo(f), numero(natural.escore[f])) }
    }),
    jung: {
      tipo: r.jung.tipo,
      eixos,
      hierarquia,
      dominanteDePercepcao: hierarquia[0].funcao === 'N' || hierarquia[0].funcao === 'S',
      inferior: { ...inferior, manifestacao: MANIFESTACAO_INFERIOR[inferior.funcao].texto, statusManifestacao: MANIFESTACAO_INFERIOR[inferior.funcao].status },
      grauDeCerteza: PAGINA_21.grauDeCerteza(hierarquia[0].nome),
    },
    valores: {
      ranking,
      porValor,
      grupos: { significativo: grupo('significativo'), circunstancial: grupo('circunstancial'), indiferente: grupo('indiferente') },
      predominantes: [ranking[0], ranking[1]],
      diferencaPredominantes: medida(r1(ranking[0].escore.valor - ranking[1].escore.valor)),
    },
    lideranca,
    competencias: {
      todas,
      porFator: Object.fromEntries(FATORES.map((f) => [f, COMPETENCIAS_POR_FATOR[f].map((c) => porCompetencia[c])])) as Record<Fator, CompetenciaDados[]>,
      radar,
      destaques: { potencializar: doNivel('potencializar', -1), consolidar: doNivel('consolidar', -1), desenvolver: doNivel('desenvolver', 1) },
    },
    ia: {
      disponivel: n !== null,
      sinteseCombinacaoNatural: blocos(n?.sintese_combinacao_natural, PARAGRAFOS.sintese_combinacao_natural),
      cruzamentos: {
        alto1_baixo1: cruz?.alto1_baixo1 ?? null,
        alto1_baixo2: cruz?.alto1_baixo2 ?? null,
        alto2_baixo1: cruz?.alto2_baixo1 ?? null,
        alto2_baixo2: cruz?.alto2_baixo2 ?? null,
      },
      custoAdaptacao: blocos(n?.custo_adaptacao_narrativa, PARAGRAFOS.custo_adaptacao_narrativa),
      fatores: {
        D: blocos(n?.fator_d_narrativa, PARAGRAFOS.fator_d_narrativa),
        I: blocos(n?.fator_i_narrativa, PARAGRAFOS.fator_i_narrativa),
        S: blocos(n?.fator_s_narrativa, PARAGRAFOS.fator_s_narrativa),
        C: blocos(n?.fator_c_narrativa, PARAGRAFOS.fator_c_narrativa),
      },
      seisForcas: n?.seis_forcas ?? null,
      jung: {
        EI: blocos(n?.jung_e_i_narrativa, PARAGRAFOS.jung_e_i_narrativa),
        NS: blocos(n?.jung_n_s_narrativa, PARAGRAFOS.jung_n_s_narrativa),
        TF: blocos(n?.jung_t_f_narrativa, PARAGRAFOS.jung_t_f_narrativa),
      },
      hierarquia: blocos(n?.hierarquia_funcional_narrativa, PARAGRAFOS.hierarquia_funcional_narrativa),
      sinaisFuncaoInferior: n?.funcao_inferior_sinais ?? null,
      doisValores: blocos(n?.dois_valores_narrativa, PARAGRAFOS.dois_valores_narrativa),
      leituraIntegrada: blocos(n?.leitura_integrada, PARAGRAFOS.leitura_integrada),
      resumo: n?.resumo_perfil_8_blocos ?? null,
      pontosDesenvolver: n?.seis_pontos_desenvolver ?? null,
      pdi: n?.pdi ?? null,
      leituras: n?.leituras_recomendadas ?? null,
      mensagemFinal: blocos(n?.mensagem_final, PARAGRAFOS.mensagem_final),
    },
  }
}
