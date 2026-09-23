/**
 * O programa do curso LIDO: os modulos e as aulas, na ordem.
 *
 * Fica separado de `actions/ead.ts` pela mesma divisao de `lib/precos.ts`, e
 * pelo mesmo motivo:
 *
 * - ESCREVER modulo e aula e do admin, passa pelo rbac (`cursos:*`) e mora na
 *   action.
 * - LER e do parceiro. A aba /facilitador/biblioteca-gravada precisa mostrar o que o admin
 *   publicou, e o rbac diz que `cursos:ler` e so do admin — guardar a leitura
 *   atras dele trancaria o parceiro fora da propria trilha. Quem barra
 *   visitante e a guarda de sessao do layout de /facilitador, que ja existe.
 *
 * Este modulo NAO e "use server": nada aqui vira endpoint POST publico.
 */
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { cursoAulas, cursoModulos, cursos } from "@/lib/db/schema";
import type { Curso, CursoAula, CursoModulo } from "@/lib/db/schema";

/**
 * Para onde a reordenacao anda. Mora neste modulo, e nao na action, porque
 * arquivo "use server" so pode exportar funcao assincrona — um `export type` la
 * dentro e o tipo de coisa que passa no editor e para o build do Next.
 */
export type Direcao = "cima" | "baixo";

/** Um modulo com as aulas dele dentro, ja ordenadas. */
export type ModuloComAulas = CursoModulo & { aulas: CursoAula[] };

/** Um curso com o programa inteiro. E o que as duas telas desenham. */
export type CursoComPrograma = Curso & { modulos: ModuloComAulas[] };

/**
 * Monta a arvore de varios cursos em DUAS consultas, e nao em uma por curso.
 *
 * A tela do admin lista todos os cursos com o programa aberto; consultar por
 * curso dentro do laco daria 1 + N + N idas ao banco para uma pagina que cabe
 * em duas. O agrupamento em memoria e barato: o programa inteiro da plataforma
 * sao dezenas de linhas, nao milhares.
 */
async function programaDe(listaDeCursos: Curso[]): Promise<CursoComPrograma[]> {
  if (listaDeCursos.length === 0) return [];

  const modulos = await db
    .select()
    .from(cursoModulos)
    .where(
      and(
        inArray(
          cursoModulos.curso_id,
          listaDeCursos.map((curso) => curso.id),
        ),
        eq(cursoModulos.is_deleted, false),
      ),
    )
    // `created_at` desempata: `ordem` nao tem indice unico de proposito (a
    // troca de posicao passa por um estado com dois iguais — ver o schema), e
    // sem desempate a lista mudaria de cara a cada leitura no meio da troca.
    .orderBy(asc(cursoModulos.ordem), asc(cursoModulos.created_at));

  const aulas =
    modulos.length === 0
      ? []
      : await db
          .select()
          .from(cursoAulas)
          .where(
            and(
              inArray(
                cursoAulas.modulo_id,
                modulos.map((modulo) => modulo.id),
              ),
              eq(cursoAulas.is_deleted, false),
            ),
          )
          .orderBy(asc(cursoAulas.ordem), asc(cursoAulas.created_at));

  const porModulo = new Map<string, CursoAula[]>();
  for (const aula of aulas) {
    const atual = porModulo.get(aula.modulo_id);
    if (atual) atual.push(aula);
    else porModulo.set(aula.modulo_id, [aula]);
  }

  const porCurso = new Map<string, ModuloComAulas[]>();
  for (const modulo of modulos) {
    const comAulas = { ...modulo, aulas: porModulo.get(modulo.id) ?? [] };
    const atual = porCurso.get(modulo.curso_id);
    if (atual) atual.push(comAulas);
    else porCurso.set(modulo.curso_id, [comAulas]);
  }

  return listaDeCursos.map((curso) => ({ ...curso, modulos: porCurso.get(curso.id) ?? [] }));
}

/**
 * O programa dos cursos que a tela do admin ja tem em maos.
 *
 * Recebe a lista pronta em vez de reconsultar: quem chama e a page, que acabou
 * de ler os cursos por `actions/cursos.listar()` — com a checagem de permissao
 * junto. Reler aqui seria a mesma consulta duas vezes por render.
 */
export async function programaDosCursos(listaDeCursos: Curso[]): Promise<CursoComPrograma[]> {
  return programaDe(listaDeCursos);
}

/**
 * A TRILHA que o parceiro ve: so curso publicado, com o programa dentro.
 *
 * O recorte e o de sempre — vivo e
 * publicado — e mora aqui, e nao na tela, pelo motivo que aquela funcao ja
 * escrevia: filtro de vitrine repetido em cada page e o que faz um rascunho
 * vazar pela terceira tela que alguem escreveu com pressa.
 *
 * AULA SEM VIDEO CONTINUA NA LISTA, marcada como pendente pela tela. Filtrar
 * `video_chave IS NOT NULL` aqui faria a aula anunciada no programa sumir sem
 * explicacao entre o dia em que o admin a cadastrou e o dia em que ele subiu a
 * gravacao — e o parceiro nao teria como saber que ela existe.
 */
export async function trilhaPublicada(): Promise<CursoComPrograma[]> {
  const publicados = await db
    .select()
    .from(cursos)
    .where(and(eq(cursos.is_deleted, false), eq(cursos.publicado, true)))
    .orderBy(asc(cursos.publicado_em));

  return programaDe(publicados);
}
