/**
 * Cobertura do conteudo fixo do relatorio MC 3.1 (src/data/relatorio-mc).
 *
 *   npm test   (nao precisa de banco)
 *
 * O que quebra calado aqui e buraco de conteudo: um fator sem descritor numa
 * zona, uma sigla de perfil sem cartao, uma competencia nova sem descricao.
 * A pagina renderiza vazio e ninguem percebe ate o PDF chegar ao avaliado.
 * Tambem trava as regras que o Valmer decidiu (D7, D8, D9) e a regra proposta
 * do espectro, para que mudar qualquer uma seja uma decisao, nao um acidente.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMPETENCIAS_POR_FATOR, FATORES, VALORES } from "@/data/inventario-mc";
import { CORES_FATOR, PALETA } from "@/data/relatorio-mc/cores";
import { MARCACOES } from "@/data/relatorio-mc/marcacoes";
import { CODIGOS_ZONA, MARCAS_DA_REGUA, ZONAS } from "@/data/relatorio-mc/zonas";
import { DESCRITORES, descritoresDe } from "@/data/relatorio-mc/descritores";
import { ARQUETIPOS, EQUILIBRADO, SIGLAS_COMPOSTAS, SIGLAS_PURAS } from "@/data/relatorio-mc/arquetipos";
import { FATORES_RELATORIO, NOME_EXIBIDO_FATOR_D, adjetivosDaCondicao } from "@/data/relatorio-mc/fatores";
import { EIXOS_RELATORIO, MANIFESTACAO_INFERIOR, POLOS_JUNG } from "@/data/relatorio-mc/jung";
import { FAIXAS_VALOR, NOME_EXIBIDO_PRI, VALORES_RELATORIO } from "@/data/relatorio-mc/spranger";
import { COMPETENCIAS, COMPETENCIAS_RADAR, ORDEM_COMPETENCIAS, nivelDaCompetencia } from "@/data/relatorio-mc/competencias";
import { GATILHOS, TENSOES } from "@/data/relatorio-mc/tensoes-gatilhos";
import { PARES_ESPECTRO, posicaoNoEspectro } from "@/data/relatorio-mc/espectro";
import { COMUNICACAO_POR_PERFIL, LIDERANCA_POR_PERFIL } from "@/data/relatorio-mc/comunicacao-lideranca";
import { LEITURAS } from "@/data/relatorio-mc/leituras";
import { ETAPAS, INDICE, PAGINAS_TEXTO_FIXO } from "@/data/relatorio-mc/textos-fixos";
import { NIVEIS, TOTAL_PAGINAS, paginasDoNivel } from "@/data/relatorio-mc/niveis";

const HEX = /^#[0-9A-F]{6}$/;
const cheio = (s: string) => typeof s === "string" && s.trim().length > 0;

describe("cores e marcacoes", () => {
  it("paleta e quatro fatores com hex exato", () => {
    for (const hex of Object.values(PALETA)) assert.match(hex, HEX);
    assert.deepEqual(Object.keys(CORES_FATOR).sort(), [...FATORES].sort());
    for (const cor of Object.values(CORES_FATOR)) for (const hex of Object.values(cor)) assert.match(hex, HEX);
    assert.equal(CORES_FATOR.D.principal, "#C62828");
    assert.equal(CORES_FATOR.C.texto, "#284F75");
  });

  it("quatro marcacoes, cada uma com cor e texto", () => {
    assert.equal(Object.keys(MARCACOES).length, 4);
    for (const m of Object.values(MARCACOES)) {
      assert.match(m.cor, HEX);
      assert.ok(cheio(m.texto) && cheio(m.selo));
    }
  });
});

describe("zonas e descritores", () => {
  it("seis zonas contiguas, batendo com as marcas da regua", () => {
    assert.equal(CODIGOS_ZONA.length, 6);
    const crescente = [...CODIGOS_ZONA].reverse().map((z) => ZONAS[z]);
    for (let i = 1; i < crescente.length; i++) {
      assert.equal(Math.round((crescente[i - 1].maximo + 0.1) * 10) / 10, crescente[i].minimo);
    }
    assert.deepEqual([...crescente.map((z) => z.minimo), 100], [...MARCAS_DA_REGUA]);
    assert.deepEqual(CODIGOS_ZONA.filter((z) => ZONAS[z].atencao), ["EA", "EB"]);
  });

  it("6 zonas x 4 fatores, quatro adjetivos em cada", () => {
    for (const zona of CODIGOS_ZONA) {
      for (const fator of FATORES) {
        const lista = DESCRITORES[zona][fator];
        assert.equal(lista.length, 4, `${zona}/${fator}`);
        assert.equal(new Set(lista).size, 4, `${zona}/${fator} repetido`);
        assert.ok(lista.every(cheio));
      }
    }
    assert.equal(descritoresDe("D", "A").adjetivos[0], "Competitivo");
    assert.equal(descritoresDe("S", "EB").atencao, true);
    assert.equal(descritoresDe("S", "MA").atencao, false);
  });
});

describe("arquetipos", () => {
  it("12 compostos transcritos + 4 puros + equilibrado em rascunho", () => {
    assert.equal(SIGLAS_COMPOSTAS.length, 12);
    for (const sigla of SIGLAS_COMPOSTAS) {
      assert.equal(ARQUETIPOS[sigla].status, "transcrito", sigla);
      assert.notEqual(sigla[0], sigla[1]);
    }
    // Toda combinacao ordenada de dois fatores diferentes tem cartao.
    const esperadas = FATORES.flatMap((a) => FATORES.filter((b) => b !== a).map((b) => a + b)).sort();
    assert.deepEqual([...SIGLAS_COMPOSTAS].sort(), esperadas);
    for (const sigla of [...SIGLAS_PURAS, EQUILIBRADO] as const) assert.equal(ARQUETIPOS[sigla].status, "rascunho", sigla);
    assert.equal(Object.keys(ARQUETIPOS).length, 17);
    for (const a of Object.values(ARQUETIPOS)) assert.ok(cheio(a.nome) && cheio(a.descricao) && cheio(a.pontoDeAtencao), a.sigla);
    assert.equal(ARQUETIPOS.DI.nome, "O Protagonista");
    assert.notEqual(ARQUETIPOS.DI.nome, ARQUETIPOS.ID.nome);
  });
});

describe("fatores", () => {
  it("ficha completa para os quatro, com o nome de D vindo da constante (D8)", () => {
    for (const f of FATORES) {
      const ficha = FATORES_RELATORIO[f];
      assert.equal(ficha.fator, f);
      assert.equal(ficha.forcas.length, 5);
      assert.equal(ficha.medos.length, 4);
      assert.equal(ficha.motiva.length, 3);
      for (const campo of [ficha.pagina.palavraChave, ficha.pagina.adjetivosQuandoAlto, ficha.pagina.adjetivosQuandoBaixo, ficha.emocaoMarston, ficha.motivador]) {
        assert.ok(cheio(campo), f);
      }
    }
    assert.equal(FATORES_RELATORIO.D.nome, NOME_EXIBIDO_FATOR_D);
    assert.deepEqual(FATORES.map((f) => FATORES_RELATORIO[f].pagina.numero), [9, 10, 11, 12]);
  });

  it("adjetivos da condicao seguem o escore (51 e alto)", () => {
    assert.equal(adjetivosDaCondicao("D", 89), FATORES_RELATORIO.D.pagina.adjetivosQuandoAlto);
    assert.equal(adjetivosDaCondicao("D", 40), FATORES_RELATORIO.D.pagina.adjetivosQuandoBaixo);
    assert.equal(adjetivosDaCondicao("S", 51), FATORES_RELATORIO.S.pagina.adjetivosQuandoAlto);
    assert.equal(adjetivosDaCondicao("S", 50.9), FATORES_RELATORIO.S.pagina.adjetivosQuandoBaixo);
  });
});

describe("jung e spranger", () => {
  it("seis polos com quatro caracteristicas e tres eixos", () => {
    assert.equal(Object.keys(POLOS_JUNG).length, 6);
    for (const p of Object.values(POLOS_JUNG)) assert.equal(p.caracteristicas.length, 4);
    assert.deepEqual(Object.values(EIXOS_RELATORIO).map((e) => e.pagina), [18, 19, 20]);
    assert.deepEqual(Object.keys(MANIFESTACAO_INFERIOR).sort(), ["F", "N", "S", "T"]);
  });

  it("seis valores, PRI com o nome da constante (D8) e faixas sem buraco", () => {
    assert.deepEqual(Object.keys(VALORES_RELATORIO), [...VALORES]);
    assert.equal(VALORES_RELATORIO.PRI.nome, NOME_EXIBIDO_PRI);
    for (const v of Object.values(VALORES_RELATORIO)) assert.ok(cheio(v.oQueRepresenta) && cheio(v.risco), v.valor);
    const [sig, cir, ind] = FAIXAS_VALOR;
    assert.equal(ind.minimo, 0);
    assert.equal(Math.round((ind.maximo + 0.1) * 10) / 10, cir.minimo);
    assert.equal(Math.round((cir.maximo + 0.1) * 10) / 10, sig.minimo);
    assert.equal(sig.maximo, 100);
  });
});

describe("competencias", () => {
  it("as 16 da v2.2, com as 4 novas em rascunho (D7)", () => {
    assert.equal(ORDEM_COMPETENCIAS.length, 16);
    assert.deepEqual(Object.keys(COMPETENCIAS).sort(), [...ORDEM_COMPETENCIAS].sort());
    for (const f of FATORES) for (const k of COMPETENCIAS_POR_FATOR[f]) assert.equal(COMPETENCIAS[k].fator, f, k);
    for (const c of Object.values(COMPETENCIAS)) assert.ok(cheio(c.nome) && cheio(c.descricao), c.competencia);
    const rascunhos = Object.values(COMPETENCIAS).filter((c) => c.status === "rascunho").map((c) => c.competencia).sort();
    assert.deepEqual(rascunhos, ["analise", "constancia", "cooperacao", "investigacao"]);
  });

  it("radar com 12, tres por fator, sem as quatro excluidas", () => {
    assert.equal(COMPETENCIAS_RADAR.length, 12);
    for (const fora of ["assertividade", "sociabilidade", "constancia", "detalhismo"] as const) {
      assert.ok(!COMPETENCIAS_RADAR.includes(fora), fora);
    }
    for (const f of FATORES) assert.equal(COMPETENCIAS_RADAR.filter((k) => COMPETENCIAS[k].fator === f).length, 3, f);
  });

  it("niveis: > 70 potencializar, 40 a 70 consolidar, < 40 desenvolver", () => {
    assert.equal(nivelDaCompetencia(70.1), "potencializar");
    assert.equal(nivelDaCompetencia(70), "consolidar");
    assert.equal(nivelDaCompetencia(40), "consolidar");
    assert.equal(nivelDaCompetencia(39.9), "desenvolver");
  });
});

describe("tensoes, gatilhos, comunicacao e leituras", () => {
  it("tensoes e gatilhos para os quatro fatores", () => {
    for (const f of FATORES) {
      assert.equal(TENSOES[f].itens.length, 6, f);
      assert.ok(cheio(TENSOES[f].comoAparece) && cheio(TENSOES[f].risco), f);
      const g = GATILHOS[f];
      assert.equal(g.nome, FATORES_RELATORIO[f].motivador, f);
      assert.ok(cheio(g.oQueSignifica) && cheio(g.comoAparece) && cheio(g.quandoFalta), f);
    }
    // O molde so traz D e I: S e C tem de estar marcados como redigidos.
    assert.deepEqual(TENSOES.D.redigidos, []);
    assert.ok(TENSOES.S.redigidos.includes("itens") && TENSOES.C.redigidos.includes("itens"));
    assert.ok(GATILHOS.S.redigidos.length === 3 && GATILHOS.C.redigidos.length === 3);
  });

  it("comunicacao e lideranca completas para os quatro perfis", () => {
    for (const f of FATORES) {
      for (const v of Object.values(COMUNICACAO_POR_PERFIL[f])) assert.ok(cheio(v), f);
      for (const v of Object.values(LIDERANCA_POR_PERFIL[f])) assert.ok(cheio(v), f);
    }
  });

  it("cinco livros por fator", () => {
    for (const f of FATORES) {
      assert.equal(LEITURAS[f].length, 5, f);
      for (const l of LEITURAS[f]) assert.ok(cheio(l.titulo) && cheio(l.autor) && cheio(l.motivo));
    }
  });
});

describe("espectro (regra proposta, a confirmar)", () => {
  const valmer = { D: 89, I: 69, S: 30, C: 24 };

  it("o lado predominante bate com o negrito do molde nos sete pares", () => {
    const lados = PARES_ESPECTRO.map((p) => posicaoNoEspectro(p, valmer).predominante);
    assert.deepEqual(lados, ["esquerda", "esquerda", "esquerda", "esquerda", "direita", "esquerda", "esquerda"]);
  });

  it("pares de C caem no proprio escore; 50 e neutro", () => {
    const prudente = PARES_ESPECTRO.find((p) => p.direita === "Prudente")!;
    assert.equal(posicaoNoEspectro(prudente, valmer).posicao, 24);
    assert.equal(posicaoNoEspectro(prudente, { ...valmer, C: 50 }).predominante, "neutro");
  });
});

describe("paginas e niveis", () => {
  it("indice de 03 a 42 e etapas contiguas", () => {
    for (let p = 3; p <= TOTAL_PAGINAS; p++) assert.ok(cheio(INDICE[p]), `pagina ${p}`);
    assert.equal(ETAPAS[0].primeira, 3);
    for (let i = 1; i < ETAPAS.length; i++) assert.equal(ETAPAS[i].primeira, ETAPAS[i - 1].ultima + 1);
    assert.equal(ETAPAS.at(-1)!.ultima, TOTAL_PAGINAS);
  });

  it("textos fixos das onze paginas pedidas", () => {
    assert.deepEqual(Object.keys(PAGINAS_TEXTO_FIXO).map(Number), [2, 3, 4, 5, 17, 23, 30, 35, 38, 41, 42]);
  });

  it("S1..S4 cortam em 16, 28, 36 e 42 (D9)", () => {
    assert.deepEqual(Object.values(NIVEIS).map((n) => n.ultimaPagina), [16, 28, 36, 42]);
    assert.deepEqual(paginasDoNivel("S1"), Array.from({ length: 16 }, (_, i) => i + 1));
  });
});

describe("originalidade", () => {
  it("nenhum texto cita instrumento concorrente", () => {
    const modulos = [
      ARQUETIPOS, FATORES_RELATORIO, POLOS_JUNG, EIXOS_RELATORIO, MANIFESTACAO_INFERIOR, VALORES_RELATORIO,
      COMPETENCIAS, TENSOES, GATILHOS, COMUNICACAO_POR_PERFIL, LIDERANCA_POR_PERFIL, PAGINAS_TEXTO_FIXO,
    ];
    const texto = JSON.stringify(modulos);
    assert.doesNotMatch(texto, /\b(CIS|Febracis|S[oó]lides|TTI)\b/i);
  });
});
