/**
 * O vinculo entre o Territorio da Empresa e os inventarios que ele consolida.
 *
 * Separado de `actions/territorios.ts` como `envio-lote.ts` e separado de
 * `assessments.ts`: e outro fluxo, com outra tela, e junto os dois passariam de
 * 600 linhas. O que NAO se repete aqui: a guarda de permissao, que vem de
 * `lib/territorios.ts`, e o recorte por dono, que vem de `obter` — duas copias
 * de qualquer uma das duas seriam duas respostas para a mesma pergunta.
 *
 * Vincular e desvincular sao `territorios:atualizar`: o vinculo e o CONTEUDO do
 * territorio, e nao um recurso com permissao propria.
 */
"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { assessments, territoriosAssessments, turmas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { vincularInventarioSchema } from "@/lib/validators/territorio";
import { exigirSessaoDeTerritorio } from "@/lib/territorios";
import { obter } from "./territorios";
import { paraTela, RecusaDeRegra } from "./recusa";

const TABELA = "territorios";
const TELA = "/facilitador/territorio-da-empresa";

/**
 * Os mapas do dono do territorio que ainda NAO estao nele — o que a tela
 * oferece em "Adicionar inventario".
 *
 * Mostra tambem o que ainda nao foi respondido: o parceiro monta o territorio
 * junto com o envio, e esconder o pendente o obrigaria a voltar depois. Quem
 * nao tem contador fica de fora da MEDIA, e nao da lista.
 */
export async function inventariosDisponiveis(territorioId: string) {
  const territorio = await obter(territorioId);
  if (!territorio) throw new RecusaDeRegra("Territorio nao encontrado");

  const jaVinculados = db
    .select({ id: territoriosAssessments.assessment_id })
    .from(territoriosAssessments)
    .where(
      and(
        eq(territoriosAssessments.territorio_id, territorioId),
        eq(territoriosAssessments.is_deleted, false),
      ),
    );

  return db
    .select({
      id: assessments.id,
      avaliado_nome: assessments.avaliado_nome,
      avaliado_email: assessments.avaliado_email,
      situacao: assessments.situacao,
      concluido_em: assessments.concluido_em,
      created_at: assessments.created_at,
    })
    .from(assessments)
    .where(
      and(
        // O dono do TERRITORIO, e nao o da sessao: assim o admin, que ve as
        // linhas de todos, tambem so recebe mapas que podem entrar aqui.
        eq(assessments.facilitador_id, territorio.facilitador_id),
        eq(assessments.is_deleted, false),
        sql`${assessments.id} not in (${jaVinculados})`,
      ),
    )
    .orderBy(desc(assessments.created_at));
}

/**
 * Pendura um mapa no territorio.
 *
 * O dono do vinculo e o dono do TERRITORIO, e nao o da sessao: e isso que faz a
 * FK composta `fk_territorios_assessments_assessment_dono` recusar, no BANCO,
 * um mapa de outro parceiro — inclusive quando quem esta logado e o admin, que
 * ve as linhas de todos. Sem isso a media de um territorio poderia misturar
 * gente de duas empresas de dois parceiros diferentes.
 */
export async function vincularInventario(territorioId: string, assessmentId: string) {
  const sessao = await exigirSessaoDeTerritorio("atualizar");
  const validado = vincularInventarioSchema.parse({
    territorio_id: territorioId,
    assessment_id: assessmentId,
  });

  const territorio = await obter(validado.territorio_id);
  if (!territorio) throw new RecusaDeRegra("Territorio nao encontrado");

  const [mapa] = await db
    .select({ id: assessments.id, nome: assessments.avaliado_nome })
    .from(assessments)
    .where(
      and(
        eq(assessments.id, validado.assessment_id),
        eq(assessments.facilitador_id, territorio.facilitador_id),
        eq(assessments.is_deleted, false),
      ),
    )
    .limit(1);

  if (!mapa) throw new RecusaDeRegra("Mapa nao encontrado");

  return db.transaction(async (tx) => {
    const [jaEsta] = await tx
      .select({ id: territoriosAssessments.id })
      .from(territoriosAssessments)
      .where(
        and(
          eq(territoriosAssessments.territorio_id, territorio.id),
          eq(territoriosAssessments.assessment_id, mapa.id),
          eq(territoriosAssessments.is_deleted, false),
        ),
      )
      .limit(1);

    // O mesmo mapa duas vezes contaria a pessoa em dobro e puxaria a media do
    // grupo para o perfil dela. O indice unico parcial tambem recusa; aqui a
    // recusa ganha frase, em vez de chegar a tela como falha de banco.
    if (jaEsta) throw new RecusaDeRegra("Este inventario ja esta neste territorio");

    const [vinculo] = await tx
      .insert(territoriosAssessments)
      .values({
        territorio_id: territorio.id,
        assessment_id: mapa.id,
        facilitador_id: territorio.facilitador_id,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "atualizar",
        tabela: TABELA,
        registroId: territorio.id,
        detalhes: `Vinculou o inventario de "${mapa.nome}" ao territorio "${territorio.nome}"`,
        dadosNovos: vinculo,
      },
      tx,
    );

    return vinculo!;
  });
}

/**
 * Tira o mapa do territorio. Soft delete do VINCULO, nunca do mapa.
 *
 * O indice unico e parcial justamente para isto: vincular de novo depois tem de
 * funcionar, e com indice cheio o par (territorio, mapa) ficaria ocupado para
 * sempre pela linha desvinculada.
 */
export async function desvincularInventario(territorioId: string, assessmentId: string) {
  const sessao = await exigirSessaoDeTerritorio("atualizar");
  const validado = vincularInventarioSchema.parse({
    territorio_id: territorioId,
    assessment_id: assessmentId,
  });

  const territorio = await obter(validado.territorio_id);
  if (!territorio) throw new RecusaDeRegra("Territorio nao encontrado");

  const agora = new Date();

  const resultado = await db
    .update(territoriosAssessments)
    .set({
      is_deleted: true,
      deleted_at: agora,
      updated_at: agora,
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(territoriosAssessments.territorio_id, territorio.id),
        eq(territoriosAssessments.assessment_id, validado.assessment_id),
        eq(territoriosAssessments.is_deleted, false),
      ),
    )
    .returning();

  if (resultado.length === 0) throw new RecusaDeRegra("Este inventario nao esta neste territorio");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: territorio.id,
    detalhes: `Desvinculou um inventario do territorio "${territorio.nome}"`,
    dadosAnteriores: resultado[0],
  });

  return resultado[0]!;
}

/**
 * Vincula de uma vez todos os mapas de um grupo de mapeamento — o botao
 * "Adicionar grupo" da tela.
 *
 * E atalho, e nao vinculo com a turma: o que o territorio consolida sao MAPAS.
 * Guardar "este territorio tem este grupo" criaria duas respostas para "quais
 * inventarios estao aqui?", e a do grupo mudaria sozinha a cada mapa
 * adicionado ou removido do grupo depois.
 *
 * Quem ja esta vinculado e ignorado em vez de recusar: o parceiro que adiciona
 * o grupo depois de ter posto uma pessoa dele na mao quer o resto, e nao uma
 * mensagem de erro.
 */
export async function vincularGrupo(territorioId: string, turmaId: string) {
  const sessao = await exigirSessaoDeTerritorio("atualizar");

  const territorio = await obter(territorioId);
  if (!territorio) throw new RecusaDeRegra("Territorio nao encontrado");

  const [turma] = await db
    .select({ id: turmas.id, nome: turmas.nome })
    .from(turmas)
    .where(
      and(
        eq(turmas.id, turmaId),
        eq(turmas.facilitador_id, territorio.facilitador_id),
        eq(turmas.is_deleted, false),
      ),
    )
    .limit(1);

  if (!turma) throw new RecusaDeRegra("Grupo de mapeamento nao encontrado");

  return db.transaction(async (tx) => {
    const doGrupo = await tx
      .select({ id: assessments.id })
      .from(assessments)
      .where(
        and(
          eq(assessments.turma_id, turma.id),
          eq(assessments.facilitador_id, territorio.facilitador_id),
          eq(assessments.is_deleted, false),
        ),
      );

    if (doGrupo.length === 0) throw new RecusaDeRegra("Este grupo ainda nao tem inventario");

    const jaVinculados = await tx
      .select({ assessment_id: territoriosAssessments.assessment_id })
      .from(territoriosAssessments)
      .where(
        and(
          eq(territoriosAssessments.territorio_id, territorio.id),
          eq(territoriosAssessments.is_deleted, false),
          inArray(
            territoriosAssessments.assessment_id,
            doGrupo.map((mapa) => mapa.id),
          ),
        ),
      );

    const tomados = new Set(jaVinculados.map((linha) => linha.assessment_id));
    const novos = doGrupo.filter((mapa) => !tomados.has(mapa.id));

    if (novos.length === 0) return { vinculados: 0 };

    await tx.insert(territoriosAssessments).values(
      novos.map((mapa) => ({
        territorio_id: territorio.id,
        assessment_id: mapa.id,
        facilitador_id: territorio.facilitador_id,
        modified_by: sessao.userId,
      })),
    );

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "atualizar",
        tabela: TABELA,
        registroId: territorio.id,
        detalhes: `Vinculou ${novos.length} inventario(s) do grupo "${turma.nome}" ao territorio "${territorio.nome}"`,
      },
      tx,
    );

    return { vinculados: novos.length };
  });
}

// --- portas da tela: recusa vira objeto, falha de verdade continua subindo ---

export async function vincularInventarioPelaTela(territorioId: string, assessmentId: string) {
  return paraTela(TELA, () => vincularInventario(territorioId, assessmentId));
}

export async function desvincularInventarioPelaTela(territorioId: string, assessmentId: string) {
  return paraTela(TELA, () => desvincularInventario(territorioId, assessmentId));
}

export async function vincularGrupoPelaTela(territorioId: string, turmaId: string) {
  return paraTela(TELA, () => vincularGrupo(territorioId, turmaId));
}
