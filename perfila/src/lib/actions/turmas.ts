/**
 * Regra de negocio das turmas, em um lugar so.
 *
 * Mesma estrutura de `actions/assessments.ts`, e de proposito: sessao exigida
 * na entrada, recorte por dono no WHERE, transacao com a trilha dentro,
 * optimistic locking por `updated_at` e recusa de regra separada de falha.
 * Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 */
"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { assessments, turmas, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { atualizarTurmaSchema, criarTurmaSchema } from "@/lib/validators/turma";
import { RecusaDeRegra } from "./recusa";

const TABELA = "turmas";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} grupos de mapeamento`);
  }
  return sessao;
}

/**
 * Recorte por dono: o parceiro so enxerga e mexe nas turmas dele.
 * O admin enxerga as de todos os parceiros, que e o que o painel dele mostra.
 */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(turmas.facilitador_id, sessao.userId);
}

/**
 * As turmas visiveis para a sessao, da mais nova para a mais antiga.
 *
 * Os totais de resposta vem de COUNT sobre os assessments, e NUNCA de coluna
 * gravada: numero calculavel guardado desencontra do dado no primeiro
 * assessment criado ou excluido fora desta funcao.
 *
 * O join e `left` porque turma recem-criada ainda nao tem assessment nenhum —
 * com `inner` ela sumiria da propria lista logo depois de ser criada, que e
 * exatamente a tela que o parceiro olha em seguida.
 */
export async function listar() {
  const sessao = await exigirSessao("ler");

  return db
    .select({
      id: turmas.id,
      facilitador_id: turmas.facilitador_id,
      nome: turmas.nome,
      area: turmas.area,
      tipo_relatorio: turmas.tipo_relatorio,
      permite_download: turmas.permite_download,
      created_at: turmas.created_at,
      updated_at: turmas.updated_at,
      criada_por: usuarios.nome,
      total: sql<number>`coalesce(count(${assessments.id}), 0)::int`,
      respondidos: sql<number>`coalesce(sum(case when ${assessments.situacao} = 'concluido' then 1 else 0 end), 0)::int`,
    })
    .from(turmas)
    .innerJoin(usuarios, eq(usuarios.id, turmas.facilitador_id))
    .leftJoin(
      assessments,
      and(eq(assessments.turma_id, turmas.id), eq(assessments.is_deleted, false)),
    )
    .where(and(eq(turmas.is_deleted, false), escopoDoDono(sessao)))
    .groupBy(turmas.id, usuarios.nome)
    .orderBy(desc(turmas.created_at));
}

/** Uma turma pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessao("ler");

  const [registro] = await db
    .select()
    .from(turmas)
    .where(and(eq(turmas.id, id), eq(turmas.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Cria a turma.
 *
 * A turma nao consome credito — quem consome e o assessment enviado a partir
 * dela. A transacao existe pela trilha: com o `registrarAuditoria` fora dela,
 * uma falha ao gravar a trilha derrubaria a action DEPOIS do commit, e o
 * parceiro criaria a mesma turma de novo achando que a primeira nao existiu.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarTurmaSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar grupo de mapeamento em nome de outro facilitador");
  }

  return db.transaction(async (tx) => {
    const [dono] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, facilitadorId), eq(usuarios.is_deleted, false)))
      .limit(1);

    // Recusas de regra, e nao falhas: sao estados que a tela precisa mostrar
    // com o nome que eles tem. Ver `criarPelaTela` abaixo.
    if (!dono) throw new RecusaDeRegra("Facilitador nao encontrado");
    if (!dono.ativo) throw new RecusaDeRegra("Facilitador inativo");

    const [nova] = await tx
      .insert(turmas)
      .values({
        facilitador_id: facilitadorId,
        nome: validado.nome,
        area: validado.area,
        tipo_relatorio: validado.tipo_relatorio,
        permite_download: validado.permite_download,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: nova!.id,
        detalhes: `Criou a turma "${nova!.nome}" (${nova!.area}, ${nova!.tipo_relatorio})`,
        dadosNovos: nova,
      },
      tx,
    );

    return nova!;
  });
}

/**
 * Atualiza a turma, com optimistic locking.
 *
 * O WHERE compara `updated_at` com o valor que a tela leu. Se outra aba gravou
 * nesse meio tempo, nenhuma linha casa e a gravacao e recusada em vez de
 * sobrescrever o trabalho alheio.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarTurmaSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Grupo de mapeamento nao encontrado");

  const resultado = await db
    .update(turmas)
    .set({
      nome: validado.nome,
      area: validado.area,
      tipo_relatorio: validado.tipo_relatorio,
      permite_download: validado.permite_download,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(turmas.id, id),
        eq(turmas.updated_at, updatedAtOriginal),
        eq(turmas.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Este grupo foi alterado por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou a turma "${resultado[0]!.nome}"`,
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0]!;
}

/**
 * Delete logico. Nunca apaga a linha.
 *
 * O `ON DELETE RESTRICT` da FK e DECORATIVO neste repositorio: delete fisico e
 * erro de build (scripts/check-compliance.mjs), entao o banco jamais recebe o
 * DELETE que dispararia o RESTRICT. A guarda que de fato protege e esta: sem
 * ela, marcar a turma como excluida deixaria assessment vivo apontando para
 * uma turma que nenhuma tela consegue mais mostrar.
 *
 * A contagem nao repete o dono: `obter()` acima ja recusou a turma alheia, e
 * quem chegou aqui esta contando os assessments da propria turma.
 */
export async function excluir(id: string) {
  const sessao = await exigirSessao("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Grupo de mapeamento nao encontrado");

  const [contagem] = await db
    .select({ ativos: sql<number>`count(*)::int` })
    .from(assessments)
    .where(and(eq(assessments.turma_id, id), eq(assessments.is_deleted, false)));

  const ativos = contagem?.ativos ?? 0;
  if (ativos > 0) {
    throw new RecusaDeRegra(
      `Este grupo tem ${ativos} mapa(s) ativo(s). Exclua-os antes de excluir o grupo.`,
    );
  }

  const resultado = await db
    .update(turmas)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(turmas.id, id), eq(turmas.is_deleted, false), escopoDoDono(sessao)))
    .returning();

  if (resultado.length === 0) throw new RecusaDeRegra("Grupo de mapeamento nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "excluir",
    tabela: TABELA,
    registroId: id,
    detalhes: `Excluiu (logico) a turma "${anterior.nome}"`,
    dadosAnteriores: anterior,
  });

  return resultado[0]!;
}

/**
 * Traduz a recusa para a tela.
 *
 * Mesmo motivo de `assessments.criarPelaTela`: uma Server Action que lanca
 * entrega ao navegador um digest opaco em producao, e "nome muito curto"
 * chegaria a tela com a mesma cara de "o banco caiu". Recusa de regra volta
 * como objeto; falha de verdade continua subindo.
 *
 * Por causa do `revalidatePath` esta funcao exige uma requisicao em curso.
 * Quem chama de script ou de teste usa `criar()` direto.
 */
export async function criarPelaTela(
  dados: unknown,
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  try {
    const nova = await criar(dados);
    revalidatePath("/facilitador/grupos-de-mapeamento");
    return { ok: true, id: nova.id };
  } catch (erro) {
    if (erro instanceof RecusaDeRegra) return { ok: false, erro: erro.message };
    if (erro instanceof ZodError) {
      return { ok: false, erro: erro.issues[0]?.message ?? "Dados invalidos" };
    }
    throw erro;
  }
}
