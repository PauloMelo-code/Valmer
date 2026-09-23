/**
 * Regra de negocio das devolutivas — a sessao de feedback sobre um assessment.
 *
 * Mesma estrutura de `actions/turmas.ts`, e de proposito: sessao exigida na
 * entrada, recorte por dono no WHERE, transacao com a trilha dentro,
 * optimistic locking por `updated_at` e recusa de regra separada de falha.
 * Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 */
"use server";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { assessments, devolutivas } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { atualizarDevolutivaSchema, criarDevolutivaSchema } from "@/lib/validators/devolutiva";
import { paraTela, RecusaDeRegra } from "./recusa";

const TABELA = "devolutivas";
const TELA = "/facilitador/sessao-de-leitura";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} sessões de leitura`);
  }
  return sessao;
}

/** Recorte por dono: o parceiro so enxerga as devolutivas dele. */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(devolutivas.facilitador_id, sessao.userId);
}

/**
 * As devolutivas visiveis para a sessao, da mais nova para a mais antiga.
 *
 * `situacao` sai do SQL, e nao de uma coluna: nao existe estado guardado, so
 * `finalizada_em` preenchida ou vazia. Guardar o rotulo ao lado da data criaria
 * o par que este projeto ja viu discordar no campo `perfil` do assessment.
 */
export async function listar() {
  const sessao = await exigirSessao("ler");

  return db
    .select({
      id: devolutivas.id,
      assessment_id: devolutivas.assessment_id,
      facilitador_id: devolutivas.facilitador_id,
      duracao_segundos: devolutivas.duracao_segundos,
      finalizada_em: devolutivas.finalizada_em,
      situacao: sql<"Finalizada" | "Pausada">`case when ${devolutivas.finalizada_em} is null then 'Pausada' else 'Finalizada' end`,
      created_at: devolutivas.created_at,
      updated_at: devolutivas.updated_at,
      avaliado_nome: assessments.avaliado_nome,
    })
    .from(devolutivas)
    .innerJoin(assessments, eq(assessments.id, devolutivas.assessment_id))
    .where(and(eq(devolutivas.is_deleted, false), escopoDoDono(sessao)))
    .orderBy(desc(devolutivas.created_at));
}

/** Uma devolutiva pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessao("ler");

  const [registro] = await db
    .select()
    .from(devolutivas)
    .where(and(eq(devolutivas.id, id), eq(devolutivas.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Abre a devolutiva sobre um assessment.
 *
 * Nasce pausada: `finalizada_em` so e preenchida por `atualizar`, quando o
 * facilitador encerra a sessao.
 *
 * A conferencia do assessment tambem confere o DONO. Nao e cinto e suspensorio
 * com a FK composta: a FK devolve violacao de constraint, que na tela vira
 * texto de driver; esta consulta e o que produz uma frase. Se alguem apagar o
 * `facilitador_id` daqui, o banco ainda recusa — e o contrario nao vale.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarDevolutivaSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar sessão de leitura em nome de outro facilitador");
  }

  return db.transaction(async (tx) => {
    const [assessment] = await tx
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.id, validado.assessment_id),
          eq(assessments.facilitador_id, facilitadorId),
          eq(assessments.is_deleted, false),
        ),
      )
      .limit(1);

    if (!assessment) throw new RecusaDeRegra("Mapa nao encontrado");

    const [nova] = await tx
      .insert(devolutivas)
      .values({
        assessment_id: assessment.id,
        facilitador_id: facilitadorId,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: nova!.id,
        detalhes: `Abriu a devolutiva de "${assessment.avaliado_nome}"`,
        dadosNovos: nova,
      },
      tx,
    );

    return nova!;
  });
}

/**
 * Grava a duracao e finaliza (ou reabre) a sessao, com optimistic locking.
 *
 * `finalizada` e um booleano da tela, e nao uma data: quem carimba a hora e o
 * servidor. Deixar a tela mandar o instante permitiria fechar uma devolutiva no
 * ano que vem por causa do relogio errado de uma maquina.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarDevolutivaSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Sessão de leitura nao encontrada");

  const resultado = await db
    .update(devolutivas)
    .set({
      duracao_segundos: validado.duracao_segundos,
      // Reabrir volta para NULL, que e o mesmo "pausada" de quem nunca fechou.
      // Nao ha terceiro estado a representar.
      finalizada_em: validado.finalizada ? (anterior.finalizada_em ?? new Date()) : null,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(devolutivas.id, id),
        eq(devolutivas.updated_at, updatedAtOriginal),
        eq(devolutivas.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Esta sessão de leitura foi alterada por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: validado.finalizada ? "Finalizou a devolutiva" : "Pausou a devolutiva",
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0]!;
}

/** Delete logico. Nunca apaga a linha. Nada pendura na devolutiva. */
export async function excluir(id: string) {
  const sessao = await exigirSessao("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Sessão de leitura nao encontrada");

  const resultado = await db
    .update(devolutivas)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(devolutivas.id, id), eq(devolutivas.is_deleted, false), escopoDoDono(sessao)))
    .returning();

  if (resultado.length === 0) throw new RecusaDeRegra("Sessão de leitura nao encontrada");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "excluir",
    tabela: TABELA,
    registroId: id,
    detalhes: "Excluiu (logico) a devolutiva",
    dadosAnteriores: anterior,
  });

  return resultado[0]!;
}

// --- portas da tela: recusa vira objeto, falha de verdade continua subindo ---

export async function criarPelaTela(dados: unknown) {
  return paraTela(TELA, () => criar(dados));
}

export async function atualizarPelaTela(id: string, dados: unknown, updatedAtOriginal: Date) {
  return paraTela(TELA, () => atualizar(id, dados, updatedAtOriginal));
}

export async function excluirPelaTela(id: string) {
  return paraTela(TELA, () => excluir(id));
}
