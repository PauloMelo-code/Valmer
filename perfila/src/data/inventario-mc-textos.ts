/**
 * Textos que o avaliado le no inventario MC-INV 2.2.
 *
 * As aberturas das quatro etapas sao transcricao exata da secao 15 do
 * blueprint v2.2, na versao "Toque primeiro...", que e a da interface por
 * toque. A secao 4 do AGENTE traz a versao "Coloque em primeiro lugar...",
 * escrita para arrastar; nao e a que vai para a tela.
 *
 * Consentimento LGPD e compromisso de atencao sao a pendencia T5: redigidos
 * aqui, originais, e so vao ao ar depois do juridico (ADR-0007, D11). Enquanto
 * `STATUS_CONSENTIMENTO` disser rascunho, a tela pode exibir o texto, mas quem
 * publica precisa saber que ele nao foi aprovado.
 *
 * O resto (progresso, etapa travada, retomada, conclusao) e texto de
 * interface. Mensagem com numero e funcao, para a tela nunca montar frase
 * concatenando pedaco.
 */
import { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG } from './inventario-mc'

export const STATUS_CONSENTIMENTO = 'rascunho — aprovacao juridica' as const

export type NumeroEtapa = 1 | 2 | 3 | 4

export type Etapa = {
  numero: NumeroEtapa
  titulo: string
  /** Texto da tela de abertura da etapa. */
  abertura: string
  /** Quantas telas a etapa tem, lido do inventario e nao digitado. */
  telas: number
  /** Como a tela da etapa se opera, em uma linha, abaixo das palavras. */
  comoResponder: string
}

export const ETAPAS: Record<NumeroEtapa, Etapa> = {
  1: {
    numero: 1,
    titulo: 'Como você é',
    abertura:
      'Em cada tela você verá quatro palavras. Toque primeiro na que mais combina com você, depois na segunda, e assim por diante. A última é a que menos combina. Pense em como você é de verdade, num dia comum, sem ninguém cobrando nada. Não existe palavra certa nem errada, e as quatro são qualidades. Responda rápido: a primeira impressão costuma ser a mais honesta.',
    telas: GRUPOS_DISC.length,
    comoResponder: 'Toque da que mais combina com você para a que menos combina.',
  },
  2: {
    numero: 2,
    titulo: 'Como a rotina te pede',
    abertura:
      'Agora as mesmas palavras voltam, em outra ordem. Desta vez, ordene pensando em como a sua rotina atual pede que você seja: trabalho, família, responsabilidades. Não como você é, e sim como você sente que precisa ser para dar conta do que esperam de você.',
    telas: GRUPOS_DISC.length,
    comoResponder: 'Toque da que a sua rotina mais pede para a que menos pede.',
  },
  3: {
    numero: 3,
    titulo: 'Como você pensa e decide',
    abertura:
      'Em cada tela há duas palavras opostas. Marque para qual lado você pende naturalmente e com que força. Não há meio-termo de propósito: mesmo que as duas pareçam suas, uma costuma vir primeiro.',
    telas: PARES_JUNG.length,
    comoResponder: 'Escolha o lado para o qual você pende e com que força.',
  },
  4: {
    numero: 4,
    titulo: 'O que te move',
    abertura:
      'Em cada tela há seis palavras. Toque primeiro na que mais importa para você e siga até a que menos importa. Pense no que de fato orienta as suas decisões, não no que seria bonito responder.',
    telas: GRUPOS_VALORES.length,
    comoResponder: 'Toque da que mais importa para você para a que menos importa.',
  },
}

/**
 * Os quatro botoes de um par de Jung, na ordem em que aparecem da esquerda
 * para a direita: `Muito [esq]`, `Mais [esq]`, `Mais [dir]`, `Muito [dir]`.
 * Recebe as palavras ja no lado sorteado — quem converte a resposta para o
 * polo A e o backend, nao o rotulo. A palavra vai em minuscula porque vem
 * depois de "Muito"/"Mais" ("Muito pé no chão", nao "Muito Pé no chão").
 */
export function rotulosJung(esquerda: string, direita: string): [string, string, string, string] {
  const e = minusculaInicial(esquerda)
  const d = minusculaInicial(direita)
  return [`Muito ${e}`, `Mais ${e}`, `Mais ${d}`, `Muito ${d}`]
}

function minusculaInicial(palavra: string): string {
  return palavra.charAt(0).toLocaleLowerCase('pt-BR') + palavra.slice(1)
}

export const TEXTOS_TELA = {
  avancar: 'Avançar',
  avancarBloqueado: 'Ordene todas as palavras para avançar.',
  desfazer: 'Toque de novo numa palavra para desfazer a partir dela.',
  definicao: 'O que significa',
  salvando: 'Salvando…',
  salvo: 'Resposta salva.',
  erroAoSalvar:
    'Não conseguimos salvar esta tela. Verifique a sua conexão e toque em Avançar de novo. Nada do que você já respondeu se perdeu.',
} as const

/** "Etapa 2 de 4 · tela 5 de 16". `tela` conta a partir de 1. */
export function textoProgresso(etapa: NumeroEtapa, tela: number): string {
  return `Etapa ${etapa} de 4 · tela ${tela} de ${ETAPAS[etapa].telas}`
}

/**
 * Por que a etapa 1 nao abre mais (secao 3 do AGENTE): a pessoa se descreve
 * antes de descrever o que o ambiente pede, e nao volta para ajustar o natural
 * depois de rever as palavras. O texto explica sem soar como castigo.
 */
export const ETAPA_TRAVADA = {
  titulo: 'Esta etapa já foi concluída',
  texto:
    'Suas respostas sobre como você é já estão guardadas e não podem mais ser alteradas. Isso é de propósito: a primeira descrição, feita antes de você ver as palavras de novo, é a mais fiel.',
  voltar: 'Continuar de onde parei',
} as const

/** Quem fechou o link e voltou pelo mesmo endereco. */
export function textoRetomada(etapa: NumeroEtapa, tela: number): { titulo: string; texto: string; botao: string } {
  return {
    titulo: 'Que bom que você voltou',
    texto: `Tudo o que você respondeu até aqui está salvo. Você continua na etapa ${etapa}, ${ETAPAS[etapa].titulo.toLocaleLowerCase('pt-BR')}, a partir da tela ${tela} de ${ETAPAS[etapa].telas}.`,
    botao: 'Continuar',
  }
}

/** Entre uma etapa e a seguinte, antes da abertura da proxima. */
export function textoFimDeEtapa(etapa: Exclude<NumeroEtapa, 4>): { titulo: string; texto: string; botao: string } {
  const faltam = 4 - etapa
  return {
    titulo: `Etapa ${etapa} concluída`,
    texto: `${faltam === 1 ? 'Falta 1 etapa' : `Faltam ${faltam} etapas`}. Se precisar parar, pode fechar: suas respostas estão salvas e você volta pelo mesmo link.`,
    botao: 'Ir para a próxima etapa',
  }
}

export const CONCLUSAO = {
  titulo: 'Pronto, você terminou',
  texto:
    'Obrigado pelo seu tempo e pela sinceridade. Suas respostas foram registradas e o seu Mapa Comportamental já está sendo preparado. Quem enviou o convite vai combinar com você a entrega e a conversa de devolutiva.',
} as const

/**
 * Prazo de guarda dos dados citado no consentimento. PENDENTE juridico: o
 * numero e proposta, nao decisao. Fica em constante para a aprovacao ser a
 * troca de uma linha.
 */
export const PRAZO_GUARDA_DADOS = 'cinco anos depois da conclusão do questionário'

export type SecaoTermo = { titulo: string; texto: string }

/**
 * Consentimento LGPD, coletado antes da primeira tela (R6 do AGENTE). Escrito
 * para o avaliado, nao para advogado: cada secao responde uma pergunta que a
 * pessoa faria. "Dado sensivel" aparece por dois motivos — o blueprint trata o
 * perfil comportamental assim (P02) e a etapa 4 tem palavras como "Fé" e
 * "Crenças", que podem revelar conviccao religiosa, dado sensivel pela letra
 * do art. 5o, II.
 */
export const CONSENTIMENTO: { titulo: string; secoes: SecaoTermo[]; aceite: string; recusa: string } = {
  titulo: 'Antes de começar: como usamos as suas respostas',
  secoes: [
    {
      titulo: 'O que coletamos',
      texto:
        'Seu nome, seu e-mail, a empresa e, se você informar, o cargo. Durante o questionário, a ordem em que você coloca cada palavra, o lado que escolhe em cada par e o horário em que entra e sai de cada tela.',
    },
    {
      titulo: 'Para que usamos',
      texto:
        'Para calcular o seu Mapa Comportamental e montar o relatório: seu perfil natural e adaptado, seu jeito de pensar e decidir e o que te move. Os horários servem só para conferir se a aplicação foi feita com atenção. Suas respostas não são usadas para propaganda nem vendidas a ninguém.',
    },
    {
      titulo: 'Um cuidado a mais',
      texto:
        'O perfil comportamental diz muito sobre você, e algumas palavras do questionário, como fé e crenças, podem revelar convicções pessoais. Por isso tratamos tudo com o cuidado que a Lei Geral de Proteção de Dados exige para dados sensíveis, e só com o seu consentimento.',
    },
    {
      titulo: 'Quem vê',
      texto:
        'Você e o analista que enviou o seu convite. Se o convite veio pela sua empresa, também as pessoas que ela autorizou a acompanhar o processo. Para redigir parte do texto do relatório, seu nome e seus resultados são enviados a um serviço de inteligência artificial contratado, apenas para essa finalidade.',
    },
    {
      titulo: 'Por quanto tempo',
      texto: `Guardamos suas respostas e seu relatório por até ${PRAZO_GUARDA_DADOS}. Depois disso, são apagados ou ficam sem nenhuma ligação com você.`,
    },
    {
      titulo: 'Seus direitos',
      texto:
        'Você pode, quando quiser, pedir para ver, corrigir ou apagar seus dados, e pode retirar este consentimento. Retirar o consentimento não desfaz o que já foi feito com ele até ali, mas interrompe qualquer uso a partir do pedido. Basta falar com o analista que enviou o convite.',
    },
  ],
  aceite: 'Li e concordo com o uso das minhas respostas como descrito acima.',
  recusa: 'Agora não',
}

/**
 * Compromisso de atencao, logo depois do consentimento. Nao e juramento: e
 * um combinado sobre as condicoes da resposta, que sao o que os indicadores de
 * validade (V1 a V6) conferem depois. Quem nao topa nao e barrado — o
 * facilitador ve a confiabilidade da aplicacao, nao um bloqueio.
 */
export const COMPROMISSO_ATENCAO = {
  titulo: 'Um combinado antes de começar',
  itens: [
    'Vou responder sozinho(a), sem ajuda de outra pessoa.',
    'Vou responder pensando em mim de verdade, e não em como eu gostaria de parecer.',
    'Vou reservar de 16 a 20 minutos, num lugar em que eu consiga me concentrar.',
    'Se precisar parar, sei que minhas respostas ficam salvas e posso voltar pelo mesmo link.',
  ],
  aceite: 'Combinado, quero começar',
} as const
