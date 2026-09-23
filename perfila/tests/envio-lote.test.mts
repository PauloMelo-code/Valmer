/**
 * Teste de integracao do envio em lote e da remocao de pendentes, contra o
 * banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * O assunto aqui e DINHEIRO, entao o que se verifica e o que some sem barulho:
 * o tudo-ou-nada do lote (com saldo curto, NENHUM mapa nasce e o saldo nao se
 * mexe), o recorte por dono na escrita (o uuid da turma alheia e recusado
 * DENTRO da action, e nao escondido na tela), o estorno lancado como linha de
 * extrato em vez de soma direta no saldo, e a invariante que a trigger da
 * migration 0005 protege: saldo = soma do extrato, antes e depois de tudo.
 *
 * As duas metades do recorte por dono sao testadas: A nao envia para a turma
 * de B, e A envia para a propria. So a primeira passaria com um WHERE que nao
 * devolve nada nunca.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, creditosTransacoes, turmas } = await import("@/lib/db/schema");
const acoes = await import("@/lib/actions/envio-lote");
const { and, eq, sql } = await import("drizzle-orm");

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

/** S1 custa 1 credito (data/planos.ts). Os dois lados nascem com 5. */
const SALDO_INICIAL = 5;

let facilitadorA = "";
let facilitadorB = "";
let turmaDeA = "";
let turmaDeB = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

/**
 * Nomes por extenso, e sem digito: `nomePessoa` so aceita letras, espaco,
 * ponto, hifen e apostrofo — a mesma regra da tela de novo mapa.
 */
const NOMES = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Alves", "Elisa Prado"];

function destinatarios(quantos: number) {
  return Array.from({ length: quantos }, (_, indice) => ({
    avaliado_nome: NOMES[indice]!,
    avaliado_email: `pessoa${indice}.${marca}@exemplo.com`,
  }));
}

async function saldoDe(id: string): Promise<number> {
  const [linha] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  return linha!.creditos;
}

/**
 * A soma das linhas ATIVAS do extrato. E o outro lado da invariante da 0005:
 * a trigger ja aborta o COMMIT quando os dois divergem, mas conferir aqui diz
 * QUAL numero ficou errado quando algo quebrar.
 */
async function extratoDe(id: string): Promise<number> {
  const [total] = await db
    .select({ soma: sql<number>`coalesce(sum(${creditosTransacoes.quantidade}), 0)::int` })
    .from(creditosTransacoes)
    .where(
      and(eq(creditosTransacoes.usuario_id, id), eq(creditosTransacoes.is_deleted, false)),
    );

  return total?.soma ?? 0;
}

async function mapasDa(turmaId: string) {
  return db
    .select()
    .from(assessments)
    .where(and(eq(assessments.turma_id, turmaId), eq(assessments.is_deleted, false)));
}

before(async () => {
  // O saldo dos dois nasce com lastro no extrato, na mesma transacao: a partir
  // da 0005 o banco confere no COMMIT se `usuarios.creditos` bate com a soma
  // do extrato, e um fixture com saldo que transacao nenhuma explica ensaiaria
  // um estado que producao nao permite.
  //
  // B tambem nasce com saldo DE PROPOSITO. E o que da dente ao teste do
  // recorte por dono: com o guard removido, o envio de A para a turma de B
  // teria credito para dar certo, e o teste falha por ter passado — em vez de
  // falhar por saldo insuficiente, que seria a recusa certa pelo motivo errado.
  const [a, b] = await db.transaction(async (tx) => {
    const criados = await tx
      .insert(usuarios)
      .values([
        {
          nome: "Facilitador A",
          email: `a.lote.${marca}@exemplo.com`,
          papel: "facilitador" as const,
          creditos: SALDO_INICIAL,
          modified_by: SISTEMA,
        },
        {
          nome: "Facilitador B",
          email: `b.lote.${marca}@exemplo.com`,
          papel: "facilitador" as const,
          creditos: SALDO_INICIAL,
          modified_by: SISTEMA,
        },
      ])
      .returning();

    await tx.insert(creditosTransacoes).values(
      criados.map((usuario) => ({
        usuario_id: usuario.id,
        tipo: "bonus" as const,
        quantidade: SALDO_INICIAL,
        descricao: "Saldo inicial do fixture",
        modified_by: SISTEMA,
      })),
    );

    return criados;
  });

  facilitadorA = a!.id;
  facilitadorB = b!.id;

  const criadas = await db
    .insert(turmas)
    .values([
      {
        facilitador_id: facilitadorA,
        nome: `Turma de A ${marca}`,
        area: "profissional" as const,
        tipo_relatorio: "S1" as const,
        modified_by: SISTEMA,
      },
      {
        facilitador_id: facilitadorB,
        nome: `Turma de B ${marca}`,
        area: "global" as const,
        tipo_relatorio: "S1" as const,
        modified_by: SISTEMA,
      },
    ])
    .returning();

  turmaDeA = criadas[0]!.id;
  turmaDeB = criadas[1]!.id;
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso — ver `removerPendentes`.
  //
  // Numa transacao so por causa da guarda da 0005: apagar o extrato num commit
  // proprio deixaria, naquele instante, um usuario com saldo que transacao
  // nenhuma explica. Apagando tudo junto o usuario ja nao existe no COMMIT, e
  // a checagem pula quem sumiu. A ordem segue as FKs.
  const ids = [facilitadorA, facilitadorB];
  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where user_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from creditos_transacoes where usuario_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from assessments where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from turmas where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from usuarios where id in ('${ids.join("','")}')`);
  });
});

describe("envio em lote", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(
      () => acoes.criarLote({ turma_id: turmaDeA, destinatarios: destinatarios(1) }),
      /Nao autenticado/,
    );
  });

  it("cria os 3 mapas ligados a turma, debita o saldo e lanca o extrato", async () => {
    entrarComo(facilitadorA);

    const resultado = await acoes.criarLote({
      turma_id: turmaDeA,
      destinatarios: destinatarios(3),
    });

    assert.equal(resultado.criados, 3);
    assert.equal(resultado.creditos, 3, "3 passaportes S1 custam 3 creditos");

    const mapas = await mapasDa(turmaDeA);
    assert.equal(mapas.length, 3, "os 3 nasceram");
    assert.ok(
      mapas.every((mapa) => mapa.turma_id === turmaDeA),
      "todo mapa do lote sai ligado a turma — e o ponto do envio rapido",
    );
    assert.ok(
      mapas.every((mapa) => mapa.facilitador_id === facilitadorA),
      "e todos com o dono da turma",
    );
    assert.ok(
      mapas.every((mapa) => mapa.tipo_relatorio === "S1"),
      "o nivel vem da turma, e nao do formulario",
    );
    assert.equal(new Set(mapas.map((mapa) => mapa.token)).size, 3, "um token por mapa");

    assert.equal(await saldoDe(facilitadorA), SALDO_INICIAL - 3, "5 - 3");
    assert.equal(
      await extratoDe(facilitadorA),
      SALDO_INICIAL - 3,
      "o extrato explica o saldo: 3 linhas de uso, uma por mapa",
    );

    const usos = await db
      .select()
      .from(creditosTransacoes)
      .where(
        and(eq(creditosTransacoes.usuario_id, facilitadorA), eq(creditosTransacoes.tipo, "uso")),
      );

    assert.equal(usos.length, 3, "uma linha de extrato por mapa, com o assessment_id de cada um");
    assert.ok(
      usos.every((linha) => mapas.some((mapa) => mapa.id === linha.assessment_id)),
      "cada linha aponta o passaporte que a explica",
    );
  });

  /**
   * A REGRA DO TUDO-OU-NADA.
   *
   * Sobraram 2 creditos e o lote pede 3. Meia entrega — 2 links criados e 1
   * recusado — seria o pior resultado possivel: o parceiro fica sabendo que
   * "falhou" sem saber quem recebeu, reenvia a lista inteira e cobra duas
   * vezes das duas primeiras pessoas.
   */
  it("com saldo curto nao cria mapa NENHUM e nao mexe no saldo", async () => {
    entrarComo(facilitadorA);

    const saldoAntes = await saldoDe(facilitadorA);
    const mapasAntes = (await mapasDa(turmaDeA)).length;
    assert.equal(saldoAntes, 2, "o teste anterior deixou 2");

    await assert.rejects(
      () =>
        acoes.criarLote({
          turma_id: turmaDeA,
          destinatarios: [
            { avaliado_nome: "Curto Um", avaliado_email: `curtoum.${marca}@exemplo.com` },
            { avaliado_nome: "Curto Dois", avaliado_email: `curtodois.${marca}@exemplo.com` },
            { avaliado_nome: "Curto Tres", avaliado_email: `curtotres.${marca}@exemplo.com` },
          ],
        }),
      /faltam 1/,
      "a recusa diz quantos creditos faltam, que e a frase acionavel",
    );

    assert.equal(await saldoDe(facilitadorA), saldoAntes, "o saldo nao se mexeu");
    assert.equal(await extratoDe(facilitadorA), saldoAntes, "nem o extrato");
    assert.equal((await mapasDa(turmaDeA)).length, mapasAntes, "nenhum mapa nasceu");
  });

  it("recusa e-mail repetido dentro do proprio lote, antes de gravar", async () => {
    entrarComo(facilitadorA);
    const saldoAntes = await saldoDe(facilitadorA);
    const mapasAntes = (await mapasDa(turmaDeA)).length;

    await assert.rejects(
      () =>
        acoes.criarLote({
          turma_id: turmaDeA,
          destinatarios: [
            { avaliado_nome: "Ana Repetida", avaliado_email: `ana.${marca}@exemplo.com` },
            // Maiusculas e espaco: o zod normaliza antes, senao passariam como
            // dois destinatarios diferentes.
            { avaliado_nome: "Ana De Novo", avaliado_email: ` Ana.${marca}@Exemplo.com ` },
          ],
        }),
      /mais de uma vez no lote/,
    );

    assert.equal(await saldoDe(facilitadorA), saldoAntes, "nada foi cobrado");
    assert.equal((await mapasDa(turmaDeA)).length, mapasAntes, "nada foi gravado");
  });

  /**
   * O gemeo, pelo lado da ESCRITA, do "tirar o dono do WHERE".
   *
   * `turma_id` vem do cliente, e Server Action e endpoint POST publico: a tela
   * so oferece as turmas proprias, mas quem montar o POST na mao manda o uuid
   * que quiser. O que impede A de plantar passaportes na turma de B — e de
   * gastar o credito de B — sao tres linhas em `turmaDoDono`.
   *
   * MEDIDO POR MUTACAO: trocando o recorte de `turmaDoDono` por `undefined`
   * (isto e, deixando o WHERE so com o id e o is_deleted), este caso passa a
   * FALHAR — `assert.rejects` nao encontra recusa nenhuma, porque a action
   * cria os 2 mapas na turma de B e debita os 2 creditos dele. Sem este caso a
   * suite inteira continuava verde com o guard apagado.
   */
  it("recusa enviar para a turma de outro parceiro, mesmo com o uuid na mao", async () => {
    entrarComo(facilitadorA);

    const saldoDeB = await saldoDe(facilitadorB);

    await assert.rejects(
      () => acoes.criarLote({ turma_id: turmaDeB, destinatarios: destinatarios(2) }),
      /Grupo de mapeamento nao encontrado/,
      "a turma alheia responde como turma inexistente: um 'sem permissao' confirmaria que o uuid e de alguem",
    );

    // Recusar nao basta: o que importa e nada ter sido gravado nem cobrado do
    // outro parceiro.
    assert.equal((await mapasDa(turmaDeB)).length, 0, "nada nasceu na turma de B");
    assert.equal(await saldoDe(facilitadorB), saldoDeB, "e o saldo de B nao foi tocado");
  });

  it("nao remove pendentes da turma de outro parceiro", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() => acoes.removerPendentes(turmaDeB), /Grupo de mapeamento nao encontrado/);
  });
});

describe("remover pendentes", () => {
  it("estorna o credito dos nao respondidos e nao toca em quem ja respondeu", async () => {
    // Um dos tres mapas passa a concluido, direto no banco: responder pelo
    // fluxo de verdade e assunto de `avaliacao.test.mts`, e aqui o que importa
    // e a situacao no momento da remocao.
    const mapas = await mapasDa(turmaDeA);
    const respondido = mapas[0]!;
    await db
      .update(assessments)
      .set({ situacao: "concluido", concluido_em: new Date() })
      .where(eq(assessments.id, respondido.id));

    entrarComo(facilitadorA);
    const saldoAntes = await saldoDe(facilitadorA);

    const resultado = await acoes.removerPendentes(turmaDeA);

    assert.equal(resultado.removidos, 2, "os dois que nao foram respondidos");
    assert.equal(resultado.creditos, 2, "cada S1 devolve o 1 credito que consumiu");

    const vivos = await mapasDa(turmaDeA);
    assert.equal(vivos.length, 1, "so sobra o respondido");
    assert.equal(vivos[0]!.id, respondido.id, "e e exatamente ele");

    // O delete e LOGICO: as linhas continuam no banco.
    const [removido] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, mapas[1]!.id));
    assert.equal(removido!.is_deleted, true);
    assert.ok(removido!.deleted_at instanceof Date);

    assert.equal(await saldoDe(facilitadorA), saldoAntes + 2, "o credito voltou");

    const estornos = await db
      .select()
      .from(creditosTransacoes)
      .where(
        and(
          eq(creditosTransacoes.usuario_id, facilitadorA),
          eq(creditosTransacoes.tipo, "estorno"),
        ),
      );

    assert.equal(estornos.length, 2, "o estorno e LINHA de extrato, uma por mapa devolvido");
    assert.ok(
      estornos.every((linha) => linha.quantidade === 1),
      "positivo: e devolucao, nao consumo",
    );
  });

  /**
   * A prova de que o estorno nao foi somado no saldo por fora.
   *
   * Se alguem trocar o lancamento por um UPDATE direto em `usuarios.creditos`,
   * a CONSTRAINT TRIGGER da 0005 aborta o proprio COMMIT — o teste acima nem
   * chegaria aqui. Este caso existe para dizer, quando isso acontecer, QUAL
   * dos dois numeros ficou errado.
   */
  it("saldo e soma do extrato continuam batendo depois de tudo", async () => {
    assert.equal(await saldoDe(facilitadorA), await extratoDe(facilitadorA));
    assert.equal(await saldoDe(facilitadorB), await extratoDe(facilitadorB));
    assert.equal(await saldoDe(facilitadorB), SALDO_INICIAL, "B atravessou a suite intacto");
  });

  it("recusa remover quando nao ha pendente, com mensagem legivel", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() => acoes.removerPendentes(turmaDeA), /nao tem passaporte pendente/);
  });
});
