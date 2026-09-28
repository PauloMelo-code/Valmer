/**
 * Indicadores de validade V1-V6 e a confiabilidade (secao 6 do AGENTE), mais o
 * caminho telas gravadas -> resultado que a rota de finalizar vai usar.
 *
 * Cada alerta e testado dos dois lados do limite: um indicador que nunca
 * dispara passaria num teste que so confere o caso "limpo".
 *
 *   node --import tsx --test tests/motor-validade.test.mts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, telaDoGrupo } from "@/data/inventario-mc";
import {
  RespostaInvalida,
  VERSAO_MOTOR,
  calcularResultado,
  confiabilidade,
  pontuarDisc,
  respostasDasTelas,
  validade,
  type TelaGravada,
} from "@/lib/motor";

const T0 = Date.parse("2026-09-24T12:00:00.000Z");
const S = 1000;
const MIN = 60 * S;

/** `dur`: quanto a tela durou. `pausa`: tempo parado antes de entrar nela. */
type Ajuste = Partial<TelaGravada> & { dur?: number; pausa?: number };

/**
 * Aplicacao limpa de 69 telas, 15 s cada, sem pausa (17 min e 15 s):
 * natural em ordem D-I-S-C, adaptado invertido, valores na ordem de cadastro,
 * Jung alternando os quatro botoes. `ajustar(i, tela)` muda o que o caso pede.
 */
function aplicacao(ajustar: (i: number, t: TelaGravada) => Ajuste = () => ({})): TelaGravada[] {
  const base: Omit<TelaGravada, "entrou_em" | "saiu_em">[] = [
    ...GRUPOS_DISC.map((g) => ({ etapa: 1, tela: telaDoGrupo("G", g.grupo), ordem_final: g.itens.map((i) => i.id), moveu_item: true })),
    ...GRUPOS_DISC.map((g) => ({ etapa: 2, tela: telaDoGrupo("G", g.grupo), ordem_final: g.itens.map((i) => i.id).reverse(), moveu_item: true })),
    ...PARES_JUNG.map((p, i) => ({ etapa: 3, tela: p.id, resposta_exibida: i % 4, resposta_polo_a: 3 - (i % 4), moveu_item: true })),
    ...GRUPOS_VALORES.map((g) => ({ etapa: 4, tela: telaDoGrupo("V", g.grupo), ordem_final: g.itens.map((i) => i.id), moveu_item: true })),
  ];
  let agora = T0;
  return base.map((b, i) => {
    const { dur = 15 * S, pausa = 0, ...resto } = ajustar(i, b as TelaGravada);
    const entrou = agora + pausa;
    const tela = { ...b, ...resto, entrou_em: new Date(entrou).toISOString(), saiu_em: new Date(entrou + dur).toISOString() };
    agora = entrou + dur;
    return tela as TelaGravada;
  });
}

const codigos = (telas: TelaGravada[]) => validade(telas).alertas.map((a) => a.codigo);
const ehDisc = (t: TelaGravada) => t.etapa === 1 || t.etapa === 2;

describe("validade", () => {
  it("aplicacao limpa: nenhum alerta, confiabilidade alta, tempo em segundos", () => {
    const v = validade(aplicacao());
    assert.deepStrictEqual(v, { alertas: [], confiabilidade: "alta", tempo_total_s: 69 * 15 });
  });

  it("V1 · abaixo de 7 min dispara; 7 min nao", () => {
    // 69 telas de 6 s = 6min54s. De 7 s = 8min3s. (6 s ainda passa do V2.)
    assert.deepStrictEqual(codigos(aplicacao(() => ({ dur: 6 * S }))), ["V1"]);
    assert.deepStrictEqual(codigos(aplicacao(() => ({ dur: 7 * S }))), []);
  });

  it("V1 · acima de 60 min dispara", () => {
    assert.deepStrictEqual(codigos(aplicacao(() => ({ dur: 53 * S }))), ["V1"]); // 60min57s
    assert.deepStrictEqual(codigos(aplicacao(() => ({ dur: 52 * S }))), []); // 59min48s
  });

  it("V1 · pausa acima de 10 min e descontada; ate 10 min conta", () => {
    // Todas as telas de 6 s (6min54s) + uma volta depois do almoco: continua curto.
    const almoco = aplicacao((i) => ({ dur: 6 * S, ...(i === 40 ? { pausa: 45 * MIN } : {}) }));
    const v = validade(almoco);
    assert.equal(v.tempo_total_s, 69 * 6);
    assert.deepStrictEqual(codigos(almoco), ["V1"]);
    // Pausa curta (5 min) entra no tempo: 6min54s + 5min = 11min54s.
    const cafe = aplicacao((i) => ({ dur: 6 * S, ...(i === 40 ? { pausa: 5 * MIN } : {}) }));
    assert.equal(validade(cafe).tempo_total_s, 69 * 6 + 300);
    assert.deepStrictEqual(codigos(cafe), []);
    // Aba aberta 40 min numa tela so: e pausa tambem.
    const aba = aplicacao((i) => (i === 10 ? { dur: 40 * MIN } : {}));
    assert.equal(validade(aba).tempo_total_s, 68 * 15);
  });

  it("V2 · mais de 30% das 32 telas DISC abaixo de 2,5 s", () => {
    // 30% de 32 = 9,6: 10 telas rapidas disparam, 9 nao.
    const rapidas = (n: number) => aplicacao((i, t) => (ehDisc(t) && i < n ? { dur: 2400 } : {}));
    assert.deepStrictEqual(codigos(rapidas(10)), ["V2"]);
    assert.deepStrictEqual(codigos(rapidas(9)), []);
    assert.equal(validade(rapidas(10)).confiabilidade, "baixa");
  });

  it("V3 · mais de 25% dos 42 grupos sem mover nada (Jung nao conta)", () => {
    // 25% de 42 = 10,5: 11 disparam, 10 nao.
    const parados = (n: number) => aplicacao((i, t) => (t.etapa !== 3 && i < n ? { moveu_item: false } : {}));
    assert.deepStrictEqual(codigos(parados(11)), ["V3"]);
    assert.deepStrictEqual(codigos(parados(10)), []);
    const jungParado = aplicacao((_, t) => (t.etapa === 3 ? { moveu_item: false } : {}));
    assert.deepStrictEqual(codigos(jungParado), []);
  });

  it("V4 · natural e adaptado identicos em 14 dos 16 grupos (informativo, confiabilidade alta)", () => {
    const iguais = (n: number) =>
      aplicacao((i, t) => (t.etapa === 2 && i - 16 < n ? { ordem_final: GRUPOS_DISC[i - 16].itens.map((x) => x.id) } : {}));
    assert.deepStrictEqual(codigos(iguais(14)), ["V4"]);
    assert.equal(validade(iguais(14)).confiabilidade, "alta");
    assert.deepStrictEqual(codigos(iguais(13)), []);
  });

  it("V5 · o mesmo botao em 24 dos 27 pares; V6 · so pontas em 26", () => {
    let k = 0;
    const botao = (fn: (j: number) => number) =>
      aplicacao((_, t) => (t.etapa === 3 ? { resposta_exibida: fn(k++ % 27) } : {}));
    // 24 no botao 1 (nao e ponta): so V5.
    assert.deepStrictEqual(codigos(botao((j) => (j < 24 ? 1 : 2))), ["V5"]);
    assert.deepStrictEqual(codigos(botao((j) => (j < 23 ? 1 : 2))), []);
    // Pontas alternadas: 26 em 0/3 sem repetir 24 vezes o mesmo — so V6.
    assert.deepStrictEqual(codigos(botao((j) => (j < 26 ? (j % 2) * 3 : 1))), ["V6"]);
    assert.deepStrictEqual(codigos(botao((j) => (j < 25 ? (j % 2) * 3 : 1))), []);
    // Tudo no botao 0: pressa de clique, dispara os dois.
    assert.deepStrictEqual(codigos(botao(() => 0)), ["V5", "V6"]);
  });

  it("carimbo de tempo invalido e erro, nao alerta", () => {
    const telas = aplicacao();
    telas[3] = { ...telas[3], saiu_em: "ontem" };
    assert.throws(() => validade(telas), RangeError);
  });
});

describe("confiabilidade", () => {
  const a = (peso: "alto" | "medio" | "baixo" | "informativo") => ({ codigo: "V1" as const, peso });
  it("nenhum ou so baixo/informativo = alta; um medio = media; alto ou dois medios = baixa", () => {
    assert.equal(confiabilidade([]), "alta");
    assert.equal(confiabilidade([a("baixo"), a("informativo")]), "alta");
    assert.equal(confiabilidade([a("medio"), a("baixo")]), "media");
    assert.equal(confiabilidade([a("alto")]), "baixa");
    assert.equal(confiabilidade([a("medio"), a("medio")]), "baixa");
  });
});

describe("telas gravadas -> resultado", () => {
  it("remonta as posicoes e monta o contrato da secao 7", () => {
    const telas = aplicacao();
    const r = calcularResultado(respostasDasTelas(telas), telas);
    assert.equal(r.versao_instrumento, "MC-INV 2.2");
    assert.equal(r.versao_motor, VERSAO_MOTOR);
    // Natural: ordem de cadastro D-I-S-C em todo grupo = T1.
    assert.deepStrictEqual(r.disc.natural.escore, { D: 100, I: 66.7, S: 33.3, C: 0 });
    assert.deepStrictEqual(r.disc.natural.zona, { D: "EA", I: "A", S: "B", C: "EB" });
    assert.equal(r.disc.natural.perfil, "DI");
    assert.deepStrictEqual(r.disc.adaptado.escore, { D: 0, I: 33.3, S: 66.7, C: 100 });
    assert.equal(r.disc.adaptado.perfil, "CS");
    assert.deepStrictEqual(r.disc.indices.polarizados, ["D", "C"]);
    // Jung: polo A = 3,2,1,0 repetido; cada eixo recebe 9 respostas.
    assert.equal(r.jung.tipo.length, 3);
    assert.deepStrictEqual(r.valores.ranking, ["TEO", "ECO", "EST", "SOC", "POL", "PRI"]);
    assert.equal(Object.keys(r.valores).includes("bruto"), false);
    assert.deepStrictEqual(r.validade, { alertas: [], confiabilidade: "alta", tempo_total_s: 69 * 15 });
    // A etapa 1 remontada e a mesma resposta que o motor recebe direto.
    assert.deepStrictEqual(pontuarDisc(respostasDasTelas(telas).natural).escore, r.disc.natural.escore);
  });

  it("tela faltando e recusada pelo motor", () => {
    const semUmPar = aplicacao().filter((t) => t.tela !== "NS05");
    assert.throws(() => calcularResultado(respostasDasTelas(semUmPar), semUmPar), RespostaInvalida);
    const semUmGrupo = aplicacao().filter((t) => !(t.etapa === 2 && t.tela === "G09"));
    assert.throws(() => calcularResultado(respostasDasTelas(semUmGrupo), semUmGrupo), RespostaInvalida);
  });

  it("par de Jung com id estranho e recusado", () => {
    const telas = aplicacao();
    const i = telas.findIndex((t) => t.etapa === 3);
    telas[i] = { ...telas[i], tela: "EI10" };
    assert.throws(() => respostasDasTelas(telas), RespostaInvalida);
  });
});
