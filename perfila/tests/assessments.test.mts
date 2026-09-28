/**
 * Teste de integracao do CRUD de assessments, contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Cobre o que a regra exige e o que quebra calado se alguem mexer:
 * autenticacao, RBAC por dono, consumo de credito, optimistic locking,
 * soft delete de verdade e trilha de auditoria.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, creditosTransacoes, auditoria } = await import("@/lib/db/schema");
const acoes = await import("@/lib/actions/assessments");
const { and, eq } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

let facilitadorA = "";
let facilitadorB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

before(async () => {
  // Os 10 creditos de A nascem com lastro no extrato, na mesma transacao.
  //
  // A partir da 0005 o banco confere no COMMIT se `usuarios.creditos` bate com
  // a soma do extrato. Um facilitador com saldo que transacao nenhuma explica e
  // exatamente o estado que a guarda proibe — e o fixture nao deve ensaiar um
  // caminho que producao nao permite. B fica com 0, que a soma vazia ja explica.
  const [a, b] = await db.transaction(async (tx) => {
    const [criadoA] = await tx
      .insert(usuarios)
      .values({
        nome: "Facilitador A",
        email: `a.${marca}@exemplo.com`,
        papel: "facilitador",
        creditos: 10,
        modified_by: SISTEMA,
      })
      .returning();

    await tx.insert(creditosTransacoes).values({
      usuario_id: criadoA.id,
      tipo: "bonus",
      quantidade: 10,
      descricao: "Saldo inicial do fixture",
      modified_by: SISTEMA,
    });

    const [criadoB] = await tx
      .insert(usuarios)
      .values({
        nome: "Facilitador B",
        email: `b.${marca}@exemplo.com`,
        papel: "facilitador",
        creditos: 0,
        modified_by: SISTEMA,
      })
      .returning();

    return [criadoA, criadoB];
  });

  facilitadorA = a.id;
  facilitadorB = b.id;
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar
  // de verdade e o certo. A aplicacao nunca faz isso — ver excluir().
  //
  // Numa transacao so por causa da guarda da 0005: apagar o extrato num commit
  // deixaria, naquele instante, um usuario com saldo que transacao nenhuma
  // explica. Apagando tudo junto o usuario ja nao existe no COMMIT, e a
  // checagem pula quem sumiu.
  const ids = [facilitadorA, facilitadorB];
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in ('${ids.join("','")}')`);
    await tx.execute(
      `delete from creditos_transacoes where usuario_id in ('${ids.join("','")}')`,
    );
    await tx.execute(
      `delete from assessments where facilitador_id in ('${ids.join("','")}')`,
    );
    await tx.execute(`delete from usuarios where id in ('${ids.join("','")}')`);
  });
});

describe("assessments", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => acoes.listar(), /Nao autenticado/);
  });

  it("valida o e-mail antes de gravar", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() =>
      acoes.criar({
        avaliado_nome: "Maria Silva",
        avaliado_email: "maria arroba exemplo",
        tipo_relatorio: "S1",
      }),
    );
  });

  it("cria consumindo credito e lancando no extrato", async () => {
    entrarComo(facilitadorA);
    const criado = await acoes.criar({
      avaliado_nome: "Maria Silva",
      avaliado_email: `Maria.${marca}@Exemplo.com`,
      tipo_relatorio: "S2",
    });

    assert.equal(criado.creditos_usados, 2, "S2 custa 2 creditos");
    assert.equal(criado.situacao, "pendente");
    assert.match(criado.token, /^[0-9a-f]{12}$/);
    assert.equal(criado.avaliado_email, `maria.${marca}@exemplo.com`, "e-mail normalizado");
    // ADR-0007 D3: todo mapa novo nasce no inventario MC-INV 2.2, com o codigo
    // da capa. A semente da ordem so e sorteada no primeiro acesso.
    assert.equal(criado.versao_instrumento, "MC-INV 2.2");
    assert.match(criado.codigo ?? "", /^MC-\d{4}-\d{4}-MS(-\d+)?$/, "iniciais de Maria Silva");
    assert.equal(criado.semente_ordem, null);

    const [dono] = await db.select().from(usuarios).where(eq(usuarios.id, facilitadorA));
    assert.equal(dono.creditos, 8, "10 - 2");

    const extrato = await db
      .select()
      .from(creditosTransacoes)
      .where(eq(creditosTransacoes.assessment_id, criado.id));
    assert.equal(extrato.length, 1);
    assert.equal(extrato[0].quantidade, -2);

    const trilha = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.registro_id, criado.id), eq(auditoria.acao, "criar")));
    assert.equal(trilha.length, 1, "criacao gravada na auditoria");
  });

  it("duas pessoas com as mesmas iniciais no mesmo dia ganham codigos diferentes", async () => {
    entrarComo(facilitadorA);
    const dados = (n: number) => ({
      avaliado_nome: "Otavio Reis",
      avaliado_email: `otavio${n}.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
    });
    const primeiro = await acoes.criar(dados(1));
    const segundo = await acoes.criar(dados(2));

    assert.match(primeiro.codigo ?? "", /^MC-\d{4}-\d{4}-OR(-\d+)?$/);
    assert.match(segundo.codigo ?? "", /^MC-\d{4}-\d{4}-OR-\d+$/, "o segundo leva sufixo");
    assert.notEqual(primeiro.codigo, segundo.codigo);
  });

  it("recusa criacao sem saldo", async () => {
    entrarComo(facilitadorB);
    await assert.rejects(
      () =>
        acoes.criar({
          avaliado_nome: "Joao Souza",
          avaliado_email: `joao.${marca}@exemplo.com`,
          tipo_relatorio: "S1",
        }),
      /Saldo insuficiente/,
    );
  });

  /*
   * `criarPelaTela` e o que o formulario da tela chama. O caminho de sucesso
   * dela nao cabe aqui: ele termina em `revalidatePath`, que exige uma
   * requisicao do Next em curso. A gravacao e o desconto ja estao cobertos
   * acima, em `criar()`, que e quem faz o trabalho — o que sobra para estes
   * dois casos e o que so existe no invólucro: recusa vira objeto legivel em
   * vez de excecao, que em producao chegaria a tela como um digest opaco.
   */
  it("criarPelaTela devolve a falta de saldo como recusa, e nao como excecao", async () => {
    entrarComo(facilitadorB);
    const resposta = await acoes.criarPelaTela({
      avaliado_nome: "Joao Souza",
      avaliado_email: `joao.recusa.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
    });

    assert.equal(resposta.ok, false);
    assert.match(resposta.ok ? "" : resposta.erro, /Saldo insuficiente/);
  });

  it("criarPelaTela devolve erro de validacao legivel, e nao um digest", async () => {
    entrarComo(facilitadorA);
    const resposta = await acoes.criarPelaTela({
      avaliado_nome: "Ana Lima",
      avaliado_email: "ana arroba exemplo",
      tipo_relatorio: "S1",
    });

    assert.equal(resposta.ok, false);
    assert.match(resposta.ok ? "" : resposta.erro, /E-mail invalido/);
  });

  it("nao mostra a um facilitador o assessment de outro", async () => {
    entrarComo(facilitadorB);
    const lista = await acoes.listar();
    assert.equal(
      lista.some((a) => a.facilitador_id === facilitadorA),
      false,
    );
  });

  it("rejeita gravacao com updated_at velho (colisao)", async () => {
    entrarComo(facilitadorA);
    const [alvo] = await acoes.listar();
    const velho = new Date(alvo.updated_at.getTime() - 1000);

    await assert.rejects(
      () =>
        acoes.atualizar(alvo.id, { avaliado_nome: "Maria S Silva", avaliado_email: alvo.avaliado_email }, velho),
      /alterado por outro usuario/,
    );
  });

  it("atualiza quando o updated_at confere", async () => {
    entrarComo(facilitadorA);
    const [alvo] = await acoes.listar();
    const atualizado = await acoes.atualizar(
      alvo.id,
      { avaliado_nome: "Maria S Silva", avaliado_email: alvo.avaliado_email },
      alvo.updated_at,
    );
    assert.equal(atualizado.avaliado_nome, "Maria S Silva");
  });

  it("exclui de forma logica: a linha continua no banco", async () => {
    entrarComo(facilitadorA);
    const [alvo] = await acoes.listar();
    await acoes.excluir(alvo.id);

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, alvo.id));
    assert.ok(linha, "a linha nao pode sumir do banco");
    assert.equal(linha.is_deleted, true);
    assert.ok(linha.deleted_at instanceof Date);

    const lista = await acoes.listar();
    assert.equal(
      lista.some((a) => a.id === alvo.id),
      false,
      "some da listagem",
    );
  });
});
