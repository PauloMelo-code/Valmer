/**
 * Roteiro por semente (lib/inventario/roteiro.ts). Sem banco.
 *
 * O teste mais importante e o ultimo: roda o `novo()` do PROTOTIPO do Valmer
 * (contexto/referencias/mc-inv-2.2/inventario-mc.html), com a semente trocada
 * pela nossa, e exige o mesmo roteiro. E isso que prova "mesma mecanica", e
 * nao so "mesmo formato".
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { montarRoteiro, comGenero, gerador } = await import("@/lib/inventario/roteiro");
const { EIXOS_JUNG, GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, telaDoGrupo } = await import("@/data/inventario-mc");

const SEMENTES = [1, 7, 918273, 2147483646];

describe("roteiro por semente", () => {
  it("mesma semente, mesmo roteiro; semente diferente, outro", () => {
    for (const s of SEMENTES) assert.deepEqual(montarRoteiro(s), montarRoteiro(s));
    assert.notDeepEqual(montarRoteiro(1), montarRoteiro(2));
  });

  it("gerador em [0, 1)", () => {
    const g = gerador(42);
    for (let i = 0; i < 10_000; i++) {
      const x = g();
      assert.ok(x >= 0 && x < 1);
    }
  });

  it("etapa 1: 16 grupos na ordem, cada um com as suas 4 palavras", () => {
    for (const s of SEMENTES) {
      const r = montarRoteiro(s);
      assert.deepEqual(
        r[1].map((t) => t.tela),
        GRUPOS_DISC.map((g) => telaDoGrupo("G", g.grupo)),
      );
      r[1].forEach((t, i) => {
        assert.deepEqual([...t.inicial].sort(), GRUPOS_DISC[i]!.itens.map((x) => x.id).sort());
      });
    }
  });

  it("etapas 2 e 4: cada grupo uma vez, com as suas palavras", () => {
    for (const s of SEMENTES) {
      const r = montarRoteiro(s);
      assert.deepEqual(r[2].map((t) => t.tela).sort(), GRUPOS_DISC.map((g) => telaDoGrupo("G", g.grupo)).sort());
      assert.deepEqual(r[4].map((t) => t.tela).sort(), GRUPOS_VALORES.map((g) => telaDoGrupo("V", g.grupo)).sort());
      for (const t of [...r[2], ...r[4]]) {
        const prefixo = t.tela.slice(0, 3);
        assert.equal(new Set(t.inicial).size, t.inicial.length);
        assert.ok(t.inicial.every((id) => id.startsWith(`${prefixo}-`)), t.tela);
      }
      assert.ok(r[4].every((t) => t.inicial.length === 6));
    }
  });

  it("etapa 3: 9 rodadas com os 3 eixos cada, os 27 pares uma vez", () => {
    for (const s of SEMENTES) {
      const r = montarRoteiro(s);
      assert.equal(r[3].length, 27);
      assert.deepEqual(r[3].map((t) => t.id).sort(), PARES_JUNG.map((p) => p.id).sort());
      for (let k = 0; k < 9; k++) {
        const rodada = r[3].slice(k * 3, k * 3 + 3).map((t) => t.eixo);
        assert.deepEqual([...rodada].sort(), [...EIXOS_JUNG].sort(), `rodada ${k + 1}`);
      }
    }
  });

  it("embaralha de verdade: posicao e lado variam entre sementes", () => {
    const iniciais = new Set<string>();
    const lados = new Set<boolean>();
    for (let s = 1; s <= 200; s++) {
      const r = montarRoteiro(s);
      iniciais.add(r[1][0]!.inicial.join());
      r[3].forEach((t) => lados.add(t.poloAEsquerda));
    }
    assert.equal(iniciais.size, 24, "as 24 ordens de 4 palavras aparecem em 200 sementes");
    assert.deepEqual([...lados].sort(), [false, true]);
  });

  it("genero: termina em 'o' ou 'or' ganha (a)", () => {
    assert.equal(comGenero("Ousado"), "Ousado(a)");
    for (const t of ["Acolhedor", "Observador", "Desafiador", "Conciliador", "Inspirador", "Motivador"]) {
      assert.equal(comGenero(t), `${t}(a)`);
    }
    assert.equal(comGenero("Firme"), "Firme");
    assert.equal(comGenero("Sociável"), "Sociável");
  });

  it("reproduz o novo() do prototipo do Valmer, sorteio por sorteio", () => {
    const html = readFileSync(join("..", "contexto", "referencias", "mc-inv-2.2", "inventario-mc.html"), "utf8");
    const linha = (inicio: string) => html.split("\n").find((l) => l.startsWith(inicio))!;
    const inicioNovo = html.indexOf("function novo(");
    const novo = html.slice(inicioNovo, html.indexOf("function salvar(", inicioNovo));
    assert.ok(inicioNovo > 0 && novo.includes("Math.random()*2147483647"), "o prototipo mudou: reler novo()");

    const codigo = [
      linha("const INV = "),
      linha("function rng("),
      linha("function shuffle("),
      novo.replace("Math.floor(Math.random()*2147483647)", "SEMENTE"),
      "return novo('x').telas;",
    ].join("\n");
    type Prot = {
      e1: { grupo: number; ini: string[] }[];
      e2: { grupo: number; ini: string[] }[];
      e3: { ax: string; i: number; aEsq: boolean }[];
      e4: { grupo: number; ini: string[] }[];
    };

    for (const s of SEMENTES) {
      const p = new Function("SEMENTE", codigo)(s) as Prot;
      const r = montarRoteiro(s);
      const ordem = (x: { grupo: number; ini: string[] }[], prefixo: "G" | "V") =>
        x.map((t) => ({ tela: telaDoGrupo(prefixo, t.grupo), inicial: t.ini }));
      assert.deepEqual(r[1], ordem(p.e1, "G"), `etapa 1, semente ${s}`);
      assert.deepEqual(r[2], ordem(p.e2, "G"), `etapa 2, semente ${s}`);
      assert.deepEqual(
        r[3].map((t) => [t.id, t.poloAEsquerda]),
        p.e3.map((t) => [`${t.ax}${String(t.i + 1).padStart(2, "0")}`, t.aEsq]),
        `etapa 3, semente ${s}`,
      );
      assert.deepEqual(r[4], ordem(p.e4, "V"), `etapa 4, semente ${s}`);
    }
  });
});
