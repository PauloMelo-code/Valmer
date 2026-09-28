/**
 * Pagina 29: o alerta "o que o ambiente pede hoje" so cita fatores
 * predominantes (>= 51). Perfil puro tem um; EQUILIBRADO, nenhum.
 *
 *   node --import tsx --test tests/relatorio-mc-p29-35.test.mts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import { calcularResultado, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio, type DadosRelatorioMC } from "@/lib/relatorio-mc/dados";
import type { Fator } from "@/data/inventario-mc";
import { PAGINAS } from "@/components/relatorio-mc/paginas/registro";

const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);

function p29(natural: Fator[], adaptado: Fator[]): string {
  const dados: DadosRelatorioMC = montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado,
    narrativa: null,
    facilitador: { nome: "Nome do Instrutor" },
    nivel: "S4",
  });
  // Os escores ficam os do caso (D 87,5 · I 68,8 natural; C 93,8 · S 70,8 adaptado); so o recorte dos predominantes muda.
  dados.perfis.natural = { ...dados.perfis.natural, fatores: natural };
  dados.perfis.adaptado = { ...dados.perfis.adaptado, fatores: adaptado };
  const pagina = PAGINAS.find((p) => p.numero === 29)!;
  return renderToStaticMarkup(createElement(pagina.Componente, { dados }));
}

describe("pagina 29 · alerta do ambiente", () => {
  it("caso de demonstracao: dois predominantes de cada lado", () => {
    assert.match(p29(["D", "I"], ["C", "S"]), /conduzido por DOMINANTE em 87,5 e INFLUENTE em 68,8\./);
  });

  it("natural puro cita so o fator predominante", () => {
    assert.match(p29(["D"], ["C", "S"]), /conduzido por DOMINANTE em 87,5\./);
  });

  it("natural EQUILIBRADO nao diz que algum fator conduz", () => {
    const h = p29([], ["C", "S"]);
    assert.ok(!h.includes("conduzido por"));
    assert.match(h, /natural não tem fator a partir de 51/);
  });

  it("sem alerta quando o adaptado nao traz fator novo", () => {
    assert.ok(!p29(["D", "I"], ["D"]).includes("Atenção"));
    assert.ok(!p29(["D", "I"], []).includes("Atenção"));
  });
});
