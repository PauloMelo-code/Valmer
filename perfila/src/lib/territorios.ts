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
 * A media sai do perfil de cada mapa vinculado (`lib/perfil-do-mapa.ts`),
 * nunca de coluna gravada nem de numero fixo. `data/dna.ts` tinha
 * `{ D: 52, I: 57, S: 47, C: 45 }` escrito a mao — que soma 201 e nao
 * descreve nenhum dos respondentes listados ao lado.
 *
 * ESCALA. A media e a media simples dos escores do DISC natural de quem
 * respondeu, na escala do proprio inventario:
 * - MC-INV 2.2: cada fator vai de 0 a 100 e os quatro somam 200 (secao 5.1 do
 *   AGENTE). A media de cada fator tambem fica entre 0 e 100, e as quatro
 *   medias somam ~200.
 * - LEGADO: percentual das 28 respostas; os quatro somam 100.
 * As duas escalas NAO se misturam numa media so: um 60 de legado e um 60 do
 * MC-INV 2.2 nao medem a mesma coisa. Num territorio com as duas, a media e
 * a do MC-INV 2.2 e os respondentes do legado continuam listados, com o perfil
 * deles, mas contados em `foraDaMedia`.
 */

import { VERSAO_LEGADO, type PerfilDoMapa } from "@/lib/perfil-do-mapa";
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

/** Um mapa vinculado ao territorio, com o perfil ja lido (nulo sem resposta). */
export type InventarioDoTerritorio = {
  assessment_id: string;
  avaliado_nome: string;
  avaliado_email: string;
  perfil: PerfilDoMapa | null;
  concluido_em: Date | null;
};

export type RespondenteDoTerritorio = {
  assessment_id: string;
  nome: string;
  email: string;
  /** "DI" (legado) ou "DI" / "D" / "EQUILIBRADO" (MC-INV 2.2). */
  perfil: string;
  /** Em que escala estao d, i, s e c — ver o cabecalho. */
  versao: string;
  d: number;
  i: number;
  s: number;
  c: number;
  respondido_em: Date | null;
  iniciais: string;
};

export type PerfilDoTerritorio = {
  medias: Record<FatorDisc, number>;
  /** A escala das medias: "MC-INV 2.2" (0-100, somam 200) ou "LEGADO" (somam 100). */
  escala: string;
  respondentes: RespondenteDoTerritorio[];
  /** Respondentes de outra escala, listados mas fora da media. */
  foraDaMedia: number;
  /** Vinculados que ainda nao responderam: nao entram na media. */
  pendentes: number;
};

/**
 * As medias do grupo e o perfil de cada respondente.
 *
 * O escore individual vem de `perfilDoMapa`, o mesmo que a lista de mapas e o
 * CSV usam: se o territorio fizesse a propria conta, o "62" do cartao do grupo
 * e o "61" da linha da pessoa sairiam de duas contas diferentes e ninguem
 * saberia qual esta certa.
 *
 * ponytail: a media e arredondada por fator, entao as quatro podem somar 99 ou
 * 101 (199 ou 201 no MC-INV 2.2). Isso e correto para MEDIA (o cartao diz
 * "Dominancia media", e nao "distribuicao do grupo") e nao da para consertar
 * com o maior resto, que fecharia a soma mentindo em um dos fatores.
 */
export function perfilDoTerritorio(
  inventarios: InventarioDoTerritorio[],
): PerfilDoTerritorio {
  const respondentes: RespondenteDoTerritorio[] = [];
  for (const item of inventarios) {
    if (!item.perfil) continue;
    respondentes.push({
      assessment_id: item.assessment_id,
      nome: item.avaliado_nome,
      email: item.avaliado_email,
      perfil: item.perfil.sigla,
      versao: item.perfil.versao,
      d: item.perfil.escores.D,
      i: item.perfil.escores.I,
      s: item.perfil.escores.S,
      c: item.perfil.escores.C,
      respondido_em: item.concluido_em,
      iniciais: initials(item.avaliado_nome),
    });
  }

  // O inventario novo prevalece: e nele que o territorio vai crescer.
  const escala =
    respondentes.find((pessoa) => pessoa.versao !== VERSAO_LEGADO)?.versao ?? VERSAO_LEGADO;
  const naMedia = respondentes.filter((pessoa) => pessoa.versao === escala);

  const medias = { D: 0, I: 0, S: 0, C: 0 } as Record<FatorDisc, number>;
  if (naMedia.length > 0) {
    const soma = { D: 0, I: 0, S: 0, C: 0 } as Record<FatorDisc, number>;
    for (const pessoa of naMedia) {
      soma.D += pessoa.d;
      soma.I += pessoa.i;
      soma.S += pessoa.s;
      soma.C += pessoa.c;
    }
    for (const fator of ORDEM_FATORES) {
      medias[fator] = Math.round(soma[fator] / naMedia.length);
    }
  }

  // Territorio recem-criado tem media zero em tudo, e e a resposta honesta:
  // nao ha respondente para tirar media de. Quem decide o que mostrar nesse
  // caso e a tela, com `respondentes.length`.
  return {
    medias,
    escala,
    respondentes,
    foraDaMedia: respondentes.length - naMedia.length,
    pendentes: inventarios.length - respondentes.length,
  };
}
