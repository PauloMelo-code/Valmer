/**
 * Ponta a ponta do relatorio MC 3.1 contra o banco local: mapa MC-INV 2.2
 * criado, as 69 telas do caso de demonstracao gravadas pelo salvarTela (na
 * ordem e no lado do roteiro da semente), finalizado, narrativa gravada pela
 * funcao de gravacao (cliente simulado devolvendo a narrativa de exemplo —
 * nenhuma chamada paga), e o relatorio S4 montado do que ficou no banco.
 *
 * Tambem confere, sem banco, que as 42 paginas do registro renderizam nos
 * quatro niveis e que o indice (02) lista so as paginas do nivel.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Renderiza as paginas do registro direto, e nao o DocumentoMC: a raiz
 * importa o CSS do molde, que o Node nao carrega. O filtro por nivel e o mesmo
 * do DocumentoMC (`dados.nivel.inclui`).
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsResultados } = await import("@/lib/db/schema");
const inv = await import("@/lib/inventario/aplicacao");
const { finalizarAplicacao } = await import("@/lib/inventario/finalizar");
const { gerarNarrativaMC } = await import("@/lib/relatorio-mc/narrativa");
const { montarRoteiro } = await import("@/lib/inventario/roteiro");
const { VERSAO_INSTRUMENTO, numeroDoGrupo } = await import("@/data/inventario-mc");
const { calcularResultado } = await import("@/lib/motor");
const { montarDadosRelatorio } = await import("@/lib/relatorio-mc/dados");
const { esquemaNarrativaMC } = await import("@/lib/relatorio-mc/narrativa-esquema");
const { PAGINAS } = await import("@/components/relatorio-mc/paginas/registro");
const { eq } = await import("drizzle-orm");

type DadosRelatorioMC = import("@/lib/relatorio-mc/dados").DadosRelatorioMC;
type ResultadoMotor = import("@/lib/motor").ResultadoMotor;
type Posicoes = Record<string, Record<string, number>>;

const caso = JSON.parse(readFileSync("tests/fixtures/caso-demonstracao.json", "utf8")) as {
  avaliado: { nome: string };
  respostas: { natural: Posicoes; adaptado: Posicoes; valores: Posicoes; jung: Record<string, number[]> };
};
const narrativaExemplo = esquemaNarrativaMC.parse(
  JSON.parse(readFileSync("tests/fixtures/narrativa-demonstracao.json", "utf8")),
);

/** O que o DocumentoMC poe dentro do `.mc31`, sem a raiz client. */
function renderizar(dados: DadosRelatorioMC): string {
  const paginas = PAGINAS.filter((p) => dados.nivel.inclui[p.numero]);
  return renderToStaticMarkup(
    createElement(Fragment, null, ...paginas.map(({ numero, Componente }) => createElement(Componente, { key: numero, dados }))),
  );
}

/** Texto visivel: tags viram espaco, para numero de um no nao colar no do vizinho. */
const textoDe = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ");

const secoes = (html: string) => html.match(/<section class="page[^"]*"/g)?.length ?? 0;

/**
 * Sobras do molde, que foi escrito para a pessoa do relatorio de referencia (D 89, I 69, S 30, C 24,
 * POLITICO 82, ECONOMICO 71): numero dela no lugar de dado do avaliado, ou
 * frase dela que devia ter virado variavel. A Adriana tem outros numeros
 * (D 87,5 · POL 88), entao nada disto pode aparecer.
 */
function sobrasDoValmer(texto: string): string[] {
  const achados: string[] = [];
  const padroes = [
    /\bValmer\b/i,
    /\bAlbuquerque\b/i,
    // Escore inteiro solto: o caso so exibe DISC com casa decimal, e 89/69/82/71
    // nao sao numero de pagina (sao 42).
    /(?<![\d,.])(89|69|82|71)(?![\d,])/,
    /\b(em|com) (89|69|30|24|82|71|64)\b(?!,)/i,
    /\b(DOMINANTE|INFLUENTE|ESTÁVEL|CONFORME) (89|69|30|24)\b(?!,)/,
    /\b(POLÍTICO|ECONÔMICO) (82|71)\b/,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m) achados.push(`${p} -> "${texto.slice(Math.max(0, m.index! - 40), m.index! + 40)}"`);
  }
  return achados;
}

function lixo(texto: string): string[] {
  return ["NaN", "undefined", "null", "[object Object]", "Infinity"].filter((t) => new RegExp(`\\b${t.replace(/[[\]]/g, "\\$&")}\\b`).test(texto));
}

// ------------------------------------------------------------ sem banco

describe("relatorio MC 3.1: as 42 paginas nos quatro niveis", () => {
  const resultado = calcularResultado(caso.respostas as never, []) as ResultadoMotor;
  const montar = (nivel: "S1" | "S2" | "S3" | "S4", narrativa: typeof narrativaExemplo | null) =>
    montarDadosRelatorio({
      assessment: { nome: caso.avaliado.nome, codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T12:00:00-03:00") },
      resultado,
      narrativa,
      facilitador: { nome: "Nome do Instrutor" },
      nivel,
    });

  it("o registro tem 42 paginas, numeradas 1..42", () => {
    assert.deepEqual(PAGINAS.map((p) => p.numero), Array.from({ length: 42 }, (_, i) => i + 1));
    for (const p of PAGINAS) assert.ok(p.titulo, `pagina ${p.numero} sem titulo`);
  });

  for (const nivel of ["S1", "S2", "S3", "S4"] as const) {
    for (const comNarrativa of [true, false]) {
      it(`${nivel} ${comNarrativa ? "com" : "sem"} narrativa: uma section.page por pagina do nivel, sem lixo`, () => {
        const dados = montar(nivel, comNarrativa ? narrativaExemplo : null);
        const html = renderizar(dados);
        assert.equal(secoes(html), dados.nivel.paginas.length);
        assert.equal(dados.nivel.paginas.at(-1), { S1: 16, S2: 28, S3: 36, S4: 42 }[nivel]);
        const texto = textoDe(html);
        assert.deepEqual(lixo(texto), []);
        assert.deepEqual(sobrasDoValmer(texto), []);
      });
    }

    it(`${nivel}: o indice (02) lista so as paginas do nivel`, () => {
      const dados = montar(nivel, narrativaExemplo);
      const p02 = PAGINAS[1]!;
      const html = renderToStaticMarkup(createElement(p02.Componente, { dados }));
      const listadas = [...html.matchAll(/href="#p(\d{2})"/g)].map((m) => Number(m[1]));
      assert.deepEqual(listadas, dados.nivel.paginas.filter((n) => n > 2));
    });
  }
});

// ------------------------------------------------------------ com banco

const marca = `p2p-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";
const token = `pp${marca}`;
let facilitador = "";
let assessmentId = "";

/** As 69 telas como o navegador mandaria (mesma receita de inventario-finalizar). */
function telasDoCaso(semente: number) {
  const roteiro = montarRoteiro(semente);
  let relogio = Date.parse("2026-09-28T12:00:00Z");
  const carimbos = () => {
    const entrou_em = new Date(relogio).toISOString();
    relogio += 15_000;
    return { entrou_em, saiu_em: new Date(relogio).toISOString() };
  };
  const ordem = (pos: Record<string, number>) => Object.keys(pos).sort((a, b) => pos[a]! - pos[b]!);
  const disc = (etapa: 1 | 2, fonte: Posicoes) =>
    roteiro[etapa].map((t) => ({ etapa, tela: t.tela, ordem_final: ordem(fonte[numeroDoGrupo(t.tela)]!), ...carimbos() }));
  return [
    ...disc(1, caso.respostas.natural),
    ...disc(2, caso.respostas.adaptado),
    ...roteiro[3].map((t) => {
      const poloA = caso.respostas.jung[t.eixo]![Number(t.id.slice(2)) - 1]!;
      return { etapa: 3, tela: t.tela, resposta_exibida: t.poloAEsquerda ? 3 - poloA : poloA, ...carimbos() };
    }),
    ...roteiro[4].map((t) => ({ etapa: 4, tela: t.tela, ordem_final: ordem(caso.respostas.valores[numeroDoGrupo(t.tela)]!), ...carimbos() })),
  ];
}

before(async () => {
  const [dono] = await db
    .insert(usuarios)
    .values({ nome: "Facilitador Ponta", email: `p2p.${marca}@exemplo.com`, papel: "facilitador", creditos: 0, modified_by: SISTEMA })
    .returning();
  facilitador = dono!.id;
  const [mapa] = await db
    .insert(assessments)
    .values({
      token,
      facilitador_id: facilitador,
      avaliado_nome: caso.avaliado.nome,
      avaliado_email: `${token}@exemplo.com`,
      tipo_relatorio: "S4",
      situacao: "pendente",
      expira_em: new Date(Date.now() + 7 * 86_400_000),
      versao_instrumento: VERSAO_INSTRUMENTO,
      codigo: `MC-2026-0928-AP-${marca.slice(4)}`,
      modified_by: SISTEMA,
    })
    .returning();
  assessmentId = mapa!.id;
});

after(async () => {
  // Limpeza de fixture com SQL cru, como em inventario-finalizar.test.mts.
  await db.transaction(async (tx) => {
    const doTeste = `(select id from assessments where token = '${token}')`;
    await tx.execute(`delete from auditoria where registro_id in ${doTeste}`);
    await tx.execute(`delete from assessments_resultados where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments_telas where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments where token = '${token}'`);
    await tx.execute(`delete from usuarios where id = '${facilitador}'`);
  });
});

describe("relatorio MC 3.1: do questionario ao HTML", () => {
  it("responde as 69 telas e finaliza", async () => {
    assert.equal((await inv.registrarConsentimento(token)).ok, true);
    const estado = await inv.estadoDaAplicacao(token);
    assert.ok(estado.ok);
    const telas = telasDoCaso(estado.semente);
    assert.equal(telas.length, 69);
    for (const tela of telas) assert.deepEqual(await inv.salvarTela(token, tela), { ok: true }, tela.tela);
    assert.deepEqual(await finalizarAplicacao(token), { ok: true, assessmentId });
  });

  it("grava a narrativa pela funcao de gravacao, sem chamar a API", async () => {
    const cliente = {
      beta: { messages: { stream: () => ({ finalMessage: async () => ({ stop_reason: "end_turn", parsed_output: narrativaExemplo }) }) } },
    };
    const gravada = await gerarNarrativaMC(assessmentId, { cliente });
    assert.ok(gravada.ok);
    assert.equal(gravada.reaproveitada, false);
  });

  it("monta o S4 do que esta no banco: 42 paginas, sem lixo e sem sobra do Valmer", async () => {
    const [mapa] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
    const [linha] = await db.select().from(assessmentsResultados).where(eq(assessmentsResultados.assessment_id, assessmentId));
    assert.equal(mapa!.situacao, "concluido");
    const narrativa = esquemaNarrativaMC.safeParse(linha!.narrativa);
    assert.ok(narrativa.success, "narrativa gravada fora do esquema");

    const dados = montarDadosRelatorio({
      assessment: { nome: mapa!.avaliado_nome, codigo: mapa!.codigo, emitidoEm: mapa!.concluido_em! },
      resultado: linha!.resultado as ResultadoMotor,
      narrativa: narrativa.data,
      facilitador: { nome: "Facilitador Ponta" },
      nivel: mapa!.tipo_relatorio as "S4",
    });
    assert.equal(dados.ia.disponivel, true);

    // Numeros do caso, conferidos no que a pagina recebe (a pagina nao faz conta).
    assert.deepEqual(
      (["D", "I", "S", "C"] as const).map((f) => dados.fatores[f].natural.escore.texto),
      ["87,5", "68,8", "22,9", "20,8"],
    );

    const html = renderizar(dados);
    assert.equal(secoes(html), 42);
    const texto = textoDe(html);
    assert.deepEqual(lixo(texto), []);
    assert.deepEqual(sobrasDoValmer(texto), []);
    assert.match(texto, /87,5/);
    assert.match(texto, /Adriana Prado/i);
    assert.match(texto, /Facilitador Ponta|FACILITADOR PONTA/);
  });
});
