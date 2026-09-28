/**
 * Teste da busca da tela de Sessao de Leitura.
 *
 *   node --import tsx --test tests/filtro-sessoes.test.mts
 *
 * Nao toca no banco: o filtro roda sobre a lista que o servidor JA entregou.
 * O que se verifica aqui e o que quebra calado — data que nao existe aceita
 * como faixa, e o dia comparado no fuso errado. O `includes` de nome e e-mail
 * esta aqui so de carona, porque o filtro e um so.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { diaDigitado, diaEmBrasilia, erroDoFiltro, filtrarSessoes, filtroAtivo, FILTRO_VAZIO } =
  await import("@/lib/filtro-sessoes");

/** 21h de 22/09 em Brasilia — 00h de 23/09 em UTC. */
const NOITE_DE_22 = Date.parse("2026-09-23T00:30:00Z");
/** 10h de 23/09 em Brasilia. */
const MANHA_DE_23 = Date.parse("2026-09-23T13:00:00Z");

const LINHAS = [
  { nome: "Ana Souza", email: "ana@exemplo.com", finalizada: true, abertaEm: NOITE_DE_22 },
  { nome: "Bruno Lima", email: "bruno@outro.com", finalizada: false, abertaEm: MANHA_DE_23 },
];

const comFiltro = (parcial: Partial<typeof FILTRO_VAZIO>) => ({ ...FILTRO_VAZIO, ...parcial });
const nomes = (linhas: typeof LINHAS) => linhas.map((linha) => linha.nome);

describe("filtro das sessoes de leitura", () => {
  it("o dia sai no fuso de Brasilia, e nao no do servidor", () => {
    // Esta e a regressao que o teste existe para pegar: o mesmo instante e dia
    // 23 em UTC e dia 22 em Brasilia, e a coluna "Criado em" da tela mostra 22.
    assert.equal(diaEmBrasilia(NOITE_DE_22), "2026-09-22");
    assert.equal(diaEmBrasilia(MANHA_DE_23), "2026-09-23");
  });

  it("recusa dia que nao existe no calendario", () => {
    assert.equal(diaDigitado("31/02/2026"), null);
    assert.equal(diaDigitado("23/13/2026"), null);
    assert.equal(diaDigitado("23/9/2026"), null);
    assert.equal(diaDigitado("23/09/2026"), "2026-09-23");
    assert.equal(diaDigitado(" 29/02/2024 "), "2024-02-29");
  });

  it("avisa em vez de buscar com data pela metade", () => {
    assert.match(erroDoFiltro(comFiltro({ de: "23/0" }))!, /Data inicial/);
    assert.match(erroDoFiltro(comFiltro({ ate: "31/02/2026" }))!, /Data final/);
    assert.match(
      erroDoFiltro(comFiltro({ de: "24/09/2026", ate: "23/09/2026" }))!,
      /depois da data final/,
    );
    assert.equal(erroDoFiltro(comFiltro({ de: "23/09/2026" })), null);
    assert.equal(erroDoFiltro(FILTRO_VAZIO), null);
  });

  it("a faixa de datas inclui os dois extremos", () => {
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ de: "22/09/2026" }))), [
      "Ana Souza",
      "Bruno Lima",
    ]);
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ ate: "22/09/2026" }))), [
      "Ana Souza",
    ]);
    assert.deepEqual(
      nomes(filtrarSessoes(LINHAS, comFiltro({ de: "23/09/2026", ate: "23/09/2026" }))),
      ["Bruno Lima"],
    );
  });

  it("data invalida nao vira faixa silenciosa", () => {
    // Quem chama sem olhar `erroDoFiltro` recebe a lista INTEIRA, e nao uma
    // lista recortada por um dia inventado.
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ de: "31/02/2026" }))), [
      "Ana Souza",
      "Bruno Lima",
    ]);
  });

  it("status usa o rotulo do campo, que difere do rotulo da linha", () => {
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ status: "Finalizada" }))), [
      "Ana Souza",
    ]);
    // "Pausado" no filtro e a "Pausada" da tabela: os dois sao finalizada_em
    // vazio.
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ status: "Pausado" }))), [
      "Bruno Lima",
    ]);
    assert.equal(filtrarSessoes(LINHAS, FILTRO_VAZIO).length, 2);
  });

  it("nome e e-mail ignoram caixa e espaco em volta", () => {
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ nome: "  souza " }))), [
      "Ana Souza",
    ]);
    assert.deepEqual(nomes(filtrarSessoes(LINHAS, comFiltro({ email: "OUTRO.COM" }))), [
      "Bruno Lima",
    ]);
  });

  it("filtro apagado deixa de ser filtro", () => {
    assert.equal(filtroAtivo(FILTRO_VAZIO), false);
    // Campo digitado e apagado devolve um objeto novo e vazio: pela identidade
    // do objeto a tela continuaria dizendo que ha uma busca em curso.
    assert.equal(filtroAtivo(comFiltro({ nome: "   " })), false);
    assert.equal(filtroAtivo(comFiltro({ status: "Pausado" })), true);
    assert.equal(filtroAtivo(comFiltro({ ate: "23/09/2026" })), true);
  });
});
