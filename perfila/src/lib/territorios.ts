/**
 * O perfil coletivo de um territorio: as medias de D, I, S e C e a lista de
 * respondentes.
 *
 * O modulo do territorio ao lado das actions, como `lib/painel.ts` e
 * `lib/metricas.ts`: a conta das medias e uma funcao PURA, que o teste checa
 * numero por numero sem banco, e a guarda de permissao vive aqui porque DOIS
 * modulos de action a usam — `actions/territorios.ts` e
 * `actions/territorios-vinculos.ts`. Arquivo "use server" so exporta funcao
 * assincrona, entao a guarda nao pode morar em um deles e ser importada pelo
 * outro sem virar Server Action publica; duas copias dela e que seriam duas
 * respostas para "quem pode mexer no territorio?".
 *
 * A media sai dos CONTADORES dos mapas vinculados, nunca de coluna gravada nem
 * de numero fixo. `data/dna.ts` tinha `{ D: 52, I: 57, S: 47, C: 45 }` escrito
 * a mao — que soma 201 e nao descreve nenhum dos respondentes listados ao lado.
 */

import { resultadoDeContadores } from "@/lib/disc";
import { initials } from "@/lib/text";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { ORDEM_FATORES } from "@/data/assessment";
import type { FatorDisc } from "@/data/dna";

const TABELA = "territorios";

/**
 * Sessao com permissao para a acao pedida, ou erro.
 *
 * Uma unica definicao para os dois modulos de action. Vincular e desvincular
 * inventario entram como `territorios:atualizar`: o vinculo e o CONTEUDO do
 * territorio, e nao um recurso com permissao propria.
 */
export async function exigirSessaoDeTerritorio(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} territorios`);
  }
  return sessao;
}

/** Um mapa vinculado ao territorio, como o banco o devolve. */
export type InventarioDoTerritorio = {
  assessment_id: string;
  avaliado_nome: string;
  avaliado_email: string;
  contador_d: number | null;
  contador_i: number | null;
  contador_s: number | null;
  contador_c: number | null;
  concluido_em: Date | null;
};

export type RespondenteDoTerritorio = {
  assessment_id: string;
  nome: string;
  email: string;
  /** As duas letras predominantes, ex. "DI". */
  perfil: string;
  d: number;
  i: number;
  s: number;
  c: number;
  respondido_em: Date | null;
  iniciais: string;
};

export type PerfilDoTerritorio = {
  medias: Record<FatorDisc, number>;
  respondentes: RespondenteDoTerritorio[];
  /** Vinculados que ainda nao responderam: nao entram na media. */
  pendentes: number;
};

/** Um mapa so entra na media depois de respondido. */
function respondido(item: InventarioDoTerritorio): boolean {
  return (
    item.contador_d !== null &&
    item.contador_i !== null &&
    item.contador_s !== null &&
    item.contador_c !== null
  );
}

/**
 * As medias do grupo e o perfil de cada respondente.
 *
 * O percentual individual vem de `resultadoDeContadores`, o mesmo que a lista
 * de mapas e o relatorio usam: se o territorio fizesse a propria conta de
 * contador para percentual, o "62" do cartao do grupo e o "61" da linha da
 * pessoa sairiam de duas contas diferentes e ninguem saberia qual esta certa.
 *
 * ponytail: a media e arredondada por fator, entao as quatro podem somar 99 ou
 * 101. Isso e correto para MEDIA (o cartao diz "Dominancia media", e nao
 * "distribuicao do grupo") e nao da para consertar com o maior resto, que
 * fecharia a soma mentindo em um dos fatores. Se um dia a tela passar a
 * afirmar "soma 100", a conta tem de mudar junto — e nao o texto.
 */
export function perfilDoTerritorio(
  inventarios: InventarioDoTerritorio[],
): PerfilDoTerritorio {
  const respondentes = inventarios.filter(respondido).map((item) => {
    const resultado = resultadoDeContadores({
      D: item.contador_d!,
      I: item.contador_i!,
      S: item.contador_s!,
      C: item.contador_c!,
    });

    return {
      assessment_id: item.assessment_id,
      nome: item.avaliado_nome,
      email: item.avaliado_email,
      perfil: resultado.combinado,
      d: resultado.percentuais.D,
      i: resultado.percentuais.I,
      s: resultado.percentuais.S,
      c: resultado.percentuais.C,
      respondido_em: item.concluido_em,
      iniciais: initials(item.avaliado_nome),
    };
  });

  const medias = { D: 0, I: 0, S: 0, C: 0 } as Record<FatorDisc, number>;
  if (respondentes.length > 0) {
    const soma = { D: 0, I: 0, S: 0, C: 0 } as Record<FatorDisc, number>;
    for (const pessoa of respondentes) {
      soma.D += pessoa.d;
      soma.I += pessoa.i;
      soma.S += pessoa.s;
      soma.C += pessoa.c;
    }
    for (const fator of ORDEM_FATORES) {
      medias[fator] = Math.round(soma[fator] / respondentes.length);
    }
  }

  // Territorio recem-criado tem media zero em tudo, e e a resposta honesta:
  // nao ha respondente para tirar media de. Quem decide o que mostrar nesse
  // caso e a tela, com `respondentes.length`.
  return { medias, respondentes, pendentes: inventarios.length - respondentes.length };
}
