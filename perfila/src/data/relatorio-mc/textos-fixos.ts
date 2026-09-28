/**
 * Textos fixos por pagina do relatorio MC 3.1 — transcritos do molde
 * (`contexto/referencias/mc-3.1/Mapa_Comportamental_MC_3_1_v3_editavel.html`).
 *
 * Paginas cobertas aqui: 02, 03, 04, 05, 17, 23, 30, 35, 38, 41 e 42. O que e
 * tabela de um assunto mora no arquivo do assunto (cartoes da 05 em
 * `fatores.ts`, eixos da 17 em `jung.ts`, faixas da 23 em `spranger.ts`,
 * niveis da 30 em `competencias.ts`, marcacoes da 02 em `marcacoes.ts`).
 *
 * Cada pagina tem `etapa` (o selo do cabecalho), `sobretitulo` (a linha
 * dourada acima do titulo) e `titulo`, como no molde. Paragrafos vao em
 * ordem; onde o molde abre o paragrafo com um trecho em negrito, o par e
 * `{ destaque, texto }`.
 */
/** Cabecalho de toda pagina: "Mapa Comportamental · <NOME EM CAIXA ALTA>". */
export const cabecalho = (nomeAvaliado: string) => `Mapa Comportamental · ${nomeAvaliado.toLocaleUpperCase('pt-BR')}`
export const RODAPE = 'MC 3.1 · REL 1.0'

export type Etapa = { numero: string; nome: string; descricao: string; selo: string; primeira: number; ultima: number }

/** As cinco etapas como o indice do molde agrupa (D5: vale o molde). */
export const ETAPAS: readonly Etapa[] = [
  { numero: '01', nome: 'Compreender', descricao: 'O modelo por trás da leitura', selo: '01 · COMPREENDER', primeira: 3, ultima: 5 },
  { numero: '02', nome: 'Interpretar', descricao: 'Comportamento, processamento e motivação', selo: '02 · INTERPRETAR', primeira: 6, ultima: 25 },
  { numero: '03', nome: 'Integrar', descricao: 'O conjunto em uma leitura', selo: '03 · INTEGRAR', primeira: 26, ultima: 28 },
  { numero: '04', nome: 'Aplicar', descricao: 'Em você e nas relações', selo: '04 · APLICAR', primeira: 29, ultima: 40 },
  { numero: '05', nome: 'Continuar', descricao: 'O próximo ciclo', selo: '05 · CONTINUAR', primeira: 41, ultima: 42 },
]

/** Titulos do indice (pagina 02), da 03 a 42. */
export const INDICE: Readonly<Record<number, string>> = {
  3: 'Sobre o seu Mapa Comportamental', 4: 'Metodologia DISC', 5: 'Teoria DISC',
  6: 'Mapa de Intensidade Comportamental', 7: 'A sua combinação natural', 8: 'O custo da adaptação',
  9: 'Fator DOMINANTE', 10: 'Fator INFLUENTE', 11: 'Fator ESTÁVEL', 12: 'Fator CONFORME',
  13: 'Forças de maior impacto', 14: 'Relacionamento, decisão e espectro',
  15: 'Pontos de tensão e insegurança', 16: 'Gatilhos comportamentais de mobilização',
  17: 'Tipos psicológicos', 18: 'Extroversão e Introversão', 19: 'Intuição e Sensação',
  20: 'Pensamento e Sentimento', 21: 'A sua hierarquia funcional', 22: 'O lado que aparece sob pressão',
  23: 'Teoria de valores', 24: 'Os seus seis valores', 25: 'Os dois valores predominantes',
  26: 'Leitura integrada das três camadas', 27: 'Painel consolidado', 28: 'Resumo do Perfil Comportamental',
  29: 'O seu estilo de liderança', 30: 'Mapa de Competências, fundamentação', 31: 'Mapa de Competências, resultado',
  32: 'Competências em detalhe', 33: 'Pontos a desenvolver, primeira parte', 34: 'Pontos a desenvolver, segunda parte',
  35: 'Como se comunicar com cada perfil', 36: 'Comunicar com DOMINANTE e INFLUENTE',
  37: 'Comunicar com ESTÁVEL e CONFORME', 38: 'Como liderar cada perfil',
  39: 'Liderando o DOMINANTE e o INFLUENTE', 40: 'Liderando o ESTÁVEL e o CONFORME',
  41: 'O desenvolvimento continua', 42: 'Impacto Academy',
}

export const PAGINA_02 = {
  etapa: 'ÍNDICE',
  sobretitulo: 'Índice',
  titulo: 'Cinco etapas, uma sequência',
  subtitulo: 'Compreender o modelo, interpretar o seu resultado, integrar as três camadas, aplicar o que ele revela em você e nas relações e continuar o desenvolvimento.',
  /** Quadro de identificacao; os valores vem do assessment. */
  identificacao: { titulo: 'Identificação', avaliado: 'Avaliado', instrumento: 'Instrumento', emissao: 'Emissão', relatorio: 'Relatório' },
} as const

export const PAGINA_03 = {
  etapa: '01 · COMPREENDER',
  sobretitulo: 'O ponto de partida',
  titulo: 'Sobre o seu Mapa Comportamental',
  subtitulo: 'Este relatório descreve o que você costuma fazer diante das situações do dia a dia, e não o que você é obrigado a fazer.',
  citacao: 'O objetivo não é dizer quem você é. É mostrar como você tende a agir, para que você reconheça seus padrões e saiba o que fazer com essa informação.',
  colunas: [
    'A palavra mapa está aqui no sentido de registro de padrões. Comportamento não é aleatório: ele se repete, com intensidades diferentes, diante de desafio, de pessoas, de mudança e de regra. Este documento mede essas intensidades e torna visível o que hoje acontece de forma automática. Tudo parte das respostas que você mesmo deu ao inventário.',
    'Comportamento tem padrão. Não é acaso e não é sorte. O que é visível pode ser escolhido, e quanto maior a consciência sobre si, maior a capacidade de agir com intenção em vez de reagir. Ainda assim, nada aqui é sentença: o relatório trabalha com tendências e padrões predominantes, nunca com determinação.',
  ],
  tituloCamadas: 'Três camadas sustentam a leitura',
  camadas: [
    {
      numero: '01', rotulo: 'Camada 01 · Comportamento', titulo: 'O que se vê',
      texto: 'Quatro fatores descrevem tendências observáveis: DOMINANTE, INFLUENTE, ESTÁVEL e CONFORME. Todo mundo tem os quatro, em intensidades diferentes, e é a proporção entre eles que descreve o comportamento.',
      pergunta: 'como esta pessoa atua?',
    },
    {
      numero: '02', rotulo: 'Camada 02 · Processamento', titulo: 'O que acontece antes',
      texto: 'Os tipos psicológicos descrevem como cada pessoa direciona energia, capta informação e chega a uma decisão. Explicam por que duas pessoas com comportamento parecido chegam ao mesmo lugar por caminhos mentais opostos.',
      pergunta: 'por qual caminho ela chega lá?',
    },
    {
      numero: '03', rotulo: 'Camada 03 · Motivação', titulo: 'Por que vale o esforço',
      texto: 'A teoria de valores descreve as forças internas que orientam escolhas e percepções de sucesso. Duas pessoas podem agir de forma semelhante e estar sendo impulsionadas por motivações completamente diferentes.',
      pergunta: 'o que move esta pessoa?',
    },
  ],
  rotuloPergunta: 'Pergunta que responde:',
  observacaoDeMetodo: {
    destaque: 'Uma observação de método',
    texto: 'As três camadas não competem entre si. A leitura ganha precisão quando as três apontam para a mesma direção, porque nesse caso a característica tende a ser estrutural. E ganha nuance quando divergem, porque a divergência costuma indicar o ponto em que o contexto está pedindo algo diferente da tendência natural.',
  },
  tituloComoUsar: 'Como usar o que está aqui',
  comoUsar: [
    'Leia com curiosidade, sem a expectativa de concordar com tudo. Marque o que ressoa e marque também o que não ressoa, porque a segunda marcação costuma render mais na conversa de devolutiva. Discordância aponta com precisão onde o instrumento e a sua experiência divergem, e conferir com pessoas que convivem com você de perto torna essa conversa ainda mais precisa.',
    'Ao terminar a leitura, escolha poucas prioridades e transforme cada uma em ação observável. Desenvolvimento real acontece quando consciência se converte em comportamento.',
  ],
  tituloNaoFaz: 'O que este relatório não faz',
  naoFaz: [
    { destaque: 'Isto não é diagnóstico clínico.', texto: 'Descreve tendências de comportamento observável a partir das suas respostas. Não avalia saúde mental e não substitui avaliação profissional.' },
    { destaque: 'Isto não mede competência.', texto: 'Inteligência, caráter e experiência ficam fora do alcance do instrumento. Facilidade para acionar um comportamento é uma coisa; produzir resultado com ele é outra.' },
    { destaque: 'Isto não determina futuro ou capacidade.', texto: 'Não estabelece limite. Nenhuma página aqui afirma que você não consegue.' },
  ],
} as const

export const PAGINA_04 = {
  etapa: '01 · COMPREENDER',
  sobretitulo: 'Como você age',
  titulo: 'Metodologia DISC',
  paragrafos: [
    'A busca por compreender por que as pessoas pensam, sentem e agem de maneiras diferentes acompanha os estudos sobre o comportamento humano há séculos. Ao longo do tempo, diferentes pesquisadores desenvolveram teorias para explicar padrões de personalidade, temperamento e respostas emocionais.',
    'Foi nesse contexto que William Moulton Marston, psicólogo formado em Harvard, apresentou importantes contribuições para o estudo do comportamento humano.',
    'Antes de aprofundar seus estudos sobre emoções e comportamento, em 1917, Marston desenvolveu um método que relacionava alterações na pressão sanguínea à identificação de respostas associadas à mentira, trabalho que se tornou um dos antecedentes científicos do desenvolvimento do polígrafo.',
    'Anos depois, em 1928, publicou a obra Emotions of Normal People, na qual apresentou uma teoria para compreender como as pessoas respondem emocionalmente às situações e às influências do ambiente.',
    'Os estudos de Marston se tornaram a principal base conceitual do que posteriormente ficou conhecido como DISC, um modelo amplamente utilizado para compreender tendências comportamentais e diferentes formas de agir, comunicar, decidir e interagir.',
    'A teoria considera quatro grandes dimensões comportamentais: Dominância, Influência, Estabilidade e Conformidade, que deram origem ao acrônimo DISC.',
    'Cada pessoa apresenta essas quatro dimensões em diferentes níveis de intensidade. Por isso, o DISC não deve ser utilizado para colocar pessoas em caixas ou determinar quem alguém é, mas como uma ferramenta para identificar tendências, preferências e padrões de comportamento.',
    'Compreender essas características amplia a percepção sobre a maneira como uma pessoa enfrenta desafios, estabelece relacionamentos, reage ao ambiente, toma decisões e se comunica.',
    'Para compreender melhor como essas dimensões se manifestam na prática, na próxima página você conhecerá as principais características dos quatro perfis comportamentais do DISC.',
  ],
  /** Legenda do retrato. O molde traz a foto embutida em base64. */
  retrato: { nome: 'WILLIAM MOULTON MARSTON', datas: '1893 a 1947' },
} as const

/** Os quatro cartoes estao em `FATORES_RELATORIO[f].pagina05`. */
export const PAGINA_05 = {
  etapa: '01 · COMPREENDER',
  sobretitulo: 'A lógica do modelo',
  titulo: 'Teoria DISC',
  rotulos: { caracteristica: 'Característica', formaDeAgir: 'Forma de agir', pergunta: 'pergunta que faz' },
} as const

/** Os tres cartoes de eixo estao em `EIXOS_RELATORIO` (jung.ts). */
export const PAGINA_17 = {
  etapa: '02 · INTERPRETAR',
  sobretitulo: 'Como você processa',
  titulo: 'Tipos psicológicos',
  paragrafos: [
    'Os tipos psicológicos mostram preferências naturais na maneira como uma pessoa direciona sua energia, percebe informações e toma decisões.',
    'Eles não definem capacidade, inteligência ou caráter. Revelam caminhos mais espontâneos de funcionamento, ajudando a compreender por que pessoas igualmente competentes podem interpretar a mesma situação de formas diferentes.',
    'Ao identificar essas preferências, você amplia sua consciência sobre como processa o mundo, quais comportamentos surgem com mais naturalidade e quais respostas exigem maior esforço.',
    'O objetivo não é rotular, mas aumentar a flexibilidade: reconhecer seu padrão predominante e desenvolver alternativas para agir melhor diante de pessoas, desafios e contextos diferentes.',
  ],
  tituloAcrescenta: 'O que esta camada acrescenta',
  acrescenta: [
    'O modelo comportamental descreve o que se vê. Os tipos psicológicos descrevem o processo que acontece antes disso, e a diferença entre os dois é prática. Duas pessoas com o mesmo perfil comportamental podem chegar ao mesmo resultado por caminhos mentais opostos, e precisam de coisas diferentes para se desenvolver.',
    'Um exemplo torna isso concreto. Quem decide rápido porque reconhece um padrão precisa aprender a checar o padrão. Quem decide rápido porque não tolera a espera precisa de outra coisa inteiramente: precisa aprender a sustentar o desconforto do intervalo. O comportamento observado é idêntico e a intervenção correta é oposta.',
  ],
} as const

/** As tres faixas estao em `FAIXAS_VALOR` (spranger.ts). */
export const PAGINA_23 = {
  etapa: '02 · INTERPRETAR',
  sobretitulo: 'O que move você',
  titulo: 'Teoria de valores',
  subtitulo: 'As forças internas que explicam por que algo vale o esforço.',
  paragrafos: [
    'Valores são forças internas que orientam escolhas, prioridades e percepções de sucesso. Eles ajudam a explicar por que pessoas com competências semelhantes podem buscar resultados completamente diferentes.',
    'Quando um valor está forte, ele influencia onde a pessoa investe tempo, energia e atenção, o que considera importante e quais situações aumentam ou reduzem seu engajamento.',
    'Ao avaliar conhecimento e experiência, identificamos o que alguém consegue fazer. Ao avaliar comportamento, identificamos como a pessoa atua. Valores respondem a uma terceira pergunta, que as duas primeiras deixam em aberto: por que aquilo vale o esforço.',
    'É a única das três camadas que explica o caso mais comum e mais mal interpretado nas organizações: alguém com desempenho adequado, competência comprovada e cargo compatível, que mesmo assim está esvaziado. Nesses casos, o que falta raramente é capacidade. É correspondência entre o que a função entrega e o que a pessoa valoriza.',
  ],
  origem: {
    destaque: 'A origem do modelo',
    texto: 'Eduard Spranger, filósofo e psicólogo alemão, publicou em 1914 a obra em que mapeia seis orientações de valor que direcionam as escolhas humanas. Ele descreve cada uma como um tipo ideal, algo que ninguém encarna por inteiro, e propõe que a combinação entre elas explica melhor a motivação do que qualquer valor isolado.',
  },
  tituloFaixas: 'Três faixas de intensidade',
} as const

/**
 * `comoFoiConstruidoMolde` descreve a regra da v2.1 ("deriva do escore do
 * fator, com um ajuste proprio") e diz que o mapa nao acrescenta informacao.
 * Na v2.2 isso e falso: cada competencia e medida por 4 adjetivos. A pagina
 * deve usar `comoFoiConstruidoV22` (rascunho) ate o Valmer aprovar.
 */
export const PAGINA_30 = {
  etapa: '04 · APLICAR',
  sobretitulo: 'Desdobramento',
  titulo: 'Mapa de Competências',
  subtitulo: 'O Mapa de Competências traduz características comportamentais em capacidades observáveis no trabalho.',
  paragrafos: [
    'Ele organiza como a pessoa tende a mobilizar conhecimentos, habilidades e atitudes diante de desafios reais. Por isso não deve ser lido como uma nota definitiva, mas como uma referência para desenvolvimento, alinhamento de função, formação de equipes e definição de prioridades.',
    'Uma competência forte indica um recurso disponível com maior naturalidade. Uma competência moderada pode aparecer de acordo com o contexto e o nível de segurança. Uma competência a desenvolver sinaliza a necessidade de prática, repertório, acompanhamento ou mudança de comportamento. A interpretação correta considera função, experiência, cultura, pressão e objetivos: perfil aponta tendência, competência se consolida por aprendizagem e aplicação.',
    'Para o líder, o mapa apoia delegação, feedback, planos de desenvolvimento e composição de equipes complementares. Para o avaliado, oferece uma visão concreta sobre quais capacidades devem ser potencializadas e quais precisam de atenção para sustentar o próximo nível de performance.',
  ],
  tituloComoFoiConstruido: 'Como este mapa foi construído',
  comoFoiConstruidoMolde: 'Cada competência deriva do escore do fator que a origina, com um ajuste próprio de cada uma. O mapa não acrescenta informação nova ao relatório: ele detalha a informação que já existe, traduzindo os quatro fatores em linguagem de comportamento observável. É por isso que todas as competências de um mesmo fator se deslocam na mesma direção entre o natural e o adaptado.',
  comoFoiConstruidoV22: 'Cada competência é medida por quatro palavras do inventário, nas duas condições, natural e adaptado. Por isso o mapa acrescenta informação: duas pessoas com o mesmo escore em um fator podem ter competências diferentes dentro dele, conforme as palavras que escolheram primeiro. A média das quatro competências de um fator continua igual ao escore do fator, o que mantém o mapa coerente com o restante da leitura.',
  statusV22: 'rascunho',
} as const

export const PAGINA_35 = {
  etapa: '04 · APLICAR',
  sobretitulo: 'Aplicar · a conversa',
  titulo: 'Como se comunicar com cada perfil',
  paragrafos: [
    'Grande parte dos conflitos nos ambientes de trabalho não nasce da falta de competência, mas da falta de uma comunicação capaz de gerar entendimento. Pessoas diferentes escutam, processam e respondem à mesma mensagem de maneiras diferentes.',
    'Quando o líder comunica apenas do jeito que prefere, pode ser claro para si e confuso, excessivo ou insuficiente para o outro. O conteúdo estava correto e o resultado foi ruído.',
    'Mapear o perfil comportamental permite adaptar a forma sem distorcer o conteúdo. O líder passa a escolher melhor o ritmo, o nível de detalhe, o tom e o canal. Em termos práticos, começa a falar uma linguagem que a outra pessoa consegue receber. Essa adaptação aumenta confiança, reduz retrabalho e torna a comunicação mais estratégica.',
    'Adaptar a forma não é bajular nem abrir mão de exigência. É retirar o ruído que impede a mensagem de chegar, para que a conversa seja sobre o assunto e não sobre o modo como ele foi dito.',
  ],
  tituloCusto: 'O custo de não adaptar',
  introCusto: 'Comunicação inadequada produz três efeitos que costumam ser atribuídos a outras causas.',
  custos: [
    { numero: '01', titulo: 'Retrabalho', texto: 'A instrução foi entendida pela metade e ninguém perguntou.' },
    { numero: '02', titulo: 'Desengajamento silencioso', texto: 'A pessoa deixa de trazer ideias porque a forma como elas foram recebidas desestimulou a próxima.' },
    { numero: '03', titulo: 'Conflito interpessoal', texto: 'Uma diferença de estilo passa a ser interpretada como falta de respeito ou de compromisso.' },
  ],
} as const

export const PAGINA_38 = {
  etapa: '04 · APLICAR',
  sobretitulo: 'Aplicar · liderar',
  titulo: 'Como liderar cada perfil',
  paragrafos: [
    'O papel do líder não é exigir que todas as pessoas trabalhem, pensem e respondam da mesma maneira. Seu papel é criar direção, estabelecer padrões e construir as condições para que talentos diferentes produzam resultados consistentes.',
    'Quando compreende os perfis comportamentais, o líder deixa de administrar pessoas por tentativa e erro e passa a conduzi-las com mais consciência.',
    'Esta ferramenta ajuda a reconhecer o que acelera ou reduz a performance de cada liderado, como delegar, acompanhar, corrigir e desenvolver. Ela também evita dois erros comuns: oferecer o mesmo tipo de motivação para todos e interpretar diferenças como falta de compromisso.',
    'Liderar perfis é adaptar a estratégia de gestão sem abrir mão do objetivo, dos critérios ou da responsabilidade.',
  ],
  destaque: ['A exigência permanece a mesma.', 'O caminho até ela muda de pessoa para pessoa.'],
  tituloDelegacao: 'Duas regras de delegação',
  delegacao: [
    { numero: '01', titulo: 'Delegam com mais facilidade', perfis: [{ rotulo: 'INFLUENTE', nota: null }, { rotulo: 'ESTÁVEL', nota: null }] },
    { numero: '02', titulo: 'Tendem a centralizar', perfis: [{ rotulo: 'DOMINANTE', nota: 'Concentra decisões' }, { rotulo: 'CONFORME', nota: 'Concentra tarefas' }] },
  ],
  fechoDelegacao: 'Reconhecer qual dos dois está diante de você muda completamente o tipo de conversa necessária.',
} as const

export const PAGINA_41 = {
  etapa: '05 · CONTINUAR',
  sobretitulo: 'Continuidade',
  titulo: 'O desenvolvimento continua',
  subtitulo: 'Consciência transformada em prática, com um caminho claro para os próximos níveis da sua evolução.',
  paragrafos: [
    'Conhecer a si mesmo é uma decisão, não um acontecimento. Ninguém amanhece mais consciente por acaso, porque consciência exige olhar os próprios padrões com honestidade e aceitar o que se encontra ali. Você tomou essa decisão ao chegar até aqui, e o que vem agora é o que separa quem se conhece de quem se desenvolve.',
    'O perfil comportamental é uma lente precisa para enxergar suas forças e seus pontos de atenção, mas descreve uma parte de você, nunca o conjunto inteiro. Somos também resultado das experiências que vivemos, das crenças que construímos, dos valores que preservamos, das relações que nos formaram e das decisões que tomamos em cada bifurcação do caminho. O Mapa Comportamental entrega um ponto de partida confiável, e ponto de partida só vale para quem dá o passo seguinte.',
    'Quanto mais você compreende seus padrões, mais liberdade conquista para escolher a resposta em vez de reagir no automático. Desenvolver-se é ampliar repertório, fortalecer competências, ressignificar crenças que já não sustentam quem você é hoje e reconhecer, sem frustração, que sempre existe um próximo nível esperando. Este material não encerra um processo, abre uma etapa, e o valor dele não se mede pela leitura, se mede pelo que muda depois dela.',
    'O desenvolvimento real começa quando o que você descobriu aqui muda a maneira como você decide, trabalha, lidera, se relaciona e serve.',
  ],
  fecho: ['A consciência mostra onde você está.', 'O desenvolvimento revela até onde você pode chegar.'],
} as const

/**
 * Pagina institucional. Os "Canais oficiais" do molde (WhatsApp e perfis de
 * Instagram) sao dado do facilitador, nao texto fixo: vem do cadastro
 * (blueprint secao 17, "Dados personalizaveis por facilitador").
 */
export const PAGINA_42 = {
  marca: 'IMPACTO ACADEMY',
  submarca: 'INSTITUTO COMPORTAMENTAL',
  lema: 'PESSOAS • CONHECIMENTO • TRANSFORMAÇÃO • RESULTADOS',
  tituloQuemSomos: 'QUEM SOMOS',
  quemSomos: [
    'A Impacto Academy é um instituto de formação de líderes, mentores e profissionais comprometidos com o desenvolvimento humano e a alta performance. Integramos comportamento, inteligência emocional, estratégia e aplicação prática para transformar conhecimento em liderança consciente, equipes mais fortes e resultados sustentáveis.',
    'Atuamos em programas de liderança, desenvolvimento pessoal, formação de mentores e capacitação de organizações públicas e privadas. Acreditamos que ambientes mais saudáveis e produtivos começam por pessoas preparadas para conduzir a si mesmas e influenciar outras pessoas com excelência, ética e humanidade.',
  ],
  tituloMissao: 'NOSSA MISSÃO',
  missao: 'Desenvolver lideranças conscientes, emocionalmente inteligentes e estrategicamente preparadas para conduzir pessoas e equipes com excelência, ética e humanização, promovendo ambientes organizacionais mais saudáveis e produtivos.',
  tituloVisao: 'NOSSA VISÃO',
  visao: 'Ser reconhecida como um dos maiores ecossistemas de desenvolvimento humano e formação de líderes do Brasil, ampliando nossa atuação até alcançar a América Latina.',
  tituloContinua: 'SEU MAPA NÃO TERMINA NESTA PÁGINA',
  continua: 'Conhecer o seu perfil é o começo. A devolutiva transforma dados em clareza, decisões e um plano de desenvolvimento aplicável à sua realidade.',
  tituloProximoPasso: 'SEU PRÓXIMO PASSO',
  proximosPassos: [
    'Agendar devolutiva individual',
    'Acessar o plano de desenvolvimento',
    'Conhecer a formação em liderança',
    'Reaplicar o inventário',
    'Conversar com um analista',
  ],
  chamada: 'AGENDE SUA DEVOLUTIVA COM UM DE NOSSOS ESPECIALISTAS',
  tituloCanais: 'CANAIS OFICIAIS',
  rodape: 'MAIS LÍDERES PARA UM AMANHÃ MELHOR',
} as const

/** Paginas desta lista, para quem precisa iterar (e para o teste de cobertura). */
export const PAGINAS_TEXTO_FIXO = {
  2: PAGINA_02, 3: PAGINA_03, 4: PAGINA_04, 5: PAGINA_05, 17: PAGINA_17, 23: PAGINA_23,
  30: PAGINA_30, 35: PAGINA_35, 38: PAGINA_38, 41: PAGINA_41, 42: PAGINA_42,
} as const
