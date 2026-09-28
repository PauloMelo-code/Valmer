/**
 * Variantes das paginas 36, 37, 39, 40 e 42 que o molde nao tem (C31, C33).
 *
 * O molde foi escrito para um avaliado DI: a nota da 36 diz que D e I sao "os
 * dois perfis mais proximos do seu modo natural", a da 37 diz que S e C sao os
 * mais distantes, e os quatro atritos das 39-40 falam com um lider D. Para
 * qualquer outro perfil essas frases sao falsas. Aqui fica o texto de cada
 * caso, escolhido pela ordem natural (e, numa clausula, pela adaptada). O que
 * saiu do molde fica `transcrito`; o que foi redigido para cobrir os outros
 * casos fica `rascunho` ate o Valmer aprovar.
 */
import type { Fator } from '../../inventario-mc'
import { LIDERANCA_POR_PERFIL } from '../comunicacao-lideranca'
import type { Status } from '../status'

export type TextoVariante = { texto: string; status: Status }
export type NotaConversa = { titulo: string; texto: string; status: Status }

/** Os dois fatores de cada pagina de conversa, na ordem em que aparecem. */
export type PaginaConversa = 36 | 37

/**
 * Onde os dois fatores da pagina caem na ordem natural: os dois entre os dois
 * mais altos, os dois entre os dois mais baixos, ou um de cada lado.
 */
export type Proximidade = 'perto' | 'longe' | 'misto'

export function proximidade(ordemNatural: readonly Fator[], par: readonly [Fator, Fator]): Proximidade {
  const topo = ordemNatural.slice(0, 2)
  const noTopo = par.filter((f) => topo.includes(f)).length
  return noTopo === 2 ? 'perto' : noTopo === 0 ? 'longe' : 'misto'
}

const TITULO_PERTO = 'Onde você acerta e onde escorrega'
const TITULO_LONGE = 'Onde está o seu maior ganho'
const TITULO_MISTO = 'Onde você acerta e onde está o seu maior ganho'

/** "Estável", como o molde escreve dentro da frase ("O Estável precisa..."). */
const nomeNaFrase = (f: Fator) => ({ D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Conforme' })[f]

/** O que os dois perfis da pagina tem em comum, para fechar a variante mista. */
const RISCO_COMUM: Record<PaginaConversa, string> = {
  36: 'O cuidado vale para os dois: perfis rápidos combinam de boca, e a divergência aparece depois, na execução. Registre o que foi decidido.',
  37: 'O cuidado vale para os dois: perfis reflexivos precisam de tempo para construir segurança. Não apresse a resposta.',
}

// Fecho da nota "longe" da 37 no molde; serve igual para a 36.
const FECHO_LONGE = 'Cada adaptação feita aqui rende mais do que qualquer refinamento nas conversas que já funcionam bem.'

/**
 * A nota do pe das paginas 36 e 37.
 *
 * A clausula "e, ao mesmo tempo, os que o seu ambiente atual mais exige" do
 * molde e verdade so quando os dois fatores da pagina sao os dois mais altos
 * do ADAPTADO; fora disso ela sai, e o resto da frase continua valendo.
 */
export function notaDaConversa(
  pagina: PaginaConversa,
  par: readonly [Fator, Fator],
  ordemNatural: readonly Fator[],
  ordemAdaptado: readonly Fator[],
): NotaConversa {
  const caso = proximidade(ordemNatural, par)
  const exigidos = proximidade(ordemAdaptado, par) === 'perto'
  const [a, b] = par

  if (caso === 'misto') {
    const [perto, longe] = ordemNatural.slice(0, 2).includes(a) ? [a, b] : [b, a]
    return {
      titulo: TITULO_MISTO,
      texto:
        `O ${nomeNaFrase(perto)} está perto do seu modo natural, e com ele a conversa tende a fluir. ` +
        `O ${nomeNaFrase(longe)} está entre os dois perfis mais distantes: é na conversa com ele que a sua adaptação rende mais. ` +
        RISCO_COMUM[pagina],
      status: 'rascunho',
    }
  }

  if (pagina === 36 && caso === 'perto') {
    return {
      titulo: TITULO_PERTO,
      texto:
        'Estes são os dois perfis mais próximos do seu modo natural, e por isso a conversa tende a fluir. O ponto de atenção é a rastreabilidade: dois perfis rápidos combinando verbalmente produzem acordos que ninguém escreveu. A divergência aparece depois, na execução.',
      status: 'transcrito',
    }
  }

  if (pagina === 37 && caso === 'longe') {
    return {
      titulo: TITULO_LONGE,
      texto:
        `Estes são os dois perfis mais distantes do seu modo natural${exigidos ? ' e, ao mesmo tempo, os que o seu ambiente atual mais exige' : ''}. ` +
        `O Estável precisa de segurança relacional e continuidade. O Conforme precisa de segurança lógica e critérios. ${FECHO_LONGE}`,
      // Sem a clausula do ambiente o texto ainda e do molde, so encurtado.
      status: 'transcrito',
    }
  }

  if (pagina === 36) {
    return {
      titulo: TITULO_LONGE,
      texto:
        `Estes são os dois perfis mais distantes do seu modo natural${exigidos ? ' e, ao mesmo tempo, os que o seu ambiente atual mais exige' : ''}. ` +
        `O Dominante precisa de objetividade e de espaço para decidir. O Influente precisa de conexão e de reconhecimento. Os dois andam mais rápido do que você: chegue com a conclusão pronta e registre o combinado. ${FECHO_LONGE}`,
      status: 'rascunho',
    }
  }

  return {
    titulo: TITULO_PERTO,
    texto:
      'Estes são os dois perfis mais próximos do seu modo natural, e por isso a conversa tende a fluir. O ponto de atenção é o ritmo: dois perfis reflexivos juntos podem adiar a decisão enquanto esperam mais segurança. Combine uma data para decidir, e não só para analisar.',
    status: 'rascunho',
  }
}

/**
 * "O atrito previsivel" das paginas 39-40: o fator mais alto do avaliado (o
 * lider que le) x o fator do liderado. A linha D e a do molde; as outras tres
 * foram redigidas no mesmo formato ("O atrito aparece quando... Ele diminui
 * quando...").
 */
export const ATRITO_PREVISIVEL: Record<Fator, Record<Fator, TextoVariante>> = {
  D: {
    D: { texto: LIDERANCA_POR_PERFIL.D.atritoPrevisivel, status: 'transcrito' },
    I: { texto: LIDERANCA_POR_PERFIL.I.atritoPrevisivel, status: 'transcrito' },
    S: { texto: LIDERANCA_POR_PERFIL.S.atritoPrevisivel, status: 'transcrito' },
    C: { texto: LIDERANCA_POR_PERFIL.C.atritoPrevisivel, status: 'transcrito' },
  },
  I: {
    D: { texto: 'O atrito aparece quando o entusiasmo ocupa o lugar da decisão. Ele diminui quando cada conversa termina com o que foi decidido, quem responde e até quando.', status: 'rascunho' },
    I: { texto: 'Os dois gostam de conversar, e a conversa pode virar o próprio trabalho. O atrito aparece na entrega; ele diminui quando o combinado sai da reunião por escrito.', status: 'rascunho' },
    S: { texto: 'O atrito aparece quando a sua energia chega como pressão para mudar depressa. Ele diminui quando você apresenta a mudança com sequência, tempo e o que continua igual.', status: 'rascunho' },
    C: { texto: 'O atrito aparece quando o argumento é o entusiasmo, e não o dado. Ele diminui quando você leva evidência, critério e prazo antes de pedir adesão.', status: 'rascunho' },
  },
  S: {
    D: { texto: 'O atrito aparece quando a sua cautela soa como falta de direção. Ele diminui quando você define o resultado e o limite de autoridade e deixa o caminho com ele.', status: 'rascunho' },
    I: { texto: 'O atrito aparece quando a rotina sufoca a necessidade de variedade e de visibilidade. Ele diminui quando há espaço para ideias dentro de marcos claros de entrega.', status: 'rascunho' },
    S: { texto: 'Os dois preservam o clima e podem adiar a conversa difícil. O atrito chega tarde e acumulado; ele diminui quando o incômodo é dito cedo, em conversa reservada e com data.', status: 'rascunho' },
    C: { texto: 'O atrito aparece quando o acordo é feito pela relação, e não pelo critério. Ele diminui quando o padrão de qualidade e as regras ficam escritos desde o início.', status: 'rascunho' },
  },
  C: {
    D: { texto: 'O atrito aparece quando a análise atrasa a decisão que ele quer tomar. Ele diminui quando você combina antes o prazo da análise e o critério mínimo para avançar.', status: 'rascunho' },
    I: { texto: 'O atrito aparece quando o retorno chega só como correção técnica, sem reconhecimento. Ele diminui quando você aponta o que funcionou antes do que precisa mudar.', status: 'rascunho' },
    S: { texto: 'O atrito aparece quando a exigência de precisão soa como desconfiança. Ele diminui quando o padrão vem acompanhado de apoio e de tempo para aprender.', status: 'rascunho' },
    C: { texto: 'Os dois buscam o critério certo e podem discutir o método sem fim. O atrito diminui quando o nível de precisão necessário é combinado antes de começar.', status: 'rascunho' },
  },
}

/**
 * Pagina 41 (D5, C32): o molde tem quatro paragrafos fixos; o blueprint pede a
 * `mensagem_final` da IA e a D5 poe ali as cinco leituras. Rotulo da lista,
 * redigido.
 */
export const TITULO_LEITURAS: TextoVariante = { texto: 'Cinco leituras para o próximo passo', status: 'rascunho' }

/**
 * Canais da pagina 42 (C33). O blueprint diz que sao personalizaveis por
 * facilitador, mas ainda nao existe campo para isso no cadastro: ficam os do
 * molde, da Impacto Academy, ate a frente do banco criar o campo. Trocar por
 * dado do facilitador e trocar esta constante por um parametro.
 */
export const CANAIS_OFICIAIS = {
  whatsapp: '(44) 99159-5998',
  instagram: ['@valmeralbuquerque', '@bartiriasilva', '@editorasignature', '@impactoacademyoficial'],
  status: 'a confirmar' as Status,
}
