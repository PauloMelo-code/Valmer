/**
 * O texto da IA de cada mapa concluido, para as listas: ja gravado, ou sendo
 * escrito agora. Lido por `lib/painel.ts`, que monta as linhas das telas.
 *
 * Cada inventario guarda o seu num lugar: o legado em `assessments_relatorios`
 * (uma linha por versao do texto), o MC-INV 2.2 na coluna `narrativa` do
 * resultado. Uma consulta por lugar para a lista inteira, e nao uma por linha:
 * a lista de mapas de um parceiro passa de centenas.
 *
 * "Sendo escrito" e a trava que o gerador toma antes da chamada paga e solta
 * no fim, de certo ou de errado: no legado em `assessments.narrativa_gerando_em`
 * (ja vem na linha), no MC-INV 2.2 no resultado. Os prazos sao os dos proprios
 * geradores, para a tela e a trava vencerem juntas.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsRelatorios, assessmentsResultados } from "@/lib/db/schema";
import { VERSAO_LEGADO } from "@/lib/perfil-do-mapa";
import { PRAZO_DA_GERACAO_MS as PRAZO_LEGADO } from "@/lib/relatorio/persistir";
import { PRAZO_DA_GERACAO_MS as PRAZO_MC } from "@/lib/relatorio-mc/narrativa";

export type EstadoDoTexto = { comNarrativa: Set<string>; gerando: Set<string> };

/**
 * O texto do mapa deste token ja esta pronto? Para a tela final do avaliado,
 * que so precisa de sim ou nao. O token e a credencial dele, como no resto do
 * inventario, e o relatorio ja abre por ele em /relatorio/<token>: esta
 * pergunta nao entrega nada que o link nao entregue. Token que nao existe, mapa
 * nao concluido ou sem texto respondem igual, "nao".
 */
export async function textoProntoDoToken(token: string): Promise<boolean> {
  const [linha] = await db
    .select({ pronta: sql<boolean>`${assessmentsResultados.narrativa} is not null` })
    .from(assessments)
    .innerJoin(
      assessmentsResultados,
      and(eq(assessmentsResultados.assessment_id, assessments.id), eq(assessmentsResultados.is_deleted, false)),
    )
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false), eq(assessments.situacao, "concluido")))
    .limit(1);
  return linha?.pronta === true;
}

/** A trava de geracao ainda vale? A mesma conta dos dois `arrendar`, com o prazo de cada um. */
function arrendado(desde: Date | null, prazo: number): boolean {
  return desde !== null && Date.now() - desde.getTime() < prazo;
}

export async function estadoDoTexto(linhas: (typeof assessments.$inferSelect)[]): Promise<EstadoDoTexto> {
  const concluidos = linhas.filter((l) => l.situacao === "concluido");
  const legado = concluidos.filter((l) => l.versao_instrumento === VERSAO_LEGADO);
  const novos = concluidos.filter((l) => l.versao_instrumento !== VERSAO_LEGADO).map((l) => l.id);

  const [antigos, atuais] = await Promise.all([
    legado.length === 0
      ? []
      : db
          .selectDistinct({ id: assessmentsRelatorios.assessment_id })
          .from(assessmentsRelatorios)
          .where(
            and(
              inArray(assessmentsRelatorios.assessment_id, legado.map((l) => l.id)),
              eq(assessmentsRelatorios.is_deleted, false),
            ),
          ),
    novos.length === 0
      ? []
      : db
          .select({
            id: assessmentsResultados.assessment_id,
            // So o "tem ou nao": o texto inteiro nao precisa atravessar a rede.
            pronta: sql<boolean>`${assessmentsResultados.narrativa} is not null`,
            desde: assessmentsResultados.narrativa_gerando_em,
          })
          .from(assessmentsResultados)
          .where(
            and(
              inArray(assessmentsResultados.assessment_id, novos),
              eq(assessmentsResultados.is_deleted, false),
            ),
          ),
  ]);

  return {
    comNarrativa: new Set([...antigos.map((g) => g.id), ...atuais.filter((r) => r.pronta).map((r) => r.id)]),
    gerando: new Set([
      ...legado.filter((l) => arrendado(l.narrativa_gerando_em, PRAZO_LEGADO)).map((l) => l.id),
      ...atuais.filter((r) => arrendado(r.desde, PRAZO_MC)).map((r) => r.id),
    ]),
  };
}
