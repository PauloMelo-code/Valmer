/**
 * Teste de integracao das turmas, contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * O que se verifica aqui e o que quebra calado: o recorte por dono na lista E
 * na leitura por id — as duas portas por onde a turma de um parceiro poderia
 * aparecer para outro —, o admin enxergando os dois, a recusa de quem nao tem
 * sessao e a guarda que impede a turma de sumir deixando assessment orfao.
 *
 * O recorte por dono e testado pelos DOIS lados: B nao ve o que e de A, e A ve
 * o que e de A. So a primeira metade passaria com um WHERE que nao devolve
 * nada nunca.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, turmas, assessments } = await import("@/lib/db/schema");
const acoes = await import("@/lib/actions/turmas");
const { eq } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

let adminId = "";
let facilitadorA = "";
let facilitadorB = "";
let turmaDeA = "";
let turmaDeB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

before(async () => {
  // Os tres nascem com saldo zero, que a soma vazia do extrato ja explica —
  // ver a guarda da migration 0005. Turma nao consome credito.
  const [admin, a, b] = await db
    .insert(usuarios)
    .values([
      {
        nome: "Admin das Turmas",
        email: `admin.turmas.${marca}@exemplo.com`,
        papel: "admin" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
      {
        nome: "Facilitador A",
        email: `a.turmas.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
      {
        nome: "Facilitador B",
        email: `b.turmas.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  adminId = admin!.id;
  facilitadorA = a!.id;
  facilitadorB = b!.id;
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso — ver excluir().
  //
  // A ordem segue as FKs: assessment aponta para turma, turma aponta para
  // usuario.
  const ids = [adminId, facilitadorA, facilitadorB];
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from assessments where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from turmas where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from usuarios where id in ('${ids.join("','")}')`);
  });
});

describe("turmas", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => acoes.listar(), /Nao autenticado/);
  });

  it("valida o nome antes de gravar", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() =>
      acoes.criar({
        nome: "ab",
        area: "global",
        tipo_relatorio: "S1",
        permite_download: false,
      }),
    );
  });

  it("cria a turma do parceiro logado", async () => {
    entrarComo(facilitadorA);
    const criada = await acoes.criar({
      nome: `Turma de A ${marca}`,
      area: "profissional",
      tipo_relatorio: "S2",
      permite_download: true,
    });

    assert.equal(criada.facilitador_id, facilitadorA, "o dono e quem esta logado");
    assert.equal(criada.area, "profissional");
    assert.equal(criada.tipo_relatorio, "S2");
    assert.equal(criada.permite_download, true);
    assert.equal(criada.is_deleted, false);
    turmaDeA = criada.id;

    entrarComo(facilitadorB);
    const daB = await acoes.criar({
      nome: `Turma de B ${marca}`,
      area: "global",
      tipo_relatorio: "S1",
      permite_download: false,
    });
    turmaDeB = daB.id;
  });

  it("nao mostra a um parceiro a turma de outro, nem na lista", async () => {
    entrarComo(facilitadorB);
    const lista = await acoes.listar();

    assert.equal(
      lista.some((turma) => turma.id === turmaDeA),
      false,
      "a turma de A nao pode aparecer para B",
    );
    assert.equal(
      lista.some((turma) => turma.id === turmaDeB),
      true,
      "e a propria turma de B tem de aparecer",
    );
  });

  it("nao mostra a um parceiro a turma de outro nem pelo id direto", async () => {
    // A lista e so uma das portas. Quem tiver o uuid da turma alheia — de um
    // link colado, de um histórico — entra por aqui, e o WHERE tem de recusar
    // igual.
    entrarComo(facilitadorB);
    assert.equal(await acoes.obter(turmaDeA), null);

    entrarComo(facilitadorA);
    assert.equal((await acoes.obter(turmaDeA))?.id, turmaDeA, "a propria turma continua legivel");
  });

  it("mostra ao admin as turmas dos dois parceiros", async () => {
    entrarComo(adminId);
    const lista = await acoes.listar();
    const ids = lista.map((turma) => turma.id);

    assert.ok(ids.includes(turmaDeA), "admin ve a turma de A");
    assert.ok(ids.includes(turmaDeB), "admin ve a turma de B");
  });

  it("conta os assessments da turma em vez de guardar o total", async () => {
    await db.insert(assessments).values({
      token: `t${marca}`.slice(0, 12),
      facilitador_id: facilitadorA,
      turma_id: turmaDeA,
      avaliado_nome: "Maria Silva",
      avaliado_email: `maria.${marca}@exemplo.com`,
      tipo_relatorio: "S2",
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      modified_by: SISTEMA,
    });

    entrarComo(facilitadorA);
    const [turma] = (await acoes.listar()).filter((linha) => linha.id === turmaDeA);
    assert.equal(turma!.total, 1);
    assert.equal(turma!.respondidos, 0, "pendente ainda nao respondeu");
  });

  it("recusa excluir turma com assessment ativo, com mensagem legivel", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() => acoes.excluir(turmaDeA), /mapa\(s\) ativo\(s\)/);

    const [linha] = await db.select().from(turmas).where(eq(turmas.id, turmaDeA));
    assert.equal(linha!.is_deleted, false, "a turma recusada continua visivel");
  });

  /**
   * O gemeo, pelo lado da ESCRITA, do "tirar o dono do WHERE".
   *
   * `criarTurmaSchema` aceita `facilitador_id` do cliente, porque o admin cria
   * em nome de um parceiro. Para o facilitador, o que impede plantar turma na
   * lista de outro sao tres linhas na action — e sem este caso elas podiam ser
   * apagadas num refactor sem quebrar teste nenhum. Foi medido: apagando o
   * guard, a suite passava inteira.
   */
  it("facilitador nao cria turma em nome de outro, nem mandando o id dele", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () =>
        acoes.criar({
          nome: `${marca} turma plantada`,
          area: "global",
          tipo_relatorio: "S1",
          permite_download: false,
          facilitador_id: facilitadorB,
        }),
      /em nome de outro/,
    );

    // Recusar nao basta: o que importa e nada ter sido gravado para B.
    entrarComo(facilitadorB);
    const deB = await acoes.listar();
    assert.equal(
      deB.some((turma) => turma.nome.includes("turma plantada")),
      false,
      "nada pode aparecer na lista do outro parceiro",
    );
  });

  it("exclui de forma logica quando nao ha assessment ativo", async () => {
    entrarComo(facilitadorB);
    await acoes.excluir(turmaDeB);

    const [linha] = await db.select().from(turmas).where(eq(turmas.id, turmaDeB));
    assert.ok(linha, "a linha nao pode sumir do banco");
    assert.equal(linha!.is_deleted, true);
    assert.ok(linha!.deleted_at instanceof Date);

    const lista = await acoes.listar();
    assert.equal(
      lista.some((turma) => turma.id === turmaDeB),
      false,
      "some da listagem",
    );
  });
});
