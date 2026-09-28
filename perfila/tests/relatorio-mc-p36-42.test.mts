/**
 * Paginas 36 a 42 do relatorio MC 3.1: as notas e os atritos que dependem do
 * perfil (C31) e a renderizacao das sete paginas com o caso de demonstracao.
 *
 *   npm test   (nao precisa de banco)
 *
 * O molde foi escrito para um avaliado DI. O risco aqui e um texto que so e
 * verdade para o Valmer sair igual para todo mundo, ou um perfil sem texto.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { FATORES, type Fator } from "@/data/inventario-mc";
import { ATRITO_PREVISIVEL, notaDaConversa, proximidade } from "@/data/relatorio-mc/variantes/p36-42";
import { calcularResultado, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio } from "@/lib/relatorio-mc/dados";
import { esquemaNarrativaMC, type NarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import { PAGINAS } from "@/components/relatorio-mc/paginas/registro";

function permutacoes(xs: readonly Fator[]): Fator[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutacoes([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}
const ORDENS = permutacoes(FATORES);

describe("nota das paginas 36 e 37 (C31)", () => {
  it("proximidade pela ordem natural", () => {
    assert.equal(proximidade(["D", "I", "S", "C"], ["D", "I"]), "perto");
    assert.equal(proximidade(["D", "I", "S", "C"], ["S", "C"]), "longe");
    assert.equal(proximidade(["D", "S", "I", "C"], ["D", "I"]), "misto");
  });

  it("o caso DI com adaptado CS recebe o texto do molde", () => {
    const n36 = notaDaConversa(36, ["D", "I"], ["D", "I", "S", "C"], ["C", "S", "I", "D"]);
    assert.equal(n36.status, "transcrito");
    assert.equal(n36.titulo, "Onde você acerta e onde escorrega");
    const n37 = notaDaConversa(37, ["S", "C"], ["D", "I", "S", "C"], ["C", "S", "I", "D"]);
    assert.equal(n37.titulo, "Onde está o seu maior ganho");
    assert.match(n37.texto, /ao mesmo tempo, os que o seu ambiente atual mais exige/);
  });

  it("a clausula do ambiente so aparece quando o adaptado tem os dois fatores no topo", () => {
    const n = notaDaConversa(37, ["S", "C"], ["D", "I", "S", "C"], ["D", "I", "S", "C"]);
    assert.doesNotMatch(n.texto, /ambiente/);
  });

  it("toda ordem natural x adaptada tem nota coerente nas duas paginas", () => {
    for (const nat of ORDENS) {
      for (const ada of ORDENS) {
        for (const [pagina, par] of [[36, ["D", "I"]], [37, ["S", "C"]]] as const) {
          const nota = notaDaConversa(pagina, par, nat, ada);
          assert.ok(nota.titulo && nota.texto.length > 80, `${pagina} ${nat.join("")}`);
          const caso = proximidade(nat, par);
          if (caso === "perto") assert.match(nota.texto, /mais próximos/);
          if (caso === "longe") assert.match(nota.texto, /mais distantes/);
          if (caso === "misto") assert.equal(nota.status, "rascunho");
        }
      }
    }
  });
});

describe("atrito previsivel das paginas 39 e 40 (C31)", () => {
  it("16 combinacoes, a linha D e a do molde, as outras em rascunho", () => {
    for (const lider of FATORES) {
      for (const liderado of FATORES) {
        const a = ATRITO_PREVISIVEL[lider][liderado];
        assert.ok(a.texto.length > 60);
        assert.equal(a.status, lider === "D" ? "transcrito" : "rascunho");
      }
    }
  });
});

describe("paginas 36 a 42 renderizam", () => {
  const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
  const montar = (narrativa: NarrativaMC | null) =>
    montarDadosRelatorio({
      assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
      resultado,
      narrativa,
      facilitador: { nome: "Nome do Instrutor" },
      nivel: "S4",
    });
  const html = (dados: ReturnType<typeof montar>, n: number) =>
    renderToStaticMarkup(createElement(PAGINAS[n - 1].Componente, { dados }));

  it("com narrativa: sem nome do Valmer, com mensagem e leituras na 41", () => {
    const dados = montar(esquemaNarrativaMC.parse(narrativaExemplo));
    for (let n = 36; n <= 42; n++) {
      const h = html(dados, n);
      assert.match(h, new RegExp(`id="p${n}"`));
      if (n < 42) assert.doesNotMatch(h, /VALMER/i, `pagina ${n}`);
    }
    const p41 = html(dados, 41);
    assert.match(p41, /Crucial Conversations/);
    assert.doesNotMatch(p41, /Pendente/);
  });

  it("sem narrativa: a 41 mostra pendente, as outras nao dependem da IA", () => {
    const dados = montar(null);
    assert.match(html(dados, 41), /Pendente/);
    for (const n of [36, 37, 38, 39, 40, 42]) assert.doesNotMatch(html(dados, n), /Pendente/);
  });
});
