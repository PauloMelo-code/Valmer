/**
 * Niveis de Credenciamento: ciclo do parceiro e categoria alcancada.
 *
 * Nada aqui e gravado. A categoria e DERIVADA dos creditos movimentados no
 * ciclo corrente, do mesmo jeito que o perfil DISC deriva dos contadores e a
 * expiracao do assessment deriva de `expira_em`. Materializar a categoria
 * criaria uma segunda fonte capaz de discordar do extrato — e o extrato e o
 * que o parceiro consegue conferir linha a linha.
 *
 * Consequencia aceita e visivel na tela: durante o ciclo a categoria so sobe,
 * e na virada ela volta a Parceiro junto com os contadores. E o que "Expira em
 * <data>" significa nesta tela.
 *
 * Modulo puro, sem banco: quem le e `painel.ts`. Assim as duas regras que
 * valem dinheiro — a janela do ciclo e o corte da faixa — sao testaveis sem
 * subir Postgres.
 */
import { categorias, type Categoria } from "@/data/beneficios";

export type Ciclo = { inicio: Date; fim: Date };

/**
 * Janela do ciclo vigente: aniversario da conta, renovando a cada 12 meses.
 *
 * A ancora e o instante de `created_at`, e nao a data em fuso nenhum. Somar um
 * ano ao proprio instante dispensa decidir em que fuso o dia vira, o que so
 * importaria para movimentos lancados na virada da meia-noite do aniversario.
 *
 * 29 de fevereiro: `setUTCFullYear` joga para 1o de marco nos anos comuns,
 * entao o aniversario desses parceiros anda um dia em tres de cada quatro
 * anos. Aceito — a alternativa e uma biblioteca de calendario para corrigir um
 * deslocamento que nao muda a contagem de credito de ninguem.
 */
export function cicloDe(criadoEm: Date, agora: Date): Ciclo {
  const aniversario = (anos: number) => {
    const data = new Date(criadoEm.getTime());
    data.setUTCFullYear(criadoEm.getUTCFullYear() + anos);
    return data;
  };

  let anos = agora.getUTCFullYear() - criadoEm.getUTCFullYear();
  if (anos < 0) anos = 0;
  if (aniversario(anos) > agora) anos -= 1;
  if (anos < 0) anos = 0;

  return { inicio: aniversario(anos), fim: aniversario(anos + 1) };
}

/**
 * Faixa alcancada com o que foi comprado e utilizado no ciclo.
 *
 * Basta bater UM dos dois criterios — e o "ou" da regra escrita. Percorre de
 * cima para baixo e para na primeira que couber: assim quem satisfaz Especialista
 * nao para em Formador so porque Formador vem antes na lista.
 */
export function categoriaAtingida(
  comprados: number,
  utilizados: number,
): { atual: Categoria; proxima: Categoria | null } {
  const indice = [...categorias]
    .map((_, posicao) => categorias.length - 1 - posicao)
    .find(
      (posicao) =>
        comprados >= categorias[posicao]!.limite.comprados ||
        utilizados >= categorias[posicao]!.limite.utilizados,
    );

  // A primeira faixa tem limite zero, entao sempre existe uma resposta; o
  // `?? 0` cobre o caso impossivel de alguem apagar essa faixa da lista.
  const atual = categorias[indice ?? 0]!;
  return { atual, proxima: categorias[(indice ?? 0) + 1] ?? null };
}

/** Quanto falta para a proxima faixa. Nunca negativo, e zero no topo. */
export function faltamPara(
  proxima: Categoria | null,
  comprados: number,
  utilizados: number,
) {
  if (!proxima) return { comprados: 0, utilizados: 0 };

  return {
    comprados: Math.max(0, proxima.limite.comprados - comprados),
    utilizados: Math.max(0, proxima.limite.utilizados - utilizados),
  };
}

/**
 * Meta a exibir nas barras de progresso.
 *
 * E o limite da PROXIMA faixa: e para la que a barra caminha. No topo nao ha
 * proxima, e a meta vira o proprio limite alcancado — barra cheia, que e a
 * leitura honesta de "voce chegou ao fim da regua".
 */
export function metaDaBarra(atual: Categoria, proxima: Categoria | null) {
  return {
    comprados: Math.max(1, (proxima ?? atual).limite.comprados),
    utilizados: Math.max(1, (proxima ?? atual).limite.utilizados),
  };
}
