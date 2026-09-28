/**
 * Textos das paginas 29 a 35 que o molde nao tem para qualquer avaliado.
 *
 * O molde traz esses blocos escritos para a pessoa do relatorio de referencia (DI, D 89, C 24). Deixa-los
 * fixos seria imprimir a leitura dela no relatorio de outra pessoa. Aqui ficam
 * as versoes redigidas para valer para qualquer perfil: ou frase fixa que so
 * afirma o que e verdade para todos, ou frase-molde que recebe os numeros da
 * pagina. Tudo 'rascunho' ate o Valmer aprovar (ADR-0007 D11); nenhum numero
 * e inventado, todos chegam por parametro.
 */
import type { Lideranca } from '@/lib/motor'
import type { CodigoNivelCompetencia } from '../competencias'
import type { Status } from '../status'

export const STATUS_VARIANTES_P29_35: Status = 'rascunho'

/**
 * Pagina 29 (D6, C26). Os cartoes do molde descreviam fatores ("Direcao e
 * resultado"); na v2.2 sao estilos. `definicao` diz o que o estilo e;
 * `efeito` substitui a linha "Em 89: ..." sem citar numero, porque nao ha
 * regra de faixa por estilo (C26).
 */
export const ESTILOS_LIDERANCA: Record<keyof Lideranca, { definicao: string; efeito: string }> = {
  executivo: {
    definicao: 'Conduz pela meta: define o objetivo, decide com rapidez e cobra a entrega dentro de um padrão.',
    efeito: 'Produz foco e velocidade, e em excesso gera pressão e receio de errar.',
  },
  metodico: {
    definicao: 'Conduz pelo processo: dá ritmo constante, apoia quem executa e preserva o que já funciona.',
    efeito: 'Produz previsibilidade e confiança, e em excesso adia a mudança que o contexto já pede.',
  },
  motivador: {
    definicao: 'Conduz pelas pessoas: envolve, comunica o porquê e cria adesão em torno de uma direção.',
    efeito: 'Produz energia e pertencimento, e em excesso falta acompanhamento do que foi combinado.',
  },
  sistematico: {
    definicao: 'Conduz pelo critério: planeja, antecipa riscos e mede a entrega contra um padrão claro.',
    efeito: 'Protege a qualidade da entrega, e em excesso atrasa a decisão à espera de mais dados.',
  },
}

/** Pagina 29, "Sintese do seu estilo" (C26: o molde era pessoal e sem chave de IA). */
export const SINTESE_LIDERANCA = {
  primeiro: (predominante: string, pct1: string, secundario: string, pct2: string) =>
    `O seu estilo predominante é o ${predominante}, com ${pct1}%, seguido do ${secundario}, com ${pct2}%. É a combinação a que você recorre primeiro quando precisa mobilizar pessoas e fechar decisões, e a que a equipe aprende a esperar de você.`,
  segundo: (doisPrimeiros: string, somaPrimeiros: string, doisUltimos: string, somaUltimos: string) =>
    `${doisPrimeiros} somam ${somaPrimeiros}% do seu estilo; ${doisUltimos} somam ${somaUltimos}%. É nessa proporção que a equipe recebe de você cada tipo de direção: o que fica nos dois últimos tende a precisar de estrutura, ou de outra pessoa, para aparecer.`,
}

/**
 * Pagina 29, "Atencao · o que o ambiente pede hoje". So aparece quando os dois
 * fatores mais altos do adaptado nao sao os dois mais altos do natural: e ai que
 * o contexto pede outro estilo. As duas ultimas frases sao do molde.
 */
export const ALERTA_AMBIENTE = {
  titulo: 'Atenção · o que o ambiente pede hoje',
  texto: (adaptado: string, natural: string) =>
    `O gráfico adaptado mostra ${adaptado}, enquanto o seu natural é conduzido por ${natural}. O contexto está pedindo uma forma de liderar diferente da que você exerce com naturalidade. Você não precisa se tornar esse estilo. Ele precisa existir na estrutura, exercido por alguém, ou a operação não sustenta crescimento.`,
}

/** Pagina 31: frase depois de cada lista de destaques (C28), e a de lista vazia. */
export const FRASES_DESTAQUE: Record<CodigoNivelCompetencia, string> & { vazio: string } = {
  potencializar: 'As mais altas do seu mapa. São o recurso que aparece sem esforço e o que a equipe reconhece primeiro em você.',
  consolidar: 'Disponíveis conforme o contexto. Ganham estabilidade com prática recorrente e uso deliberado.',
  desenvolver: 'As que mais pedem atenção. Crescem com repertório e acompanhamento, ou são supridas por outra pessoa da equipe.',
  vazio: 'Nenhuma das doze competências do radar está nesta faixa.',
}

/**
 * Pagina 32, "Uma leitura util desta pagina" (C29). O fator escolhido e o de
 * maior variacao entre natural e adaptado; a media das quatro competencias e o
 * escore do fator, entao e tambem o conjunto em que a adaptacao mais mexe.
 */
export const LEITURA_P32 = {
  titulo: 'Uma leitura útil desta página.',
  /** `natural` e `adaptado` ja formatados: "20 a 28", ou "24" quando as quatro empatam. */
  texto: (fator: string, natural: string, adaptado: string, citaPagina08: boolean) =>
    `As quatro competências do fator ${fator} partem de ${natural} no natural e chegam a ${adaptado} no adaptado. É o conjunto em que a adaptação mais mexe no seu mapa, e por isso o primeiro lugar a olhar quando o custo da adaptação${citaPagina08 ? ', descrito na página 08,' : ''} pesar.`,
}

/**
 * Pagina 34, "Por onde comecar". O do molde citava "o rigor" (a alavanca do
 * Valmer) e dividia 02-03 conduta / 04-06 consequencia, divisao que o prompt
 * da IA nao garante. Fica so a regra que o prompt garante: 01 = alavanca.
 */
export const POR_ONDE_COMECAR = {
  titulo: 'Por onde começar',
  texto: 'O ponto 01 é a alavanca, e é o único que resolve a causa em vez do sintoma. Enquanto ele não mudar, os outros tendem a voltar. Os pontos 02 a 06 são condutas e consequências: podem ser trabalhados em paralelo, e vários deles cedem quando o primeiro cede.',
}

/** Pagina 34, PDI no lugar de "Como acompanhar" (D5, C30). Rotulos dos campos de `pdi`. */
export const ROTULOS_PDI = {
  titulo: 'Plano de desenvolvimento · próximos 30 dias',
  prioridade: 'Prioridade principal',
  acoes: 'Ações semanais',
  desafio: 'Desafio de 30 dias',
  medir: 'Como medir',
}
