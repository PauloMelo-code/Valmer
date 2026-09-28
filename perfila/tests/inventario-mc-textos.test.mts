/**
 * Textos do inventario MC-INV 2.2: definicoes do "?" (T1) e textos de tela.
 *
 * Sem banco. O que se protege aqui e o casamento entre texto e item: uma
 * palavra trocada no inventario sem a definicao acompanhar deixaria o "?"
 * vazio — ou pior, explicando a palavra antiga — em silencio.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, TOTAL_TELAS } = await import("@/data/inventario-mc");
const { DEFINICOES, definicaoDe } = await import("@/data/inventario-mc-definicoes");
const { ETAPAS, rotulosJung, textoProgresso, textoRetomada, textoFimDeEtapa, CONSENTIMENTO, COMPROMISSO_ATENCAO } =
  await import("@/data/inventario-mc-textos");

const itensDisc = GRUPOS_DISC.flatMap((g) => g.itens.map((i) => i.texto));
const itensJung = PARES_JUNG.flatMap((p) => [p.poloA, p.poloB]);
const itensValores = GRUPOS_VALORES.flatMap((g) => g.itens.map((i) => i.texto));
const todos = [...itensDisc, ...itensJung, ...itensValores];

describe("definicoes do botao ?", () => {
  it("o inventario tem 64 + 54 + 60 itens, todos com texto distinto", () => {
    assert.equal(itensDisc.length, 64);
    assert.equal(itensJung.length, 54);
    assert.equal(itensValores.length, 60);
    // Chave repetida entre etapas faria duas palavras dividirem uma definicao.
    assert.equal(new Set(todos).size, 178);
  });

  it("178 definicoes, uma por item, nenhuma chave orfa", () => {
    const chaves = Object.keys(DEFINICOES);
    assert.equal(chaves.length, 178);
    assert.deepEqual(todos.filter((t) => !definicaoDe(t)), [], "item sem definicao");
    assert.deepEqual(chaves.filter((c) => !todos.includes(c)), [], "definicao sem item");
  });

  it("nenhuma passa de 12 palavras nem fica vazia", () => {
    const longas = Object.entries(DEFINICOES).filter(([, d]) => d.trim().split(/\s+/).length > 12);
    assert.deepEqual(longas, []);
    for (const [chave, d] of Object.entries(DEFINICOES)) assert.ok(d.trim().length > 0, chave);
  });

  it("nao confunde propriedade herdada com definicao", () => {
    assert.equal(definicaoDe("toString"), undefined);
  });
});

describe("textos das etapas", () => {
  it("as quatro etapas tem titulo, abertura e instrucao", () => {
    for (const n of [1, 2, 3, 4] as const) {
      const e = ETAPAS[n];
      assert.equal(e.numero, n);
      for (const campo of [e.titulo, e.abertura, e.comoResponder]) assert.ok(campo.length > 0, `etapa ${n}`);
    }
  });

  it("as telas das etapas somam o inventario inteiro", () => {
    const soma = ETAPAS[1].telas + ETAPAS[2].telas + ETAPAS[3].telas + ETAPAS[4].telas;
    assert.equal(soma, TOTAL_TELAS);
    assert.equal(soma, 69);
  });

  it("abertura da etapa 1 e a versao por toque do blueprint", () => {
    assert.match(ETAPAS[1].abertura, /^Em cada tela você verá quatro palavras\. Toque primeiro/);
    assert.match(ETAPAS[4].abertura, /^Em cada tela há seis palavras\. Toque primeiro/);
  });

  it("botoes de Jung: Muito/Mais de cada lado, palavra em minuscula", () => {
    assert.deepEqual(rotulosJung("Sonhador", "Pé no chão"), [
      "Muito sonhador",
      "Mais sonhador",
      "Mais pé no chão",
      "Muito pé no chão",
    ]);
  });

  it("mensagens com numero", () => {
    assert.equal(textoProgresso(2, 5), "Etapa 2 de 4 · tela 5 de 16");
    assert.equal(textoProgresso(3, 27), "Etapa 3 de 4 · tela 27 de 27");
    assert.match(textoRetomada(4, 3).texto, /etapa 4, o que te move, a partir da tela 3 de 10/);
    assert.match(textoFimDeEtapa(3).texto, /^Falta 1 etapa\./);
    assert.match(textoFimDeEtapa(1).texto, /^Faltam 3 etapas\./);
  });

  it("consentimento cobre o que, para que, quem ve, prazo, revogacao e dado sensivel", () => {
    const tudo = CONSENTIMENTO.secoes.map((s) => s.texto).join(" ");
    for (const trecho of ["coletamos", "Para calcular", "analista", "Guardamos", "retirar este consentimento", "dados sensíveis"]) {
      assert.ok(`${CONSENTIMENTO.secoes.map((s) => s.titulo).join(" ")} ${tudo}`.includes(trecho), trecho);
    }
    assert.ok(COMPROMISSO_ATENCAO.itens.length > 0);
  });
});
