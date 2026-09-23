/**
 * Teste de integracao da tabela comercial, contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * O assunto aqui e PRECO, que e dinheiro com efeito retroativo em potencial.
 * Tres coisas sao verificadas, e a terceira e a que importa:
 *
 * 1. O facilitador NAO edita preco. A checagem mora dentro da action, e nao na
 *    tela: Server Action e endpoint POST publico, e a tela escondida nao
 *    protege nada.
 * 2. O admin edita e a trilha registra o antes e o depois — e a unica forma de,
 *    um mes depois, explicar por que dois mapas do mesmo nivel custaram
 *    diferente.
 * 3. Mudar o preco de S1 NAO altera `creditos_usados` de um mapa JA CRIADO. O
 *    credito ja foi debitado e o extrato ja foi lancado; reprecificar o passado
 *    faria a soma do extrato deixar de explicar o saldo, que e o COMMIT que a
 *    CONSTRAINT TRIGGER da migration 0005 aborta. O preco novo vale para o
 *    PROXIMO mapa — e isso tambem e verificado, senao o teste passaria com uma
 *    action que simplesmente ignora a tabela de precos.
 *
 * POR QUE `npm test` PASSOU A RODAR OS ARQUIVOS EM SERIE
 * (`--test-concurrency=1` em package.json)
 * ------------------------------------------------------
 * Preco e a primeira linha GLOBAL e mutavel do banco de teste: todo o resto que
 * os testes escrevem e fixture proprio, marcado com o timestamp da rodada. Este
 * arquivo precisa mudar o preco do S1 para provar o que promete, e os outros
 * arquivos criam mapas S1 contando com o preco do seed — em paralelo, um pega o
 * preco inflado do outro e falha por um motivo que nao tem nada a ver com o que
 * ele testa. Serie e alguns segundos a mais; teste que falha sozinho de vez em
 * quando custa muito mais caro que isso.
 *
 * De quebra, o caminho da degustacao: mapa de amostra nao encosta no saldo de
 * credito nem no extrato, consome 1 do saldo de degustacao e nasce com
 * `creditos_usados = 0`.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { assessments, auditoria, creditosTransacoes, precosRelatorios, usuarios } = await import(
  "@/lib/db/schema"
);
const precos = await import("@/lib/actions/precos");
const mapas = await import("@/lib/actions/assessments");
const { and, eq, sql } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

/** Folga para criar dois mapas, o segundo ja com o preco inflado do teste. */
const SALDO_INICIAL = 30;

/** O preco que o teste instala no S1 para provar que o passado nao se mexe. */
const PRECO_NOVO = 7;

let admin = "";
let facilitador = "";
/** O S1 como o seed o deixou. Restaurado no fim: a tabela de precos e global. */
let s1Original: typeof precosRelatorios.$inferSelect;

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

async function s1Agora() {
  const [linha] = await db
    .select()
    .from(precosRelatorios)
    .where(and(eq(precosRelatorios.codigo, "S1"), eq(precosRelatorios.is_deleted, false)))
    .limit(1);

  return linha!;
}

async function mapaPorId(id: string) {
  const [linha] = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  return linha!;
}

async function usuarioPorId(id: string) {
  const [linha] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  return linha!;
}

/** A soma das linhas ATIVAS do extrato: o outro lado da invariante da 0005. */
async function extratoDe(id: string): Promise<number> {
  const [total] = await db
    .select({ soma: sql<number>`coalesce(sum(${creditosTransacoes.quantidade}), 0)::int` })
    .from(creditosTransacoes)
    .where(and(eq(creditosTransacoes.usuario_id, id), eq(creditosTransacoes.is_deleted, false)));

  return total?.soma ?? 0;
}

before(async () => {
  s1Original = await s1Agora();
  assert.ok(s1Original, "O seed precisa ter rodado: sem preco de S1 nao ha o que testar.");

  // O saldo nasce com lastro no extrato, na mesma transacao: a partir da 0005 o
  // banco confere no COMMIT se `usuarios.creditos` bate com a soma do extrato.
  const [umAdmin, umFacilitador] = await db.transaction(async (tx) => {
    const criados = await tx
      .insert(usuarios)
      .values([
        {
          nome: "Admin do Teste",
          email: `admin.precos.${marca}@exemplo.com`,
          papel: "admin" as const,
          modified_by: SISTEMA,
        },
        {
          nome: "Facilitador do Teste",
          email: `parceiro.precos.${marca}@exemplo.com`,
          papel: "facilitador" as const,
          creditos: SALDO_INICIAL,
          modified_by: SISTEMA,
        },
      ])
      .returning();

    await tx.insert(creditosTransacoes).values({
      usuario_id: criados[1]!.id,
      tipo: "bonus" as const,
      quantidade: SALDO_INICIAL,
      descricao: "Saldo inicial do fixture",
      modified_by: SISTEMA,
    });

    return criados;
  });

  admin = umAdmin!.id;
  facilitador = umFacilitador!.id;
});

after(async () => {
  // A tabela de precos e da PLATAFORMA, e nao do fixture: deixar o S1 valendo 7
  // creditos cobraria a mais no proximo `npm run dev` de quem rodou o teste.
  await db
    .update(precosRelatorios)
    .set({
      nome: s1Original.nome,
      creditos: s1Original.creditos,
      conteudo: s1Original.conteudo,
      revenda_min: s1Original.revenda_min,
      revenda_max: s1Original.revenda_max,
      updated_at: s1Original.updated_at,
      modified_by: s1Original.modified_by,
    })
    .where(eq(precosRelatorios.id, s1Original.id));

  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. Numa transacao so por causa da guarda da 0005 — apagar o
  // extrato num commit proprio deixaria, naquele instante, um usuario com saldo
  // que transacao nenhuma explica. A ordem segue as FKs.
  const ids = [admin, facilitador];
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from creditos_transacoes where usuario_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from assessments where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from usuarios where id in ('${ids.join("','")}')`);
  });

  delete process.env.SESSAO_DEV_USUARIO_ID;
});

describe("tabela de precos", () => {
  it("recusa a edicao de preco pelo facilitador, dentro da action", async () => {
    entrarComo(facilitador);
    const s1 = await s1Agora();

    await assert.rejects(
      () =>
        precos.atualizarRelatorio(
          s1.id,
          {
            nome: s1.nome,
            creditos: 99,
            conteudo: s1.conteudo,
            revenda_min: s1.revenda_min,
            revenda_max: s1.revenda_max,
          },
          s1.updated_at,
        ),
      /Sem permissao/,
    );

    // A recusa nao pode ter gravado nada pelo caminho.
    assert.equal((await s1Agora()).creditos, s1.creditos);
  });

  it("recusa ao facilitador ate a LEITURA da tela de gestao", async () => {
    entrarComo(facilitador);
    await assert.rejects(() => precos.listarRelatorios(), /Sem permissao/);
  });

  it("deixa o admin editar e registra na auditoria", async () => {
    entrarComo(admin);
    const antes = await s1Agora();

    const salvo = await precos.atualizarRelatorio(
      antes.id,
      {
        nome: antes.nome,
        creditos: PRECO_NOVO,
        conteudo: antes.conteudo,
        revenda_min: antes.revenda_min,
        revenda_max: antes.revenda_max,
      },
      antes.updated_at,
    );

    assert.equal(salvo.creditos, PRECO_NOVO);

    const trilha = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.user_id, admin), eq(auditoria.registro_id, antes.id)));

    assert.equal(trilha.length, 1);
    assert.equal(trilha[0]!.tabela, "precos_relatorios");
    assert.equal(trilha[0]!.acao, "atualizar");
    assert.match(trilha[0]!.detalhes!, new RegExp(`${antes.creditos} -> ${PRECO_NOVO}`));
  });

  it("recusa a segunda gravacao com o updated_at velho (optimistic locking)", async () => {
    entrarComo(admin);
    const atual = await s1Agora();
    const campos = {
      nome: atual.nome,
      creditos: PRECO_NOVO,
      conteudo: atual.conteudo,
      revenda_min: atual.revenda_min,
      revenda_max: atual.revenda_max,
    };

    await assert.rejects(
      () => precos.atualizarRelatorio(atual.id, campos, s1Original.updated_at),
      /alterado por outra aba/,
    );
  });
});

describe("preco novo nao reescreve o passado", () => {
  it("mantem creditos_usados do mapa criado antes da mudanca", async () => {
    // 1. O mapa nasce com o preco de HOJE (o do seed), antes de qualquer edicao.
    entrarComo(admin);
    await precos.atualizarRelatorio(
      (await s1Agora()).id,
      {
        nome: s1Original.nome,
        creditos: s1Original.creditos,
        conteudo: s1Original.conteudo,
        revenda_min: s1Original.revenda_min,
        revenda_max: s1Original.revenda_max,
      },
      (await s1Agora()).updated_at,
    );

    entrarComo(facilitador);
    const antigo = await mapas.criar({
      avaliado_nome: "Ana Souza",
      avaliado_email: `ana.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
    });

    assert.equal(antigo.creditos_usados, s1Original.creditos);

    const saldoDepoisDoPrimeiro = (await usuarioPorId(facilitador)).creditos;
    assert.equal(saldoDepoisDoPrimeiro, SALDO_INICIAL - s1Original.creditos);

    // 2. O admin reprecifica o S1.
    entrarComo(admin);
    const atual = await s1Agora();
    await precos.atualizarRelatorio(
      atual.id,
      {
        nome: atual.nome,
        creditos: PRECO_NOVO,
        conteudo: atual.conteudo,
        revenda_min: atual.revenda_min,
        revenda_max: atual.revenda_max,
      },
      atual.updated_at,
    );

    // 3. O mapa ja criado nao se mexeu — nem na linha dele, nem no extrato.
    const relido = await mapaPorId(antigo.id);
    assert.equal(relido.creditos_usados, s1Original.creditos);

    const [lancamento] = await db
      .select()
      .from(creditosTransacoes)
      .where(eq(creditosTransacoes.assessment_id, antigo.id));

    assert.equal(lancamento!.quantidade, -s1Original.creditos);
    assert.equal((await usuarioPorId(facilitador)).creditos, saldoDepoisDoPrimeiro);
    assert.equal(await extratoDe(facilitador), saldoDepoisDoPrimeiro);

    // 4. E o preco novo vale para o PROXIMO. Sem esta metade, uma action que
    //    ignorasse a tabela de precos passaria no teste acima.
    entrarComo(facilitador);
    const novo = await mapas.criar({
      avaliado_nome: "Bruno Lima",
      avaliado_email: `bruno.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
    });

    assert.equal(novo.creditos_usados, PRECO_NOVO);
    assert.equal(
      (await usuarioPorId(facilitador)).creditos,
      saldoDepoisDoPrimeiro - PRECO_NOVO,
    );
    assert.equal(await extratoDe(facilitador), saldoDepoisDoPrimeiro - PRECO_NOVO);
  });
});

describe("degustacao", () => {
  it("consome amostra em vez de credito, e nao lanca extrato", async () => {
    entrarComo(facilitador);
    const antes = await usuarioPorId(facilitador);
    const extratoAntes = await extratoDe(facilitador);

    const amostra = await mapas.criar({
      avaliado_nome: "Carla Dias",
      avaliado_email: `carla.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
      degustacao: true,
    });

    const depois = await usuarioPorId(facilitador);

    assert.equal(amostra.degustacao, true);
    // Zero de propria vontade: nenhum credito saiu da carteira. Guardar aqui o
    // custo "equivalente" faria o estorno de `removerPendentes` devolver
    // credito de verdade por um mapa que nunca custou credito.
    assert.equal(amostra.creditos_usados, 0);
    assert.equal(depois.creditos, antes.creditos);
    assert.equal(depois.creditos_degustacao, antes.creditos_degustacao - 1);
    assert.equal(await extratoDe(facilitador), extratoAntes);
  });

  it("recusa a amostra quando o saldo de degustacao acabou", async () => {
    await db
      .update(usuarios)
      .set({ creditos_degustacao: 0 })
      .where(eq(usuarios.id, facilitador));

    entrarComo(facilitador);
    await assert.rejects(
      () =>
        mapas.criar({
          avaliado_nome: "Diego Alves",
          avaliado_email: `diego.${marca}@exemplo.com`,
          tipo_relatorio: "S1",
          degustacao: true,
        }),
      /Sem testes grátis disponíveis/,
    );
  });
});
