/**
 * O perfil DISC NATURAL de um mapa, qualquer que seja o inventario dele.
 *
 * Existem dois inventarios convivendo (ADR-0007, D3), e cada um guarda o
 * resultado num lugar:
 *
 * - LEGADO: os quatro contadores em `assessments` (28 respostas). O escore e o
 *   percentual de `resultadoDeContadores`, e os quatro somam 100.
 * - MC-INV 2.2: a linha viva de `assessments_resultados`, gravada pelo motor.
 *   O escore e o do DISC natural: cada fator vai de 0 a 100 e os quatro somam
 *   200 (secao 5.1 do AGENTE). NAO e percentual, e dividir por dois para
 *   "parecer" o legado inventaria um numero que o instrumento nao mede.
 *
 * Toda tela do portal que mostra perfil (lista de mapas, CSV, territorio,
 * painel) le daqui. Assim o corte por versao e um `if` em um lugar so: se
 * cada leitor decidisse sozinho de onde tirar o perfil, a lista diria "DI" e o
 * CSV da mesma pessoa diria outra coisa assim que alguem esquecesse um lado.
 *
 * O que decide o caminho e a versao do MAPA, e nao a existencia de contador ou
 * de resultado: o `if` e so "LEGADO ou nao". Uma versao nova do inventario le
 * `assessments_resultados` sem mexer aqui.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessmentsResultados, type AssessmentResultado } from "@/lib/db/schema";
import { resultadoDeContadores } from "@/lib/disc";
import type { FatorDisc } from "@/data/dna";

export const VERSAO_LEGADO = "LEGADO";

export type Confiabilidade = AssessmentResultado["confiabilidade"];

export type PerfilDoMapa = {
  /** "LEGADO" ou "MC-INV 2.2": diz em que escala estao os escores. */
  versao: string;
  /** "DI" no legado; "DI", "D" ou "EQUILIBRADO" no MC-INV 2.2. */
  sigla: string;
  /** DISC natural. Legado: percentual, soma 100. MC-INV 2.2: 0-100, soma 200. */
  escores: Record<FatorDisc, number>;
  /** Secao 6 do AGENTE. Nulo no legado, que nao tem indicador de validade. */
  confiabilidade: Confiabilidade | null;
};

/** As colunas de `assessments` que o perfil precisa. */
export type MapaParaPerfil = {
  id: string;
  versao_instrumento: string;
  contador_d: number | null;
  contador_i: number | null;
  contador_s: number | null;
  contador_c: number | null;
};

type ResultadoParaPerfil = Pick<
  AssessmentResultado,
  "perfil_natural" | "nat_d" | "nat_i" | "nat_s" | "nat_c" | "confiabilidade"
>;

/**
 * A conta pura, sem banco. Nulo quando o mapa ainda nao tem resultado —
 * nunca `{D: 0, ...}`, que a lista exibiria como perfil de quem nao respondeu.
 */
export function perfilDoMapa(
  mapa: MapaParaPerfil,
  resultado: ResultadoParaPerfil | undefined,
): PerfilDoMapa | null {
  if (mapa.versao_instrumento !== VERSAO_LEGADO) {
    if (!resultado) return null;
    return {
      versao: mapa.versao_instrumento,
      sigla: resultado.perfil_natural,
      escores: { D: resultado.nat_d, I: resultado.nat_i, S: resultado.nat_s, C: resultado.nat_c },
      confiabilidade: resultado.confiabilidade,
    };
  }

  const { contador_d, contador_i, contador_s, contador_c } = mapa;
  if (contador_d === null || contador_i === null || contador_s === null || contador_c === null) {
    return null;
  }
  const legado = resultadoDeContadores({ D: contador_d, I: contador_i, S: contador_s, C: contador_c });
  return {
    versao: VERSAO_LEGADO,
    sigla: legado.combinado,
    escores: legado.percentuais,
    confiabilidade: null,
  };
}

/**
 * O perfil de cada mapa da lista, por id. Mapa sem resultado fica de fora.
 *
 * Uma consulta para a lista inteira, e nao uma por linha: a lista de um
 * parceiro passa de centenas de mapas. Quem chama ja aplicou o recorte por
 * dono em `mapas`; aqui so se busca o resultado dos ids recebidos.
 */
export async function perfisDosMapas(
  mapas: readonly MapaParaPerfil[],
): Promise<Map<string, PerfilDoMapa>> {
  const ids = mapas.filter((m) => m.versao_instrumento !== VERSAO_LEGADO).map((m) => m.id);

  const resultados =
    ids.length === 0
      ? []
      : await db
          .select({
            assessment_id: assessmentsResultados.assessment_id,
            perfil_natural: assessmentsResultados.perfil_natural,
            nat_d: assessmentsResultados.nat_d,
            nat_i: assessmentsResultados.nat_i,
            nat_s: assessmentsResultados.nat_s,
            nat_c: assessmentsResultados.nat_c,
            confiabilidade: assessmentsResultados.confiabilidade,
          })
          .from(assessmentsResultados)
          .where(
            and(
              inArray(assessmentsResultados.assessment_id, ids),
              eq(assessmentsResultados.is_deleted, false),
            ),
          );

  const porMapa = new Map(resultados.map((r) => [r.assessment_id, r]));
  const perfis = new Map<string, PerfilDoMapa>();
  for (const mapa of mapas) {
    const perfil = perfilDoMapa(mapa, porMapa.get(mapa.id));
    if (perfil) perfis.set(mapa.id, perfil);
  }
  return perfis;
}
