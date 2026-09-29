/**
 * A escolha do zoom de cada bloco do relatorio MC 3.1.
 *
 * O molde do Valmer so ampliava (1 a 1,3): la o texto era fixo e cabia por
 * construcao. Com texto da IA, que pode vir acima do pedido, o que nao cabia era
 * cortado pelo overflow da folha sem ninguem saber. `escolherZoom` e a parte
 * pura do ajuste; o encaixe real (medir no navegador) e o `cabe` que ela recebe.
 *
 *   node --import tsx --test tests/relatorio-mc-ajuste.test.mts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { escolherZoom, escalaDaTela } = await import("@/components/relatorio-mc/ajuste-de-pagina");

describe("escalaDaTela", () => {
  const FOLHA = (210 / 25.4) * 96;

  it("tela larga: folha no tamanho real, nunca ampliada", () => {
    assert.equal(escalaDaTela(1920), 1);
    assert.equal(escalaDaTela(FOLHA + 16), 1);
  });

  it("celular: a A4 inteira cabe na largura, com respiro dos dois lados", () => {
    const escala = escalaDaTela(390);
    assert.ok(escala > 0.47 && escala < 0.48, `escala ${escala}`);
    assert.ok(FOLHA * escala + 16 <= 390 + 1e-9, "a folha encolhida cabe na tela");
  });

  it("largura zero nao vira zoom invalido", () => {
    assert.equal(escalaDaTela(0), 0.1);
  });
});

/** Bloco que cabe ate um certo zoom, como a medicao do navegador responderia. */
const cabeAte = (limite: number) => (zoom: number) => zoom <= limite + 1e-9;

describe("escolherZoom", () => {
  it("sobra muito espaco: amplia ate o teto do molde", () => {
    assert.deepEqual(escolherZoom(cabeAte(2)), { zoom: 1.3, transborda: false });
  });

  it("sobra algum espaco: amplia o que cabe, sem passar", () => {
    const { zoom, transborda } = escolherZoom(cabeAte(1.17));
    assert.equal(transborda, false);
    assert.ok(zoom <= 1.17 && zoom > 1.16, `zoom ${zoom}`);
  });

  it("cabe exatamente em 1: fica em 1", () => {
    const { zoom } = escolherZoom(cabeAte(1));
    assert.ok(zoom >= 0.999 && zoom <= 1, `zoom ${zoom}`);
  });

  it("nao cabe em 1: REDUZ em vez de deixar o overflow cortar o texto", () => {
    const { zoom, transborda } = escolherZoom(cabeAte(0.93));
    assert.equal(transborda, false);
    assert.ok(zoom <= 0.93 && zoom > 0.92, `zoom ${zoom}`);
  });

  it("nao cabe nem no piso de legibilidade: para no piso e avisa", () => {
    assert.deepEqual(escolherZoom(cabeAte(0.7)), { zoom: 0.88, transborda: true });
  });

  it("o zoom escolhido sempre cabe quando ha zoom que caiba", () => {
    for (const limite of [0.88, 0.9, 0.95, 1, 1.05, 1.2, 1.29]) {
      const { zoom, transborda } = escolherZoom(cabeAte(limite));
      assert.equal(transborda, false, `limite ${limite}`);
      assert.ok(zoom <= limite + 1e-9, `limite ${limite}: zoom ${zoom} nao cabe`);
    }
  });
});
