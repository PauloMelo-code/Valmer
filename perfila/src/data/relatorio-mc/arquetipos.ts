/**
 * Arquetipos do perfil composto — blueprint secao 10.
 *
 * O motor devolve a sigla ("DI", "D" ou "EQUILIBRADO": fatores com escore
 * >= 51, em ordem, os dois primeiros) e esta tabela devolve o cartao. Texto
 * estatico, nunca da IA. Vai na pagina 07, e nao na 23 que a secao 10 cita
 * (ADR-0007, D5).
 *
 * A sigla e ORDENADA: "DI" (O Protagonista) e "ID" (O Inspirador de
 * Resultados) sao cartoes diferentes, porque o fator que vem primeiro manda
 * no tom.
 *
 * Os 12 compostos sao transcritos. A secao 10 manda "exibir o perfil puro"
 * quando so um fator passa de 50, mas nao traz o texto, e o caso EQUILIBRADO
 * (nenhum acima de 50) nem e citado: esses cinco foram redigidos aqui,
 * originais, e esperam o Valmer.
 */
import type { Status } from './status'

export const SIGLAS_COMPOSTAS = ['DI', 'DC', 'DS', 'ID', 'IS', 'IC', 'SI', 'SD', 'SC', 'CD', 'CS', 'CI'] as const
export const SIGLAS_PURAS = ['D', 'I', 'S', 'C'] as const
export const EQUILIBRADO = 'EQUILIBRADO'

export type SiglaPerfil =
  | (typeof SIGLAS_COMPOSTAS)[number]
  | (typeof SIGLAS_PURAS)[number]
  | typeof EQUILIBRADO

/** Rotulo que antecede `pontoDeAtencao` no cartao, como na secao 10. */
export const ROTULO_PONTO_DE_ATENCAO = 'Ponto de atenção:'

export type Arquetipo = {
  sigla: SiglaPerfil
  nome: string
  descricao: string
  /** Comeca em minuscula porque vem depois de `ROTULO_PONTO_DE_ATENCAO`. */
  pontoDeAtencao: string
  status: Status
}

function a(sigla: SiglaPerfil, nome: string, descricao: string, pontoDeAtencao: string, status: Status = 'transcrito'): Arquetipo {
  return { sigla, nome, descricao, pontoDeAtencao, status }
}

export const ARQUETIPOS: Record<SiglaPerfil, Arquetipo> = {
  DI: a('DI', 'O Protagonista',
    'Une resultado e influência. Age rápido e arrasta pessoas junto. Entra em qualquer sala sabendo que vai sair com o que precisa.',
    'velocidade que atropela o processo de construção coletiva.'),
  DC: a('DC', 'O Estrategista',
    'Une resultado e precisão. Quer vencer, mas quer vencer com inteligência. Estuda antes de atacar — e ataca com método.',
    'exigência de si mesmo e dos outros pode criar ambiente de alta pressão crônica.'),
  DS: a('DS', 'O Guardião Executor',
    'Une resultado e consistência. Entrega o que promete sem precisar de barulho. Confiança construída por ação repetida.',
    'tensão interna entre urgência do D e paciência do S — pode gerar oscilação de ritmo.'),
  ID: a('ID', 'O Inspirador de Resultados',
    'Une influência e resultado. Convence com entusiasmo mas cobra entrega. Cria times que querem ir junto e cobram o destino.',
    'pode prometer mais do que o sistema consegue entregar para todos.'),
  IS: a('IS', 'O Catalisador Social',
    'Une influência e conexão humana genuína. Não só encanta — cuida. Cria ambientes onde as pessoas querem ficar e performar.',
    'dificuldade de entregar feedback duro por medo de romper o vínculo.'),
  IC: a('IC', 'O Comunicador Preciso',
    'Une influência e precisão. Consegue encantar e embasar ao mesmo tempo. Vende bem e entrega com qualidade.',
    'pode travar entre o impulso criativo e a necessidade de validação técnica.'),
  SI: a('SI', 'O Servidor Empático',
    'Une cuidado com pessoas e expressão. Serve com presença. Faz o ambiente respirar sem precisar ser o centro.',
    'pode se silenciar em conflito justamente quando o grupo mais precisa que ele fale.'),
  SD: a('SD', 'O Construtor Paciente',
    'Une consistência e resultado. Não é o mais rápido, mas é o que chegou. Constrói com solidez o que outros constroem com pressa.',
    'resistência a mudar de rota mesmo quando os sinais já mostram que é necessário.'),
  SC: a('SC', 'O Analítico Confiável',
    'Une consistência e precisão. Faz do jeito certo, no ritmo certo. Referência técnica que o grupo procura quando a situação exige qualidade.',
    'pode ser percebido como lento por quem precisa de agilidade e resultado imediato.'),
  CD: a('CD', 'O Arquiteto Decisivo',
    'Une precisão e resultado. Planeja com profundidade e age com firmeza. Não toma decisão que não sustenta — mas quando toma, vai até o fim.',
    'pode se tornar inflexível após decidir — dificuldade de rever posição mesmo com dados novos.'),
  CS: a('CS', 'O Guardião da Qualidade',
    'Une precisão e constância. Entrega com excelência repetidamente. O mais difícil de substituir porque o padrão está incorporado, não executado.',
    'dificuldade de aceitar entregas que "estão boas o suficiente" — perfeccionismo como freio.'),
  CI: a('CI', 'O Analista Persuasivo',
    'Une precisão e comunicação. Convence com dados e apresenta com clareza. Faz o técnico ser compreendido por qualquer audiência.',
    'pode ser percebido como excessivamente crítico ao tentar elevar o padrão do grupo.'),

  // Redigidos aqui (rascunho): a secao 10 nao traz perfil puro nem equilibrado.
  D: a('D', 'O Desbravador',
    'Resultado em estado puro. Enxerga o objetivo antes do caminho e prefere abrir a trilha a esperar que alguém a desenhe. Onde há obstáculo, há motivo para avançar.',
    'sozinho no comando, decide por todos e escuta tarde demais quem pensava diferente.', 'rascunho'),
  I: a('I', 'O Mobilizador',
    'Pessoas em estado puro. Transforma conversa em adesão e ideia em movimento coletivo. Por onde passa, o grupo fica mais disposto do que estava.',
    'o entusiasmo do começo nem sempre chega ao fim do projeto — falta quem registre e acompanhe.', 'rascunho'),
  S: a('S', 'O Pilar',
    'Constância em estado puro. Sustenta o ritmo quando todos aceleram e mantém o grupo inteiro quando a pressão aumenta. É a presença que ninguém nota até faltar.',
    'aceita em silêncio o que deveria discutir, e o incômodo guardado aparece tarde e de uma vez.', 'rascunho'),
  C: a('C', 'O Criterioso',
    'Precisão em estado puro. Só dá o passo quando entende o terreno. Vê o erro antes de ele acontecer e sustenta o padrão mesmo quando ninguém está olhando.',
    'esperar o dado completo pode custar o momento certo — e a crítica soa como desconfiança.', 'rascunho'),
  EQUILIBRADO: a('EQUILIBRADO', 'O Versátil',
    'Nenhum fator passa de 50: o repertório está distribuído. Transita entre resultado, pessoas, ritmo e critério conforme a situação pede, sem um modo que se imponha aos outros.',
    'sem um fator que puxe, a escolha do modo pode demorar, e quem convive lê a flexibilidade como falta de posição.', 'rascunho'),
}
