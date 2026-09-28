/**
 * Teste de integracao da gravacao tela a tela do inventario MC-INV 2.2,
 * contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Cobre: consentimento idempotente, semente sorteada uma vez, as recusas
 * (legado, sem consentimento, fora de ordem, etapa 1 travada, concluido,
 * expirado, entrada adulterada), o caminho feliz das 69 telas, e as travas
 * que o BANCO garante sozinho (CHECKs e a FK composta da versao).
 *
 * Os mapas entram por INSERT direto com `versao_instrumento = 'MC-INV 2.2'`:
 * a criacao ainda nasce LEGADO nesta onda (ADR-0007, D3).
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsTelas, auditoria } = await import("@/lib/db/schema");
const inv = await import("@/lib/inventario/aplicacao");
const { gerarCodigo, codigoBase, iniciais, proximoCodigo } = await import("@/lib/inventario/codigo");
const { paraPoloA, telaSchema } = await import("@/lib/validators/inventario-mc");
const { montarRoteiro } = await import("@/lib/inventario/roteiro");
const { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, TOTAL_TELAS, VERSAO_INSTRUMENTO, telaDoGrupo } =
  await import("@/data/inventario-mc");
const { and, eq } = await import("drizzle-orm");

const marca = `inv-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";
const DIA = 24 * 60 * 60 * 1000;

let facilitador = "";
const tokens: string[] = [];

async function inserirMapa(
  sufixo: string,
  opcoes: { versao?: string; situacao?: "pendente" | "concluido"; expiraEm?: Date; codigo?: string } = {},
): Promise<{ token: string; id: string }> {
  const token = `${sufixo}${marca}`;
  tokens.push(token);
  const [linha] = await db
    .insert(assessments)
    .values({
      token,
      facilitador_id: facilitador,
      avaliado_nome: "Respondente Inventario",
      avaliado_email: `${token}@exemplo.com`,
      tipo_relatorio: "S1",
      situacao: opcoes.situacao ?? "pendente",
      expira_em: opcoes.expiraEm ?? new Date(Date.now() + 7 * DIA),
      codigo: opcoes.codigo,
      ...(opcoes.versao === undefined ? {} : { versao_instrumento: opcoes.versao }),
      modified_by: SISTEMA,
    })
    .returning();
  return { token, id: linha!.id };
}

// --- payloads montados a partir do INVENTARIO, nunca redigitados ---
const entrou = "2026-09-28T12:00:00.000Z";
const saiu = "2026-09-28T09:00:09.500-03:00"; // offset do navegador aceito: 9,5 s depois de `entrou`

function telaDisc(etapa: 1 | 2, indice: number, invertida = false) {
  const g = GRUPOS_DISC[indice]!;
  const ids = g.itens.map((i) => i.id);
  return {
    etapa,
    tela: telaDoGrupo("G", g.grupo),
    ordem_final: invertida ? ids.reverse() : ids,
    moveu_item: true,
    entrou_em: entrou,
    saiu_em: saiu,
  };
}

function telaJung(indice: number, lado: "esquerda" | "direita", botao: number) {
  return {
    etapa: 3,
    tela: PARES_JUNG[indice]!.id,
    lado_polo_a: lado,
    resposta_exibida: botao,
    moveu_item: true,
    entrou_em: entrou,
    saiu_em: saiu,
  };
}

function telaValores(indice: number) {
  const g = GRUPOS_VALORES[indice]!;
  return {
    etapa: 4,
    tela: telaDoGrupo("V", g.grupo),
    ordem_final: g.itens.map((i) => i.id),
    moveu_item: false,
    entrou_em: entrou,
    saiu_em: saiu,
  };
}

/** Qual constraint o Postgres acusou, atravessando o embrulho do drizzle. */
async function constraintVioladaEm(promessa: Promise<unknown>): Promise<string | undefined> {
  try {
    await promessa;
  } catch (erro) {
    const e = erro as { constraint?: string; cause?: { constraint?: string } };
    return e.cause?.constraint ?? e.constraint;
  }
  assert.fail("o banco aceitou o que devia recusar");
}

let feliz = { token: "", id: "" };
let semConsentir = { token: "", id: "" };
let legado = { token: "", id: "" };
let vencido = { token: "", id: "" };
let concluido = { token: "", id: "" };

before(async () => {
  const [dono] = await db
    .insert(usuarios)
    .values({
      nome: "Facilitador do Inventario",
      email: `inv.${marca}@exemplo.com`,
      papel: "facilitador",
      creditos: 0,
      modified_by: SISTEMA,
    })
    .returning();
  facilitador = dono!.id;

  feliz = await inserirMapa("fe", { versao: VERSAO_INSTRUMENTO });
  semConsentir = await inserirMapa("sc", { versao: VERSAO_INSTRUMENTO });
  legado = await inserirMapa("lg");
  vencido = await inserirMapa("vc", { versao: VERSAO_INSTRUMENTO, expiraEm: new Date(Date.now() - DIA) });
  concluido = await inserirMapa("cc", { versao: VERSAO_INSTRUMENTO, situacao: "concluido" });
});

after(async () => {
  // Limpeza de fixture com SQL cru: o unico lugar onde apagar de verdade e o
  // certo. Numa transacao so pelo mesmo motivo de avaliacao.test.mts.
  const lista = tokens.map((t) => `'${t}'`).join(",");
  await db.transaction(async (tx) => {
    const doTeste = `(select id from assessments where token in (${lista}))`;
    await tx.execute(`delete from auditoria where registro_id in ${doTeste}`);
    await tx.execute(`delete from assessments_telas where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments where token in (${lista})`);
    await tx.execute(`delete from auditoria where user_id = '${facilitador}'`);
    await tx.execute(`delete from usuarios where id = '${facilitador}'`);
  });
});

describe("inventario: regras puras", () => {
  it("converte o botao para o polo A (secao 23)", () => {
    assert.deepEqual([0, 1, 2, 3].map((b) => paraPoloA("esquerda", b)), [3, 2, 1, 0]);
    assert.deepEqual([0, 1, 2, 3].map((b) => paraPoloA("direita", b)), [0, 1, 2, 3]);
  });

  it("monta o codigo no horario de Brasilia, com iniciais e sufixo de colisao", () => {
    assert.equal(iniciais("Valmer Albuquerque"), "VA");
    assert.equal(iniciais("Érica de Souza Ávila"), "EA", "acento sai, ultimo nome vale");
    assert.equal(iniciais("Ana"), "AN");
    // 01:30 UTC do dia 29 ainda e dia 28 em Brasilia.
    assert.equal(codigoBase("Valmer Albuquerque", new Date("2026-09-29T01:30:00Z")), "MC-2026-0928-VA");
    assert.equal(proximoCodigo("MC-2026-0928-VA", []), "MC-2026-0928-VA");
    assert.equal(proximoCodigo("MC-2026-0928-VA", ["MC-2026-0928-VA"]), "MC-2026-0928-VA-2");
    assert.equal(
      proximoCodigo("MC-2026-0928-VA", ["MC-2026-0928-VA", "MC-2026-0928-VA-2", "MC-2026-0928-VA-4"]),
      "MC-2026-0928-VA-3",
    );
  });

  it("recusa payload fora do inventario", () => {
    const valido = telaDisc(1, 6);
    assert.doesNotThrow(() => telaSchema.parse(valido));
    const ruins: [string, unknown][] = [
      ["tela inexistente", { ...valido, tela: "G17" }],
      ["id repetido", { ...valido, ordem_final: ["G07-D", "G07-D", "G07-S", "G07-C"] }],
      ["id de outra tela", { ...valido, ordem_final: ["G08-D", "G07-I", "G07-S", "G07-C"] }],
      ["faltando item", { ...valido, ordem_final: ["G07-D", "G07-I", "G07-S"] }],
      ["etapa 5", { ...valido, etapa: 5 }],
      ["tela DISC na etapa 4", { ...valido, etapa: 4 }],
      ["valores com 4 itens", { ...telaValores(0), ordem_final: ["V01-TEO", "V01-ECO", "V01-EST", "V01-SOC"] }],
      ["botao 4", telaJung(0, "esquerda", 4)],
      ["lado invalido", { ...telaJung(0, "esquerda", 1), lado_polo_a: "meio" }],
      ["par inexistente", { ...telaJung(0, "esquerda", 1), tela: "EI10" }],
      ["saida antes da entrada", { ...valido, entrou_em: saiu, saiu_em: entrou }],
      ["carimbo invalido", { ...valido, entrou_em: "ontem" }],
    ];
    for (const [motivo, payload] of ruins) assert.throws(() => telaSchema.parse(payload), motivo);
  });
});

describe("inventario: recusas de estado", () => {
  it("token inexistente e invalido", async () => {
    const nada = `nao-existe-${marca}`;
    assert.deepEqual(await inv.estadoDaAplicacao(nada), { ok: false, erro: "invalido" });
    assert.deepEqual(await inv.registrarConsentimento(nada), { ok: false, erro: "invalido" });
    assert.deepEqual(await inv.salvarTela(nada, telaDisc(1, 0)), { ok: false, erro: "invalido" });
  });

  it("mapa LEGADO e recusado nas tres funcoes, sem tocar nele", async () => {
    assert.deepEqual(await inv.estadoDaAplicacao(legado.token), { ok: false, erro: "legado" });
    assert.deepEqual(await inv.registrarConsentimento(legado.token), { ok: false, erro: "legado" });
    assert.deepEqual(await inv.salvarTela(legado.token, telaDisc(1, 0)), { ok: false, erro: "legado" });

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, legado.id));
    assert.equal(linha!.versao_instrumento, "LEGADO", "o default da coluna e LEGADO");
    assert.equal(linha!.semente_ordem, null);
    assert.equal(linha!.consentimento_em, null);
  });

  it("recusa mapa vencido e mapa concluido", async () => {
    for (const fn of [inv.estadoDaAplicacao, inv.registrarConsentimento]) {
      assert.deepEqual(await fn(vencido.token), { ok: false, erro: "expirado" });
      assert.deepEqual(await fn(concluido.token), { ok: false, erro: "concluido" });
    }
    assert.deepEqual(await inv.salvarTela(vencido.token, telaDisc(1, 0)), { ok: false, erro: "expirado" });
    assert.deepEqual(await inv.salvarTela(concluido.token, telaDisc(1, 0)), { ok: false, erro: "concluido" });
  });

  it("recusa tela antes do consentimento", async () => {
    assert.deepEqual(await inv.salvarTela(semConsentir.token, telaDisc(1, 0)), {
      ok: false,
      erro: "sem_consentimento",
    });
    const linhas = await db.select().from(assessmentsTelas).where(eq(assessmentsTelas.assessment_id, semConsentir.id));
    assert.equal(linhas.length, 0);
  });

  it("entrada adulterada lanca antes de tocar o banco", async () => {
    await assert.rejects(() => inv.salvarTela(semConsentir.token, { ...telaDisc(1, 0), tela: "G99" }));
    await assert.rejects(() => inv.salvarTela(semConsentir.token, null));
  });
});

describe("inventario: carimbos de tempo do cliente", () => {
  it("recusa tela que dura mais que o tempo desde o consentimento", async () => {
    const m = await inserirMapa("rl", { versao: VERSAO_INSTRUMENTO });
    assert.equal((await inv.registrarConsentimento(m.token)).ok, true);
    const absurda = { ...telaDisc(1, 0), entrou_em: "1970-01-01T00:00:00Z", saiu_em: "2999-01-01T00:00:00Z" };
    await assert.rejects(() => inv.salvarTela(m.token, absurda), RangeError);
    // O relogio do PC pode estar errado: so a duracao importa, nao a data.
    const relogioAtrasado = { ...telaDisc(1, 0), entrou_em: "2001-01-01T00:00:00Z", saiu_em: "2001-01-01T00:00:08Z" };
    assert.deepEqual(await inv.salvarTela(m.token, relogioAtrasado), { ok: true });
  });
});

describe("inventario: caminho feliz das 69 telas", () => {
  let semente = 0;

  it("o primeiro acesso sorteia a semente, e ela nao muda mais", async () => {
    const primeiro = await inv.estadoDaAplicacao(feliz.token);
    assert.equal(primeiro.ok, true);
    if (!primeiro.ok) return;
    assert.equal(primeiro.consentiu, false);
    assert.equal(primeiro.etapaAtual, 1);
    assert.deepEqual(primeiro.feitas, { 1: [], 2: [], 3: [], 4: [] });
    assert.ok(Number.isInteger(primeiro.semente) && primeiro.semente > 0);
    semente = primeiro.semente;

    const segundo = await inv.estadoDaAplicacao(feliz.token);
    assert.equal(segundo.ok && segundo.semente, semente);
  });

  it("consentimento grava data, inicio e trilha, e e idempotente", async () => {
    const primeiro = await inv.registrarConsentimento(feliz.token);
    assert.equal(primeiro.ok, true);
    const segundo = await inv.registrarConsentimento(feliz.token);
    assert.deepEqual(segundo, primeiro, "o segundo clique nao move a data do aceite");

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, feliz.id));
    assert.ok(linha!.consentimento_em instanceof Date);
    assert.ok(linha!.iniciado_em instanceof Date);
    assert.equal(linha!.semente_ordem, semente, "consentir nao sorteia de novo");

    const trilha = await db.select().from(auditoria).where(eq(auditoria.registro_id, feliz.id));
    assert.equal(trilha.length, 1, "uma linha de trilha, mesmo com dois cliques");
    assert.ok(!trilha[0]!.detalhes.includes("Respondente Inventario"), "sem nome na trilha (R6)");
  });

  it("recusa etapa 2 antes de a etapa 1 terminar", async () => {
    assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(2, 0)), { ok: false, erro: "fora_de_ordem" });
  });

  it("grava a etapa 1 e tira o mapa de pendente", async () => {
    for (let i = 0; i < GRUPOS_DISC.length; i += 1) {
      assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(1, i)), { ok: true });
    }
    const [linha] = await db.select().from(assessments).where(eq(assessments.id, feliz.id));
    assert.equal(linha!.situacao, "em_andamento");
  });

  it("o servidor deriva moveu_item do roteiro, e ignora o que o cliente diz", async () => {
    const g01 = montarRoteiro(semente)[1].find((t) => t.tela === "G01")!;
    const lerG01 = async () =>
      (
        await db
          .select()
          .from(assessmentsTelas)
          .where(and(eq(assessmentsTelas.assessment_id, feliz.id), eq(assessmentsTelas.etapa, 1), eq(assessmentsTelas.tela, "G01")))
      )[0]!;

    // Na ordem exibida, mas o cliente jura que mexeu: vale o roteiro.
    await inv.salvarTela(feliz.token, { ...telaDisc(1, 0), ordem_final: [...g01.inicial], moveu_item: true });
    assert.equal((await lerG01()).moveu_item, false);

    // Fora da ordem exibida, e o cliente diz que nao mexeu.
    await inv.salvarTela(feliz.token, { ...telaDisc(1, 0), ordem_final: [...g01.inicial].reverse(), moveu_item: false });
    assert.equal((await lerG01()).moveu_item, true);
  });

  it("reenvio da mesma tela sobrescreve em vez de duplicar", async () => {
    const reenvio = telaDisc(1, 0, true);
    assert.deepEqual(await inv.salvarTela(feliz.token, reenvio), { ok: true });
    const linhas = await db
      .select()
      .from(assessmentsTelas)
      .where(and(eq(assessmentsTelas.assessment_id, feliz.id), eq(assessmentsTelas.tela, "G01")));
    assert.equal(linhas.length, 1);
    assert.deepEqual(linhas[0]!.ordem_final, reenvio.ordem_final);
    assert.equal(linhas[0]!.versao_instrumento, VERSAO_INSTRUMENTO);
    assert.equal(linhas[0]!.modified_by, SISTEMA, "assinada pela sentinela do respondente");
  });

  it("recusa etapa 3 antes de a etapa 2 terminar", async () => {
    assert.deepEqual(await inv.salvarTela(feliz.token, telaJung(0, "direita", 1)), {
      ok: false,
      erro: "fora_de_ordem",
    });
  });

  it("a etapa 1 trava assim que a etapa 2 comeca", async () => {
    assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(2, 0)), { ok: true });
    assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(1, 3, true)), {
      ok: false,
      erro: "etapa_travada",
    });
    const estado = await inv.estadoDaAplicacao(feliz.token);
    assert.equal(estado.ok && estado.etapaAtual, 2);
  });

  it("grava etapas 2, 3 e 4 ate a 69a tela", async () => {
    for (let i = 1; i < GRUPOS_DISC.length; i += 1) {
      assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(2, i)), { ok: true });
    }
    // Recusa etapa 4 antes do fim da 3.
    assert.deepEqual(await inv.salvarTela(feliz.token, telaValores(0)), { ok: false, erro: "fora_de_ordem" });

    // O lado enviado e sempre "esquerda": o servidor tem de ignorar e usar o
    // lado sorteado pelo roteiro da semente.
    for (let i = 0; i < PARES_JUNG.length; i += 1) {
      assert.deepEqual(await inv.salvarTela(feliz.token, telaJung(i, "esquerda", i % 4)), { ok: true });
    }
    for (let i = 0; i < GRUPOS_VALORES.length; i += 1) {
      assert.deepEqual(await inv.salvarTela(feliz.token, telaValores(i)), { ok: true });
    }

    const linhas = await db
      .select()
      .from(assessmentsTelas)
      .where(and(eq(assessmentsTelas.assessment_id, feliz.id), eq(assessmentsTelas.is_deleted, false)));
    assert.equal(linhas.length, TOTAL_TELAS);
    assert.equal(TOTAL_TELAS, 69);

    // Cada par: lado do roteiro, polo A convertido a partir dele.
    const roteiro = montarRoteiro(semente);
    const lados = new Set<string>();
    PARES_JUNG.forEach((par, i) => {
      const linha = linhas.find((l) => l.tela === par.id)!;
      const lado = roteiro[3].find((t) => t.tela === par.id)!.poloAEsquerda ? "esquerda" : "direita";
      lados.add(lado);
      assert.deepEqual(
        [linha.lado_polo_a, linha.resposta_exibida, linha.resposta_polo_a, linha.ordem_final, linha.moveu_item],
        [lado, i % 4, paraPoloA(lado, i % 4), null, true],
        par.id,
      );
    });
    assert.equal(lados.size, 2, "27 sorteios de lado nao caem todos do mesmo lado");

    const estado = await inv.estadoDaAplicacao(feliz.token);
    assert.equal(estado.ok, true);
    if (!estado.ok) return;
    assert.equal(estado.etapaAtual, null, "69 telas salvas: falta so finalizar");
    assert.equal(estado.consentiu, true);
    assert.deepEqual(
      [estado.feitas[1].length, estado.feitas[2].length, estado.feitas[3].length, estado.feitas[4].length],
      [16, 16, 27, 10],
    );
  });

  it("depois da etapa 4 ainda aceita correcao das etapas 2 e 3", async () => {
    // So a etapa 1 trava (secao 3); corrigir o resto e reenvio legitimo.
    assert.deepEqual(await inv.salvarTela(feliz.token, telaJung(2, "direita", 3)), { ok: true });
    assert.deepEqual(await inv.salvarTela(feliz.token, telaDisc(2, 5, true)), { ok: true });
  });
});

describe("inventario: o que o banco garante sozinho", () => {
  const base = () => ({
    assessment_id: feliz.id,
    versao_instrumento: VERSAO_INSTRUMENTO,
    moveu_item: true,
    entrou_em: new Date(entrou),
    saiu_em: new Date(entrou),
    modified_by: SISTEMA,
  });

  it("recusa etapa 1 sem ordem_final (o COALESCE do CHECK)", async () => {
    const violada = await constraintVioladaEm(
      db.insert(assessmentsTelas).values({ ...base(), etapa: 1, tela: "G50", ordem_final: null }),
    );
    assert.equal(violada, "ck_assessments_telas_forma");
  });

  it("recusa etapa 3 com polo A que nao bate com o botao", async () => {
    const violada = await constraintVioladaEm(
      db.insert(assessmentsTelas).values({
        ...base(),
        etapa: 3,
        tela: "EI50",
        lado_polo_a: "esquerda",
        resposta_exibida: 0,
        resposta_polo_a: 0,
      }),
    );
    assert.equal(violada, "ck_assessments_telas_polo_a");
  });

  it("recusa tela com versao diferente da do mapa, e trava a versao do mapa", async () => {
    const violada = await constraintVioladaEm(
      db.insert(assessmentsTelas).values({
        ...base(),
        versao_instrumento: "LEGADO",
        etapa: 1,
        tela: "G50",
        ordem_final: ["a", "b", "c", "d"],
      }),
    );
    assert.equal(violada, "fk_assessments_telas_assessment_versao");

    const travada = await constraintVioladaEm(
      db.update(assessments).set({ versao_instrumento: "LEGADO" }).where(eq(assessments.id, feliz.id)),
    );
    assert.equal(travada, "fk_assessments_telas_assessment_versao");
  });

  it("codigo: formato no banco e sufixo na colisao", async () => {
    const violada = await constraintVioladaEm(
      db.update(assessments).set({ codigo: "MC-26-0928-VA" }).where(eq(assessments.id, semConsentir.id)),
    );
    assert.equal(violada, "ck_assessments_codigo");

    // Base improvavel (ano 1999) para nao colidir com dado real do banco.
    const quando = new Date("1999-01-02T15:00:00Z");
    const nome = "Zeca Quintana";
    assert.equal(await gerarCodigo(db, nome, quando), "MC-1999-0102-ZQ");
    await inserirMapa("c1", { codigo: "MC-1999-0102-ZQ" });
    assert.equal(await gerarCodigo(db, nome, quando), "MC-1999-0102-ZQ-2");

    const repetido = await constraintVioladaEm(inserirMapa("c2", { codigo: "MC-1999-0102-ZQ" }));
    assert.equal(repetido, "uq_assessments_codigo");
  });
});
