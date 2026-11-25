/**
 * Teste de integracao do cadastro de parceiro e da venda de credito, contra o
 * banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * O que se verifica aqui e o que quebra calado: a invariante que a trigger da
 * 0005 cobra no COMMIT (saldo = soma do extrato), o recorte por papel, a
 * recusa legivel de e-mail repetido e a senha que o parceiro recebe de fato
 * funcionando no login.
 *
 * A edicao (/admin/facilitadores/[id]) acrescenta quatro que so aparecem em
 * producao: `creditos` mandado na chamada NAO movendo o saldo — o caso que tem
 * de falhar se alguem tirar o guard, porque um UPDATE direto no saldo aborta a
 * transacao inteira pela trigger da 0005 —, a senha nova valendo e a antiga
 * parando de valer, o parceiro desativado deixando de entrar, e o facilitador
 * nao alcancando esta action nem para editar a si mesmo.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { ZodError } from "zod";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { auditoria, usuarios, creditosTransacoes } = await import("@/lib/db/schema");
const acoes = await import("@/lib/actions/facilitadores");
const { auth } = await import("@/lib/auth/config");
const { desc, eq, sql } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";
const SENHA = "senha-inicial-longa";
const SENHA_REDEFINIDA = "senha-redefinida-987";

let adminId = "";
let facilitadorId = "";
let parceiroId = "";
const emailParceiro = `parceiro.${marca}@exemplo.com`;

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

/** A soma do extrato ativo do usuario: o numero que a trigger da 0005 confere. */
async function somaDoExtrato(usuarioId: string): Promise<number> {
  const [linha] = await db
    .select({ total: sql<number>`coalesce(sum(${creditosTransacoes.quantidade}), 0)::int` })
    .from(creditosTransacoes)
    .where(eq(creditosTransacoes.usuario_id, usuarioId));

  return linha!.total;
}

async function saldoDe(usuarioId: string): Promise<number> {
  const [linha] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
  return linha!.creditos;
}

async function linhaDe(usuarioId: string) {
  const [linha] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
  return linha!;
}

/**
 * O cadastro completo que `atualizar` exige, partindo da linha atual.
 *
 * O schema e `strictObject`, entao mandar menos que os cinco campos e recusado
 * do mesmo jeito que mandar um a mais. Isto evita que cada teste repita quatro
 * campos que ele nao esta testando — e que um deles copie errado e passe a
 * medir outra coisa.
 */
function cadastro(
  linha: {
    nome: string;
    email: string;
    empresa: string | null;
    telefone: string | null;
    ativo: boolean;
  },
  mudanca: Record<string, unknown> = {},
) {
  return {
    nome: linha.nome,
    email: linha.email,
    empresa: linha.empresa ?? "",
    telefone: linha.telefone ?? "",
    ativo: linha.ativo,
    ...mudanca,
  };
}

/** Tenta entrar. Devolve o id de quem entrou, ou null quando o login recusa. */
async function entrarNoLogin(email: string, senha: string): Promise<string | null> {
  try {
    const resposta = await auth.api.signInEmail({
      body: { email, password: senha },
      headers: new Headers(),
    });
    return (resposta.user as { id: string }).id;
  } catch {
    return null;
  }
}

before(async () => {
  // Os dois nascem com saldo zero, que a soma vazia do extrato ja explica.
  const [admin, facilitador] = await db
    .insert(usuarios)
    .values([
      {
        nome: "Admin do Teste",
        email: `admin.${marca}@exemplo.com`,
        papel: "admin" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
      {
        nome: "Facilitador do Teste",
        email: `facilitador.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  adminId = admin!.id;
  facilitadorId = facilitador!.id;
});

after(async () => {
  // Limpeza de fixture com SQL cru, numa transacao so: apagar o extrato num
  // commit deixaria, naquele instante, um usuario com saldo que transacao
  // nenhuma explica — exatamente o que a guarda da 0005 aborta. Apagando tudo
  // junto o usuario ja nao existe no COMMIT, e a checagem pula quem sumiu.
  const ids = [adminId, facilitadorId, parceiroId].filter(Boolean);
  const lista = `('${ids.join("','")}')`;

  await db.transaction(async (tx) => {
    await tx.execute(`delete from sessoes where usuario_id in ${lista}`);
    await tx.execute(`delete from contas where usuario_id in ${lista}`);
    await tx.execute(`delete from auditoria where user_id in ${lista}`);
    await tx.execute(`delete from creditos_transacoes where usuario_id in ${lista}`);
    await tx.execute(`delete from usuarios where id in ${lista}`);
  });
});

describe("facilitadores", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(
      () =>
        acoes.criar({
          nome: "Sem Sessao",
          email: `anonimo.${marca}@exemplo.com`,
          empresa: "Consultoria Anonima",
          pacote: "Starter",
        }),
      /Nao autenticado/,
    );
  });

  it("admin cria o parceiro com o pacote creditado e lastro no extrato", async () => {
    entrarComo(adminId);

    const novo = await acoes.criar({
      nome: "Parceiro Novo",
      email: emailParceiro.toUpperCase(),
      empresa: "Consultoria Teste",
      pacote: "Starter",
    });
    parceiroId = novo.id;
    // O parceiro nasce sem senha (ele a define pelo link de e-mail, ver
    // tests/emails.test.mts). Aqui o plano B do admin faz o papel do link,
    // para os testes de login abaixo.
    await acoes.definirSenhaDoParceiro(novo.id, SENHA);

    assert.equal(novo.papel, "facilitador");
    assert.equal(novo.email, emailParceiro, "e-mail normalizado");
    assert.equal(novo.creditos, 10, "o pacote Starter tem 10 creditos");

    // A invariante da trigger: o commit acima ja teria sido abortado se o
    // extrato nao explicasse o saldo. O assert deixa o motivo visivel.
    assert.equal(await somaDoExtrato(novo.id), novo.creditos);

    const [compra] = await db
      .select()
      .from(creditosTransacoes)
      .where(eq(creditosTransacoes.usuario_id, novo.id));
    assert.equal(compra!.tipo, "compra");
    assert.equal(compra!.quantidade, 10);
    // O preco vai GRAVADO na linha: e dele que a receita do painel sai, e nao
    // do pacote vigente na hora de olhar o painel. Ver `schema/creditos.ts`.
    assert.equal(compra!.valor_cobrado, 290, "o preco do Starter no momento da venda");
  });

  it("o parceiro criado entra com a senha definida", async () => {
    const resposta = await auth.api.signInEmail({
      body: { email: emailParceiro, password: SENHA },
      headers: new Headers(),
    });

    assert.equal((resposta.user as { id: string }).id, parceiroId);
  });

  it("recusa e-mail repetido com mensagem, e nao com excecao de banco", async () => {
    entrarComo(adminId);

    const resposta = await acoes.criarPelaTela({
      nome: "Parceiro Repetido",
      email: emailParceiro,
      empresa: "Outra Consultoria",
      pacote: "Pro",
    });

    assert.equal(resposta.ok, false);
    assert.match(resposta.ok ? "" : resposta.erro, /Ja existe um usuario com o e-mail/);
  });

  it("admin vende um pacote: saldo sobe e o extrato explica", async () => {
    entrarComo(adminId);

    const venda = await acoes.venderCreditos({ facilitador_id: parceiroId, pacote: "Pro" });

    assert.equal(venda.creditos, 50);
    assert.equal(venda.saldo, 60, "10 do Starter + 50 do Pro");
    assert.equal(await saldoDe(parceiroId), 60);
    assert.equal(await somaDoExtrato(parceiroId), 60);

    const [ultima] = await db
      .select()
      .from(creditosTransacoes)
      .where(eq(creditosTransacoes.usuario_id, parceiroId))
      .orderBy(desc(creditosTransacoes.created_at))
      .limit(1);
    assert.equal(ultima!.valor_cobrado, 990, "a venda tambem grava o que cobrou");
  });

  it("facilitador nao cria parceiro nem vende credito", async () => {
    entrarComo(facilitadorId);

    await assert.rejects(
      () =>
        acoes.criar({
          nome: "Parceiro Do Colega",
          email: `colega.${marca}@exemplo.com`,
          empresa: "Consultoria Teste",
          pacote: "Starter",
        }),
      /Sem permissao/,
    );

    await assert.rejects(
      () => acoes.venderCreditos({ facilitador_id: facilitadorId, pacote: "Enterprise" }),
      /Sem permissao/,
    );

    // Recusar com excecao nao basta: o que nao pode e o saldo ter se mexido.
    assert.equal(await saldoDe(facilitadorId), 0);
    assert.equal(await somaDoExtrato(facilitadorId), 0);
  });

  // --- edicao do parceiro: /admin/facilitadores/[id] ---

  it("facilitador nao edita ninguem por esta action, nem a si mesmo", async () => {
    entrarComo(facilitadorId);

    const alvo = await linhaDe(parceiroId);
    const proprio = await linhaDe(facilitadorId);

    await assert.rejects(
      () => acoes.atualizar(parceiroId, cadastro(alvo, { nome: "Nome Roubado" }), alvo.updated_at),
      /Sem permissao/,
    );

    // O proprio cadastro tambem nao: `usuarios` e o parceiro visto pelo admin.
    // O que o facilitador muda em si mesmo passa por actions/perfil.ts, que nao
    // alcanca e-mail nem situacao.
    await assert.rejects(
      () =>
        acoes.atualizar(
          facilitadorId,
          cadastro(proprio, { nome: "Facilitador Promovido" }),
          proprio.updated_at,
        ),
      /Sem permissao/,
    );

    await assert.rejects(
      () => acoes.definirSenhaDoParceiro(parceiroId, "senha-de-invasor-123"),
      /Sem permissao/,
    );

    const depois = await linhaDe(parceiroId);
    assert.equal(depois.nome, alvo.nome, "a linha do outro nao pode ter mudado");
    assert.equal(await entrarNoLogin(emailParceiro, "senha-de-invasor-123"), null);
  });

  it("admin edita nome e empresa, e a auditoria registra", async () => {
    entrarComo(adminId);

    const antes = await linhaDe(parceiroId);
    const salvo = await acoes.atualizar(
      parceiroId,
      cadastro(antes, { nome: "Parceiro Renomeado", empresa: "Consultoria Renomeada" }),
      antes.updated_at,
    );

    assert.equal(salvo.nome, "Parceiro Renomeado");
    assert.equal(salvo.empresa, "Consultoria Renomeada");
    assert.equal(salvo.creditos, antes.creditos, "editar cadastro nao mexe em saldo");

    const trilha = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.registro_id, parceiroId));

    assert.ok(
      trilha.some((linha) => linha.detalhes.includes("Atualizou o parceiro")),
      "a edicao precisa aparecer na trilha",
    );
  });

  it("recusa e-mail ja usado por outro usuario com mensagem, e nao com excecao de banco", async () => {
    entrarComo(adminId);

    const antes = await linhaDe(parceiroId);
    const resposta = await acoes.atualizarPelaTela(
      parceiroId,
      cadastro(antes, { email: `admin.${marca}@exemplo.com` }),
      antes.updated_at,
    );

    assert.equal(resposta.ok, false);
    assert.match(resposta.ok ? "" : resposta.erro, /Ja existe um usuario com o e-mail/);
    assert.equal((await linhaDe(parceiroId)).email, emailParceiro, "o e-mail nao mudou");
  });

  /**
   * O caso que tem de falhar se alguem tirar o guard.
   *
   * `creditos` chega pela chamada como qualquer Server Action — que e um POST
   * publico. Nao basta a action recusar: o que importa e o SALDO nao ter se
   * mexido, e continuar batendo com o extrato. Um UPDATE direto em
   * `usuarios.creditos` nao "quase funciona": a trigger da 0005 aborta o COMMIT
   * inteiro, e a edicao de nome que veio junto se perde tambem.
   */
  it("mandar `creditos` na action nao muda o saldo", async () => {
    entrarComo(adminId);

    const antes = await linhaDe(parceiroId);

    await assert.rejects(
      () =>
        acoes.atualizar(
          parceiroId,
          cadastro(antes, { nome: "Parceiro Rico", creditos: 9999 }),
          antes.updated_at,
        ),
      (erro: unknown) => {
        // A recusa tem de vir da FRONTEIRA — do schema —, e nao do COMMIT. Se
        // `creditos` chegar ao UPDATE quem recusa e a trigger da 0005: a linha
        // ate fica certa, porque a transacao inteira volta atras, mas o admin ve
        // um erro de banco no meio de um formulario de cadastro, e a edicao de
        // nome que veio junto se perde sem explicacao. Por isso o teste exige o
        // ZodError, e nao so a rejeicao — sem isto, a versao que deixa o campo
        // chegar ao banco passaria igual (MEDIDO: o erro do drizzle nem carrega
        // a mensagem da trigger no topo, ela fica no `cause`).
        assert.ok(erro instanceof ZodError, `recusa deveria vir do schema; veio: ${erro}`);
        assert.match(erro.message, /creditos/, "a recusa precisa nomear o campo");
        return true;
      },
    );

    assert.equal(await saldoDe(parceiroId), antes.creditos, "saldo so se move lancando extrato");
    assert.equal(await somaDoExtrato(parceiroId), antes.creditos);
    assert.equal((await linhaDe(parceiroId)).nome, antes.nome, "nada da chamada foi gravado");
  });

  it("a senha nova passa a valer e a antiga para de valer", async () => {
    entrarComo(adminId);

    await acoes.definirSenhaDoParceiro(parceiroId, SENHA_REDEFINIDA);

    assert.equal(await entrarNoLogin(emailParceiro, SENHA), null, "a antiga nao vale mais");
    assert.equal(await entrarNoLogin(emailParceiro, SENHA_REDEFINIDA), parceiroId);
  });

  it("parceiro desativado nao entra mais", async () => {
    entrarComo(adminId);

    const antes = await linhaDe(parceiroId);
    const salvo = await acoes.atualizar(
      parceiroId,
      cadastro(antes, { ativo: false }),
      antes.updated_at,
    );

    assert.equal(salvo.ativo, false);
    // A senha continua certa: o que barra e a situacao da conta, conferida em
    // lib/auth/config.ts antes de a sessao nascer.
    assert.equal(await entrarNoLogin(emailParceiro, SENHA_REDEFINIDA), null);
  });
});
