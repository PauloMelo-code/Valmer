/**
 * Regra de negocio do Territorio da Empresa — o perfil coletivo de uma empresa.
 *
 * Mesma estrutura de `actions/cargos.ts`, e de proposito: sessao exigida na
 * entrada, recorte por dono no WHERE, transacao com a trilha dentro,
 * optimistic locking por `updated_at` e recusa de regra separada de falha.
 * Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 *
 * O territorio e a lista dele estao aqui; vincular e desvincular inventario
 * estao em `actions/territorios-vinculos.ts`, pelo mesmo motivo que
 * `envio-lote.ts` nao mora dentro de `assessments.ts`: e outro fluxo, com
 * outra tela, e junto os dois passariam de 600 linhas. A guarda de permissao e
 * UMA, importada de `lib/territorios.ts` pelos dois.
 */
"use server";

import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { assessments, territorios, territoriosAssessments, usuarios } from "@/lib/db/schema";
import type { Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import {
  atualizarTerritorioSchema,
  criarTerritorioSchema,
  slugDoNome,
} from "@/lib/validators/territorio";
import {
  exigirSessaoDeTerritorio,
  perfilDoTerritorio,
  type PerfilDoTerritorio,
} from "@/lib/territorios";
import { perfisDosMapas } from "@/lib/perfil-do-mapa";
import { paraTela, RecusaDeRegra } from "./recusa";

const TABELA = "territorios";
const TELA = "/facilitador/territorio-da-empresa";

/** So a parte de `db` que `slugLivre` usa, para nao importar os tipos de tx. */
type Leitor = Pick<typeof db, "select">;

/** Recorte por dono: o parceiro so enxerga e mexe nos territorios dele. */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(territorios.facilitador_id, sessao.userId);
}

/**
 * Os territorios visiveis para a sessao, do mais novo para o mais antigo.
 *
 * A contagem de inventarios vem de COUNT sobre os vinculos, e NUNCA de coluna
 * gravada: numero calculavel guardado desencontra do dado no primeiro vinculo
 * feito ou desfeito fora desta funcao — e o CONTINUIDADE.md ja registra esse
 * erro no campo `perfil` do assessment.
 *
 * `leftJoin` porque territorio recem-criado nao tem vinculo nenhum, e com
 * `inner` ele sumiria da propria lista logo depois de ser criado — que e
 * exatamente a tela que o parceiro olha em seguida.
 */
export async function listar() {
  const sessao = await exigirSessaoDeTerritorio("ler");

  return db
    .select({
      id: territorios.id,
      facilitador_id: territorios.facilitador_id,
      nome: territorios.nome,
      slug: territorios.slug,
      descricao: territorios.descricao,
      created_at: territorios.created_at,
      updated_at: territorios.updated_at,
      criado_por: usuarios.nome,
      inventarios: sql<number>`coalesce(count(${territoriosAssessments.id}), 0)::int`,
    })
    .from(territorios)
    .innerJoin(usuarios, eq(usuarios.id, territorios.facilitador_id))
    .leftJoin(
      territoriosAssessments,
      and(
        eq(territoriosAssessments.territorio_id, territorios.id),
        eq(territoriosAssessments.is_deleted, false),
      ),
    )
    .where(and(eq(territorios.is_deleted, false), escopoDoDono(sessao)))
    .groupBy(territorios.id, usuarios.nome)
    .orderBy(desc(territorios.created_at));
}

/** Um territorio pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessaoDeTerritorio("ler");

  const [registro] = await db
    .select()
    .from(territorios)
    .where(and(eq(territorios.id, id), eq(territorios.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Um territorio pelo slug, que e o que vem na URL.
 *
 * O slug e unico POR DONO, e nao global (ver o indice parcial no schema): dois
 * parceiros podem ter "matriz", e cada um alcanca so a sua porque o recorte do
 * dono esta no WHERE. Para o admin, que ve as linhas de todos, um slug repetido
 * e ambiguo — a tela dele identifica territorio por id, e nao por slug.
 */
export async function obterPorSlug(slug: string) {
  const sessao = await exigirSessaoDeTerritorio("ler");

  const [registro] = await db
    .select()
    .from(territorios)
    .where(
      and(eq(territorios.slug, slug), eq(territorios.is_deleted, false), escopoDoDono(sessao)),
    )
    .orderBy(desc(territorios.created_at))
    .limit(1);

  return registro ?? null;
}

/**
 * O territorio pelo slug com as medias e os respondentes — o que a tela de
 * detalhe mostra, numa chamada.
 *
 * As medias saem do perfil de cada mapa vinculado (`lib/perfil-do-mapa.ts`:
 * contadores no legado, resultado do motor no MC-INV 2.2), via
 * `lib/territorios.ts`, que tambem documenta a escala.
 * Nao existe coluna de media, e nao vai existir: ela mudaria a cada mapa
 * respondido e a cada vinculo, e a versao gravada passaria a discordar da lista
 * de respondentes logo embaixo dela, na mesma tela.
 */
export async function detalhe(slug: string): Promise<
  | (PerfilDoTerritorio & {
      territorio: NonNullable<Awaited<ReturnType<typeof obterPorSlug>>>;
    })
  | null
> {
  const territorio = await obterPorSlug(slug);
  if (!territorio) return null;

  const vinculados = await db
    .select({
      assessment_id: assessments.id,
      avaliado_nome: assessments.avaliado_nome,
      avaliado_email: assessments.avaliado_email,
      versao_instrumento: assessments.versao_instrumento,
      contador_d: assessments.contador_d,
      contador_i: assessments.contador_i,
      contador_s: assessments.contador_s,
      contador_c: assessments.contador_c,
      concluido_em: assessments.concluido_em,
    })
    .from(territoriosAssessments)
    .innerJoin(assessments, eq(assessments.id, territoriosAssessments.assessment_id))
    .where(
      and(
        eq(territoriosAssessments.territorio_id, territorio.id),
        eq(territoriosAssessments.is_deleted, false),
        eq(assessments.is_deleted, false),
      ),
    )
    .orderBy(desc(assessments.concluido_em));

  const perfis = await perfisDosMapas(
    vinculados.map((mapa) => ({ ...mapa, id: mapa.assessment_id })),
  );

  return {
    territorio,
    ...perfilDoTerritorio(
      vinculados.map((mapa) => ({ ...mapa, perfil: perfis.get(mapa.assessment_id) ?? null })),
    ),
  };
}

/**
 * Slug livre para este dono.
 *
 * "Matriz" cadastrada duas vezes pelo mesmo parceiro e normal — sao dois
 * clientes dele. O indice unico recusaria a segunda com erro de banco, que
 * chegaria a tela como falha e nao como "escolha outro nome"; o sufixo resolve
 * sem pedir nada ao parceiro. A corrida continua fechada pelo indice: dois
 * cadastros simultaneos do mesmo nome passam os dois por aqui e o BANCO recusa
 * o segundo — o que se evita aqui e o caso comum, nao o instantaneo.
 */
async function slugLivre(base: string, facilitadorId: string, tx: Leitor): Promise<string> {
  const existentes = await tx
    .select({ slug: territorios.slug })
    .from(territorios)
    .where(
      and(
        eq(territorios.facilitador_id, facilitadorId),
        eq(territorios.is_deleted, false),
        or(eq(territorios.slug, base), like(territorios.slug, `${base}-%`)),
      ),
    );

  const tomados = new Set(existentes.map((linha) => linha.slug));
  if (!tomados.has(base)) return base;

  for (let sufixo = 2; sufixo < 1000; sufixo += 1) {
    const candidato = `${base}-${sufixo}`;
    if (!tomados.has(candidato)) return candidato;
  }

  throw new RecusaDeRegra("Ja existem territorios demais com este nome");
}

/**
 * Cria o territorio.
 *
 * A transacao existe pela trilha: com o `registrarAuditoria` fora dela, uma
 * falha ao gravar a trilha derrubaria a action DEPOIS do commit, e o parceiro
 * cadastraria a mesma empresa de novo achando que a primeira nao existiu.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessaoDeTerritorio("criar");
  const validado = criarTerritorioSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar territorio em nome de outro facilitador");
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
      .insert(territorios)
      .values({
        facilitador_id: facilitadorId,
        nome: validado.nome,
        slug: await slugLivre(slugDoNome(validado.nome), facilitadorId, tx),
        descricao: validado.descricao,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: novo!.id,
        detalhes: `Criou o territorio "${novo!.nome}"`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo!;
  });
}

/**
 * Atualiza o territorio, com optimistic locking.
 *
 * O WHERE compara `updated_at` com o valor que a tela leu. Se outra aba gravou
 * nesse meio tempo, nenhuma linha casa e a gravacao e recusada em vez de
 * sobrescrever o trabalho alheio.
 *
 * O slug NAO acompanha o nome: o link do territorio ja foi enviado ao cliente,
 * e trocar a URL ao renomear a empresa quebraria esse link em silencio.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessaoDeTerritorio("atualizar");
  const validado = atualizarTerritorioSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Territorio nao encontrado");

  const resultado = await db
    .update(territorios)
    .set({
      nome: validado.nome,
      descricao: validado.descricao,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(territorios.id, id),
        eq(territorios.updated_at, updatedAtOriginal),
        eq(territorios.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Este territorio foi alterado por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou o territorio "${resultado[0]!.nome}"`,
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0]!;
}

/**
 * Delete logico. Nunca apaga a linha.
 *
 * NAO recusa por vinculo, e a diferenca com `turmas.excluir` e proposital: o
 * vinculo nao e um dependente com vida propria, e o CONTEUDO do territorio. Os
 * mapas continuam inteiros, na lista de mapas, com relatorio e devolutiva —
 * quem desaparece e a leitura coletiva. Obrigar o parceiro a desvincular 69
 * inventarios antes de apagar uma empresa seria burocracia que nao protege
 * dado nenhum.
 *
 * Os vinculos caem JUNTO, na mesma transacao: vinculo ativo apontando para
 * territorio invisivel faz "quantos inventarios estao neste territorio?"
 * responder um numero para um territorio que nao existe mais.
 */
export async function excluir(id: string) {
  const sessao = await exigirSessaoDeTerritorio("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Territorio nao encontrado");

  const agora = new Date();

  return db.transaction(async (tx) => {
    const resultado = await tx
      .update(territorios)
      .set({
        is_deleted: true,
        deleted_at: agora,
        updated_at: agora,
        modified_by: sessao.userId,
      })
      .where(and(eq(territorios.id, id), eq(territorios.is_deleted, false), escopoDoDono(sessao)))
      .returning();

    if (resultado.length === 0) throw new RecusaDeRegra("Territorio nao encontrado");

    const vinculos = await tx
      .update(territoriosAssessments)
      .set({
        is_deleted: true,
        deleted_at: agora,
        updated_at: agora,
        modified_by: sessao.userId,
      })
      .where(
        and(
          eq(territoriosAssessments.territorio_id, id),
          eq(territoriosAssessments.is_deleted, false),
        ),
      )
      .returning({ id: territoriosAssessments.id });

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "excluir",
        tabela: TABELA,
        registroId: id,
        detalhes: `Excluiu (logico) o territorio "${anterior.nome}" e ${vinculos.length} vinculo(s)`,
        dadosAnteriores: anterior,
      },
      tx,
    );

    return resultado[0]!;
  });
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
