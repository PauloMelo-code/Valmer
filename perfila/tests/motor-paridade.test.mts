/**
 * Paridade do motor TypeScript com a referencia Python, caso a caso.
 *
 * `fixtures/motor-paridade.json` sai de `scripts/motor/gerar-fixtures-paridade.py`,
 * que roda o proprio `motor_referencia.py`. Os testes de ouro cobrem oito
 * situacoes; estes 1.430 casos pegam o que passa neles e erra no desempate, na
 * borda do arredondamento ou numa combinacao de Jung. Igualdade exata, inclusive
 * -0 contra 0: se um caso divergir, o porte esta errado — nunca o gabarito.
 *
 *   node --import tsx --test tests/motor-paridade.test.mts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calcularResultado,
  indices,
  lideranca,
  perfil,
  pontuarDisc,
  pontuarJung,
  pontuarValores,
  r1,
  zona,
} from "@/lib/motor";

// Lido do disco (e nao importado) para o JSON.parse preservar o -0.0 do Python.
const { casos } = JSON.parse(
  readFileSync(new URL("./fixtures/motor-paridade.json", import.meta.url), "utf8"),
);

const TOTAL = 1430;

describe("paridade com motor_referencia.py", () => {
  it(`o gabarito tem os ${TOTAL} casos`, () => {
    const total = Object.values(casos).reduce((s: number, c) => s + (c as unknown[]).length, 0);
    assert.equal(total, TOTAL);
  });

  it("r1", () => {
    for (const c of casos.r1) assert.deepStrictEqual(r1(c.x), c.esperado, `r1(${c.x})`);
  });

  it("zona", () => {
    for (const c of casos.zona) assert.equal(zona(c.x), c.esperado, `zona(${c.x})`);
  });

  it("pontuarDisc", () => {
    casos.disc.forEach((c: any, i: number) =>
      assert.deepStrictEqual(pontuarDisc(c.respostas), c.esperado, `disc #${i}`),
    );
  });

  it("perfil", () => {
    casos.perfil.forEach((c: any, i: number) =>
      assert.deepStrictEqual(perfil(c.escore, c.primeiros), c.esperado, `perfil #${i}`),
    );
  });

  it("indices", () => {
    casos.indices.forEach((c: any, i: number) =>
      assert.deepStrictEqual(indices(c.natural, c.adaptado), c.esperado, `indices #${i}`),
    );
  });

  it("lideranca", () => {
    casos.lideranca.forEach((c: any, i: number) =>
      assert.deepStrictEqual(lideranca(c.natural), c.esperado, `lideranca #${i}`),
    );
  });

  it("pontuarJung", () => {
    casos.jung.forEach((c: any, i: number) =>
      assert.deepStrictEqual(pontuarJung(c.respostas), c.esperado, `jung #${i}`),
    );
  });

  it("pontuarValores", () => {
    casos.valores.forEach((c: any, i: number) =>
      assert.deepStrictEqual(pontuarValores(c.respostas), c.esperado, `valores #${i}`),
    );
  });

  it("aplicacao completa (calcularResultado)", () => {
    casos.completos.forEach((c: any, i: number) => {
      const r = calcularResultado(c.respostas, []);
      const semZona = ({ escore, competencias, perfil, ordem }: any) => ({ escore, competencias, perfil, ordem });
      assert.deepStrictEqual(
        {
          natural: semZona(r.disc.natural),
          adaptado: semZona(r.disc.adaptado),
          indices: r.disc.indices,
          lideranca: r.disc.lideranca,
          jung: r.jung,
          valores: r.valores,
        },
        c.esperado,
        `completo #${i}`,
      );
      for (const cond of [r.disc.natural, r.disc.adaptado]) {
        for (const f of ["D", "I", "S", "C"] as const) assert.equal(cond.zona[f], zona(cond.escore[f]));
      }
    });
  });
});
