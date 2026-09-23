/**
 * Teste de integracao do perfil e da busca, contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * O que se verifica aqui e o que quebra calado:
 *
 * - a senha atual sendo de fato exigida na troca, e a senha antiga deixando de
 *   valer depois dela — sem isso, quem senta numa maquina com sessao aberta
 *   toma a conta;
 * - o parceiro nao alcancando papel, creditos, situacao nem e-mail pela action
 *   do proprio perfil, mesmo mandando os campos na chamada (escalada de
 *   privilegio: este caso tem de falhar se alguem apagar o guard);
 * - o recorte por dono da busca, pelos DOIS lados — B nao encontra o que e de
 *   A, e A encontra o que e de A. So a primeira metade passaria com um WHERE
 *   que nao devolve nada nunca.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, turmas, assessments } = await import("@/lib/db/schema");
const perfil = await import("@/lib/actions/perfil");
const busca = await import("@/lib/actions/busca");
const { conferirSenha, definirSenha } = await import("@/lib/auth/senha");
const { eq } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

const SENHA_ORIGINAL = "senha-original-123";
const SENHA_NOVA = "senha-trocada-456";

let adminId = "";
let facilitadorA = "";
let facilitadorB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

before(async () => {
  // Os tres nascem com saldo zero, que a soma vazia do extrato ja explica —
  // ver a guarda da migration 0005. Nada aqui move credito.
  const [admin, a, b] = await db
    .insert(usuarios)
    .values([
      {
        nome: "Admin do Perfil",
        email: `admin.perfil.${marca}@exemplo.com`,
        papel: "admin" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
      {
        nome: "Ana Perfil",
        email: `a.perfil.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        empresa: "Consultoria A",
        creditos: 0,
        modified_by: SISTEMA,
      },
      {
        nome: "Bruno Perfil",
        email: `b.perfil.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        creditos: 0,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  adminId = admin!.id;
  facilitadorA = a!.id;
  facilitadorB = b!.id;

  await definirSenha(facilitadorA, SENHA_ORIGINAL);

  // Um avaliado e uma turma de cada lado, com nomes que se parecem: e assim
  // que um WHERE sem dono aparece: o termo casa com os dois.
  const [turmaA, turmaB] = await db
    .insert(turmas)
    .values([
      {
        facilitador_id: facilitadorA,
        nome: `Lideranca Alfa ${marca}`,
        area: "profissional" as const,
        tipo_relatorio: "S2" as const,
        permite_download: false,
        modified_by: SISTEMA,
      },
      {
        facilitador_id: facilitadorB,
        nome: `Lideranca Beta ${marca}`,
        area: "global" as const,
        tipo_relatorio: "S1" as const,
        permite_download: false,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  await db.insert(assessments).values([
    {
      token: `pa${marca}`.slice(0, 12),
      facilitador_id: facilitadorA,
      turma_id: turmaA!.id,
      avaliado_nome: `Zoraide Alfa ${marca}`,
      avaliado_email: `zoraide.alfa.${marca}@exemplo.com`,
      tipo_relatorio: "S2" as const,
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      modified_by: SISTEMA,
    },
    {
      token: `pb${marca}`.slice(0, 12),
      facilitador_id: facilitadorB,
      turma_id: turmaB!.id,
      avaliado_nome: `Zoraide Beta ${marca}`,
      avaliado_email: `zoraide.beta.${marca}@exemplo.com`,
      tipo_relatorio: "S1" as const,
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      modified_by: SISTEMA,
    },
  ]);
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso.
  //
  // A ordem segue as FKs: assessment aponta para turma, turma e conta apontam
  // para usuario.
  const ids = [adminId, facilitadorA, facilitadorB];
  const lista = `'${ids.join("','")}'`;
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in (${lista})`);
    await tx.execute(`delete from assessments where facilitador_id in (${lista})`);
    await tx.execute(`delete from turmas where facilitador_id in (${lista})`);
    await tx.execute(`delete from contas where usuario_id in (${lista})`);
    await tx.execute(`delete from usuarios where id in (${lista})`);
  });
});

describe("perfil", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => perfil.atualizar({ nome: "Qualquer Um" }), /Nao autenticado/);
  });

  it("grava nome, empresa e telefone do proprio parceiro", async () => {
    entrarComo(facilitadorA);

    const salvo = await perfil.atualizar({
      nome: "Ana Perfil Silva",
      empresa: "Consultoria Alfa",
      telefone: "(11) 98888-7777",
    });

    assert.equal(salvo.nome, "Ana Perfil Silva");
    assert.equal(salvo.empresa, "Consultoria Alfa");
    assert.equal(salvo.telefone, "(11) 98888-7777");
    assert.equal(salvo.id, facilitadorA, "escreveu na propria linha");
  });

  it("guarda campo opcional em branco como nulo, e nao como texto vazio", async () => {
    entrarComo(facilitadorA);

    const salvo = await perfil.atualizar({
      nome: "Ana Perfil Silva",
      empresa: "Consultoria Alfa",
      telefone: "",
    });

    assert.equal(salvo.telefone, null);
  });

  /**
   * O caso que tem de falhar se alguem apagar o guard.
   *
   * Os quatro campos abaixo sao decisao do dono da plataforma: papel e o que a
   * pessoa enxerga, creditos e quanto ela pode gastar, `ativo` e se ela entra,
   * e o e-mail e a credencial de login. A action recebe o objeto do cliente
   * como qualquer Server Action — que e um POST publico —, entao mandar os
   * campos e trivial para quem quiser tentar.
   *
   * Nao basta a action recusar: o que importa e a LINHA nao ter mudado.
   */
  it("nao deixa o parceiro mudar papel, creditos, situacao nem e-mail", async () => {
    entrarComo(facilitadorA);

    const [antes] = await db.select().from(usuarios).where(eq(usuarios.id, facilitadorA));

    await assert.rejects(() =>
      perfil.atualizar({
        nome: "Ana Perfil Silva",
        empresa: "Consultoria Alfa",
        telefone: "(11) 98888-7777",
        papel: "admin",
        creditos: 9999,
        ativo: false,
        email: `sequestrado.${marca}@exemplo.com`,
      }),
    );

    const [depois] = await db.select().from(usuarios).where(eq(usuarios.id, facilitadorA));

    assert.equal(depois!.papel, antes!.papel, "o papel nao pode mudar por aqui");
    assert.equal(depois!.creditos, antes!.creditos, "o saldo nao pode mudar por aqui");
    assert.equal(depois!.ativo, antes!.ativo, "a situacao nao pode mudar por aqui");
    assert.equal(depois!.email, antes!.email, "o e-mail e credencial, e nao muda por aqui");
  });

  it("recusa a troca de senha com a senha atual errada, e a antiga continua valendo", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () => perfil.trocarSenha({ senha_atual: "chute-errado-000", senha_nova: SENHA_NOVA }),
      /Senha atual incorreta/,
    );

    assert.equal(
      await conferirSenha(facilitadorA, SENHA_ORIGINAL),
      true,
      "a senha antiga tem de continuar valendo depois da recusa",
    );
    assert.equal(
      await conferirSenha(facilitadorA, SENHA_NOVA),
      false,
      "a senha nova nao pode ter sido gravada",
    );
  });

  it("troca a senha com a atual certa, e a antiga para de valer", async () => {
    entrarComo(facilitadorA);

    await perfil.trocarSenha({ senha_atual: SENHA_ORIGINAL, senha_nova: SENHA_NOVA });

    assert.equal(await conferirSenha(facilitadorA, SENHA_NOVA), true, "a nova vale");
    assert.equal(await conferirSenha(facilitadorA, SENHA_ORIGINAL), false, "a antiga nao vale mais");
  });

  it("recusa senha nova curta demais, sem tocar na senha que vale", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(() =>
      perfil.trocarSenha({ senha_atual: SENHA_NOVA, senha_nova: "curta" }),
    );

    assert.equal(await conferirSenha(facilitadorA, SENHA_NOVA), true);
  });
});

describe("busca da barra superior", () => {
  it("nao consulta o banco com menos de dois caracteres", async () => {
    entrarComo(facilitadorA);

    assert.deepEqual(await busca.buscar(""), { itens: [], truncado: false });
    assert.deepEqual(await busca.buscar("Z"), { itens: [], truncado: false });
  });

  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => busca.buscar("Zoraide"), /Nao autenticado/);
  });

  it("nao devolve a um parceiro o avaliado nem a turma de outro", async () => {
    entrarComo(facilitadorB);

    const resultado = await busca.buscar(marca);
    const titulos = resultado.itens.map((item) => item.titulo);

    assert.ok(
      titulos.some((titulo) => titulo.includes("Zoraide Beta")),
      "o proprio avaliado tem de aparecer",
    );
    assert.ok(
      titulos.some((titulo) => titulo.includes("Lideranca Beta")),
      "a propria turma tem de aparecer",
    );
    assert.equal(
      titulos.some((titulo) => titulo.includes("Alfa")),
      false,
      "nada de A pode aparecer para B",
    );
  });

  it("devolve ao admin o avaliado e a turma dos dois parceiros", async () => {
    entrarComo(adminId);

    const titulos = (await busca.buscar(marca)).itens.map((item) => item.titulo);

    assert.ok(titulos.some((titulo) => titulo.includes("Zoraide Alfa")));
    assert.ok(titulos.some((titulo) => titulo.includes("Zoraide Beta")));
    assert.ok(titulos.some((titulo) => titulo.includes("Lideranca Alfa")));
    assert.ok(titulos.some((titulo) => titulo.includes("Lideranca Beta")));
  });

  it("encontra o avaliado pelo e-mail, e leva a lista filtrada por ele", async () => {
    entrarComo(facilitadorA);

    const [item] = (await busca.buscar(`zoraide.alfa.${marca}`)).itens;

    assert.equal(item!.tipo, "avaliado");
    assert.equal(item!.href, `/facilitador/acervo-de-mapas?q=${encodeURIComponent(item!.detalhe)}`);
  });

  /**
   * Token e credencial do respondente: aceita-lo no campo de busca
   * transformaria a busca numa porta — quem tivesse um token na mao
   * descobriria por ele o dono e o resto do cadastro.
   */
  it("nao encontra nada por token nem por id", async () => {
    entrarComo(facilitadorA);

    const [linha] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.facilitador_id, facilitadorA));

    assert.deepEqual(await busca.buscar(linha!.token), { itens: [], truncado: false });
    assert.deepEqual(await busca.buscar(linha!.id), { itens: [], truncado: false });
  });

  /**
   * Curinga digitado nao pode virar curinga de SQL: quem procura "100%" espera
   * nada, e nao a base inteira.
   */
  it("trata % e _ como texto, e nao como curinga", async () => {
    entrarComo(facilitadorA);

    assert.equal((await busca.buscar("%")).itens.length, 0, "% sozinho nem chega ao banco");
    assert.equal((await busca.buscar("%%")).itens.length, 0, "e nem casa com tudo");
  });
});
