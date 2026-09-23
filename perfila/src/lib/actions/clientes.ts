/**
 * Regra de negocio dos clientes — a pessoa avaliada, na carteira do parceiro.
 *
 * Mesma estrutura de `actions/turmas.ts`, e de proposito: sessao exigida na
 * entrada, recorte por dono no WHERE, transacao com a trilha dentro,
 * optimistic locking por `updated_at` e recusa de regra separada de falha.
 * Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 */
"use server";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { atualizarClienteSchema, criarClienteSchema } from "@/lib/validators/cliente";
import { paraTela, RecusaDeRegra } from "./recusa";

const TABELA = "clientes";
const TELA = "/facilitador/meus-clientes";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} clientes`);
  }
  return sessao;
}

/**
 * Recorte por dono: o parceiro so enxerga a propria carteira.
 *
 * Aqui isso pesa mais que nas outras tabelas — a carteira e a lista de quem o
 * concorrente atende, e ela vazar por inteiro e o pior estrago possivel neste
 * produto.
 */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(clientes.facilitador_id, sessao.userId);
}

/** Os clientes visiveis para a sessao, do mais novo para o mais antigo. */
export async function listar() {
  const sessao = await exigirSessao("ler");

  return db
    .select({
      id: clientes.id,
      facilitador_id: clientes.facilitador_id,
      nome: clientes.nome,
      email: clientes.email,
      celular: clientes.celular,
      created_at: clientes.created_at,
      updated_at: clientes.updated_at,
      dono: usuarios.nome,
    })
    .from(clientes)
    .innerJoin(usuarios, eq(usuarios.id, clientes.facilitador_id))
    .where(and(eq(clientes.is_deleted, false), escopoDoDono(sessao)))
    .orderBy(desc(clientes.created_at));
}

/** Um cliente pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessao("ler");

  const [registro] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Cria o cliente.
 *
 * A consulta de duplicidade existe para a recusa ter NOME: o indice unico
 * parcial ja recusaria, mas com "duplicate key value violates unique
 * constraint" na cara do parceiro. O indice continua sendo a garantia — esta
 * consulta e a mensagem.
 *
 * A transacao existe pela trilha: com o `registrarAuditoria` fora dela, uma
 * falha ao gravar a trilha derrubaria a action DEPOIS do commit, e o parceiro
 * cadastraria a mesma pessoa de novo achando que a primeira nao existiu.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarClienteSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar cliente em nome de outro facilitador");
  }

  return db.transaction(async (tx) => {
    const [dono] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, facilitadorId), eq(usuarios.is_deleted, false)))
      .limit(1);

    if (!dono) throw new RecusaDeRegra("Facilitador nao encontrado");
    if (!dono.ativo) throw new RecusaDeRegra("Facilitador inativo");

    // O e-mail e conferido DENTRO do dono: o mesmo endereco na carteira do
    // concorrente nao e conflito nenhum, e recusar por causa dele contaria a um
    // parceiro quem o outro atende.
    const [repetido] = await tx
      .select({ id: clientes.id })
      .from(clientes)
      .where(
        and(
          eq(clientes.facilitador_id, facilitadorId),
          eq(clientes.email, validado.email),
          eq(clientes.is_deleted, false),
        ),
      )
      .limit(1);

    if (repetido) {
      throw new RecusaDeRegra(`Voce ja tem um cliente com o e-mail ${validado.email}.`);
    }

    const [novo] = await tx
      .insert(clientes)
      .values({
        facilitador_id: facilitadorId,
        nome: validado.nome,
        email: validado.email,
        celular: validado.celular,
        modified_by: sessao.userId,
      })
      .returning();

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: novo!.id,
        detalhes: `Criou o cliente "${novo!.nome}" (${novo!.email})`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo!;
  });
}

/**
 * Atualiza o cliente, com optimistic locking.
 *
 * O WHERE compara `updated_at` com o valor que a tela leu. Se outra aba gravou
 * nesse meio tempo, nenhuma linha casa e a gravacao e recusada em vez de
 * sobrescrever o trabalho alheio.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarClienteSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Cliente nao encontrado");

  // O e-mail pode ter mudado, e a checagem exclui a propria linha — senao o
  // cliente colidiria consigo mesmo ao ter so o nome corrigido.
  const [repetido] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      and(
        eq(clientes.facilitador_id, anterior.facilitador_id),
        eq(clientes.email, validado.email),
        eq(clientes.is_deleted, false),
        ne(clientes.id, id),
      ),
    )
    .limit(1);

  if (repetido) {
    throw new RecusaDeRegra(`Voce ja tem um cliente com o e-mail ${validado.email}.`);
  }

  const resultado = await db
    .update(clientes)
    .set({
      nome: validado.nome,
      email: validado.email,
      celular: validado.celular,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(clientes.id, id),
        eq(clientes.updated_at, updatedAtOriginal),
        eq(clientes.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Este cliente foi alterado por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou o cliente "${resultado[0]!.nome}"`,
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0]!;
}

/**
 * Delete logico. Nunca apaga a linha.
 *
 * Nao ha guarda de dependente porque nada pendura no cliente ainda: os
 * assessments continuam com `avaliado_nome`/`avaliado_email` proprios. Quando a
 * ligacao existir, a guarda entra aqui, no mesmo lugar em que `turmas` conta os
 * assessments ativos antes de deixar excluir.
 *
 * O indice unico e PARCIAL justamente por causa desta funcao: a linha excluida
 * continua no banco, mas para de ocupar o par (dono, e-mail), e a pessoa pode
 * ser recadastrada depois.
 */
export async function excluir(id: string) {
  const sessao = await exigirSessao("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Cliente nao encontrado");

  const resultado = await db
    .update(clientes)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(clientes.id, id), eq(clientes.is_deleted, false), escopoDoDono(sessao)))
    .returning();

  if (resultado.length === 0) throw new RecusaDeRegra("Cliente nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "excluir",
    tabela: TABELA,
    registroId: id,
    detalhes: `Excluiu (logico) o cliente "${anterior.nome}"`,
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
