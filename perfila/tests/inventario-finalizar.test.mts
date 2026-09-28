/**
 * Ponta a ponta do inventario MC-INV 2.2 contra o banco local: o caso de
 * demonstracao (tests/fixtures/caso-demonstracao.json) respondido tela a tela
 * pelo salvarTela, na ordem e no lado do roteiro da semente do mapa, e
 * finalizado. O resultado gravado tem de bater com o do motor Python.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsTelas, assessmentsResultados } = await import("@/lib/db/schema");
const inv = await import("@/lib/inventario/aplicacao");
const { finalizarAplicacao } = await import("@/lib/inventario/finalizar");
const actions = await import("@/lib/actions/inventario-mc");
const { montarRoteiro } = await import("@/lib/inventario/roteiro");
const { VERSAO_INSTRUMENTO, numeroDoGrupo } = await import("@/data/inventario-mc");
const { and, eq } = await import("drizzle-orm");

type Posicoes = Record<string, Record<string, number>>;
const caso = JSON.parse(readFileSync("tests/fixtures/caso-demonstracao.json", "utf8")) as {
  respostas: { natural: Posicoes; adaptado: Posicoes; valores: Posicoes; jung: Record<string, number[]> };
  esperado: Record<string, unknown>;
};

const marca = `fin-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";
let facilitador = "";
const tokens: string[] = [];

async function inserirMapa(sufixo: string) {
  const token = `${sufixo}${marca}`;
  tokens.push(token);
  const [linha] = await db
    .insert(assessments)
    .values({
      token,
      facilitador_id: facilitador,
      avaliado_nome: "Adriana Prado",
      avaliado_email: `${token}@exemplo.com`,
      tipo_relatorio: "S4",
      situacao: "pendente",
      expira_em: new Date(Date.now() + 7 * 86_400_000),
      versao_instrumento: VERSAO_INSTRUMENTO,
      modified_by: SISTEMA,
    })
    .returning();
  return { token, id: linha!.id };
}

/**
 * As 69 telas do caso, como o navegador mandaria: na ordem do roteiro, so a
 * escolha e os carimbos. 15 s por tela, sem pausa (V1 e V2 quietos).
 */
function telasDoCaso(semente: number) {
  const roteiro = montarRoteiro(semente);
  let relogio = Date.parse("2026-09-28T12:00:00Z");
  const carimbos = () => {
    const entrou_em = new Date(relogio).toISOString();
    relogio += 15_000;
    return { entrou_em, saiu_em: new Date(relogio).toISOString() };
  };
  const ordem = (pos: Record<string, number>) => Object.keys(pos).sort((a, b) => pos[a]! - pos[b]!);
  const disc = (etapa: 1 | 2, fonte: Posicoes) =>
    roteiro[etapa].map((t) => ({ etapa, tela: t.tela, ordem_final: ordem(fonte[numeroDoGrupo(t.tela)]!), ...carimbos() }));

  return [
    ...disc(1, caso.respostas.natural),
    ...disc(2, caso.respostas.adaptado),
    ...roteiro[3].map((t) => {
      // O caso guarda o polo A (3 = muito A); o botao exibido depende do lado.
      const poloA = caso.respostas.jung[t.eixo]![Number(t.id.slice(2)) - 1]!;
      return { etapa: 3, tela: t.tela, resposta_exibida: t.poloAEsquerda ? 3 - poloA : poloA, ...carimbos() };
    }),
    ...roteiro[4].map((t) => ({
      etapa: 4,
      tela: t.tela,
      ordem_final: ordem(caso.respostas.valores[numeroDoGrupo(t.tela)]!),
      ...carimbos(),
    })),
  ];
}

let mapa = { token: "", id: "" };
let corrompido = { token: "", id: "" };

before(async () => {
  const [dono] = await db
    .insert(usuarios)
    .values({ nome: "Facilitador Fecho", email: `fin.${marca}@exemplo.com`, papel: "facilitador", creditos: 0, modified_by: SISTEMA })
    .returning();
  facilitador = dono!.id;
  mapa = await inserirMapa("fa");
  corrompido = await inserirMapa("fb");
});

after(async () => {
  // Limpeza de fixture com SQL cru, como em inventario-telas.test.mts.
  const lista = tokens.map((t) => `'${t}'`).join(",");
  await db.transaction(async (tx) => {
    const doTeste = `(select id from assessments where token in (${lista}))`;
    await tx.execute(`delete from auditoria where registro_id in ${doTeste}`);
    await tx.execute(`delete from assessments_resultados where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments_telas where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments where token in (${lista})`);
    await tx.execute(`delete from usuarios where id = '${facilitador}'`);
  });
});

describe("inventario: finalizacao ponta a ponta", () => {
  let telas: ReturnType<typeof telasDoCaso> = [];

  it("recusa finalizar sem consentimento", async () => {
    assert.deepEqual(await finalizarAplicacao(mapa.token), { ok: false, erro: "sem_consentimento" });
  });

  it("grava as 69 telas do caso pelo salvarTela", async () => {
    const estado = await inv.estadoDaAplicacao(mapa.token);
    assert.ok(estado.ok);
    assert.equal((await inv.registrarConsentimento(mapa.token)).ok, true);
    telas = telasDoCaso(estado.semente);
    assert.equal(telas.length, 69);
    for (const tela of telas.slice(0, -1)) assert.deepEqual(await inv.salvarTela(mapa.token, tela), { ok: true }, tela.tela);
  });

  it("com uma tela faltando, recusa com a lista e nao conclui", async () => {
    const ultima = telas.at(-1)!;
    assert.deepEqual(await finalizarAplicacao(mapa.token), {
      ok: false,
      erro: "incompleto",
      faltando: [{ etapa: 4, tela: ultima.tela }],
    });
    const [linha] = await db.select().from(assessments).where(eq(assessments.id, mapa.id));
    assert.notEqual(linha!.situacao, "concluido");
  });

  it("finaliza, grava o resultado do motor e conclui o mapa", async () => {
    assert.deepEqual(await inv.salvarTela(mapa.token, telas.at(-1)), { ok: true });
    const fecho = await finalizarAplicacao(mapa.token);
    assert.deepEqual(fecho, { ok: true, assessmentId: mapa.id });

    const [m] = await db.select().from(assessments).where(eq(assessments.id, mapa.id));
    assert.equal(m!.situacao, "concluido");
    assert.ok(m!.concluido_em instanceof Date);

    const resultados = await db
      .select()
      .from(assessmentsResultados)
      .where(and(eq(assessmentsResultados.assessment_id, mapa.id), eq(assessmentsResultados.is_deleted, false)));
    assert.equal(resultados.length, 1);
    const r = resultados[0]!;
    const gravado = r.resultado as {
      disc: Record<string, unknown>;
      jung: unknown;
      valores: unknown;
      validade: { confiabilidade: string };
    };
    const esperado = caso.esperado;

    // O gabarito do Python nao traz a zona (derivada do escore): compara so
    // as chaves que ele tem.
    const soAsDoGabarito = (atual: unknown, gabarito: unknown) =>
      Object.fromEntries(Object.keys(gabarito as object).map((k) => [k, (atual as Record<string, unknown>)[k]]));
    assert.deepEqual(soAsDoGabarito(gravado.disc.natural, esperado.natural), esperado.natural);
    assert.deepEqual(soAsDoGabarito(gravado.disc.adaptado, esperado.adaptado), esperado.adaptado);
    assert.deepEqual(gravado.disc.indices, esperado.indices);
    assert.deepEqual(gravado.disc.lideranca, esperado.lideranca);
    assert.deepEqual(gravado.jung, esperado.jung);
    assert.deepEqual(gravado.valores, esperado.valores);

    // Colunas de filtro tiradas do mesmo resultado.
    assert.deepEqual(
      [r.nat_d, r.nat_i, r.nat_s, r.nat_c, r.ada_d, r.ada_i, r.ada_s, r.ada_c],
      [87.5, 68.8, 22.9, 20.8, 14.6, 20.8, 70.8, 93.8],
    );
    assert.deepEqual([r.perfil_natural, r.perfil_adaptado, r.tipo_jung], ["DI", "CS", "ENT"]);
    assert.equal(r.confiabilidade, gravado.validade.confiabilidade);
    assert.equal(r.versao_instrumento, VERSAO_INSTRUMENTO);
    assert.equal(r.modified_by, SISTEMA);
  });

  it("o segundo fecho e recusado como concluido, e a action trata como sucesso", async () => {
    assert.deepEqual(await finalizarAplicacao(mapa.token), { ok: false, erro: "concluido" });
    assert.deepEqual(await actions.finalizar(mapa.token), { ok: true });
    const vivos = await db
      .select()
      .from(assessmentsResultados)
      .where(and(eq(assessmentsResultados.assessment_id, mapa.id), eq(assessmentsResultados.is_deleted, false)));
    assert.equal(vivos.length, 1, "um resultado vivo so");
  });

  it("RespostaInvalida do motor vira recusa, sem gravar nada", async () => {
    // Telas copiadas do mapa bom, com um grupo corrompido no banco (id
    // repetido): o zod nunca deixaria entrar, mas o fecho nao pode dar 500.
    await db
      .update(assessments)
      .set({ consentimento_em: new Date(), semente_ordem: 1 })
      .where(eq(assessments.id, corrompido.id));
    const origem = await db.select().from(assessmentsTelas).where(eq(assessmentsTelas.assessment_id, mapa.id));
    await db.insert(assessmentsTelas).values(
      origem.map(({ id: _id, created_at: _c, updated_at: _u, ...l }) => ({
        ...l,
        assessment_id: corrompido.id,
        ordem_final: l.etapa === 1 && l.tela === "G01" ? ["G01-D", "G01-D", "G01-S", "G01-C"] : l.ordem_final,
      })),
    );

    const fecho = await finalizarAplicacao(corrompido.token);
    assert.equal(fecho.ok, false);
    assert.equal(!fecho.ok && fecho.erro, "resposta_invalida");

    const [m] = await db.select().from(assessments).where(eq(assessments.id, corrompido.id));
    assert.notEqual(m!.situacao, "concluido");
    const resultados = await db.select().from(assessmentsResultados).where(eq(assessmentsResultados.assessment_id, corrompido.id));
    assert.equal(resultados.length, 0);
  });
});
