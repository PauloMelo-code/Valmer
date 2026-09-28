/**
 * O filtro de data da lista de grupos de mapeamento.
 *
 *   node --import tsx --test tests/filtro-grupos.test.mts
 *
 * Nao toca no banco: o que se testa aqui e o unico pedaco de logica do filtro —
 * ler o dia de uma data ja formatada em pt-BR e decidir se ela cabe no
 * intervalo. O resto do filtro e `includes` e igualdade, e nao ganha suite.
 *
 * A regra que este teste protege e o fail-open: data que o parser nao reconhece
 * CONTINUA na lista. Um filtro que esconde a linha quando nao entende o formato
 * apaga grupo do parceiro sem dizer por que, e e exatamente o tipo de mentira
 * silenciosa que `telas-honestas.test.mts` existe para impedir.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { dentroDoPeriodo, diaIso } = await import("@/lib/filtro-grupos");

describe("filtro de periodo dos grupos", () => {
  it("le o dia da data formatada em pt-BR, com ou sem hora", () => {
    assert.equal(diaIso("23/09/2026, 14:43"), "2026-09-23");
    assert.equal(diaIso("01/02/2026"), "2026-02-01");
  });

  it("nao inventa dia a partir de texto que nao e data", () => {
    assert.equal(diaIso(""), null);
    assert.equal(diaIso("ontem"), null);
    assert.equal(diaIso("2026-09-23"), null);
  });

  it("intervalo vazio nao esconde nada", () => {
    assert.equal(dentroDoPeriodo("23/09/2026, 14:43", "", ""), true);
  });

  it("respeita as duas pontas, incluindo os dias das pontas", () => {
    const dia = "23/09/2026, 14:43";
    assert.equal(dentroDoPeriodo(dia, "2026-09-23", "2026-09-23"), true);
    assert.equal(dentroDoPeriodo(dia, "2026-09-24", ""), false);
    assert.equal(dentroDoPeriodo(dia, "", "2026-09-22"), false);
  });

  it("compara por dia, e nao por texto solto: dezembro nao vira menor que janeiro", () => {
    // O motivo do aaaa-mm-dd. Com "23/12/2026" contra "01/01/2027" comparados
    // no formato brasileiro, dezembro pareceria depois de janeiro.
    assert.equal(dentroDoPeriodo("23/12/2026, 09:00", "2027-01-01", ""), false);
    assert.equal(dentroDoPeriodo("01/01/2027, 09:00", "2026-12-23", ""), true);
  });

  it("data que o parser nao entende continua na lista", () => {
    assert.equal(dentroDoPeriodo("sem data", "2026-01-01", "2026-12-31"), true);
  });
});
