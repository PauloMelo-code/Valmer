/**
 * Paginas 08 a 14 do relatorio MC 3.1, renderizadas com o caso de
 * demonstracao (sem banco):
 *
 *   node --import tsx --test tests/relatorio-mc-p08-14.test.mts
 *
 * O risco aqui nao e a pagina quebrar: e ela sair com o numero ou o texto
 * pessoal do Valmer (o molde) para qualquer avaliado, ou com texto de IA
 * inventado quando a narrativa ainda nao existe.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { calcularResultado, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio, type DadosRelatorioMC } from "@/lib/relatorio-mc/dados";
import { esquemaNarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import { ADAPTADO_P14, RELACIONAMENTO, frasePolarizados } from "@/data/relatorio-mc/variantes/p08-14";
import M08 from "@/components/relatorio-mc/paginas/p08";
import M09 from "@/components/relatorio-mc/paginas/p09";
import M10 from "@/components/relatorio-mc/paginas/p10";
import M11 from "@/components/relatorio-mc/paginas/p11";
import M12 from "@/components/relatorio-mc/paginas/p12";
import M13 from "@/components/relatorio-mc/paginas/p13";
import M14 from "@/components/relatorio-mc/paginas/p14";

type Pag = ComponentType<{ dados: DadosRelatorioMC }>;
// .tsx chega ao .mts como CommonJS: o default pode vir embrulhado em { default }.
const pag = (m: unknown): Pag => (typeof m === "function" ? m : (m as { default: Pag }).default) as Pag;
const [P08, P09, P10, P11, P12, P13, P14] = [M08, M09, M10, M11, M12, M13, M14].map(pag);

const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
const montar = (comIA: boolean): DadosRelatorioMC =>
  montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado,
    narrativa: comIA ? esquemaNarrativaMC.parse(narrativaExemplo) : null,
    facilitador: { nome: "Nome do Instrutor" },
    nivel: "S4",
  });
const PAGINAS: Record<string, ComponentType<{ dados: DadosRelatorioMC }>> = { P08, P09, P10, P11, P12, P13, P14 };
const html = (P: ComponentType<{ dados: DadosRelatorioMC }>, d: DadosRelatorioMC) => renderToStaticMarkup(createElement(P, { dados: d }));

describe("paginas 08-14", () => {
  const d = montar(true);

  it("nenhuma repete o mapa do Valmer do molde", () => {
    for (const [nome, P] of Object.entries(PAGINAS)) {
      const h = html(P, d);
      for (const proibido of ["VALMER", "Contorno muito nítido", "entre 32 e 69", "INFLUENTE em 69", "ESTÁVEL em 30", "DISCRETO", "MARCANTE"]) {
        assert.ok(!h.includes(proibido), `${nome} contem "${proibido}"`);
      }
    }
  });

  it("08: indices e tabela vem do view-model", () => {
    const h = html(P08, d);
    assert.ok(h.includes(`>${d.indices.adaptacao.texto}<`));
    assert.ok(h.includes(`Adaptação ${d.indices.classe}.`));
    assert.ok(h.includes(frasePolarizados(3, d.indices.polarizadosTexto)));
    for (const f of ["D", "I", "S", "C"] as const) assert.ok(h.includes(`>${d.fatores[f].variacao.texto}<`));
  });

  it("09-12: escore, zona e os 4 descritores de cada condicao", () => {
    for (const [P, f] of [[P09, "D"], [P10, "I"], [P11, "S"], [P12, "C"]] as const) {
      const h = html(P, d);
      const x = d.fatores[f];
      assert.ok(h.includes(`>${x.natural.escore.texto}<`) && h.includes(`>${x.adaptado.zona.nome}<`));
      assert.ok(h.toLocaleLowerCase("pt-BR").includes(x.adaptado.descritores[3].toLocaleLowerCase("pt-BR")));
    }
    // So a 09 explica a linha "Emocao associada".
    assert.ok(html(P09, d).includes("Como ler a linha"));
    assert.ok(!html(P10, d).includes("Como ler a linha"));
  });

  it("13: um cartao por forca, com o rotulo da IA", () => {
    const h = html(P13, d);
    for (const forca of d.ia.seisForcas!) assert.ok(h.includes(forca.nome));
  });

  it("14: cartoes pelo fator mais alto e nota pelo fator que mais mudou", () => {
    const h = html(P14, d);
    assert.ok(h.includes(RELACIONAMENTO[d.ordemNatural[0]].sustenta));
    // Caso: C sobe 73 (a maior variacao absoluta) ate 93,8.
    assert.ok(h.includes(ADAPTADO_P14.sobe.C("CONFORME", "93,8")));
  });

  it("sem narrativa: texto de IA sai pendente, calculo e tabela continuam", () => {
    const s = montar(false);
    for (const P of [P08, P09, P13]) assert.ok(html(P, s).includes('data-ia="pendente"'));
    assert.ok(html(P08, s).includes(`>${s.indices.adaptacao.texto}<`));
    assert.ok(!html(P14, s).includes('data-ia="pendente"'), "a 14 nao depende da IA");
  });

  it("variantes: singular, zero e todas as combinacoes preenchidas", () => {
    assert.match(frasePolarizados(1, "CONFORME"), /^CONFORME atravessa /);
    assert.match(frasePolarizados(0, ""), /^Nenhum fator/);
    for (const direcao of ["sobe", "desce"] as const)
      for (const f of ["D", "I", "S", "C"] as const) assert.ok(!ADAPTADO_P14[direcao][f]("X", "1").includes("undefined"));
  });
});
