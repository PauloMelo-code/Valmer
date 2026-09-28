/**
 * A folha de impressao do cargo.
 *
 *   npm test
 *
 * Puro: nao toca banco nem navegador. O que se prova aqui e o unico jeito de
 * esta folha causar dano — nome de cargo digitado por gente virando HTML vivo
 * na janela aberta — e a linha que diferencia "sem alvo" de "alvo 0%", que e o
 * dado que o papel existe para carregar.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { folhaDeCargo } = await import("@/lib/folha-de-cargo");

const BASE = {
  nome: "Consultora de Vendas",
  alvo_d: 40,
  alvo_i: 30,
  alvo_s: 20,
  alvo_c: 10,
  dono: "Ana Souza",
  criadoEm: "23/09/2026 14:30",
};

describe("folha de impressao do cargo", () => {
  it("escapa o que foi digitado", () => {
    const folha = folhaDeCargo(
      { ...BASE, nome: '<script>alert(1)</script>', dono: "Ana & Cia" },
      "23/09/2026 15:00",
    );
    assert.ok(!folha.includes("<script>"), "script do nome do cargo entrou vivo na folha");
    assert.ok(folha.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(folha.includes("Ana &amp; Cia"));
  });

  it("imprime os quatro percentuais e a autoria", () => {
    const folha = folhaDeCargo(BASE, "23/09/2026 15:00");
    assert.match(folha, /D 40%.*I 30%.*S 20%.*C 10%/);
    assert.match(folha, /Criado por Ana Souza em 23\/09\/2026 14:30/);
  });

  it("cargo sem alvo diz que esta sem alvo, e nao 0%", () => {
    const folha = folhaDeCargo(
      { ...BASE, alvo_d: null, alvo_i: null, alvo_s: null, alvo_c: null },
      "23/09/2026 15:00",
    );
    assert.match(folha, /Sem alvo definido/);
    assert.ok(!/D 0%/.test(folha));
  });
});
