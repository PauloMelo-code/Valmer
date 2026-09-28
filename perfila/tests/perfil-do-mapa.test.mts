/**
 * O perfil de um mapa no portal, nas duas versoes do inventario (ADR-0007 D3).
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   node --import tsx --test tests/perfil-do-mapa.test.mts
 *
 * 1. A conta pura: legado le contadores (percentual, soma 100); MC-INV 2.2 le
 *    o resultado do motor (0-100 por fator, soma 200). Sem resultado, nulo.
 * 2. A media do territorio nao mistura as duas escalas.
 * 3. O codigo do lote nao repete iniciais dentro do mesmo INSERT.
 * 4. Ponta a ponta: o seed grava o caso de demonstracao pelo motor, e a lista
 *    do portal le perfil e confiabilidade dele.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, creditosTransacoes } = await import("@/lib/db/schema");
const { perfilDoMapa } = await import("@/lib/perfil-do-mapa");
const { perfilDoTerritorio } = await import("@/lib/territorios");
const { codigosDoLote } = await import("@/lib/codigo-do-mapa");
const { semearMapasMc } = await import("@/lib/db/seed-mc");
const { assessmentsVisiveis } = await import("@/lib/painel");
const { inArray } = await import("drizzle-orm");

const SISTEMA = "00000000-0000-0000-0000-000000000000";
const marca = `teste-${Date.now()}`;
const IDS_DO_SEED = ["6f2c8a03-4e5b-4d71-9a86-0b3c5d7e9f59", "7a3d9b14-5f6c-4e82-8b97-1c4d6e8f0a6a"];

const legado = (c: [number, number, number, number] | null) => ({
  id: "a",
  versao_instrumento: "LEGADO",
  contador_d: c?.[0] ?? null,
  contador_i: c?.[1] ?? null,
  contador_s: c?.[2] ?? null,
  contador_c: c?.[3] ?? null,
});
const mc = { id: "b", versao_instrumento: "MC-INV 2.2", contador_d: null, contador_i: null, contador_s: null, contador_c: null };
const resultado = { perfil_natural: "DI", nat_d: 87.5, nat_i: 68.8, nat_s: 22.9, nat_c: 20.8, confiabilidade: "media" as const };

describe("perfilDoMapa", () => {
  it("legado: sigla e percentual dos contadores, sem confiabilidade", () => {
    const perfil = perfilDoMapa(legado([14, 7, 7, 0]), undefined);
    assert.deepEqual(perfil, {
      versao: "LEGADO",
      sigla: "DI",
      escores: { D: 50, I: 25, S: 25, C: 0 },
      confiabilidade: null,
    });
  });

  it("MC-INV 2.2: escores do natural (soma 200) e confiabilidade do resultado", () => {
    const perfil = perfilDoMapa(mc, resultado);
    assert.equal(perfil?.sigla, "DI");
    assert.deepEqual(perfil?.escores, { D: 87.5, I: 68.8, S: 22.9, C: 20.8 });
    assert.equal(perfil?.confiabilidade, "media");
  });

  it("sem resposta nao ha perfil, em nenhuma versao", () => {
    assert.equal(perfilDoMapa(legado(null), undefined), null);
    assert.equal(perfilDoMapa(mc, undefined), null);
    // Contador gravado num mapa novo nao e fonte: o que vale e o resultado.
    assert.equal(perfilDoMapa({ ...mc, contador_d: 28, contador_i: 0, contador_s: 0, contador_c: 0 }, undefined), null);
  });
});

describe("perfilDoTerritorio", () => {
  const item = (id: string, perfil: ReturnType<typeof perfilDoMapa>) => ({
    assessment_id: id,
    avaliado_nome: `Pessoa ${id}`,
    avaliado_email: `${id}@exemplo.com`,
    perfil,
    concluido_em: null,
  });
  const mcCom = (d: number, i: number, s: number, c: number) =>
    perfilDoMapa(mc, { ...resultado, nat_d: d, nat_i: i, nat_s: s, nat_c: c });

  it("MC-INV 2.2: media simples dos escores, na escala de soma 200", () => {
    const t = perfilDoTerritorio([item("1", mcCom(80, 60, 40, 20)), item("2", mcCom(20, 40, 60, 80)), item("3", null)]);
    assert.equal(t.escala, "MC-INV 2.2");
    assert.deepEqual(t.medias, { D: 50, I: 50, S: 50, C: 50 });
    assert.equal(t.pendentes, 1);
    assert.equal(t.foraDaMedia, 0);
  });

  it("nao mistura escalas: com MC-INV 2.2 presente, o legado fica listado e fora da media", () => {
    const t = perfilDoTerritorio([item("1", mcCom(80, 60, 40, 20)), item("2", perfilDoMapa(legado([28, 0, 0, 0]), undefined))]);
    assert.equal(t.escala, "MC-INV 2.2");
    assert.deepEqual(t.medias, { D: 80, I: 60, S: 40, C: 20 });
    assert.equal(t.respondentes.length, 2, "quem respondeu no legado continua na lista");
    assert.equal(t.foraDaMedia, 1);
  });
});

describe("codigosDoLote", () => {
  it("duas pessoas com as mesmas iniciais no mesmo lote nao dividem codigo", async () => {
    const codigos = await codigosDoLote(db, ["Ana Souza", "Ana Souza", "Bruno Lima"], new Date());
    assert.equal(new Set(codigos).size, 3);
    assert.ok(codigos.every((c) => /^MC-\d{4}-\d{4}-[A-Z]{2}(-\d+)?$/.test(c)));
  });
});

describe("seed MC-INV 2.2 lido pelo portal", () => {
  let dono = "";
  let jaSemeado = false;

  before(async () => {
    jaSemeado = (await db.select({ id: assessments.id }).from(assessments).where(inArray(assessments.id, IDS_DO_SEED))).length > 0;
    // Saldo com lastro no extrato, na mesma transacao (guarda da 0005).
    dono = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(usuarios)
        .values({ nome: "Dono do seed", email: `seed.${marca}@exemplo.com`, papel: "facilitador", creditos: 8, modified_by: SISTEMA })
        .returning();
      await tx.insert(creditosTransacoes).values({ usuario_id: u!.id, tipo: "bonus", quantidade: 8, descricao: "fixture", modified_by: SISTEMA });
      return u!.id;
    });
  });

  after(async () => {
    await db.transaction(async (tx) => {
      const ids = `'${IDS_DO_SEED.join("','")}'`;
      if (!jaSemeado) {
        await tx.execute(`delete from assessments_resultados where assessment_id in (${ids})`);
        await tx.execute(`delete from assessments_telas where assessment_id in (${ids})`);
      }
      await tx.execute(`delete from creditos_transacoes where usuario_id = '${dono}'`);
      await tx.execute(`delete from assessments where facilitador_id = '${dono}'`);
      await tx.execute(`delete from usuarios where id = '${dono}'`);
    });
  });

  it("grava o caso de demonstracao pelo motor e a lista mostra perfil e confiabilidade", async (t) => {
    if (jaSemeado) return t.skip("o banco local ja tem os mapas do seed");

    await semearMapasMc(db, dono);
    process.env.SESSAO_DEV_USUARIO_ID = dono;
    const lista = await assessmentsVisiveis();

    const concluido = lista.find((m) => m.id === IDS_DO_SEED[0]);
    const pendente = lista.find((m) => m.id === IDS_DO_SEED[1]);
    assert.equal(concluido?.versao, "MC-INV 2.2");
    assert.equal(concluido?.situacao, "concluido");
    assert.equal(concluido?.perfil?.sigla, "DI", "natural DI, como o caso espera");
    assert.deepEqual(concluido?.perfil?.escores, { D: 87.5, I: 68.8, S: 22.9, C: 20.8 });
    assert.equal(concluido?.perfil?.confiabilidade, "alta");
    assert.equal(concluido?.temNarrativa, false, "a narrativa sai pelo botao, nao pelo seed");
    assert.match(concluido?.codigo ?? "", /^MC-\d{4}-\d{4}-AP(-\d+)?$/);

    assert.equal(pendente?.situacao, "pendente");
    assert.equal(pendente?.perfil, undefined);
    assert.notEqual(pendente?.codigo, concluido?.codigo);
  });
});
