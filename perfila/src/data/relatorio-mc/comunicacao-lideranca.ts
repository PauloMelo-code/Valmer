/**
 * Comunicacao e lideranca de cada perfil — paginas 36, 37, 39 e 40 do molde.
 *
 * Tabelas estaticas, iguais para qualquer avaliado (marcacao APLICACAO
 * PRATICA). Tudo transcrito. Os textos de abertura das paginas 35 e 38 estao
 * em `textos-fixos.ts`.
 *
 * Duas coisas do molde ficam de fora de proposito:
 *   - os quadros "Onde voce acerta e onde escorrega" (36) e "Onde esta o seu
 *     maior ganho" (37) comparam os perfis com o do avaliado; sao derivados
 *     do escore e vem da montagem da pagina, nao daqui;
 *   - a "Decisao" de S e C: na pagina 37 o molde diz "ponderada" e nas 11,
 *     12 e 40 diz "demorada". Cada tabela guarda a palavra da sua pagina.
 */
import type { Fator } from '../inventario-mc'

type Base = {
  foco: string
  comunicacao: string
  decisao: string
  perguntaCentral: string
}

export type ComunicacaoPerfil = Base & {
  preferencia: string
  comoConduzir: string
  /** Frase entre aspas curvas, como no molde. */
  abertura: string
  aplicacao: string
  evite: string
  feedback: string
  comoConfirmar: string
}

export type LiderancaPerfil = Base & {
  descricao: string
  comoLiderar: string
  aplicacao: string
  eviteEDesenvolva: string
  atritoPrevisivel: string
}

export const COMUNICACAO_POR_PERFIL: Record<Fator, ComunicacaoPerfil> = {
  D: {
    preferencia: 'Prefere objetividade, autonomia, desafio e foco no resultado.',
    foco: 'Resultado', comunicacao: 'Direta e objetiva', decisao: 'Racional e rápida', perguntaCentral: 'O quê?',
    comoConduzir: 'Vá direto ao ponto. Apresente primeiro o objetivo, os limites e o resultado esperado. Depois, ofereça apenas o contexto necessário.',
    abertura: '“Precisamos decidir X até Y. Temos duas alternativas e estes são os impactos.”',
    aplicacao: 'Comece pela decisão necessária, ofereça alternativas claras e combine prazo, responsabilidade e margem de autonomia na mesma conversa.',
    evite: 'Rodeios, excesso de detalhes, repetição, microgestão e mensagens que terminam sem conclusão.',
    feedback: 'Seja direto, específico e ligado ao impacto. Preserve a autonomia, mas deixe clara a responsabilidade pela decisão.',
    comoConfirmar: 'Registre decisão, responsável, prazo e limite de autoridade.',
  },
  I: {
    preferencia: 'Prefere interação, reconhecimento, entusiasmo e possibilidade de expressão.',
    foco: 'Pessoas', comunicacao: 'Informal e pessoal', decisao: 'Emocional e rápida', perguntaCentral: 'Quem?',
    comoConduzir: 'Crie conexão antes do assunto, mostre o impacto sobre as pessoas e permita participação real na construção da solução.',
    abertura: '“Sua participação pode mobilizar o grupo. Vamos definir juntos a melhor forma de avançar?”',
    aplicacao: 'Use exemplos e linguagem viva, marque checkpoints curtos e registre os combinados por escrito depois da conversa.',
    evite: 'Frieza, isolamento, tecnicidade excessiva, crítica diante do grupo e ausência de retorno.',
    feedback: 'Preserve a imagem, reconheça a contribuição e aponte o comportamento específico que precisa mudar.',
    comoConfirmar: 'Registre combinado, próximo passo, responsável e data de retorno.',
  },
  S: {
    preferencia: 'Prefere segurança, previsibilidade, colaboração e tempo para adaptação.',
    foco: 'Método', comunicacao: 'Suave e empática', decisao: 'Emocional e ponderada', perguntaCentral: 'Como?',
    comoConduzir: 'Explique o contexto, apresente o passo a passo e mostre como a mudança afetará a rotina, as relações e o que continuará igual.',
    abertura: '“Quero explicar o que muda, o que permanece e como faremos esta transição com segurança.”',
    aplicacao: 'Avise mudanças com antecedência, escute as preocupações até o fim e estabeleça transições com marcos claros e apoio definido.',
    evite: 'Pressão pública, mudanças bruscas, confronto agressivo, urgência artificial e ambiguidade sobre o que permanece igual.',
    feedback: 'Converse de forma reservada, gradual e específica. Reconheça a consistência e apresente o ajuste como um caminho acompanhado, não como abandono.',
    comoConfirmar: 'Registre sequência, responsáveis, apoio disponível, prazo e o que não será alterado.',
  },
  C: {
    preferencia: 'Prefere precisão, critérios, lógica, qualidade e redução de riscos.',
    foco: 'Critério', comunicacao: 'Formal e específica', decisao: 'Racional e ponderada', perguntaCentral: 'Por quê?',
    comoConduzir: 'Apresente fatos, padrões, método, prazos e critérios de decisão. Evidência e coerência valem mais do que confiança pedida.',
    abertura: '“Estes são os dados, os critérios e os riscos considerados. Analise e retorne até esta data.”',
    aplicacao: 'Envie informações organizadas com antecedência, dê tempo real para análise e responda às perguntas com consistência.',
    evite: 'Improviso sem base, generalizações, pressão por resposta imediata, dados incompletos e regras que mudam sem explicação.',
    feedback: 'Apresente o fato específico, o padrão esperado e um caminho verificável de correção. Defina com precisão o que significa estar correto.',
    comoConfirmar: 'Registre critério, evidência necessária, padrão de qualidade, responsável e prazo de análise.',
  },
}

/**
 * "O atrito previsivel" fala com o LIDER leitor ("quando voce corta a
 * conversa"). O molde foi escrito para um lider DI; o texto de D e I pode
 * soar deslocado para um lider S ou C. Mantido como esta ate o Valmer dizer.
 */
export const LIDERANCA_POR_PERFIL: Record<Fator, LiderancaPerfil> = {
  D: {
    descricao: 'Tende a responder bem a desafios, autonomia, metas ambiciosas e decisões rápidas. Precisa perceber progresso e espaço para agir.',
    foco: 'Resultado', comunicacao: 'Direta e objetiva', decisao: 'Racional e rápida', perguntaCentral: 'O quê?',
    comoLiderar: 'Defina resultados claros, dê margem de decisão e use conversas objetivas. Apresente o desafio antes do processo.',
    aplicacao: 'Delegue projetos com meta, prazo, limite de autoridade e indicador de sucesso. Faça acompanhamentos curtos, centrados em obstáculos e resultados.',
    eviteEDesenvolva: 'Evite microgerenciamento, lentidão e feedback indireto. Desenvolva escuta, paciência, análise de impacto e colaboração.',
    atritoPrevisivel: 'A disputa aparece quando o limite de autoridade não está claro. Ela desaparece quando o território é dividido por escrito uma única vez.',
  },
  I: {
    descricao: 'Tende a se engajar por reconhecimento, interação, visibilidade e entusiasmo. Precisa sentir conexão com as pessoas e com o significado da entrega.',
    foco: 'Pessoas', comunicacao: 'Informal e pessoal', decisao: 'Emocional e rápida', perguntaCentral: 'Quem?',
    comoLiderar: 'Mostre o impacto do trabalho, reconheça avanços e permita que apresente ideias. Combine energia com estrutura.',
    aplicacao: 'Divida projetos longos em marcos, registre acordos, estabeleça prioridades e use reuniões rápidas de acompanhamento.',
    eviteEDesenvolva: 'Evite isolamento prolongado, comunicação fria e tarefas sem significado percebido. Desenvolva organização, constância, escuta e conclusão.',
    atritoPrevisivel: 'O atrito aparece quando você corta a conversa que, para ele, constrói o vínculo. Dez minutos sem pauta antes do assunto resolvem boa parte disso.',
  },
  S: {
    descricao: 'Tende a produzir melhor em ambientes previsíveis, colaborativos e respeitosos. Valoriza confiança, continuidade e relações consistentes.',
    foco: 'Método', comunicacao: 'Suave e empática', decisao: 'Emocional e demorada', perguntaCentral: 'Como?',
    comoLiderar: 'Explique mudanças, dê tempo razoável para adaptação e reconheça a contribuição silenciosa. Seja firme sem ser abrupto.',
    aplicacao: 'Delegue com sequência, contexto, apoio disponível e critérios estáveis. Convide-o a expressar discordâncias antes que o incômodo se acumule.',
    eviteEDesenvolva: 'Evite mudanças bruscas, exposição pública e pressão agressiva. Desenvolva posicionamento, agilidade e abertura à mudança.',
    atritoPrevisivel: 'O atrito aparece quando a mudança chega sem tempo, contexto ou apoio. Ele diminui quando você esclarece o que muda, o que permanece e como acontecerá a transição.',
  },
  C: {
    descricao: 'Tende a responder bem a critérios claros, lógica, qualidade, precisão e preparação. Precisa compreender por que a decisão é segura e coerente.',
    foco: 'Critério', comunicacao: 'Formal e específica', decisao: 'Racional e demorada', perguntaCentral: 'Por quê?',
    comoLiderar: 'Forneça dados, padrões, escopo e parâmetros de qualidade. Respeite a necessidade de análise e combine prazo para decidir.',
    aplicacao: 'Delegue problemas complexos, revisão, planejamento e melhoria de processos. Defina o nível de precisão realmente necessário.',
    eviteEDesenvolva: 'Evite instruções vagas, regras instáveis e urgência artificial. Desenvolva velocidade, tolerância ao erro controlado e visão do todo.',
    atritoPrevisivel: 'O atrito aparece quando os critérios são vagos ou mudam durante a execução. Ele diminui quando parâmetros, evidências, prazo e padrão de qualidade ficam registrados.',
  },
}

/** Cabecalhos e rotulos das paginas 36-37 e 39-40. */
export const PAGINAS_COMUNICACAO_LIDERANCA = {
  36: {
    sobretitulo: 'Aplicar · a conversa', titulo: 'Comunicar com Dominante e Influente', fatores: ['D', 'I'],
    subtitulo: 'Dois perfis rápidos. Duas linguagens diferentes. Um mesmo risco: combinar sem registrar.',
  },
  37: {
    sobretitulo: 'Aplicar · a conversa', titulo: 'Comunicar com Estável e Conforme', fatores: ['S', 'C'],
    subtitulo: 'Dois perfis reflexivos. Duas formas de construir segurança. Um mesmo cuidado: não apressar a resposta.',
  },
  39: {
    sobretitulo: 'Aplicar · a relação vertical', titulo: 'Liderando o Dominante e o Influente', fatores: ['D', 'I'],
    subtitulo: 'Como liderar, aplicar e desenvolver cada perfil.',
  },
  40: {
    sobretitulo: 'Aplicar · a relação vertical', titulo: 'Liderando o Estável e o Conforme', fatores: ['S', 'C'],
    subtitulo: 'Como liderar, aplicar e desenvolver cada perfil.',
  },
} as const

export const ROTULOS_COMUNICACAO_LIDERANCA = {
  foco: 'Foco',
  comunicacao: 'Comunicação',
  decisao: 'Decisão',
  perguntaCentral: 'Pergunta central',
  comoConduzir: 'Como conduzir',
  abertura: 'Abertura ideal',
  aplicacao: 'Aplicação prática',
  evite: 'Evite',
  feedback: 'Feedback',
  comoConfirmar: 'Como confirmar',
  comoLiderar: 'Como liderar',
  eviteEDesenvolva: 'Evite e desenvolva',
  atritoPrevisivel: 'O atrito previsível',
} as const
