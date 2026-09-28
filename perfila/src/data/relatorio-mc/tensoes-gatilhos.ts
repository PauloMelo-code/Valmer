/**
 * Pontos de tensao (pagina 15) e gatilhos de mobilizacao (pagina 16).
 *
 * As duas paginas mostram o fator mais alto e o segundo do perfil natural, e
 * qualquer um dos quatro pode cair ali. O molde so traz D e I, porque o
 * relatorio de referencia e de um perfil DI. S e C foram montados aqui a partir dos "Medos" e do "Motiva"
 * da secao 08 do blueprint, no mesmo formato do molde; o que foi escrito aqui
 * esta nomeado em `redigidos`.
 *
 * O texto que depende da POSICAO do fator (mais alto ou segundo) nao mora no
 * fator: esta nas funcoes e constantes do fim do arquivo.
 */
import type { Fator } from '../inventario-mc'

export type TensaoFator = {
  /** Seis itens da lista "Ligados ao fator X". */
  itens: readonly string[]
  /** Paragrafo "Como aparece." */
  comoAparece: string
  /** Bloco "Risco · impacto possivel" quando este e o fator mais alto. */
  risco: string
  redigidos: readonly ('itens' | 'comoAparece' | 'risco')[]
}

export const TENSOES: Record<Fator, TensaoFator> = {
  D: {
    itens: [
      'Fracassar',
      'Perder o poder e a autoridade',
      'Perder autonomia e liberdade de ação',
      'Ter que se submeter ou se subordinar a alguém',
      'Perder posição para outra pessoa',
      'Ter que reconhecer os próprios erros',
    ],
    comoAparece: 'Reação rápida de fechamento, tom mais firme do que o assunto pedia e pressa em retomar o controle da conversa.',
    risco: 'Decisões tomadas para preservar posição, e não para resolver o problema. Conversas encerradas cedo demais. E equipes que aprendem a não trazer o assunto que aciona o gatilho, o que retira de você exatamente a informação de que você mais precisa.',
    redigidos: [],
  },
  I: {
    itens: [
      'Rejeição',
      'Ficar sozinho',
      'Frustrar a expectativa dos outros',
      'Não ser reconhecido e valorizado',
      'Não se sentir apoiado',
      'Perder o prazer nas próprias ações e na rotina',
    ],
    // O molde so tem o texto do I como segundo fator; a ultima frase dele e a
    // que vale para o fator e foi aproveitada no fim deste paragrafo.
    comoAparece: 'Humor que cai de repente, conversa desviada para um tom mais leve e menos iniciativa no grupo em que se sentiu deixado de lado. O sinal aqui é o afastamento, não o confronto.',
    risco: 'Decisões tomadas para agradar, e não para resolver. Promessas feitas para evitar o desconforto de um não. E críticas que nunca chegam a você, porque as pessoas aprendem que a conversa difícil custa o clima.',
    redigidos: ['comoAparece', 'risco'],
  },
  S: {
    itens: [
      'Perder a estabilidade e a segurança conquistadas',
      'Enfrentar conflito aberto e tensão que não se resolve',
      'Passar por mudança brusca sem explicação',
      'Romper um relacionamento importante',
      'Ser pressionado a decidir sem tempo',
      'Decepcionar quem conta com você',
    ],
    comoAparece: 'Silêncio no lugar da discordância, concordância que não se converte em ação e apego ao jeito conhecido de fazer. O incômodo não sai na hora; aparece depois, acumulado.',
    risco: 'Mudanças necessárias adiadas para preservar a paz. Problemas que todos veem e ninguém nomeia. E um desgaste guardado que, quando finalmente aparece, parece desproporcional a quem não acompanhou o acúmulo.',
    redigidos: ['itens', 'comoAparece', 'risco'],
  },
  C: {
    itens: [
      'Cometer erros',
      'Ser criticado publicamente pelo próprio trabalho',
      'Sair das normas e dos padrões estabelecidos',
      'Lidar com ambiguidade e falta de clareza',
      'Decidir sem dados suficientes',
      'Entregar algo abaixo do próprio padrão',
    ],
    comoAparece: 'Mais perguntas, mais checagem e pedido de prazo. A crítica recebida vira defesa técnica detalhada, e a conversa passa do resultado para o critério.',
    risco: 'Decisões adiadas até que o momento passe. Energia gasta em provar que estava certo em vez de corrigir o rumo. E pessoas que deixam de trazer ideias ainda cruas, com receio da avaliação antes da hora.',
    redigidos: ['itens', 'comoAparece', 'risco'],
  },
}

export type GatilhoFator = {
  /** Nome do gatilho: e o motivador do fator (secao 07). */
  nome: string
  /** O que aciona, sem a frase de posicao (ver `derivaDoFator`). */
  oQueSignifica: string
  comoAparece: string
  quandoFalta: string
  redigidos: readonly ('oQueSignifica' | 'comoAparece' | 'quandoFalta')[]
}

export const GATILHOS: Record<Fator, GatilhoFator> = {
  D: {
    nome: 'Desafio e poder',
    oQueSignifica: 'Situação em que existe algo a superar, decisão a tomar ou território a conquistar aciona você imediatamente.',
    comoAparece: 'Você entra com energia em projetos que ainda não têm dono e perde interesse quando o projeto vira rotina administrada.',
    quandoFalta: 'Posição sem autonomia real drena a sua energia mesmo quando todo o resto está bom, e o esvaziamento aparece antes que a insatisfação seja verbalizada.',
    redigidos: [],
  },
  I: {
    nome: 'Reconhecimento social',
    oQueSignifica: 'Situação em que há pessoas para envolver, ideias para apresentar e alguém para ver o resultado aciona você com facilidade.',
    comoAparece: 'Ser reconhecido pelo que entregou, e não apenas ter entregado, sustenta o seu esforço por mais tempo em ciclos longos.',
    quandoFalta: 'O efeito raramente é reclamação. É retirada silenciosa de energia daquele projeto, o que torna o sinal difícil de perceber por quem está de fora.',
    redigidos: ['oQueSignifica'],
  },
  S: {
    nome: 'Segurança',
    oQueSignifica: 'Situação em que o terreno é conhecido, as regras são estáveis e as pessoas são de confiança libera o seu melhor ritmo.',
    comoAparece: 'Você rende mais quando sabe o que vem a seguir e quando o seu trabalho sustenta alguém que conta com ele.',
    quandoFalta: 'Mudança sem aviso consome energia antes mesmo de começar. A reação não costuma ser protesto: é cautela, lentidão e espera para ver se o chão firma.',
    redigidos: ['oQueSignifica', 'comoAparece', 'quandoFalta'],
  },
  C: {
    nome: 'Informação e alto padrão',
    oQueSignifica: 'Situação em que o critério está claro, a informação é suficiente e a qualidade será notada aciona você com constância.',
    comoAparece: 'Você se engaja em problemas complexos, em que o cuidado faz diferença, e perde interesse quando o padrão exigido é baixo ou muda sem explicação.',
    quandoFalta: 'Expectativa vaga gera verificação em excesso. A energia vai para se proteger do erro, e não para produzir, e o prazo passa a correr contra você.',
    redigidos: ['oQueSignifica', 'comoAparece', 'quandoFalta'],
  },
}

/** Textos fixos da pagina 15 que nao dependem do fator. */
export const PAGINA_15 = {
  sobretitulo: 'O que está por baixo',
  titulo: 'Pontos de tensão e insegurança',
  intro: 'Tensão não descreve fraqueza. É o motor emocional que organiza boa parte do comportamento e explica reações que a lógica sozinha não explica. Quando um destes pontos é tocado, a reação costuma ser mais rápida e mais intensa do que o evento pediria, e é essa desproporção que serve de sinal.',
  ligadosAoFator: (rotulo: string) => `Ligados ao fator ${rotulo}`,
  rotuloPrimeiro: 'Fator mais alto',
  rotuloSegundo: 'Segundo fator',
  rotuloComoAparece: 'Como aparece.',
  /** Vem antes do `comoAparece` do SEGUNDO fator. */
  notaSegundoFator: 'Aparecem com menos frequência, e com mais força quando o primeiro grupo já foi acionado.',
  tituloRisco: 'Risco · impacto possível',
  tituloRecomendacao: 'Recomendação · prática',
  recomendacao: 'Leve a lista para a conversa de devolutiva e marque cada item como reconhecido, parcial ou improvável. Depois escolha o item mais reconhecido e identifique a última vez em que ele apareceu. Nomear o episódio concreto vale mais do que concordar com a lista inteira.',
} as const

/** Textos fixos da pagina 16 que nao dependem do fator. */
export const PAGINA_16 = {
  sobretitulo: 'O que move você',
  titulo: 'Gatilhos comportamentais de mobilização',
  intro: 'Gatilhos comportamentais de mobilização são as forças que colocam você em movimento antes de qualquer incentivo externo. Reconhecê-los explica por que certos projetos sustentam a sua energia por meses e outros a drenam em semanas, mesmo quando o volume de trabalho é parecido.',
  ponte: 'Os gatilhos comportamentais explicam o que coloca você em movimento. Os valores explicam por que esse movimento vale o esforço.',
  rotuloPrincipal: 'Gatilho principal',
  rotuloComplementar: 'Gatilho complementar',
  rotuloSignifica: 'O que significa.',
  rotuloComoAparece: 'Como aparece.',
  rotuloQuandoFalta: 'O que acontece quando falta.',
  tituloCruzamento: 'O cruzamento com os seus valores',
  rotuloAplicacao: 'Aplicação prática.',
  /**
   * Primeira frase de "O que significa.". No molde, o gatilho principal segue
   * com o `oQueSignifica` do fator; o complementar para aqui.
   */
  derivaDoFator: (posicao: 'principal' | 'complementar', rotulo: string, escore: string) =>
    posicao === 'principal'
      ? `Deriva do seu fator mais alto no perfil natural, ${rotulo} em ${escore} pontos.`
      : `Deriva do seu segundo fator, ${rotulo} em ${escore} pontos. Reforça o engajamento depois que o principal já está atendido.`,
} as const
