/**
 * Ativos do molde MC 3.1 (ADR-0007 D5), gerados por
 * contexto/extraido/mc-3.1-paginas/extrair.py.
 *
 * Nao precisa de banco. Cobre o que quebra calado se alguem editar o CSS a
 * mao ou gerar de novo com um molde diferente: seletor sem o escopo .mc31
 * (vaza para o app inteiro), @page sem nome (briga com o relatorio antigo),
 * base64 de volta (2,5 MB no bundle) e url de fonte ou imagem que nao existe
 * em public/ (o PDF sai com a fonte reserva e ninguem percebe).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(`${app}/src/components/relatorio-mc/relatorio-mc.css`, "utf8");
const paginas = fileURLToPath(new URL("../../contexto/extraido/mc-3.1-paginas", import.meta.url));

/** Regras de topo do CSS, sem comentarios. O molde nao tem @media nem aninhamento. */
function regras(texto: string): { seletor: string }[] {
  const semComentario = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...semComentario.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => ({ seletor: m[1].trim() }));
}

describe("relatorio-mc.css", () => {
  it("nao carrega base64", () => {
    assert.equal(css.includes(";base64,"), false);
  });

  it("todo seletor comeca em .mc31", () => {
    const soltos = regras(css)
      .filter((r) => !r.seletor.startsWith("@"))
      .flatMap((r) => r.seletor.split(",").map((s) => s.trim()))
      .filter((s) => s !== ".mc31" && !s.startsWith(".mc31 "));
    assert.deepEqual(soltos, []);
  });

  it("so declara @page nomeado, e as folhas do molde usam esse nome", () => {
    const pages = regras(css).filter((r) => r.seletor.startsWith("@page"));
    assert.deepEqual(
      pages.map((r) => r.seletor),
      ["@page mc31"],
    );
    assert.match(css, /\.mc31 \.page\{page:mc31\}/);
  });

  it("toda url aponta para arquivo existente em public/", () => {
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
    assert.equal(urls.length, 18);
    const faltando = urls.filter((u) => !existsSync(`${app}/public${u}`));
    assert.deepEqual(faltando, []);
  });
});

describe("paginas extraidas do molde", () => {
  const arquivos = readdirSync(paginas).filter((f) => /^pag\d\d\.html$/.test(f));

  it("sao 42, cada uma com a sua secao", () => {
    assert.equal(arquivos.length, 42);
    arquivos.forEach((f, i) => {
      const n = String(i + 1).padStart(2, "0");
      assert.equal(f, `pag${n}.html`);
      assert.match(readFileSync(`${paginas}/${f}`, "utf8"), new RegExp(`<section\\s+class="page"\\s+id="p${n}"`));
    });
  });

  it("nao carregam base64 e as imagens existem em public/", () => {
    for (const f of arquivos) {
      const html = readFileSync(`${paginas}/${f}`, "utf8");
      assert.equal(html.includes(";base64,"), false, f);
      for (const [, src] of html.matchAll(/src="([^"]+)"/g)) {
        assert.ok(existsSync(`${app}/public${src}`), `${f}: ${src}`);
      }
    }
  });
});
