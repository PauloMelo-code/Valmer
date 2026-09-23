/**
 * Teste de integracao dos tres cadastros — clientes, cargos e devolutivas —
 * contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * As tres tabelas sao do PARCEIRO, e nesta plataforma os parceiros sao
 * concorrentes entre si. Entao o que se verifica aqui e sempre a mesma
 * pergunta, por tres portas: a lista, a leitura pelo id direto e a ESCRITA com
 * o dono forjado. Cada uma delas ja foi, em algum sistema, o vazamento.
 *
 * O recorte e testado pelos DOIS lados: B nao ve o que e de A, e A ve o que e
 * de A. So a primeira metade passaria com um WHERE que nao devolve nada nunca.
 *
 * As guardas de BANCO (soma 100, duracao nao negativa, dono na chave) sao
 * testadas com insert cru, sem passar pelas actions: o que se quer provar e que
 * elas valem tambem para o seed, a importacao e o UPDATE feito no psql.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, clientes, cargos, devolutivas } = await import("@/lib/db/schema");
const acoesClientes = await import("@/lib/actions/clientes");
const acoesCargos = await import("@/lib/actions/cargos");
const acoesDevolutivas = await import("@/lib/actions/devolutivas");
const { eq } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

let adminId = "";
let facilitadorA = "";
let facilitadorB = "";
let assessmentDeA = "";
let assessmentDeB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

/**
 * Casa com o nome da constraint que o Postgres violou.
 *
 * O drizzle embrulha o erro do driver: a mensagem de cima e "Failed query:
 * insert into ..." e o nome da constraint vive no `cause`. Um regex direto no
 * `assert.rejects` passaria a existir sem nunca conferir NADA — qualquer falha
 * de insert satisfaria "rejeitou". Aqui o teste so passa se foi a guarda certa
 * que recusou.
 */
function violou(constraint: string) {
  return (erro: unknown) => {
    const cadeia: string[] = [];
    for (let atual = erro; atual instanceof Error; atual = (atual as { cause?: unknown }).cause) {
      cadeia.push(atual.message);
    }
    assert.ok(
      cadeia.some((mensagem) => mensagem.includes(constraint)),
      `esperava a violacao de ${constraint}, veio: ${cadeia.join(" | ")}`,
    );
    return true;
  };
}

before(async () => {
  const [admin, a, b] = await db
    .insert(usuarios)
    .values(
      (["admin", "facilitador", "facilitador"] as const).map((papel, i) => ({
        nome: ["Admin dos Cadastros", "Facilitador A", "Facilitador B"][i]!,
        email: `${["admin", "a", "b"][i]}.cadastros.${marca}@exemplo.com`,
        papel,
        creditos: 0,
        modified_by: SISTEMA,
      })),
    )
    .returning();

  adminId = admin!.id;
  facilitadorA = a!.id;
  facilitadorB = b!.id;

  // Devolutiva pendura em assessment, entao cada parceiro precisa do seu.
  const criados = await db
    .insert(assessments)
    .values(
      [facilitadorA, facilitadorB].map((dono, i) => ({
        token: `dev${marca.slice(-6)}${i}`,
        facilitador_id: dono,
        avaliado_nome: `Avaliado ${i === 0 ? "de A" : "de B"}`,
        avaliado_email: `avaliado${i}.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        modified_by: SISTEMA,
      })),
    )
    .returning();

  assessmentDeA = criados[0]!.id;
  assessmentDeB = criados[1]!.id;
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso — ver excluir().
  //
  // A ordem segue as FKs: devolutiva aponta para assessment, e todo o resto
  // aponta para usuario.
  const ids = [adminId, facilitadorA, facilitadorB];
  const lista = `'${ids.join("','")}'`;
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in (${lista})`);
    await tx.execute(`delete from devolutivas where facilitador_id in (${lista})`);
    await tx.execute(`delete from assessments where facilitador_id in (${lista})`);
    await tx.execute(`delete from clientes where facilitador_id in (${lista})`);
    await tx.execute(`delete from cargos where facilitador_id in (${lista})`);
    await tx.execute(`delete from usuarios where id in (${lista})`);
  });
});

describe("clientes", () => {
  let clienteDeA = "";
  let clienteDeB = "";
  const emailComum = `pessoa.comum.${marca}@exemplo.com`;

  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => acoesClientes.listar(), /Nao autenticado/);
  });

  it("cria o cliente do parceiro logado", async () => {
    entrarComo(facilitadorA);
    const criado = await acoesClientes.criar({
      nome: "Ana Souza",
      email: emailComum,
      celular: "(11) 99999-0000",
    });

    assert.equal(criado.facilitador_id, facilitadorA, "o dono e quem esta logado");
    assert.equal(criado.email, emailComum);
    assert.equal(criado.is_deleted, false);
    clienteDeA = criado.id;

    entrarComo(facilitadorB);
    const daB = await acoesClientes.criar({
      nome: "Bruno Lima",
      email: `bruno.${marca}@exemplo.com`,
    });
    clienteDeB = daB.id;
  });

  it("nao mostra a um parceiro o cliente de outro, nem na lista nem pelo id", async () => {
    entrarComo(facilitadorB);
    const lista = await acoesClientes.listar();

    assert.equal(
      lista.some((cliente) => cliente.id === clienteDeA),
      false,
      "a carteira de A nao pode aparecer para B",
    );
    assert.equal(
      lista.some((cliente) => cliente.id === clienteDeB),
      true,
      "e o proprio cliente de B tem de aparecer",
    );

    // A lista e so uma das portas. Quem tiver o uuid — de um link colado, do
    // historico do navegador — entra por aqui, e o WHERE tem de recusar igual.
    assert.equal(await acoesClientes.obter(clienteDeA), null);

    entrarComo(facilitadorA);
    assert.equal((await acoesClientes.obter(clienteDeA))?.id, clienteDeA);
  });

  it("mostra ao admin os clientes dos dois parceiros", async () => {
    entrarComo(adminId);
    const ids = (await acoesClientes.listar()).map((cliente) => cliente.id);

    assert.ok(ids.includes(clienteDeA), "admin ve o cliente de A");
    assert.ok(ids.includes(clienteDeB), "admin ve o cliente de B");
  });

  /**
   * O gemeo, pelo lado da ESCRITA, do "tirar o dono do WHERE".
   *
   * `criarClienteSchema` aceita `facilitador_id` do cliente, porque o admin
   * cadastra em nome de um parceiro. Para o facilitador, o que impede plantar
   * gente na carteira de outro sao tres linhas na action — e sem este caso elas
   * podiam ser apagadas num refactor sem quebrar teste nenhum.
   */
  it("facilitador nao cria cliente em nome de outro, nem mandando o id dele", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () =>
        acoesClientes.criar({
          nome: "Plantado Silva",
          email: `plantado.${marca}@exemplo.com`,
          facilitador_id: facilitadorB,
        }),
      /em nome de outro/,
    );

    // Recusar nao basta: o que importa e nada ter sido gravado para B.
    entrarComo(facilitadorB);
    assert.equal(
      (await acoesClientes.listar()).some((cliente) => cliente.nome.includes("Plantado")),
      false,
      "nada pode aparecer na carteira do outro parceiro",
    );
  });

  it("recusa e-mail repetido no mesmo dono, e aceita o mesmo e-mail em outro dono", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(
      () => acoesClientes.criar({ nome: "Ana Souza Repetida", email: emailComum }),
      /ja tem um cliente com o e-mail/,
    );

    // A mesma pessoa atendida por dois parceiros vira duas linhas, uma por
    // dono. Recusar aqui contaria a B que A ja atende essa pessoa.
    entrarComo(facilitadorB);
    const naOutraCarteira = await acoesClientes.criar({
      nome: "Ana Souza",
      email: emailComum,
    });
    assert.equal(naOutraCarteira.facilitador_id, facilitadorB);
  });

  it("exclui de forma logica e deixa recadastrar o mesmo e-mail depois", async () => {
    entrarComo(facilitadorA);
    await acoesClientes.excluir(clienteDeA);

    const [linha] = await db.select().from(clientes).where(eq(clientes.id, clienteDeA));
    assert.ok(linha, "a linha nao pode sumir do banco");
    assert.equal(linha!.is_deleted, true);
    assert.ok(linha!.deleted_at instanceof Date);

    // O indice unico e PARCIAL exatamente para isto: soft delete com indice
    // cheio proibiria o recadastro para sempre.
    const denovo = await acoesClientes.criar({ nome: "Ana Souza", email: emailComum });
    assert.equal(denovo.facilitador_id, facilitadorA);
  });
});

describe("cargos", () => {
  let cargoDeA = "";
  let cargoDeB = "";

  it("cria o cargo do parceiro logado", async () => {
    entrarComo(facilitadorA);
    const criado = await acoesCargos.criar({
      nome: `Gerente de A ${marca}`,
      alvo_d: 40,
      alvo_i: 30,
      alvo_s: 20,
      alvo_c: 10,
    });

    assert.equal(criado.facilitador_id, facilitadorA);
    assert.equal(criado.alvo_d, 40);
    cargoDeA = criado.id;

    entrarComo(facilitadorB);
    // Sem alvo: e o cargo de 2020, cadastrado antes de o campo existir. Se isto
    // falhar, as colunas viraram NOT NULL e a tabela ficou impossivel de
    // preencher para o dado que ja esta la.
    const daB = await acoesCargos.criar({
      nome: `Analista de B ${marca}`,
      alvo_d: null,
      alvo_i: null,
      alvo_s: null,
      alvo_c: null,
    });
    assert.equal(daB.alvo_d, null);
    cargoDeB = daB.id;
  });

  it("nao mostra a um parceiro o cargo de outro, nem na lista nem pelo id", async () => {
    entrarComo(facilitadorB);
    const lista = await acoesCargos.listar();

    assert.equal(
      lista.some((cargo) => cargo.id === cargoDeA),
      false,
      "o cargo de A nao pode aparecer para B",
    );
    assert.equal(
      lista.some((cargo) => cargo.id === cargoDeB),
      true,
      "e o proprio cargo de B tem de aparecer",
    );

    assert.equal(await acoesCargos.obter(cargoDeA), null);

    entrarComo(facilitadorA);
    assert.equal((await acoesCargos.obter(cargoDeA))?.id, cargoDeA);
  });

  it("mostra ao admin os cargos dos dois parceiros", async () => {
    entrarComo(adminId);
    const ids = (await acoesCargos.listar()).map((cargo) => cargo.id);

    assert.ok(ids.includes(cargoDeA), "admin ve o cargo de A");
    assert.ok(ids.includes(cargoDeB), "admin ve o cargo de B");
  });

  it("facilitador nao cria cargo em nome de outro, nem mandando o id dele", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () =>
        acoesCargos.criar({
          nome: `${marca} cargo plantado`,
          alvo_d: 25,
          alvo_i: 25,
          alvo_s: 25,
          alvo_c: 25,
          facilitador_id: facilitadorB,
        }),
      /em nome de outro/,
    );

    entrarComo(facilitadorB);
    assert.equal(
      (await acoesCargos.listar()).some((cargo) => cargo.nome.includes("cargo plantado")),
      false,
      "nada pode aparecer na lista do outro parceiro",
    );
  });

  /**
   * O insert e CRU de proposito: o zod ja recusaria, e nao e ele que esta em
   * julgamento. Alvo que soma 99 comparado contra um perfil que soma 100 gera
   * distancia sem significado, e a tela mostraria ranking errado sem quebrar —
   * por isso a regra tem de valer para quem entra por fora do formulario.
   */
  it("o banco recusa alvo que nao soma 100", async () => {
    await assert.rejects(
      () =>
        db.insert(cargos).values({
          facilitador_id: facilitadorA,
          nome: `${marca} soma 99`,
          alvo_d: 40,
          alvo_i: 30,
          alvo_s: 20,
          alvo_c: 9,
          modified_by: SISTEMA,
        }),
      violou("ck_cargos_alvo"),
    );
  });

  it("o banco recusa alvo preenchido pela metade", async () => {
    // Os quatro andam juntos: tres preenchidos e um nulo somaria 100 sem ser um
    // perfil, e a comparacao trataria o vazio como zero.
    await assert.rejects(
      () =>
        db.insert(cargos).values({
          facilitador_id: facilitadorA,
          nome: `${marca} pela metade`,
          alvo_d: 50,
          alvo_i: 30,
          alvo_s: 20,
          alvo_c: null,
          modified_by: SISTEMA,
        }),
      violou("ck_cargos_alvo"),
    );
  });
});

describe("devolutivas", () => {
  let devolutivaDeA = "";
  let devolutivaDeB = "";

  it("abre a devolutiva pausada, sobre o proprio assessment", async () => {
    entrarComo(facilitadorA);
    const criada = await acoesDevolutivas.criar({ assessment_id: assessmentDeA });

    assert.equal(criada.facilitador_id, facilitadorA);
    assert.equal(criada.finalizada_em, null, "nasce pausada: nao ha coluna de situacao");
    devolutivaDeA = criada.id;

    entrarComo(facilitadorB);
    const daB = await acoesDevolutivas.criar({ assessment_id: assessmentDeB });
    devolutivaDeB = daB.id;
  });

  it("recusa devolutiva sobre o assessment de outro parceiro", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(
      () => acoesDevolutivas.criar({ assessment_id: assessmentDeB }),
      /Mapa nao encontrado/,
    );
  });

  it("o banco recusa o cruzamento de dono, mesmo sem passar pela action", async () => {
    // A FK composta (assessment_id, facilitador_id) aponta para
    // uq_assessments_id_facilitador. E ela, e nao o WHERE, que impede a
    // devolutiva de um parceiro sobre o mapa de outro.
    await assert.rejects(
      () =>
        db.insert(devolutivas).values({
          assessment_id: assessmentDeB,
          facilitador_id: facilitadorA,
          modified_by: SISTEMA,
        }),
      violou("fk_devolutivas_assessment_dono"),
    );
  });

  it("nao mostra a um parceiro a devolutiva de outro, nem na lista nem pelo id", async () => {
    entrarComo(facilitadorB);
    const lista = await acoesDevolutivas.listar();

    assert.equal(
      lista.some((devolutiva) => devolutiva.id === devolutivaDeA),
      false,
      "a devolutiva de A nao pode aparecer para B",
    );
    assert.equal(
      lista.some((devolutiva) => devolutiva.id === devolutivaDeB),
      true,
      "e a propria devolutiva de B tem de aparecer",
    );

    assert.equal(await acoesDevolutivas.obter(devolutivaDeA), null);

    entrarComo(facilitadorA);
    assert.equal((await acoesDevolutivas.obter(devolutivaDeA))?.id, devolutivaDeA);
  });

  it("mostra ao admin as devolutivas dos dois parceiros", async () => {
    entrarComo(adminId);
    const ids = (await acoesDevolutivas.listar()).map((devolutiva) => devolutiva.id);

    assert.ok(ids.includes(devolutivaDeA), "admin ve a devolutiva de A");
    assert.ok(ids.includes(devolutivaDeB), "admin ve a devolutiva de B");
  });

  it("facilitador nao abre devolutiva em nome de outro, nem mandando o id dele", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () =>
        acoesDevolutivas.criar({
          assessment_id: assessmentDeA,
          facilitador_id: facilitadorB,
        }),
      /em nome de outro/,
    );

    entrarComo(facilitadorB);
    const deB = await acoesDevolutivas.listar();
    assert.equal(
      deB.some((devolutiva) => devolutiva.assessment_id === assessmentDeA),
      false,
      "nada pode aparecer na lista do outro parceiro",
    );
  });

  it("deriva a situacao de finalizada_em, sem coluna guardada", async () => {
    entrarComo(facilitadorA);
    const antes = await acoesDevolutivas.obter(devolutivaDeA);
    assert.equal(
      (await acoesDevolutivas.listar()).find((linha) => linha.id === devolutivaDeA)?.situacao,
      "Pausada",
    );

    const finalizada = await acoesDevolutivas.atualizar(
      devolutivaDeA,
      { duracao_segundos: 1800, finalizada: true },
      antes!.updated_at,
    );

    assert.ok(finalizada.finalizada_em instanceof Date);
    assert.equal(
      (await acoesDevolutivas.listar()).find((linha) => linha.id === devolutivaDeA)?.situacao,
      "Finalizada",
    );
  });

  it("o banco recusa duracao negativa", async () => {
    await assert.rejects(
      () =>
        db.insert(devolutivas).values({
          assessment_id: assessmentDeA,
          facilitador_id: facilitadorA,
          duracao_segundos: -1,
          modified_by: SISTEMA,
        }),
      violou("ck_devolutivas_duracao"),
    );
  });
});
