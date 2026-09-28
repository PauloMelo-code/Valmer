/**
 * Teste de integracao do Territorio da Empresa contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Tres perguntas, e sao as tres que a camada de dados existe para responder:
 *
 * 1. O RECORTE POR DONO, pelos dois lados. A tela de territorio mostra nome de
 *    empresa e nome de pessoa avaliada — nesta plataforma os parceiros sao
 *    concorrentes, e a lista de empresas de um e a carteira de clientes dele.
 *    Testado pela lista, pelo id, pelo slug e pela escrita com o dono forjado.
 * 2. A MEDIA vem do BANCO. `data/dna.ts` trazia `{ D: 52, I: 57, S: 47, C: 45 }`
 *    escrito a mao — que soma 201 e nao descreve nenhum dos respondentes
 *    listados ao lado. Aqui os contadores sao conhecidos e a media e conferida
 *    numero por numero, inclusive o caso do vinculado que ainda nao respondeu:
 *    contador nulo tratado como zero rebaixaria a media do grupo inteiro.
 * 3. O cruzamento de dono no VINCULO e recusado pelo BANCO, com insert cru, sem
 *    passar pela action. O que se quer provar e que a FK composta vale tambem
 *    para seed, importacao e UPDATE feito no psql.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, territorios, territoriosAssessments } = await import(
  "@/lib/db/schema"
);
const acoes = await import("@/lib/actions/territorios");
const vinculos = await import("@/lib/actions/territorios-vinculos");
const { slugDoNome } = await import("@/lib/validators/territorio");
const { and, eq } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

let adminId = "";
let facilitadorA = "";
let facilitadorB = "";
/** Dois mapas concluidos de A, com contadores conhecidos, e um pendente. */
let mapaDeA1 = "";
let mapaDeA2 = "";
let mapaPendenteDeA = "";
let mapaDeB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

/**
 * Casa com o nome da constraint que o Postgres violou.
 *
 * O drizzle embrulha o erro do driver: a mensagem de cima e "Failed query:
 * insert into ..." e o nome da constraint vive no `cause`. Um regex direto no
 * `assert.rejects` passaria a existir sem conferir NADA — qualquer falha de
 * insert satisfaria "rejeitou".
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
        nome: ["Admin dos Territorios", "Facilitador A", "Facilitador B"][i]!,
        email: `${["admin", "a", "b"][i]}.territorios.${marca}@exemplo.com`,
        papel,
        creditos: 0,
        modified_by: SISTEMA,
      })),
    )
    .returning();

  adminId = admin!.id;
  facilitadorA = a!.id;
  facilitadorB = b!.id;

  /**
   * Os contadores sao escolhidos para a media NAO poder sair por acidente:
   * nenhum dos dois respondentes tem 25 em fator nenhum, e a media dos dois e
   * 25 nos quatro. Numero fixo, numero copiado de um respondente ou media
   * calculada sobre um deles so — qualquer um desses erros da outro resultado.
   */
  const criados = await db
    .insert(assessments)
    .values([
      {
        token: `terr${marca.slice(-6)}1`,
        facilitador_id: facilitadorA,
        avaliado_nome: "Bruno Carvalho",
        avaliado_email: `bruno.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        situacao: "concluido" as const,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        concluido_em: new Date(),
        contador_d: 14,
        contador_i: 14,
        contador_s: 0,
        contador_c: 0,
        modified_by: SISTEMA,
      },
      {
        token: `terr${marca.slice(-6)}2`,
        facilitador_id: facilitadorA,
        avaliado_nome: "Eduardo Salles",
        avaliado_email: `eduardo.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        situacao: "concluido" as const,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        concluido_em: new Date(),
        contador_d: 0,
        contador_i: 0,
        contador_s: 14,
        contador_c: 14,
        modified_by: SISTEMA,
      },
      {
        token: `terr${marca.slice(-6)}3`,
        facilitador_id: facilitadorA,
        avaliado_nome: "Camila Ferraz",
        avaliado_email: `camila.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        modified_by: SISTEMA,
      },
      {
        token: `terr${marca.slice(-6)}4`,
        facilitador_id: facilitadorB,
        avaliado_nome: "Pessoa de B",
        avaliado_email: `pessoab.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        situacao: "concluido" as const,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        concluido_em: new Date(),
        contador_d: 28,
        contador_i: 0,
        contador_s: 0,
        contador_c: 0,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  mapaDeA1 = criados[0]!.id;
  mapaDeA2 = criados[1]!.id;
  mapaPendenteDeA = criados[2]!.id;
  mapaDeB = criados[3]!.id;
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso — ver excluir().
  //
  // A ordem segue as FKs: vinculo aponta para territorio e para assessment.
  const ids = [adminId, facilitadorA, facilitadorB];
  const lista = `'${ids.join("','")}'`;
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in (${lista})`);
    await tx.execute(`delete from territorios_assessments where facilitador_id in (${lista})`);
    await tx.execute(`delete from territorios where facilitador_id in (${lista})`);
    await tx.execute(`delete from assessments where facilitador_id in (${lista})`);
    await tx.execute(`delete from usuarios where id in (${lista})`);
  });
});

describe("territorios", () => {
  let territorioDeA = "";
  let slugDeA = "";
  let territorioDeB = "";
  const nomeComum = `Matriz ${marca}`;

  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => acoes.listar(), /Nao autenticado/);
  });

  it("cria o territorio do parceiro logado, com slug tirado do nome", async () => {
    entrarComo(facilitadorA);
    const criado = await acoes.criar({ nome: nomeComum, descricao: "  " });

    assert.equal(criado.facilitador_id, facilitadorA, "o dono e quem esta logado");
    assert.equal(criado.slug, slugDoNome(nomeComum));
    assert.equal(criado.descricao, null, "descricao em branco nao vira string vazia gravada");
    assert.equal(criado.is_deleted, false);
    territorioDeA = criado.id;
    slugDeA = criado.slug;

    entrarComo(facilitadorB);
    const daB = await acoes.criar({ nome: `Filial ${marca}`, descricao: "A filial do B" });
    assert.equal(daB.descricao, "A filial do B");
    territorioDeB = daB.id;
  });

  it("o mesmo nome no mesmo dono ganha sufixo, e o mesmo slug em outro dono e livre", async () => {
    entrarComo(facilitadorA);
    const segunda = await acoes.criar({ nome: nomeComum });
    assert.equal(segunda.slug, `${slugDeA}-2`, "dois clientes chamados igual sao normais");

    // Recusar aqui contaria a B que A ja tem uma empresa com esse nome. O slug
    // e unico POR DONO, e toda leitura passa pelo recorte do dono.
    entrarComo(facilitadorB);
    const noOutroDono = await acoes.criar({ nome: nomeComum });
    assert.equal(noOutroDono.slug, slugDeA);
    assert.equal(noOutroDono.facilitador_id, facilitadorB);
  });

  it("nao mostra a um parceiro o territorio de outro, nem na lista, nem pelo id, nem pelo slug", async () => {
    entrarComo(facilitadorB);
    const lista = await acoes.listar();

    assert.equal(
      lista.some((territorio) => territorio.id === territorioDeA),
      false,
      "a lista de empresas de A nao pode aparecer para B",
    );
    assert.equal(
      lista.some((territorio) => territorio.id === territorioDeB),
      true,
      "e o proprio territorio de B tem de aparecer",
    );

    // A lista e so uma das portas. Quem tiver o uuid ou o slug — de um link
    // colado, do historico do navegador — entra por aqui, e o WHERE tem de
    // recusar igual. O slug e o caso mais afiado: ele e ADIVINHAVEL a partir do
    // nome da empresa, coisa que o uuid nao e.
    assert.equal(await acoes.obter(territorioDeA), null);

    const peloSlug = await acoes.obterPorSlug(slugDeA);
    assert.notEqual(
      peloSlug?.id,
      territorioDeA,
      "o slug de A, adivinhado pelo nome da empresa, nao pode abrir o territorio de A",
    );
    assert.equal(
      peloSlug?.facilitador_id,
      facilitadorB,
      "B pede o slug e recebe o territorio DELE que tem esse slug, nunca o de A",
    );
    assert.equal(await acoes.detalhe(slugDeA + "-nao-existe"), null);

    entrarComo(facilitadorA);
    assert.equal((await acoes.obter(territorioDeA))?.id, territorioDeA);
    assert.equal((await acoes.obterPorSlug(slugDeA))?.id, territorioDeA);
  });

  it("mostra ao admin os territorios dos dois parceiros", async () => {
    entrarComo(adminId);
    const ids = (await acoes.listar()).map((territorio) => territorio.id);

    assert.ok(ids.includes(territorioDeA), "admin ve o territorio de A");
    assert.ok(ids.includes(territorioDeB), "admin ve o territorio de B");
  });

  it("facilitador nao cria territorio em nome de outro, nem mandando o id dele", async () => {
    entrarComo(facilitadorA);

    await assert.rejects(
      () => acoes.criar({ nome: `Plantado ${marca}`, facilitador_id: facilitadorB }),
      /em nome de outro/,
    );

    entrarComo(facilitadorB);
    assert.equal(
      (await acoes.listar()).some((territorio) => territorio.nome.includes("Plantado")),
      false,
      "nada pode aparecer na lista do outro parceiro",
    );
  });

  it("recusa vincular o mapa de outro parceiro", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(
      () => vinculos.vincularInventario(territorioDeA, mapaDeB),
      /Mapa nao encontrado/,
    );

    entrarComo(facilitadorB);
    await assert.rejects(
      () => vinculos.vincularInventario(territorioDeA, mapaDeB),
      /Territorio nao encontrado/,
    );
  });

  it("o banco recusa o cruzamento de dono no vinculo, mesmo sem passar pela action", async () => {
    // A FK composta (assessment_id, facilitador_id) aponta para
    // uq_assessments_id_facilitador. E ela, e nao o WHERE, que impede o
    // territorio de um parceiro de consolidar o mapa de outro — e com isso a
    // media de uma empresa misturar gente de duas carteiras.
    await assert.rejects(
      () =>
        db.insert(territoriosAssessments).values({
          territorio_id: territorioDeA,
          assessment_id: mapaDeB,
          facilitador_id: facilitadorA,
          modified_by: SISTEMA,
        }),
      violou("fk_territorios_assessments_assessment_dono"),
    );

    await assert.rejects(
      () =>
        db.insert(territoriosAssessments).values({
          territorio_id: territorioDeA,
          assessment_id: mapaDeB,
          facilitador_id: facilitadorB,
          modified_by: SISTEMA,
        }),
      violou("fk_territorios_assessments_territorio_dono"),
    );
  });

  it("vincula os inventarios e conta so os vinculos vivos na lista", async () => {
    entrarComo(facilitadorA);
    await vinculos.vincularInventario(territorioDeA, mapaDeA1);
    await vinculos.vincularInventario(territorioDeA, mapaDeA2);
    await vinculos.vincularInventario(territorioDeA, mapaPendenteDeA);

    const naLista = (await acoes.listar()).find((linha) => linha.id === territorioDeA);
    assert.equal(naLista?.inventarios, 3, "a contagem e COUNT dos vinculos, nao coluna gravada");
    assert.equal(naLista?.criado_por, "Facilitador A");
  });

  it("recusa o mesmo inventario duas vezes, e deixa revincular depois de desvincular", async () => {
    entrarComo(facilitadorA);

    // Em dobro, a pessoa entraria duas vezes na media e puxaria o perfil do
    // grupo para o dela.
    await assert.rejects(
      () => vinculos.vincularInventario(territorioDeA, mapaDeA1),
      /ja esta neste territorio/,
    );

    await vinculos.desvincularInventario(territorioDeA, mapaPendenteDeA);
    assert.equal(
      (await acoes.listar()).find((linha) => linha.id === territorioDeA)?.inventarios,
      2,
      "desvinculado sai da contagem",
    );

    await assert.rejects(
      () => vinculos.desvincularInventario(territorioDeA, mapaPendenteDeA),
      /nao esta neste territorio/,
    );

    // O indice unico e PARCIAL exatamente para isto: com indice cheio o par
    // (territorio, mapa) ficaria ocupado para sempre pela linha desvinculada.
    await vinculos.vincularInventario(territorioDeA, mapaPendenteDeA);
    assert.equal(
      (await acoes.listar()).find((linha) => linha.id === territorioDeA)?.inventarios,
      3,
    );
  });

  it("desvincular nao apaga o mapa", async () => {
    const [mapa] = await db.select().from(assessments).where(eq(assessments.id, mapaPendenteDeA));
    assert.equal(mapa!.is_deleted, false, "o mapa tem relatorio e devolutiva; ele nao e do vinculo");
  });

  it("calcula a media de D, I, S e C a partir dos contadores do banco", async () => {
    entrarComo(facilitadorA);
    const detalhe = await acoes.detalhe(slugDeA);

    assert.ok(detalhe, "o territorio de A abre pelo slug dele");
    assert.equal(detalhe!.respondentes.length, 2, "so quem respondeu entra");
    assert.equal(detalhe!.pendentes, 1, "o vinculado sem resposta e contado a parte");

    // Bruno 50/50/0/0 e Eduardo 0/0/50/50. A media e 25 nos quatro — numero que
    // NENHUM dos dois respondentes tem, entao nao ha como ela sair por copia.
    assert.deepEqual(detalhe!.medias, { D: 25, I: 25, S: 25, C: 25 });

    // Contador nulo tratado como zero rebaixaria os quatro fatores de uma vez
    // (25 viraria ~17, dividindo por tres em vez de dois). Este assert e o que
    // pega isso.
    const soma = detalhe!.medias.D + detalhe!.medias.I + detalhe!.medias.S + detalhe!.medias.C;
    assert.equal(soma, 100);

    const bruno = detalhe!.respondentes.find((pessoa) => pessoa.nome === "Bruno Carvalho");
    assert.equal(bruno?.perfil, "DI", "o perfil individual vem do mesmo calculo do resto do sistema");
    assert.equal(bruno?.d, 50);
    assert.equal(bruno?.iniciais, "BC");
    assert.equal(
      detalhe!.respondentes.find((pessoa) => pessoa.nome === "Eduardo Salles")?.perfil,
      "SC",
    );
  });

  it("a media de um territorio vazio e zero, e nao numero inventado", async () => {
    entrarComo(facilitadorB);
    const vazio = await acoes.criar({ nome: `Sem inventario ${marca}` });
    const detalhe = await acoes.detalhe(vazio.slug);

    assert.deepEqual(detalhe!.medias, { D: 0, I: 0, S: 0, C: 0 });
    assert.equal(detalhe!.respondentes.length, 0);
  });

  it("oferece para vincular so os mapas do dono que ainda nao estao no territorio", async () => {
    entrarComo(facilitadorA);
    const disponiveis = (await vinculos.inventariosDisponiveis(territorioDeA)).map(
      (mapa) => mapa.id,
    );

    assert.equal(disponiveis.includes(mapaDeA1), false, "quem ja esta dentro nao aparece");
    assert.equal(disponiveis.includes(mapaDeB), false, "mapa de outro parceiro nunca aparece");
  });

  it("recusa que B atualize ou exclua o territorio de A", async () => {
    entrarComo(facilitadorA);
    const antes = await acoes.obter(territorioDeA);

    entrarComo(facilitadorB);
    await assert.rejects(
      () => acoes.atualizar(territorioDeA, { nome: `Invadido ${marca}` }, antes!.updated_at),
      /Territorio nao encontrado/,
    );
    await assert.rejects(() => acoes.excluir(territorioDeA), /Territorio nao encontrado/);

    const [linha] = await db.select().from(territorios).where(eq(territorios.id, territorioDeA));
    assert.equal(linha!.nome, antes!.nome, "o nome nao pode ter mudado");
    assert.equal(linha!.is_deleted, false, "e a linha continua viva");
  });

  it("atualiza o nome sem trocar o slug, e recusa gravacao de aba velha", async () => {
    entrarComo(facilitadorA);
    const antes = await acoes.obter(territorioDeA);
    const atualizado = await acoes.atualizar(
      territorioDeA,
      { nome: `Matriz renomeada ${marca}`, descricao: "agora tem descricao" },
      antes!.updated_at,
    );

    // O link do territorio ja foi enviado ao cliente: trocar a URL no rename
    // quebraria esse link em silencio.
    assert.equal(atualizado.slug, slugDeA, "o slug nao acompanha o nome");
    assert.equal(atualizado.descricao, "agora tem descricao");

    await assert.rejects(
      () => acoes.atualizar(territorioDeA, { nome: `Outra vez ${marca}` }, antes!.updated_at),
      /alterado por outra aba/,
    );
  });

  it("exclui de forma logica, derruba os vinculos junto e libera o slug", async () => {
    entrarComo(facilitadorA);
    await acoes.excluir(territorioDeA);

    const [linha] = await db.select().from(territorios).where(eq(territorios.id, territorioDeA));
    assert.ok(linha, "a linha nao pode sumir do banco");
    assert.equal(linha!.is_deleted, true);
    assert.ok(linha!.deleted_at instanceof Date);

    // Vinculo vivo apontando para territorio invisivel faria "quantos
    // inventarios tem este territorio?" responder por um territorio que nao
    // existe mais.
    const vivos = await db
      .select()
      .from(territoriosAssessments)
      .where(
        and(
          eq(territoriosAssessments.territorio_id, territorioDeA),
          eq(territoriosAssessments.is_deleted, false),
        ),
      );
    assert.equal(vivos.length, 0, "os vinculos caem na mesma transacao");

    // Os mapas continuam inteiros: o que foi excluido e a leitura coletiva.
    const [mapa] = await db.select().from(assessments).where(eq(assessments.id, mapaDeA1));
    assert.equal(mapa!.is_deleted, false);

    // O indice unico e parcial: quem excluiu por engano recadastra a empresa.
    const denovo = await acoes.criar({ nome: `Matriz ${marca}` });
    assert.equal(denovo.slug, slugDeA, "o slug volta a estar livre");
    assert.equal(await acoes.obterPorSlug(slugDeA).then((linha) => linha?.id), denovo.id);
  });
});
