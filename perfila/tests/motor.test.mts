/**
 * Testes de ouro T1-T8 do motor (secao 10 do AGENTE-INVENTARIO-MC.md).
 *
 * O porte so vai ao ar se reproduzir exatamente estes numeros, que sao os de
 * `python motor_referencia.py`. A paridade caso a caso esta em
 * motor-paridade.test.mts; aqui ficam os casos que o Valmer consegue conferir
 * lendo a tabela, mais a recusa de resposta corrompida (secao 5.1).
 *
 *   node --import tsx --test tests/motor.test.mts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COMPETENCIAS_POR_FATOR,
  FATORES,
  GRUPOS_DISC,
  GRUPOS_VALORES,
  PARES_JUNG,
  TOTAL_TELAS,
} from "@/data/inventario-mc";
import {
  RespostaInvalida,
  indices,
  lideranca,
  perfil,
  pontuarDisc,
  pontuarJung,
  pontuarValores,
  r1,
  zona,
  type RespostasGrupos,
} from "@/lib/motor";
import { conferirSoma } from "@/lib/motor/ordenacao";

/** Ordena todo grupo pela mesma preferencia (a `resposta_fixa` da referencia). */
function respostaFixa(grupos: readonly { grupo: number; itens: readonly any[] }[], pref: string[]): RespostasGrupos {
  const chave = pref.length === 4 ? "fator" : "valor";
  return Object.fromEntries(
    grupos.map((g) => [g.grupo, Object.fromEntries(g.itens.map((it) => [it.id, pref.indexOf(it[chave]) + 1]))]),
  );
}

/** PRNG com semente (mulberry32): o T2 precisa ser repetivel, nao igual ao do Python. */
function sorteador(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(xs: T[], rnd: () => number): T[] {
  const r = [...xs];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const NAT = { D: 100, I: 66.7, S: 33.3, C: 0 };

describe("testes de ouro", () => {
  it("T1 · D sempre em 1o, I 2o, S 3o, C 4o", () => {
    const r = pontuarDisc(respostaFixa(GRUPOS_DISC, ["D", "I", "S", "C"]));
    assert.deepStrictEqual(r.escore, { D: 100, I: 66.7, S: 33.3, C: 0 });
    assert.equal(r.competencias.ousadia, 100);
    assert.equal(r.competencias.analise, 0);
    assert.deepStrictEqual(r.primeiros, { D: 16, I: 0, S: 0, C: 0 });
  });

  it("T2 · soma 200 (+-0,2) em 2.000 ordenacoes aleatorias", () => {
    const rnd = sorteador(7);
    for (let n = 0; n < 2000; n++) {
      const resp = Object.fromEntries(
        GRUPOS_DISC.map((g) => {
          const pos = embaralhar([1, 2, 3, 4], rnd);
          return [g.grupo, Object.fromEntries(g.itens.map((it, i) => [it.id, pos[i]]))];
        }),
      );
      const e = pontuarDisc(resp).escore;
      assert.ok(Math.abs(e.D + e.I + e.S + e.C - 200) <= 0.2 + 1e-9);
    }
  });

  it("T3 · perfil e indices de adaptacao", () => {
    assert.equal(perfil(NAT, { D: 16, I: 0, S: 0, C: 0 }).sigla, "DI");
    const ix = indices(NAT, { D: 33.3, I: 0, S: 100, C: 66.7 });
    assert.deepStrictEqual(ix.variacao, { D: -66.7, I: -66.7, S: 66.7, C: 66.7 });
    assert.equal(ix.indice_adaptacao, 66.7);
    assert.equal(ix.classe, "extremamente alta");
    assert.deepStrictEqual(ix.polarizados, []);
  });

  it("T3b · polarizados", () => {
    const ix = indices({ D: 20, I: 80, S: 50, C: 50 }, { D: 75, I: 25, S: 50, C: 50 });
    assert.deepStrictEqual(ix.polarizados, ["D", "I"]);
  });

  it("T4 · zonas nas bordas", () => {
    assert.deepStrictEqual(
      [100, 88, 87.9, 70, 69.9, 51, 50.9, 33, 32.9, 16, 15.9, 0].map(zona),
      ["EA", "EA", "MA", "MA", "A", "A", "B", "B", "MB", "MB", "EB", "EB"],
    );
  });

  it("T5 · lideranca", () => {
    const l = lideranca(NAT);
    assert.deepStrictEqual(l, { executivo: 34.6, metodico: 11.5, motivador: 30.8, sistematico: 23.1 });
    assert.ok(Math.abs(l.executivo + l.metodico + l.motivador + l.sistematico - 100) <= 0.2 + 1e-9);
  });

  it("T6 · Jung", () => {
    const j = pontuarJung({
      EI: [3, 3, 2, 2, 2, 1, 2, 3, 2],
      NS: [2, 2, 1, 2, 3, 2, 2, 1, 2],
      TF: [3, 2, 2, 3, 2, 2, 3, 2, 1],
    });
    assert.deepStrictEqual(j.percentuais, { E: 74.1, I: 25.9, N: 63, S: 37, T: 74.1, F: 25.9 });
    assert.equal(j.tipo, "ENT");
    assert.deepStrictEqual(j.hierarquia, [
      "Pensamento Extrovertido",
      "Intuição Introvertida",
      "Sensação Extrovertida",
      "Sentimento Introvertido",
    ]);
  });

  it("T7 · valores", () => {
    const v = pontuarValores(respostaFixa(GRUPOS_VALORES, ["PRI", "ECO", "SOC", "POL", "TEO", "EST"]));
    assert.deepStrictEqual(v.escore, { PRI: 100, ECO: 80, SOC: 60, POL: 40, TEO: 20, EST: 0 });
    assert.equal(Object.values(v.escore).reduce((s, x) => s + x, 0), 300);
    assert.deepStrictEqual(v.ranking, ["PRI", "ECO", "SOC", "POL", "TEO", "EST"]);
  });

  it("T8 · integridade do inventario", () => {
    assert.equal(GRUPOS_DISC.length, 16);
    assert.equal(PARES_JUNG.length, 27);
    assert.equal(GRUPOS_VALORES.length, 10);
    assert.equal(TOTAL_TELAS, 69);

    const disc = GRUPOS_DISC.flatMap((g) => g.itens.map((i) => i.texto));
    assert.equal(disc.length, 64);
    assert.equal(new Set(disc).size, 64, "palavra DISC repetida");
    for (const g of GRUPOS_DISC) {
      assert.deepStrictEqual(g.itens.map((i) => i.fator), [...FATORES], `grupo ${g.grupo} sem um item por fator`);
    }
    for (const f of FATORES) {
      for (const c of COMPETENCIAS_POR_FATOR[f]) {
        const grupos = GRUPOS_DISC.filter((g) => g.itens.some((i) => i.competencia === c && i.fator === f));
        assert.equal(grupos.length, 4, `competencia ${c} fora de 4 grupos`);
      }
    }

    const jung = PARES_JUNG.flatMap((p) => [p.poloA, p.poloB]);
    assert.equal(jung.length, 54);
    assert.equal(new Set(jung).size, 54, "palavra de Jung repetida");
    assert.deepStrictEqual(jung.filter((t) => disc.includes(t)), [], "palavra de Jung repete o DISC");

    const valores = GRUPOS_VALORES.flatMap((g) => g.itens.map((i) => i.texto));
    assert.equal(valores.length, 60);
    assert.equal(new Set(valores).size, 60, "expressao de valor repetida");
  });
});

describe("arredondamento", () => {
  it("meio para longe do zero, onde Math.round e round() bancario erram", () => {
    assert.equal(r1(66.65), 66.7);
    assert.equal(r1(-66.65), -66.7);
    assert.equal(r1(2.25), 2.3);
    assert.equal(r1(0.05), 0.1);
    assert.equal(r1(8.345), 8.3);
    assert.ok(Object.is(r1(-0.04), -0));
    assert.throws(() => r1(NaN), RangeError);
  });
});

describe("resposta corrompida e recusada", () => {
  const boa = () => respostaFixa(GRUPOS_DISC, ["D", "I", "S", "C"]);

  it("grupo faltando", () => {
    const r = boa();
    delete r[16];
    assert.throws(() => pontuarDisc(r), RespostaInvalida);
  });

  it("posicao repetida", () => {
    const r = boa();
    r[3]["G03-I"] = 1;
    assert.throws(() => pontuarDisc(r), RespostaInvalida);
  });

  it("item de outro grupo misturado", () => {
    const r = boa();
    r[3]["G04-D"] = 1;
    assert.throws(() => pontuarDisc(r), RespostaInvalida);
  });

  it("valores com posicao fora de 1..6", () => {
    const r = respostaFixa(GRUPOS_VALORES, ["PRI", "ECO", "SOC", "POL", "TEO", "EST"]);
    r[1]["V01-EST"] = 7;
    assert.throws(() => pontuarValores(r), RespostaInvalida);
  });

  it("Jung sem 9 respostas, com buraco ou fora de 0..3", () => {
    const ok = [3, 3, 2, 2, 2, 1, 2, 3, 2];
    const buraco = [...ok];
    delete buraco[4];
    for (const EI of [ok.slice(1), buraco, [...ok.slice(1), 4], [...ok.slice(1), 1.5]]) {
      assert.throws(() => pontuarJung({ EI, NS: ok, TF: ok }), RespostaInvalida);
    }
  });

  it("soma conferida em decimos: 200,2 legitimo passa, 200,3 nao", () => {
    // 6,25 + 6,25 + 93,75 + 93,75 = 200, e os quatro arredondam para cima.
    assert.doesNotThrow(() => conferirSoma([6.3, 6.3, 93.8, 93.8], 200, 0.2, "DISC"));
    assert.throws(() => conferirSoma([50, 50, 50, 50.3], 200, 0.2, "DISC"), RespostaInvalida);
    assert.throws(() => conferirSoma([100, 80, 60, 40, 20, 0.4], 300, 0.3, "Valores"), RespostaInvalida);
  });
});

