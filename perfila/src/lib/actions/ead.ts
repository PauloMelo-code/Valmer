/**
 * Escrita do programa do curso: modulo e aula.
 *
 * Antes disto o programa era o textarea `cursos.conteudo`, e por isso a aba
 * /facilitador/biblioteca-gravada nao tinha o que espelhar — mostrava sete titulos escritos em
 * `data/aprendizado.ts`. Aqui o modulo vira linha, a aula vira linha, e a aba
 * do parceiro passa a ler o que o admin publicou.
 *
 * Mesma estrutura de `actions/precos.ts` e `actions/turmas.ts`: sessao exigida
 * na entrada, transacao com a trilha dentro, optimistic locking por
 * `updated_at` e recusa de regra separada de falha.
 *
 * NAO HA RECORTE POR DONO, e o porque esta em `db/schema/ead.ts`: o curso e da
 * plataforma, escrito pelo dono do negocio. Quem restringe e o rbac (`cursos:*`
 * so admin); a LEITURA e aberta e mora em `lib/ead.ts`.
 *
 * O ENVIO DO VIDEO NAO ESTA NESTE ARQUIVO: e `actions/ead-video.ts`, porque o
 * video nao passa por Server Action nenhuma — o navegador manda direto para o
 * bucket e o servidor so assina e confere.
 *
 * NAO HA ACTION DE RENOMEAR. Titulo errado se resolve excluindo e recriando, o
 * que a tela faz em dois cliques, e o programa e curto. Se a edicao no lugar
 * passar a fazer falta, ela nasce igual a `precos.atualizarRelatorio`.
 */
"use server";

import { and, asc, desc, eq, gt, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Direcao } from "@/lib/ead";
import { cursoAulas, cursoModulos, cursos } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { aulaSchema, moduloSchema } from "@/lib/validators/ead";
import { paraTela, RecusaDeRegra } from "./recusa";

const RECURSO = "cursos";
const TELA = "/admin/cursos";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, RECURSO, acao)) {
    throw new Error(`Sem permissao para ${acao} cursos`);
  }
  return sessao;
}

// ---------------------------------------------------------------------------
// Modulos
// ---------------------------------------------------------------------------

/**
 * Cria um modulo no fim do curso.
 *
 * A posicao nasce como "o ultimo + 1", lida DENTRO da transacao: duas abas
 * criando ao mesmo tempo pegariam o mesmo numero se a leitura ficasse fora, e
 * o desempate por `created_at` do ORDER BY resolveria a exibicao — mas as duas
 * apareceriam empatadas na tela de reordenar.
 */
export async function criarModulo(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = moduloSchema.parse(dados);

  return db.transaction(async (tx) => {
    const [curso] = await tx
      .select()
      .from(cursos)
      .where(and(eq(cursos.id, validado.curso_id), eq(cursos.is_deleted, false)))
      .limit(1);

    if (!curso) throw new RecusaDeRegra("Curso nao encontrado");

    const [ultimo] = await tx
      .select({ ordem: cursoModulos.ordem })
      .from(cursoModulos)
      .where(
        and(
          eq(cursoModulos.curso_id, validado.curso_id),
          eq(cursoModulos.is_deleted, false),
        ),
      )
      .orderBy(desc(cursoModulos.ordem))
      .limit(1);

    const [novo] = await tx
      .insert(cursoModulos)
      .values({
        curso_id: validado.curso_id,
        titulo: validado.titulo,
        ordem: (ultimo?.ordem ?? 0) + 1,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: "curso_modulos",
        registroId: novo!.id,
        detalhes: `Criou o modulo "${novo!.titulo}" no curso "${curso.titulo}"`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo!;
  });
}

/**
 * Descontinua um modulo. Delete logico, como todo delete deste projeto.
 *
 * O modulo com aula dentro NAO sai: as aulas continuariam vivas apontando para
 * um pai invisivel, some do admin e some da aba do parceiro sem nunca terem
 * sido excluidas — dado orfao que ninguem mais alcanca para apagar. Mesma
 * guarda de `turmas.excluir` com assessment dentro.
 */
export async function excluirModulo(id: string) {
  const sessao = await exigirSessao("deletar");

  return db.transaction(async (tx) => {
    const [anterior] = await tx
      .select()
      .from(cursoModulos)
      .where(and(eq(cursoModulos.id, id), eq(cursoModulos.is_deleted, false)))
      .limit(1);

    if (!anterior) throw new RecusaDeRegra("Modulo nao encontrado");

    const dentro = await tx
      .select({ id: cursoAulas.id })
      .from(cursoAulas)
      .where(and(eq(cursoAulas.modulo_id, id), eq(cursoAulas.is_deleted, false)));

    if (dentro.length > 0) {
      throw new RecusaDeRegra(
        `Este modulo ainda tem ${dentro.length} aula(s). Exclua as aulas antes de excluir o modulo.`,
      );
    }

    const [excluido] = await tx
      .update(cursoModulos)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        modified_by: sessao.userId,
      })
      .where(and(eq(cursoModulos.id, id), eq(cursoModulos.is_deleted, false)))
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "excluir",
        tabela: "curso_modulos",
        registroId: id,
        detalhes: `Excluiu (logico) o modulo "${anterior.titulo}"`,
        dadosAnteriores: anterior,
      },
      tx,
    );

    return excluido!;
  });
}

/**
 * Sobe ou desce um modulo dentro do curso.
 *
 * DUAS LINHAS, SEMPRE DUAS: troca o `ordem` do alvo com o do vizinho. Renumerar
 * a lista inteira a cada clique seria N updates para mover uma posicao, e com
 * o optimistic locking do projeto cada uma dessas N linhas seria uma chance a
 * mais de a gravacao ser recusada por um motivo que ninguem entenderia.
 *
 * O optimistic locking vale para o ALVO — a linha em que se clicou —, e nao
 * para o vizinho: a troca acontece dentro da mesma transacao, entao ou as duas
 * gravam ou nenhuma, e exigir o `updated_at` do vizinho pediria a tela mandar
 * um dado que ela nao tem motivo para conhecer.
 */
export async function moverModulo(id: string, direcao: Direcao, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");

  return db.transaction(async (tx) => {
    const [alvo] = await tx
      .select()
      .from(cursoModulos)
      .where(and(eq(cursoModulos.id, id), eq(cursoModulos.is_deleted, false)))
      .limit(1);

    if (!alvo) throw new RecusaDeRegra("Modulo nao encontrado");

    const [vizinho] = await tx
      .select()
      .from(cursoModulos)
      .where(
        and(
          eq(cursoModulos.curso_id, alvo.curso_id),
          eq(cursoModulos.is_deleted, false),
          direcao === "cima"
            ? lt(cursoModulos.ordem, alvo.ordem)
            : gt(cursoModulos.ordem, alvo.ordem),
        ),
      )
      .orderBy(direcao === "cima" ? desc(cursoModulos.ordem) : asc(cursoModulos.ordem))
      .limit(1);

    if (!vizinho) {
      throw new RecusaDeRegra(
        direcao === "cima" ? "Este modulo ja e o primeiro." : "Este modulo ja e o ultimo.",
      );
    }

    const trocado = await tx
      .update(cursoModulos)
      .set({ ordem: vizinho.ordem, updated_at: new Date(), modified_by: sessao.userId })
      .where(
        and(
          eq(cursoModulos.id, alvo.id),
          eq(cursoModulos.updated_at, updatedAtOriginal),
          eq(cursoModulos.is_deleted, false),
        ),
      )
      .returning();

    if (trocado.length === 0) {
      throw new RecusaDeRegra(
        "Este modulo foi alterado por outra aba. Recarregue a pagina e tente de novo.",
      );
    }

    await tx
      .update(cursoModulos)
      .set({ ordem: alvo.ordem, updated_at: new Date(), modified_by: sessao.userId })
      .where(and(eq(cursoModulos.id, vizinho.id), eq(cursoModulos.is_deleted, false)));

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "atualizar",
        tabela: "curso_modulos",
        registroId: alvo.id,
        detalhes: `Moveu o modulo "${alvo.titulo}" para ${direcao} (trocou com "${vizinho.titulo}")`,
        dadosAnteriores: alvo,
        dadosNovos: trocado[0],
      },
      tx,
    );

    return trocado[0]!;
  });
}

// ---------------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------------

/**
 * Cria a aula no fim do modulo, SEM VIDEO.
 *
 * Nascer pendente e de proposito, e nao um passo faltando: o admin monta o
 * programa inteiro de uma vez e sobe as gravacoes conforme elas ficam prontas.
 * A aba do parceiro ja mostra a aula, marcada como pendente — ver a nota de
 * `lib/ead.ts:trilhaPublicada`.
 */
export async function criarAula(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = aulaSchema.parse(dados);

  return db.transaction(async (tx) => {
    const [modulo] = await tx
      .select()
      .from(cursoModulos)
      .where(and(eq(cursoModulos.id, validado.modulo_id), eq(cursoModulos.is_deleted, false)))
      .limit(1);

    if (!modulo) throw new RecusaDeRegra("Modulo nao encontrado");

    const [ultima] = await tx
      .select({ ordem: cursoAulas.ordem })
      .from(cursoAulas)
      .where(and(eq(cursoAulas.modulo_id, validado.modulo_id), eq(cursoAulas.is_deleted, false)))
      .orderBy(desc(cursoAulas.ordem))
      .limit(1);

    const [nova] = await tx
      .insert(cursoAulas)
      .values({
        modulo_id: validado.modulo_id,
        titulo: validado.titulo,
        ordem: (ultima?.ordem ?? 0) + 1,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: "curso_aulas",
        registroId: nova!.id,
        detalhes: `Criou a aula "${nova!.titulo}" no modulo "${modulo.titulo}", ainda sem video`,
        dadosNovos: nova,
      },
      tx,
    );

    return nova!;
  });
}

/**
 * Descontinua uma aula. Delete logico.
 *
 * O VIDEO NO BUCKET FICA. Apagar o objeto aqui tornaria o delete logico
 * irreversivel na pratica: a linha volta com um `is_deleted = false`, mas o
 * arquivo nao volta de lugar nenhum. O preco e um objeto que ninguem alcanca —
 * ver a pendencia 13 de `docs/infra.md`, que ja trata a limpeza do bucket.
 */
export async function excluirAula(id: string) {
  const sessao = await exigirSessao("deletar");

  return db.transaction(async (tx) => {
    const [anterior] = await tx
      .select()
      .from(cursoAulas)
      .where(and(eq(cursoAulas.id, id), eq(cursoAulas.is_deleted, false)))
      .limit(1);

    if (!anterior) throw new RecusaDeRegra("Aula nao encontrada");

    const [excluida] = await tx
      .update(cursoAulas)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        modified_by: sessao.userId,
      })
      .where(and(eq(cursoAulas.id, id), eq(cursoAulas.is_deleted, false)))
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "excluir",
        tabela: "curso_aulas",
        registroId: id,
        detalhes: `Excluiu (logico) a aula "${anterior.titulo}"`,
        dadosAnteriores: anterior,
      },
      tx,
    );

    return excluida!;
  });
}

/** Sobe ou desce uma aula dentro do modulo. Ver a nota de `moverModulo`. */
export async function moverAula(id: string, direcao: Direcao, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");

  return db.transaction(async (tx) => {
    const [alvo] = await tx
      .select()
      .from(cursoAulas)
      .where(and(eq(cursoAulas.id, id), eq(cursoAulas.is_deleted, false)))
      .limit(1);

    if (!alvo) throw new RecusaDeRegra("Aula nao encontrada");

    const [vizinha] = await tx
      .select()
      .from(cursoAulas)
      .where(
        and(
          eq(cursoAulas.modulo_id, alvo.modulo_id),
          eq(cursoAulas.is_deleted, false),
          direcao === "cima" ? lt(cursoAulas.ordem, alvo.ordem) : gt(cursoAulas.ordem, alvo.ordem),
        ),
      )
      .orderBy(direcao === "cima" ? desc(cursoAulas.ordem) : asc(cursoAulas.ordem))
      .limit(1);

    if (!vizinha) {
      throw new RecusaDeRegra(
        direcao === "cima" ? "Esta aula ja e a primeira." : "Esta aula ja e a ultima.",
      );
    }

    const trocada = await tx
      .update(cursoAulas)
      .set({ ordem: vizinha.ordem, updated_at: new Date(), modified_by: sessao.userId })
      .where(
        and(
          eq(cursoAulas.id, alvo.id),
          eq(cursoAulas.updated_at, updatedAtOriginal),
          eq(cursoAulas.is_deleted, false),
        ),
      )
      .returning();

    if (trocada.length === 0) {
      throw new RecusaDeRegra(
        "Esta aula foi alterada por outra aba. Recarregue a pagina e tente de novo.",
      );
    }

    await tx
      .update(cursoAulas)
      .set({ ordem: alvo.ordem, updated_at: new Date(), modified_by: sessao.userId })
      .where(and(eq(cursoAulas.id, vizinha.id), eq(cursoAulas.is_deleted, false)));

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "atualizar",
        tabela: "curso_aulas",
        registroId: alvo.id,
        detalhes: `Moveu a aula "${alvo.titulo}" para ${direcao} (trocou com "${vizinha.titulo}")`,
        dadosAnteriores: alvo,
        dadosNovos: trocada[0],
      },
      tx,
    );

    return trocada[0]!;
  });
}

// ---------------------------------------------------------------------------
// Portas de tela
// ---------------------------------------------------------------------------
//
// Recusa de regra e erro de validacao voltam como objeto; falha de verdade
// continua subindo. Mesmo contrato de `actions/recusa.ts:paraTela`, e pelo
// mesmo motivo: uma Server Action que lanca entrega ao navegador um digest
// opaco em producao, e "este modulo ainda tem 3 aulas" chegaria com a mesma
// cara de "o banco caiu".

export async function criarModuloPelaTela(dados: unknown) {
  return paraTela(TELA, () => criarModulo(dados));
}

export async function excluirModuloPelaTela(id: string) {
  return paraTela(TELA, () => excluirModulo(id));
}

export async function moverModuloPelaTela(id: string, direcao: Direcao, updatedAt: Date) {
  return paraTela(TELA, () => moverModulo(id, direcao, updatedAt));
}

export async function criarAulaPelaTela(dados: unknown) {
  return paraTela(TELA, () => criarAula(dados));
}

export async function excluirAulaPelaTela(id: string) {
  return paraTela(TELA, () => excluirAula(id));
}

export async function moverAulaPelaTela(id: string, direcao: Direcao, updatedAt: Date) {
  return paraTela(TELA, () => moverAula(id, direcao, updatedAt));
}
