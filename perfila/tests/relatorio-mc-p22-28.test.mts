/**
 * Paginas 22 a 28 do relatorio MC 3.1, renderizadas com o caso de
 * demonstracao (sem banco, sem navegador).
 *
 *   node --import tsx --test tests/relatorio-mc-p22-28.test.mts
 *
 * O molde traz o resultado do Valmer escrito a mao. O risco destas paginas e
 * um numero ou nome dele sobrar no HTML e sair no relatorio de outra pessoa,
 * ou um texto de IA ausente virar espaco em branco calado.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { calcularResultado, type ResultadoMotor, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio } from "@/lib/relatorio-mc/dados";
import { esquemaNarrativaMC, type NarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import { PAGINAS } from "@/components/relatorio-mc/paginas/registro";
import { REGULACOES_INFERIOR } from "@/data/relatorio-mc/variantes/p22-28";

const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
const narrativa = esquemaNarrativaMC.parse(narrativaExemplo);

function html(numero: number, r: ResultadoMotor = resultado, n: NarrativaMC | null = narrativa): string {
  const dados = montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado: r,
    narrativa: n,
    facilitador: { nome: "Nome do Instrutor" },
    nivel: "S4",
  });
  const pagina = PAGINAS.find((p) => p.numero === numero)!;
  return renderToStaticMarkup(createElement(pagina.Componente, { dados }));
}

const NUMEROS = [22, 23, 24, 25, 26, 27, 28];

describe("paginas 22-28", () => {
  it("nada do exemplo do molde sobra no HTML", () => {
    for (const n of NUMEROS) {
      const h = html(n);
      for (const proibido of ["VALMER", "REGULATÓRIO", "Regulatório", "Direção e resultado", "Sensação · 36", "Detalhes nas páginas 31", "contorno nítido", "1 a 30", "1 a 30"]) {
        assert.ok(!h.includes(proibido), `pagina ${n} ainda tem "${proibido}"`);
      }
    }
  });

  it("numeros do caso de demonstracao", () => {
    assert.match(html(22), /Função inferior: Sensação Introvertida, 37 pontos\./);
    assert.match(html(23), /31 a 65,9/);
    const p24 = html(24);
    assert.match(p24, /PRINCÍPIOS/);
    assert.match(p24, /limites de 31 e 66 pontos/);
    assert.match(p24, /TEÓRICO e ESTÉTICO\./);
    assert.match(html(25), />88<.*>76</s);
    const p27 = html(27);
    for (const t of ["87,5", "93,8", "Extremo alto", "Executivo", "33,6", "Metódico", "12,2", "adaptação extremamente alta", "66,7", "−72,9", "Detalhes na página 08."]) {
      assert.ok(p27.includes(t), `pagina 27 sem "${t}"`);
    }
  });

  it("sem narrativa, os blocos de IA saem como pendentes e o calculo continua", () => {
    for (const n of [22, 25, 26, 28]) assert.match(html(n, resultado, null), /data-ia="pendente"/, `pagina ${n}`);
    assert.match(html(27, resultado, null), /87,5/);
  });

  it("regulacoes e manifestacao seguem a funcao inferior (C20)", () => {
    const outra: ResultadoMotor = {
      ...resultado,
      jung: { ...resultado.jung, hierarquia: ["Sensação Introvertida", "Sentimento Extrovertido", "Pensamento Introvertido", "Intuição Extrovertida"] },
    };
    const h = html(22, outra, null);
    assert.match(h, /Intuição Extrovertida, 63 pontos/);
    assert.ok(h.includes(REGULACOES_INFERIOR.N.itens[0]));
    assert.ok(!h.includes(REGULACOES_INFERIOR.S.itens[0]));
    assert.ok(Object.values(REGULACOES_INFERIOR).every((r) => r.itens.length === 3));
  });
});
