/**
 * Paginas 01 a 07 do relatorio MC 3.1, renderizadas em HTML estatico com o
 * caso de demonstracao.
 *
 *   npm test   (nao precisa de banco)
 *
 * O que se confere aqui e o que o olho nao pega no modelo: numero e texto do
 * Valmer que ficaram no componente, indice que promete pagina fora do nivel,
 * leitura rapida e subtitulo que nao mudam com o perfil.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { calcularResultado, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio, type DadosRelatorioMC } from "@/lib/relatorio-mc/dados";
import { esquemaNarrativaMC, type NarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import type { CodigoNivel } from "@/data/relatorio-mc/niveis";
import { leituraRapida } from "@/data/relatorio-mc/variantes/p01-07";
import { realcar } from "@/components/relatorio-mc/paginas/p01-07/realce";
import type { PropsPagina } from "@/components/relatorio-mc/paginas/registro";
import * as M01 from "@/components/relatorio-mc/paginas/p01";
import * as M02 from "@/components/relatorio-mc/paginas/p02";
import * as M03 from "@/components/relatorio-mc/paginas/p03";
import * as M04 from "@/components/relatorio-mc/paginas/p04";
import * as M05 from "@/components/relatorio-mc/paginas/p05";
import * as M06 from "@/components/relatorio-mc/paginas/p06";
import * as M07 from "@/components/relatorio-mc/paginas/p07";
import * as M15 from "@/components/relatorio-mc/paginas/p15";
import { FATORES, GRUPOS_DISC } from "@/data/inventario-mc";

const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
const narrativa = esquemaNarrativaMC.parse(narrativaExemplo);

function montar(nivel: CodigoNivel = "S4", n: NarrativaMC | null = narrativa, codigo: string | null = "MC-2026-0928-AP"): DadosRelatorioMC {
  return montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo, emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado,
    narrativa: n,
    facilitador: { nome: "Nome do Instrutor" },
    nivel,
  });
}

// O .tsx sai como CommonJS e o teste e ESM: o `default` chega embrulhado uma vez a mais.
const pagina = (m: { default: unknown }) => ((m.default as { default?: unknown }).default ?? m.default) as ComponentType<PropsPagina>;
const [P01, P02, P03, P04, P05, P06, P07] = [M01, M02, M03, M04, M05, M06, M07].map(pagina);
const P15 = pagina(M15);

const html = (P: ComponentType<PropsPagina>, d: DadosRelatorioMC) => renderToStaticMarkup(createElement(P, { dados: d }));
const TODAS = [P01, P02, P03, P04, P05, P06, P07];

describe("paginas 01-07 do relatorio MC 3.1", () => {
  it("nenhum dado pessoal do Valmer sobra no componente", () => {
    const texto = TODAS.map((P) => html(P, montar())).join("\n");
    for (const resto of ["VALMER", "Valmer", "MC-2026-0823-VA", "Decide e traz gente junto", "MC 3.0", ">89<", ">69<"]) {
      assert.ok(!texto.includes(resto), `sobrou "${resto}" do molde`);
    }
  });

  it("capa traz nome, instrutor, data e codigo; sem codigo, a linha some", () => {
    const capa = html(P01, montar());
    for (const t of ["ADRIANA PRADO", "NOME DO INSTRUTOR", "SETEMBRO DE 2026", "MC-2026-0928-AP"]) assert.ok(capa.includes(t), t);
    assert.ok(!html(P01, montar("S4", narrativa, null)).includes("CÓDIGO"));
  });

  it("indice so lista pagina que o nivel inclui (C35)", () => {
    const s1 = html(P02, montar("S1"));
    assert.ok(s1.includes('href="#p16"'));
    assert.ok(!s1.includes('href="#p17"'));
    assert.ok(!s1.includes("Integrar"), "etapa sem pagina some");
    assert.ok(s1.includes("S1 · Essencial"));
    const s4 = html(P02, montar("S4"));
    assert.ok(s4.includes('href="#p42"'));
    assert.ok(s4.includes("MC-INV 2.2 · MC-2026-0928-AP"));
  });

  it("pagina 06 usa a regua de 6 zonas, a linha em 51 e a leitura rapida do molde para DI -> CS", () => {
    const p06 = html(P06, montar());
    assert.ok(p06.includes(">87,5<") && p06.includes(">93,8<"));
    assert.ok(p06.includes("Muito alto") && p06.includes("Extremo baixo"));
    assert.ok(p06.includes(">51<"));
    assert.ok(!p06.includes(">75<"), "sem os ticks da regua antiga");
    assert.ok(p06.includes("O ambiente atual pede mais método, cautela, estabilidade e acompanhamento do que o seu padrão natural costuma entregar, e menos"));
  });

  it("leitura rapida cobre os quatro casos", () => {
    assert.match(leituraRapida("a", "b"), /pede mais a .* e menos b\.$/);
    assert.match(leituraRapida("a", ""), /pede mais a do que/);
    assert.match(leituraRapida("", "b"), /pede menos b do que/);
    assert.match(leituraRapida("", ""), /nenhum fator muda/);
  });

  it("pagina 07: arquetipo, subtitulo do perfil duplo e cruzamentos por posicao", () => {
    const p07 = html(P07, montar());
    assert.ok(p07.includes("O Protagonista"));
    assert.ok(p07.includes("DOMINANTE em 87,5 e INFLUENTE em 68,8."));
    // Pilula com a zona real do fator: D 87,5 muito alto, I 68,8 alto, S 22,9 e C 20,8 muito baixo.
    assert.equal(p07.match(/DOMINANTE muito alto</g)?.length, 2);
    assert.equal(p07.match(/INFLUENTE alto</g)?.length, 2);
    assert.equal(p07.match(/CONFORME muito baixo</g)?.length, 2);
    assert.equal(p07.match(/ESTÁVEL muito baixo</g)?.length, 2);
    assert.ok(p07.includes("os dois fatores mais altos cruzados com os dois mais baixos"));
  });

  it("perfil EQUILIBRADO: os quatro em 50, nenhuma pilula diz alto e a 15 nao fala em fator mais alto", () => {
    // Cada fator passa uma vez por cada posicao a cada 4 grupos: bruto 40, escore 50 nos quatro.
    const natural = Object.fromEntries(
      GRUPOS_DISC.map((g, i) => [g.grupo, Object.fromEntries(g.itens.map((it) => [it.id, ((FATORES.indexOf(it.fator) + i) % 4) + 1]))]),
    );
    const r = calcularResultado({ ...(caso.respostas as unknown as RespostasInventario), natural }, []);
    assert.equal(r.disc.natural.perfil, "EQUILIBRADO");
    const d = montarDadosRelatorio({
      assessment: { nome: "Adriana Prado", codigo: null, emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
      resultado: r,
      narrativa: null,
      facilitador: { nome: "Nome do Instrutor" },
      nivel: "S4",
    });
    const p07 = html(P07, d);
    assert.ok(!/(DOMINANTE|INFLUENTE|ESTÁVEL|CONFORME) alto</.test(p07), "pilula 'alto' com o fator em 50");
    assert.equal(p07.match(/(DOMINANTE|INFLUENTE|ESTÁVEL|CONFORME) baixo</g)?.length, 8);
    assert.ok(p07.includes("os quatro empatam em 50"));
    const p15 = html(P15, d);
    assert.ok(!p15.includes("Fator mais alto") && !p15.includes("Segundo fator"));
    assert.ok(p15.includes("Primeiro no desempate") && p15.includes("Segundo no desempate"));
  });

  it("sem narrativa, a 07 mostra os oito blocos de IA como pendentes", () => {
    const p07 = html(P07, montar("S4", null));
    assert.equal(p07.match(/data-ia="pendente"/g)?.length, 8);
  });

  it("realcar destaca cada trecho uma vez e ignora o que nao aparece", () => {
    const r = renderToStaticMarkup(createElement("p", null, realcar("A e B e A", [{ trecho: "A" }, { trecho: "X" }, { trecho: "B", como: "i" }])));
    assert.equal(r, "<p><b>A</b> e <i>B</i> e A</p>");
  });
});
