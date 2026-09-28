/**
 * View-model do relatorio MC 3.1 (src/lib/relatorio-mc/dados.ts) com o caso de
 * demonstracao: numeros, rotulos, ordem e recorte por nivel.
 *
 *   npm test   (nao precisa de banco)
 *
 * As 42 paginas leem daqui sem fazer conta. Um rotulo errado aqui sai errado
 * em ate oito paginas ao mesmo tempo, e ninguem percebe ate o PDF chegar.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import caso from "./fixtures/caso-demonstracao.json" with { type: "json" };
import narrativaExemplo from "./fixtures/narrativa-demonstracao.json" with { type: "json" };
import { calcularResultado, type RespostasInventario } from "@/lib/motor";
import { montarDadosRelatorio, etapaDaPagina, classeVariacao, type DadosRelatorioMC } from "@/lib/relatorio-mc/dados";
import { comSinal, juntar, mesAnoPorExtenso, numero } from "@/lib/relatorio-mc/formato";
import { PARAGRAFOS, esquemaNarrativaMC, type NarrativaMC } from "@/lib/relatorio-mc/narrativa-esquema";
import type { CodigoNivel } from "@/data/relatorio-mc/niveis";

const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, []);
const narrativa = esquemaNarrativaMC.parse(narrativaExemplo);

function montar(nivel: CodigoNivel = "S4", n: NarrativaMC | null = narrativa): DadosRelatorioMC {
  return montarDadosRelatorio({
    assessment: { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
    resultado,
    narrativa: n,
    facilitador: { nome: "Nome do Instrutor" },
    nivel,
  });
}

const d = montar();

describe("formato", () => {
  it("numero com virgula, inteiro sem casa, sinal U+2212", () => {
    assert.equal(numero(88), "88");
    assert.equal(numero(87.5), "87,5");
    assert.equal(numero(-48), "−48");
    assert.equal(numero(-0), "0");
    assert.equal(comSinal(47.9), "+47,9");
    assert.equal(comSinal(-72.9), "−72,9");
    assert.equal(comSinal(0), "0");
    assert.equal(juntar(["DOMINANTE", "ESTÁVEL", "CONFORME"]), "DOMINANTE, ESTÁVEL e CONFORME");
    // Meia-noite UTC do dia 1 ainda e o mes anterior em Brasilia.
    assert.equal(mesAnoPorExtenso(new Date("2026-10-01T02:00:00Z")), "Setembro de 2026");
  });
});

describe("caso de demonstracao", () => {
  it("o motor reproduz o resultado esperado da fixture", () => {
    assert.deepEqual(resultado.disc.natural.escore, caso.esperado.natural.escore);
    assert.deepEqual(resultado.disc.adaptado.escore, caso.esperado.adaptado.escore);
    assert.deepEqual(resultado.valores.ranking, caso.esperado.valores.ranking);
  });

  it("identificacao", () => {
    assert.equal(d.identificacao.nomeMaiusculo, "ADRIANA PRADO");
    assert.equal(d.identificacao.cabecalho, "Mapa Comportamental · ADRIANA PRADO");
    assert.equal(d.identificacao.emissao, "Setembro de 2026");
    assert.equal(d.identificacao.emissaoMaiuscula, "SETEMBRO DE 2026");
    assert.equal(d.identificacao.instrumento, "MC-INV 2.2 · MC-2026-0928-AP");
    assert.equal(d.identificacao.instrutorMaiusculo, "NOME DO INSTRUTOR");
    assert.equal(d.identificacao.relatorio, "MC 3.1 · REL 1.0");
  });

  it("fatores: escore, zona de 6 faixas, variacao e polarizacao", () => {
    const { D, I, S, C } = d.fatores;
    assert.deepEqual([D.natural.escore.texto, I.natural.escore.texto, S.natural.escore.texto, C.natural.escore.texto], ["87,5", "68,8", "22,9", "20,8"]);
    assert.deepEqual([D.natural.zona.nome, I.natural.zona.nome, S.natural.zona.nome], ["Muito alto", "Alto", "Muito baixo"]);
    assert.equal(C.adaptado.zona.codigo, "EA");
    assert.equal(C.adaptado.zona.atencao, true);
    assert.equal(D.adaptado.zona.nome, "Extremo baixo");
    assert.equal(D.variacao.texto, "−72,9");
    assert.equal(D.direcao, "desce");
    assert.equal(D.textoDirecao, "desce no adaptado");
    assert.equal(C.variacao.texto, "+73");
    assert.equal(I.variacao.texto, "−48");
    assert.equal(I.classeVariacao, "extremamente alta");
    assert.deepEqual([D.polarizado, I.polarizado, S.polarizado, C.polarizado], [true, false, true, true]);
    assert.equal(D.nome, "Dominância");
    assert.equal(D.rotulo, "DOMINANTE");
    assert.equal(D.natural.descritores.length, 4);
    assert.equal(classeVariacao(10), "baixa");
    assert.equal(classeVariacao(-25), "alta");
  });

  it("ordem, perfis, arquetipo e cruzamentos", () => {
    assert.deepEqual(d.ordemNatural, ["D", "I", "S", "C"]);
    assert.deepEqual(d.ordemAdaptado, ["C", "S", "I", "D"]);
    assert.deepEqual([d.fatores.D.posicao, d.fatores.C.posicao], [1, 4]);
    assert.equal(d.perfis.natural.rotulo, "DOMINANTE + INFLUENTE");
    assert.equal(d.perfis.natural.tipo, "duplo");
    assert.equal(d.perfis.adaptado.rotulo, "CONFORME + ESTÁVEL");
    assert.equal(d.arquetipo.nome, "O Protagonista");
    assert.deepEqual(
      d.cruzamentos.map((c) => `${c.chave}:${c.alto}${c.baixo}`),
      ["alto1_baixo2:DS", "alto1_baixo1:DC", "alto2_baixo2:IS", "alto2_baixo1:IC"],
    );
  });

  it("indices e gatilhos", () => {
    assert.equal(d.indices.adaptacao.texto, "60,5");
    assert.equal(d.indices.classe, "extremamente alta");
    assert.equal(d.indices.amplitude.texto, "66,7");
    assert.equal(d.indices.polarizadosTexto, "DOMINANTE, ESTÁVEL e CONFORME");
    assert.deepEqual(d.indices.sobem, ["S", "C"]);
    assert.deepEqual(d.tensoes.map((t) => t.fator), ["D", "I"]);
    assert.equal(d.gatilhos[0].deriva, "Deriva do seu fator mais alto no perfil natural, DOMINANTE em 87,5 pontos.");
    assert.equal(d.espectro.length, 7);
  });

  it("jung: polos, hierarquia com atitude e funcao inferior", () => {
    assert.equal(d.jung.tipo, "ENT");
    assert.deepEqual(d.jung.eixos.map((e) => e.predominante.polo), ["E", "N", "T"]);
    assert.equal(d.jung.eixos[0].predominante.percentual.texto, "70,4");
    assert.equal(d.jung.eixos[0].complementar.nome, "Introversão");
    assert.equal(d.jung.eixos[2].diferenca.texto, "18,6");
    assert.deepEqual(d.jung.hierarquia.map((f) => `${f.rotulo} ${f.funcao}${f.atitude} ${f.percentual.texto}`), [
      "Dominante NE 63", "Auxiliar TI 59,3", "Terciária FE 40,7", "Inferior SI 37",
    ]);
    assert.equal(d.jung.dominanteDePercepcao, true);
    assert.equal(d.jung.inferior.nomeFuncao, "Sensação");
    assert.equal(d.jung.inferior.statusManifestacao, "transcrito");
    assert.match(d.jung.grauDeCerteza, /Intuição Extrovertida/);
  });

  it("valores: ranking, nivel, grupos e nome de PRI pela constante", () => {
    assert.deepEqual(d.valores.ranking.map((v) => `${v.valor} ${v.escore.texto}`), ["POL 88", "ECO 76", "SOC 54", "PRI 44", "TEO 30", "EST 8"]);
    assert.deepEqual(d.valores.grupos.significativo.map((v) => v.valor), ["POL", "ECO"]);
    assert.deepEqual(d.valores.grupos.circunstancial.map((v) => v.valor), ["SOC", "PRI"]);
    assert.deepEqual(d.valores.grupos.indiferente.map((v) => v.valor), ["TEO", "EST"]);
    assert.equal(d.valores.porValor.PRI.nome, "Princípios");
    assert.equal(d.valores.predominantes[0].nomeMaiusculo, "POLÍTICO");
    assert.equal(d.valores.diferencaPredominantes.texto, "12");
  });

  it("lideranca ordenada (D6) e competencias (D7)", () => {
    assert.deepEqual(d.lideranca.map((e) => `${e.rotuloPosicao} ${e.nome} ${e.percentual.texto}`), [
      "Predominante Executivo 33,6", "Secundário Motivador 27,9", "De apoio Sistemático 26,3", "Residual Metódico 12,2",
    ]);
    assert.equal(d.competencias.todas.length, 16);
    assert.equal(d.competencias.radar.length, 12);
    assert.deepEqual(d.competencias.porFator.S.map((c) => c.nome), ["Empatia", "Paciência", "Constância", "Cooperação"]);
    assert.deepEqual(d.competencias.destaques.potencializar.map((c) => c.competencia), ["ousadia", "comando", "objetividade"]);
    assert.deepEqual(d.competencias.destaques.consolidar.map((c) => c.competencia), ["entusiasmo", "organizacao"]);
    assert.deepEqual(d.competencias.destaques.desenvolver.map((c) => c.competencia), ["investigacao", "paciencia", "cooperacao"]);
    assert.equal(d.competencias.todas[0].natural.texto, "91,7");
  });
});

describe("nivel (D9) e referencias cruzadas (C35)", () => {
  it("S4 tem as 42 e o indice das 5 etapas", () => {
    assert.equal(d.nivel.paginas.length, 42);
    assert.deepEqual(d.indice.map((e) => e.numero), ["01", "02", "03", "04", "05"]);
    assert.equal(d.indice[0].paginas[0].titulo, "Sobre o seu Mapa Comportamental");
  });

  it("S1 corta na 16: indice sem etapa vazia, pagina 33 fora", () => {
    const s1 = montar("S1");
    assert.deepEqual(s1.nivel.paginas, Array.from({ length: 16 }, (_, i) => i + 1));
    assert.equal(s1.nivel.inclui[16], true);
    assert.equal(s1.nivel.inclui[33], false);
    assert.deepEqual(s1.indice.map((e) => e.numero), ["01", "02"]);
    assert.equal(s1.indice[1].paginas.at(-1)?.numero, 16);
  });

  it("etapa e cor de cada pagina, como no molde", () => {
    assert.deepEqual(etapaDaPagina(2), { codigo: "indice", selo: "ÍNDICE", cor: "#C39A42", abaTopo: null });
    assert.equal(etapaDaPagina(9).selo, "02 · INTERPRETAR");
    assert.equal(etapaDaPagina(26).abaTopo, "102mm");
    assert.equal(etapaDaPagina(41).cor, "#344454");
  });
});

describe("blocos de IA", () => {
  it("sem narrativa, tudo pendente (null) e na quantidade de blocos da pagina", () => {
    const sem = montar("S4", null);
    assert.equal(sem.ia.disponivel, false);
    assert.deepEqual(sem.ia.sinteseCombinacaoNatural, [null, null, null, null]);
    assert.equal(sem.ia.fatores.C.length, PARAGRAFOS.fator_c_narrativa);
    assert.ok(sem.ia.fatores.C.every((p) => p === null));
    assert.equal(sem.ia.cruzamentos.alto1_baixo1, null);
    assert.equal(sem.ia.seisForcas, null);
    assert.equal(sem.ia.pdi, null);
  });

  it("a narrativa de demonstracao e marcada como exemplo e traz cada chave na quantidade de PARAGRAFOS", () => {
    assert.equal((narrativaExemplo as { _exemplo?: { status: string } })._exemplo?.status, "rascunho");
    for (const [chave, quantos] of Object.entries(PARAGRAFOS)) {
      const texto = narrativa[chave as keyof typeof PARAGRAFOS];
      assert.equal(texto.split(/\n\s*\n/).length, quantos, `${chave} deveria ter ${quantos} paragrafo(s)`);
    }
    assert.equal(d.ia.disponivel, true);
    assert.ok(d.ia.fatores.D.every((p) => typeof p === "string" && p.length > 0));
    assert.match(d.ia.cruzamentos.alto1_baixo1 ?? "", /Regra e excesso de detalhe/);
  });

  it("o view-model e JSON puro (pagina client recebe sem perder nada)", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
  });
});
