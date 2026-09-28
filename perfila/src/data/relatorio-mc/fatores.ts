/**
 * Os quatro fatores DISC — base fixa do relatorio.
 *
 * Tres fontes, uma ficha por fator:
 *   - blueprint secao 07 (tabela) e 08 (base completa): nome, o que mede,
 *     pergunta central, emocao de Marston, motivador, forcas, medos, motiva;
 *   - pagina 05 do molde: os quatro cartoes da Teoria DISC;
 *   - paginas 09-12 do molde: os campos fixos de cada fator.
 * Tudo transcrito. A IA recebe isto como base e nao reescreve (secao 23).
 *
 * Nome exibido: D8 do ADR-0007 deixa o nome do fator D numa constante so,
 * porque a pendencia T3 (Dominancia ou Direcao) ainda e do Valmer.
 */
import type { Fator } from '../inventario-mc'

/** Pendencia T3. Trocar para 'Direção' e mudar esta linha. */
export const NOME_EXIBIDO_FATOR_D = 'Dominância'

export type FichaFator = {
  fator: Fator
  /** Nome do fator (secao 08). */
  nome: string
  /** Como o molde escreve o fator no texto corrido: "DOMINANTE". */
  rotulo: string
  /** Coluna "Nome" da tabela da secao 07. */
  nomeTabela: string
  /** Linha de tres palavras sob o nome (secao 08). */
  tresPalavras: string
  /** Paragrafo de descricao (secao 08). */
  descricao: string
  /** Secao 07. */
  oQueMede: string
  /** Secao 07, em caixa alta como na tabela. */
  perguntaCentral: string
  /** Secao 07; igual a "Emocao associada" das paginas 09-12. */
  emocaoMarston: string
  /** Secao 07; igual ao "Motivador" das paginas 09-12. */
  motivador: string
  forcas: readonly string[]
  medos: readonly string[]
  motiva: readonly string[]
  /** Cartao da pagina 05. */
  pagina05: { foco: string; caracteristica: string; formaDeAgir: string; perguntaCentral: string }
  /** Campos fixos das paginas 09-12. */
  pagina: {
    numero: 9 | 10 | 11 | 12
    /** "Fator 01". */
    ordem: string
    /** Subtitulo sob o nome. */
    comoLida: string
    palavraChave: string
    comunicacao: string
    decisao: string
    contribuicao: string
    /**
     * Adjetivos das linhas "No natural" / "No adaptado". O molde nao escreve
     * uma lista por condicao, e sim uma para o fator alto e outra para o fator
     * baixo: nas oito linhas do Valmer, a lista segue o escore daquela
     * condicao (>= 51 alto, abaixo baixo). Ver `adjetivosDaCondicao`.
     */
    adjetivosQuandoAlto: string
    adjetivosQuandoBaixo: string
  }
}

export const FATORES_RELATORIO: Record<Fator, FichaFator> = {
  D: {
    fator: 'D',
    nome: NOME_EXIBIDO_FATOR_D,
    rotulo: 'DOMINANTE',
    nomeTabela: 'Dominante',
    tresPalavras: 'Rápido · Ousado · Orientado a resultados',
    descricao: 'O Dominante vive para desafios. Para ele, inércia é desperdício. Age primeiro, analisa depois. Tem energia natural de comando que emerge mesmo sem cargo de liderança.',
    oQueMede: 'Como lida com adversidades',
    perguntaCentral: 'O QUÊ?',
    emocaoMarston: 'Raiva',
    motivador: 'Desafio e poder',
    forcas: [
      'Decisão rápida mesmo sob pressão',
      'Mobiliza pessoas e recursos com velocidade',
      'Coragem para decisões impopulares',
      'Resiliência diante de obstáculos',
      'Foco absoluto no resultado',
    ],
    medos: [
      'Falhar e perder autoridade pública',
      'Perder autonomia e liberdade',
      'Ser microgerenciado',
      'Ambientes sem metas ou urgência',
    ],
    motiva: [
      'Poder, autonomia, desafios novos',
      'Reconhecimento por resultados concretos',
      'Competição e oportunidade de superar limites',
    ],
    pagina05: {
      foco: 'Foco em resultado',
      caracteristica: 'Determinado, competitivo, voltado a resultados, confiante',
      formaDeAgir: 'Comunicação direta e objetiva, decisão racional e rápida',
      perguntaCentral: 'O QUÊ?',
    },
    pagina: {
      numero: 9,
      ordem: 'Fator 01',
      comoLida: 'Como você lida com adversidades e desafios.',
      palavraChave: 'Intolerância',
      comunicacao: 'Direta e objetiva',
      decisao: 'Racional e rápida',
      contribuicao: 'Comando e iniciativa',
      adjetivosQuandoAlto: 'Determinado, competitivo, voltado a resultados, confiante, direto, objetivo, ousado.',
      adjetivosQuandoBaixo: 'Conservador, agradável, cooperador, moderado, evita imposição.',
    },
  },
  I: {
    fator: 'I',
    nome: 'Influência',
    rotulo: 'INFLUENTE',
    nomeTabela: 'Influente',
    tresPalavras: 'Comunicativo · Amigável · Orientado para pessoas',
    descricao: 'O Influente transforma o ambiente que entra. Não é só extroversão — é a capacidade genuína de fazer as pessoas se sentirem vistas e valorizadas. Cria conexões com facilidade.',
    oQueMede: 'Como lida com pessoas',
    perguntaCentral: 'QUEM?',
    emocaoMarston: 'Otimismo',
    motivador: 'Reconhecimento social',
    forcas: [
      'Comunicação poderosa e inspiradora',
      'Facilidade de criar conexões humanas',
      'Energia e clima positivo no ambiente',
      'Criatividade e geração de ideias',
      'Adaptabilidade social',
    ],
    medos: [
      'Rejeição social e perda de aprovação',
      'Ambientes frios e sem interação',
      'Ser ignorado ou não reconhecido',
      'Conflitos que possam romper relações',
    ],
    motiva: [
      'Reconhecimento público e aprovação',
      'Projetos criativos com muita interação',
      'Ambientes dinâmicos com novidade',
    ],
    pagina05: {
      foco: 'Foco em pessoas',
      caracteristica: 'Carismático, encantador, otimista, expressivo',
      formaDeAgir: 'Comunicação informal e pessoal, decisão emocional e rápida',
      perguntaCentral: 'QUEM?',
    },
    pagina: {
      numero: 10,
      ordem: 'Fator 02',
      comoLida: 'Como você lida com pessoas e as influencia.',
      palavraChave: 'Sociável',
      comunicacao: 'Informal e pessoal',
      decisao: 'Emocional e rápida',
      contribuicao: 'Negociação e criatividade',
      adjetivosQuandoAlto: 'Carismático, encantador, otimista, expressivo, persuasivo, articulador, entusiasta.',
      adjetivosQuandoBaixo: 'Sério, lógico, cético, formal, introspectivo, reservado, concentrado, crítico.',
    },
  },
  S: {
    fator: 'S',
    nome: 'Estabilidade',
    rotulo: 'ESTÁVEL',
    nomeTabela: 'Estável',
    tresPalavras: 'Paciente · Conciliador · Orientado ao equilíbrio',
    descricao: 'O Estável é o que mantém tudo em pé enquanto os outros correm. Paciência que parece infinita, lealdade que raramente falha. Não é o mais rápido nem o mais barulhento, mas é o mais confiável.',
    oQueMede: 'Como lida com mudanças',
    perguntaCentral: 'COMO?',
    emocaoMarston: 'Serenidade',
    motivador: 'Segurança',
    forcas: [
      'Confiabilidade absoluta',
      'Paciência e escuta ativa genuína',
      'Relacionamentos duradouros',
      'Suporte emocional autêntico',
      'Consistência sob alta pressão',
    ],
    medos: [
      'Perda de estabilidade e segurança',
      'Conflitos abertos e tensão constante',
      'Mudanças bruscas sem explicação',
      'Romper relacionamentos importantes',
    ],
    motiva: [
      'Segurança, estabilidade e harmonia',
      'Saber que seu trabalho importa',
      'Equipes coesas e de alta confiança',
    ],
    pagina05: {
      foco: 'Foco em método',
      caracteristica: 'Compreensivo, acolhedor, consistente, bom ouvinte',
      formaDeAgir: 'Comunicação suave e empática, decisão emocional e demorada',
      perguntaCentral: 'COMO?',
    },
    pagina: {
      numero: 11,
      ordem: 'Fator 03',
      comoLida: 'Como você lida com mudanças e estabelece o seu ritmo.',
      palavraChave: 'Previsibilidade',
      comunicacao: 'Suave e empática',
      decisao: 'Emocional e demorada',
      contribuicao: 'Planejamento e cooperação',
      adjetivosQuandoAlto: 'Compreensivo, acolhedor, consistente, bom ouvinte, paciente, planejador, previsível, leal.',
      adjetivosQuandoBaixo: 'Ativo, impulsivo, inquieto, enérgico, dinâmico, versátil, acelerado, multitarefa.',
    },
  },
  C: {
    fator: 'C',
    nome: 'Conformidade',
    rotulo: 'CONFORME',
    nomeTabela: 'Conforme',
    tresPalavras: 'Cauteloso · Detalhista · Orientado à precisão',
    descricao: 'O Conforme não age sem entender. Para ele, decisão sem dados suficientes é risco desnecessário. Mente analítica que vê o que os outros não veem. Introvertido não por timidez, mas por preferência de profundidade.',
    oQueMede: 'Como lida com regras',
    perguntaCentral: 'POR QUÊ?',
    emocaoMarston: 'Medo',
    motivador: 'Informação e alto padrão',
    forcas: [
      'Análise profunda e prevenção de problemas',
      'Precisão e excelência técnica',
      'Planejamento estratégico',
      'Alta capacidade de aprendizado',
      'Pensamento crítico e baseado em dados',
    ],
    medos: [
      'Cometer erros e ser criticado publicamente',
      'Sair das normas estabelecidas',
      'Ambiguidade e falta de clareza',
      'Decidir sem dados suficientes',
    ],
    motiva: [
      'Clareza nas expectativas e critérios',
      'Projetos com alta complexidade técnica',
      'Ser reconhecido pela qualidade',
    ],
    pagina05: {
      foco: 'Foco em critério',
      caracteristica: 'Disciplinado, analítico, preciso, organizado',
      formaDeAgir: 'Comunicação formal e específica, decisão racional e demorada',
      perguntaCentral: 'POR QUÊ?',
    },
    pagina: {
      numero: 12,
      ordem: 'Fator 04',
      comoLida: 'Como você lida com regras e procedimentos.',
      palavraChave: 'Crítico',
      comunicacao: 'Formal e específica',
      decisao: 'Racional e demorada',
      contribuicao: 'Qualidade e atenção ao detalhe',
      adjetivosQuandoAlto: 'Disciplinado, analítico, preciso, organizado, detalhista, cuidadoso, formal, ordenado.',
      adjetivosQuandoBaixo: 'Criativo, informal, livre, independente, desinibido, assume riscos, flexível.',
    },
  },
}

/**
 * Limiar entre as duas listas de adjetivos. E o limiar de predominancia do
 * motor (zona A comeca em 51). Regra inferida do molde, que so mostra um
 * avaliado — status 'a confirmar'.
 */
export const LIMIAR_ADJETIVOS_ALTO = 51

/** Lista para a linha "No natural" ou "No adaptado", pelo escore daquela condicao. */
export function adjetivosDaCondicao(fator: Fator, escore: number): string {
  const { adjetivosQuandoAlto, adjetivosQuandoBaixo } = FATORES_RELATORIO[fator].pagina
  return escore >= LIMIAR_ADJETIVOS_ALTO ? adjetivosQuandoAlto : adjetivosQuandoBaixo
}

/** Nota ao pe da pagina 09 (so ali), que explica a linha "Emocao associada". */
export const NOTA_EMOCAO_ASSOCIADA = {
  titulo: 'Como ler a linha “Emoção associada”.',
  texto: 'No modelo de Marston, cada fator descreve uma reação emocional típica diante do ambiente, e não um traço de caráter da pessoa. Raiva, nesse vocabulário, nomeia a energia de enfrentamento que aparece quando o contexto resiste ao que você quer. A mesma lógica vale para as outras três emoções listadas nas páginas seguintes.',
} as const

/** Rotulos fixos das paginas 09-12, na ordem do molde. */
export const ROTULOS_PAGINA_FATOR = {
  escala: 'Posição na escala de intensidade · 0 a 100',
  natural: 'NATURAL',
  adaptado: 'ADAPTADO',
  variacao: 'VARIAÇÃO',
  desce: 'desce no adaptado',
  sobe: 'sobe no adaptado',
  noNatural: 'No natural',
  noAdaptado: 'No adaptado',
  palavraChave: 'Palavra-chave',
  emocao: 'Emoção associada',
  motivador: 'Motivador',
  comunicacao: 'Comunicação',
  decisao: 'Decisão',
  contribuicao: 'Contribuição',
  aplicacao: 'Aplicação no trabalho',
  polarizado: 'Fator polarizado · o que mudou na prática.',
} as const
