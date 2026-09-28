/**
 * Paginas 15 a 21 do relatorio MC 3.1, renderizadas sem banco:
 *
 *   node --import tsx --test tests/relatorio-mc-p15-21.test.mts
 *
 * O risco e a pagina imprimir o caso do Valmer (D e I em cima, POL no topo,
 * polos E/N/T) para quem nao e o caso dele. Por isso, alem do caso de
 * demonstracao, roda um perfil invertido: C e S em cima, polos I/S/F, SOC no
 * topo, sem narrativa.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { calcularResultado, type RespostasInventario, type ResultadoMotor } from "@/lib/motor";
import { montarDadosRelatorio, type DadosRelatorioMC } from "@/lib/relatorio-mc/dados";
import { esquemaNarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import { PAGINA_21 } from "@/data/relatorio-mc/jung";
import { LEITURA_DO_ALINHAMENTO } from "@/data/relatorio-mc/variantes/p15-21";
import { TOM, TOM_HIERARQUIA, clarear } from "@/components/relatorio-mc/paginas/p15-21/cores";
import P15 from "@/components/relatorio-mc/paginas/p15";
import P16 from "@/components/relatorio-mc/paginas/p16";
import P17 from "@/components/relatorio-mc/paginas/p17";
import P18 from "@/components/relatorio-mc/paginas/p18";
import P19 from "@/components/relatorio-mc/paginas/p19";
import P20 from "@/components/relatorio-mc/paginas/p20";
import P21 from "@/components/relatorio-mc/paginas/p21";

type P = ComponentType<{ dados: DadosRelatorioMC }>;
const PAGINAS: Record<string, P> = { P15, P16, P17, P18, P19, P20, P21 };
// .tsx chega ao .mts como CommonJS: o default pode vir embrulhado em { default }.
const html = (Pg: unknown, d: DadosRelatorioMC) =>
  renderToStaticMarkup(createElement((typeof Pg === "function" ? Pg : (Pg as { default: P }).default) as P, { dados: d }));

const demo = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
const montar = (resultado: ResultadoMotor, comIA: boolean) =>
  montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado,
    narrativa: comIA ? esquemaNarrativaMC.parse(narrativaExemplo) : null,
    facilitador: { nome: "Nome do Instrutor" },
    nivel: "S4",
  });

function invertido(): ResultadoMotor {
  const r = structuredClone(demo);
  r.disc.natural.ordem = ["C", "S", "I", "D"];
  r.disc.natural.escore = { D: 12.5, I: 30, S: 72.5, C: 85 };
  r.jung = { percentuais: { E: 25.9, I: 74.1, N: 11.1, S: 88.9, T: 33.3, F: 66.7 }, tipo: "ISF", hierarquia: ["Sensação Introvertida", "Sentimento Extrovertido", "Pensamento Introvertido", "Intuição Extrovertida"] };
  r.valores.ranking = ["SOC", "PRI", "TEO", "ECO", "POL", "EST"];
  return r;
}

describe("paginas 15-21", () => {
  const d = montar(demo, true);
  const inv = montar(invertido(), false);

  it("nenhuma repete o caso do Valmer do molde", () => {
    for (const dados of [d, inv]) {
      for (const [nome, Pg] of Object.entries(PAGINAS)) {
        const h = html(Pg, dados);
        for (const proibido of ["VALMER", "DOMINANTE em 89", "INFLUENTE em 69", "com 82 pontos", "Intuição 64", "EXTROVERSÃO 71", "maior escore dentro do seu par"]) {
          assert.ok(!h.includes(proibido), `${nome} contem "${proibido}"`);
        }
      }
    }
  });

  it("15 e 16 seguem a ordem natural", () => {
    assert.ok(html(P15, d).includes("Ligados ao fator DOMINANTE"));
    const h15 = html(P15, inv);
    assert.ok(h15.includes("Ligados ao fator CONFORME") && h15.includes("Ligados ao fator ESTÁVEL"));
    assert.ok(h15.includes("Cometer erros"));
    const h16 = html(P16, d);
    assert.ok(h16.includes("DOMINANTE em 87,5 pontos") && h16.includes("Ele confirma e reforça o gatilho principal"));
    // SOC e afim de S (complementar), nao de C (principal): o "confirma e reforca" do molde nao pode sair.
    const h16i = html(P16, inv);
    assert.ok(h16i.includes("Informação e alto padrão") && h16i.includes("VALOR SOCIAL"));
    assert.ok(!h16i.includes("confirma e reforça") && h16i.includes(LEITURA_DO_ALINHAMENTO.complementar.texto));
  });

  it("18-20: numeros e textos por polo; sem narrativa, pendente", () => {
    const h = html(P18, d);
    assert.ok(h.includes("EXTROVERSÃO <!-- -->70,4") || h.includes("EXTROVERSÃO 70,4"));
    assert.ok(h.includes("Seu polo predominante · <!-- -->70,4") || h.includes("Seu polo predominante · 70,4"));
    assert.ok(!h.includes('data-ia="pendente"'));
    const hi = html(P18, inv);
    // Polo A (E) continua a esquerda, agora em tom claro; o cartao do predominante e o da Introversao.
    assert.ok(hi.includes(`fill="${clarear("#B14A2F", TOM.barra)}"`));
    assert.ok(hi.indexOf("Introversão</h2>") < hi.indexOf("Extroversão</h2>"));
    assert.equal(hi.match(/data-ia="pendente"/g)?.length, 2);
  });

  it("21: hierarquia com atitude, regra de clareza e nota da IA", () => {
    const h = html(P21, d);
    assert.ok(h.includes("Tipo Intuição Extrovertida."));
    assert.ok(h.includes(PAGINA_21.comoAOrdemEDeterminadaV22));
    assert.ok(h.includes("Sensação 37 e Sentimento 40,7") && h.includes("a proximidade entre os números"));
    const hi = html(P21, inv);
    assert.ok(hi.includes("Intuição 11,1 e Pensamento 33,3") && !hi.includes("a proximidade entre os números"));
    assert.ok(hi.includes('data-ia="pendente"'));
  });

  it("os tons claros reproduzem os do molde (ate 1 unidade por canal)", () => {
    const perto = (a: string, b: string) => {
      const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      assert.ok(c(a).every((v, i) => Math.abs(v - c(b)[i]) <= 1), `${a} x ${b}`);
    };
    perto(clarear("#4B4E85", TOM.barra), "#BBBCD1");
    perto(clarear("#4B4E85", TOM.borda), "#AEAFC8");
    perto(clarear("#4B4E85", TOM.marcador), "#9C9EBC");
    perto(clarear("#3D5A80", TOM_HIERARQUIA[1]), "#5A7393");
    perto(clarear("#A04668", TOM_HIERARQUIA[2]), "#BC7E95");
    perto(clarear("#2B7A78", TOM_HIERARQUIA[3]), "#8AB6B5");
  });
});
