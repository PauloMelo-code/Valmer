/**
 * Regra de negocio dos cargos — o alvo DISC de uma posicao.
 *
 * Mesma estrutura de `actions/turmas.ts`, e de proposito: sessao exigida na
 * entrada, recorte por dono no WHERE, transacao com a trilha dentro,
 * optimistic locking por `updated_at` e recusa de regra separada de falha.
 * Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 */
"use server";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { cargos, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { atualizarCargoSchema, criarCargoSchema } from "@/lib/validators/cargo";
import { paraTela, RecusaDeRegra } from "./recusa";

const TABELA = "cargos";
const TELA = "/facilitador/perfil-ideal-por-cargo";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} cargos`);
  }
  return sessao;
}

/** Recorte por dono: o parceiro so enxerga e mexe nos cargos dele. */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(cargos.facilitador_id, sessao.userId);
}

/** Os cargos visiveis para a sessao, do mais novo para o mais antigo. */
export async function listar() {
  const sessao = await exigirSessao("ler");

  return db
    .select({
      id: cargos.id,
      facilitador_id: cargos.facilitador_id,
      nome: cargos.nome,
      alvo_d: cargos.alvo_d,
      alvo_i: cargos.alvo_i,
      alvo_s: cargos.alvo_s,
      alvo_c: cargos.alvo_c,
      created_at: cargos.created_at,
      updated_at: cargos.updated_at,
      dono: usuarios.nome,
    })
    .from(cargos)
    .innerJoin(usuarios, eq(usuarios.id, cargos.facilitador_id))
    .where(and(eq(cargos.is_deleted, false), escopoDoDono(sessao)))
    .orderBy(desc(cargos.created_at));
}

/** Um cargo pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessao("ler");

  const [registro] = await db
    .select()
    .from(cargos)
    .where(and(eq(cargos.id, id), eq(cargos.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Cria o cargo.
 *
 * A transacao existe pela trilha: com o `registrarAuditoria` fora dela, uma
 * falha ao gravar a trilha derrubaria a action DEPOIS do commit, e o parceiro
 * cadastraria o mesmo cargo de novo achando que o primeiro nao existiu.
 *
 * Os alvos nao sao conferidos aqui: quem soma 100 e o CHECK `ck_cargos_alvo`,
 * no banco, e o zod so traduz a mesma regra para o formulario. Repetir a conta
 * numa terceira casa e criar uma terceira resposta para a mesma pergunta.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarCargoSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar cargo em nome de outro facilitador");
  }

  return db.transaction(async (tx) => {
    const [dono] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, facilitadorId), eq(usuarios.is_deleted, false)))
      .limit(1);

    if (!dono) throw new RecusaDeRegra("Facilitador nao encontrado");
    if (!dono.ativo) throw new RecusaDeRegra("Facilitador inativo");

    const [novo] = await tx
      .insert(cargos)
      .values({
        facilitador_id: facilitadorId,
        nome: validado.nome,
        alvo_d: validado.alvo_d,
        alvo_i: validado.alvo_i,
        alvo_s: validado.alvo_s,
        alvo_c: validado.alvo_c,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: novo!.id,
        detalhes: `Criou o cargo "${novo!.nome}"`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo!;
  });
}

/**
 * Atualiza o cargo, com optimistic locking.
 *
 * O WHERE compara `updated_at` com o valor que a tela leu. Se outra aba gravou
 * nesse meio tempo, nenhuma linha casa e a gravacao e recusada em vez de
 * sobrescrever o trabalho alheio.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarCargoSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Cargo nao encontrado");

  const resultado = await db
    .update(cargos)
    .set({
      nome: validado.nome,
      alvo_d: validado.alvo_d,
      alvo_i: validado.alvo_i,
      alvo_s: validado.alvo_s,
      alvo_c: validado.alvo_c,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(cargos.id, id),
        eq(cargos.updated_at, updatedAtOriginal),
        eq(cargos.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Este cargo foi alterado por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou o cargo "${resultado[0]!.nome}"`,
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0]!;
}

/**
 * Delete logico. Nunca apaga a linha.
 *
 * Nao ha guarda de dependente porque nada pendura no cargo ainda — a
 * comparacao de candidato le o alvo na hora, e nao guarda referencia. Quando
 * houver, a guarda entra aqui, como em `turmas.excluir`.
 */
export async function excluir(id: string) {
  const sessao = await exigirSessao("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Cargo nao encontrado");

  const resultado = await db
    .update(cargos)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(cargos.id, id), eq(cargos.is_deleted, false), escopoDoDono(sessao)))
    .returning();

  if (resultado.length === 0) throw new RecusaDeRegra("Cargo nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "excluir",
    tabela: TABELA,
    registroId: id,
    detalhes: `Excluiu (logico) o cargo "${anterior.nome}"`,
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
