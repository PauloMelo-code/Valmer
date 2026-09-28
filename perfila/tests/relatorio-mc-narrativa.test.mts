/**
 * Narrativa da IA do relatorio MC 3.1, com a API SIMULADA e o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Nenhuma chamada real: o cliente injetado devolve o que o teste manda. Cobre o
 * pedido (numeros, virgula, ordem e cruzamentos), a conferencia de paragrafos
 * com UMA nova tentativa, o arrendamento contra geracao dupla, a falha limpa
 * sem chave e a guarda da action.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsResultados } = await import("@/lib/db/schema");
const { calcularResultado } = await import("@/lib/motor");
const { VERSAO_INSTRUMENTO } = await import("@/data/inventario-mc");
const { LEITURAS } = await import("@/data/relatorio-mc/leituras");
const { esquemaNarrativaMC, PARAGRAFOS } = await import("@/lib/relatorio-mc/narrativa-esquema");
const { SISTEMA, montarPedido } = await import("@/lib/relatorio-mc/narrativa-prompt");
const { gerarNarrativaMC, conferirNarrativa, FalhaNaNarrativaMC, MODELO_NARRATIVA_MC } = await import(
  "@/lib/relatorio-mc/narrativa"
);
const { gerarRelatorioMC } = await import("@/lib/actions/relatorio-mc");
const { eq } = await import("drizzle-orm");

type Narrativa = import("@/lib/relatorio-mc/narrativa-esquema").NarrativaMC;
type Cliente = import("@/lib/relatorio-mc/narrativa").ClienteIA;
type Params = import("@/lib/relatorio-mc/narrativa").ParametrosIA;

const caso = JSON.parse(readFileSync("tests/fixtures/caso-demonstracao.json", "utf8"));
const resultado = calcularResultado(caso.respostas, []);

const marca = `nmc-${Date.now()}`;
const SISTEMA_ID = "00000000-0000-0000-0000-000000000000";
const tokens: string[] = [];
let facilitador = "";
let outro = "";

// --- narrativa simulada, no tamanho e na quantidade de paragrafos pedidos ---
const nParagrafos = (k: string) => {
  const n = (PARAGRAFOS as Record<string, unknown>)[k];
  return typeof n === "number" ? n : 1;
};
const texto = (chave: string, palavras: number) => {
  const n = nParagrafos(chave);
  return Array.from({ length: n }, () => Array(Math.ceil(palavras / n)).fill("palavra").join(" ")).join("\n\n");
};
function narrativaValida(): Narrativa {
  const forca = { fator: "DOMINANTE 87,5", nome: "Decide quando o grupo trava", descricao: "Uma frase." };
  const ponto = (num: number) => ({ num, titulo: "Ponto", como_aparece: "a", impacto_possivel: "b", pratica_recomendada: "c" });
  return esquemaNarrativaMC.parse({
    sintese_combinacao_natural: texto("sintese_combinacao_natural", 350),
    quatro_cruzamentos: { alto1_baixo1: "a", alto1_baixo2: "b", alto2_baixo1: "c", alto2_baixo2: "d" },
    custo_adaptacao_narrativa: texto("custo_adaptacao_narrativa", 210),
    fator_d_narrativa: texto("fator_d_narrativa", 200),
    fator_i_narrativa: texto("fator_i_narrativa", 200),
    fator_s_narrativa: texto("fator_s_narrativa", 200),
    fator_c_narrativa: texto("fator_c_narrativa", 200),
    seis_forcas: Array(6).fill(forca),
    jung_e_i_narrativa: texto("jung_e_i_narrativa", 120),
    jung_n_s_narrativa: texto("jung_n_s_narrativa", 120),
    jung_t_f_narrativa: texto("jung_t_f_narrativa", 120),
    hierarquia_funcional_narrativa: texto("hierarquia_funcional_narrativa", 150),
    funcao_inferior_sinais: ["a", "b", "c"],
    dois_valores_narrativa: texto("dois_valores_narrativa", 200),
    leitura_integrada: texto("leitura_integrada", 250),
    resumo_perfil_8_blocos: {
      essencia: "a", contribuicao_maior_valor: "b", ambiente_melhor_performance: "c", estilo_comunicacao: "d",
      motivadores: "e", riscos_excesso: "f", prioridades_desenvolvimento: "g", direcao_recomendada: "h",
    },
    seis_pontos_desenvolver: [1, 2, 3, 4, 5, 6].map(ponto),
    leituras_recomendadas: Array(5).fill({ titulo: "Livro", autor: "Autor", por_que_para_voce: "Porque sim." }),
    pdi: { prioridade_principal: "a", acoes_semanais: ["a", "b", "c"], desafio_30_dias: "d", como_medir: "e" },
    mensagem_final: texto("mensagem_final", 115),
  });
}

/** Cliente simulado: devolve as respostas na ordem e guarda os pedidos. */
function simulado(respostas: (() => Promise<Narrativa | null>)[]) {
  const pedidos: Params[] = [];
  const cliente: Cliente = {
    beta: {
      messages: {
        stream(params) {
          pedidos.push(params);
          const proxima = respostas[pedidos.length - 1] ?? (() => Promise.reject(new Error("chamada a mais")));
          return {
            finalMessage: async () => ({ stop_reason: "end_turn", parsed_output: await proxima() }),
          };
        },
      },
    },
  };
  return { cliente, pedidos };
}

async function mapaComResultado(sufixo: string, versao = VERSAO_INSTRUMENTO): Promise<{ id: string; token: string }> {
  const token = `${sufixo}${marca}`;
  tokens.push(token);
  const [mapa] = await db
    .insert(assessments)
    .values({
      token,
      facilitador_id: facilitador,
      avaliado_nome: "Adriana Prado",
      avaliado_email: `${token}@exemplo.com`,
      tipo_relatorio: "S4",
      situacao: "concluido",
      concluido_em: new Date("2026-09-28T15:00:00Z"),
      expira_em: new Date(Date.now() + 86_400_000),
      versao_instrumento: versao,
      modified_by: SISTEMA_ID,
    })
    .returning();
  if (versao === VERSAO_INSTRUMENTO) {
    const n = resultado.disc.natural.escore;
    const a = resultado.disc.adaptado.escore;
    await db.insert(assessmentsResultados).values({
      assessment_id: mapa!.id,
      versao_instrumento: versao,
      versao_motor: resultado.versao_motor,
      resultado,
      nat_d: n.D, nat_i: n.I, nat_s: n.S, nat_c: n.C,
      ada_d: a.D, ada_i: a.I, ada_s: a.S, ada_c: a.C,
      perfil_natural: resultado.disc.natural.perfil,
      perfil_adaptado: resultado.disc.adaptado.perfil,
      tipo_jung: resultado.jung.tipo,
      confiabilidade: resultado.validade.confiabilidade,
      modified_by: SISTEMA_ID,
    });
  }
  return { id: mapa!.id, token };
}

async function linha(id: string) {
  const [l] = await db.select().from(assessmentsResultados).where(eq(assessmentsResultados.assessment_id, id));
  return l!;
}

before(async () => {
  const novos = await db
    .insert(usuarios)
    .values([
      { nome: "Facilitador MC", email: `a.${marca}@exemplo.com`, papel: "facilitador", creditos: 0, modified_by: SISTEMA_ID },
      { nome: "Outro Facilitador", email: `b.${marca}@exemplo.com`, papel: "facilitador", creditos: 0, modified_by: SISTEMA_ID },
    ])
    .returning();
  facilitador = novos[0]!.id;
  outro = novos[1]!.id;
});

after(async () => {
  // Limpeza de fixture com SQL cru: o unico lugar onde apagar de verdade e o certo.
  const lista = tokens.map((t) => `'${t}'`).join(",");
  await db.transaction(async (tx) => {
    const doTeste = `(select id from assessments where token in (${lista}))`;
    await tx.execute(`delete from auditoria where registro_id in ${doTeste}`);
    await tx.execute(`delete from assessments_resultados where assessment_id in ${doTeste}`);
    await tx.execute(`delete from assessments where token in (${lista})`);
    await tx.execute(`delete from auditoria where user_id in ('${facilitador}', '${outro}')`);
    await tx.execute(`delete from usuarios where id in ('${facilitador}', '${outro}')`);
  });
});

describe("narrativa MC: o pedido", () => {
  const pedido = montarPedido(resultado, { nome: "Adriana Prado", codigo: "MC-2026-0928-AP", emitidoEm: new Date("2026-09-28T15:00:00Z") });

  it("traz os numeros do resultado com virgula decimal", () => {
    for (const trecho of [
      "D (Dominante): 87,5% · Zona: Muito alto",
      "C (Conforme): 20,8% · Zona: Muito baixo",
      "C adaptado: 93,8% · Zona: Extremo alto",
      "Índice de adaptação: 60,5 (extremamente alta)",
      "Variações D/I/S/C (adaptado menos natural): -72,9 / -48 / +47,9 / +73",
      "Fatores polarizados: D, S, C",
      "Extroversão: 70,4% | Introversão: 29,6% → polo: Extroversão",
      "Hierarquia: 1ª Intuição Extrovertida",
      "Político: 88 (Significativo)",
      "Hierarquia Spranger: Político > Econômico > Social > Princípios > Teórico > Estético",
      "Ousadia: 91,7 → 25",
      "Data de emissão: 28/09/2026",
      "Código: MC-2026-0928-AP",
    ]) {
      assert.ok(pedido.includes(trecho), `falta: ${trecho}`);
    }
    assert.doesNotMatch(pedido, /\d\.\d/, "nenhum numero com ponto decimal");
  });

  it("diz a ordem natural e traduz as chaves de cruzamento por posicao", () => {
    assert.ok(pedido.includes("Ordem natural dos fatores, do mais alto ao mais baixo: D > I > S > C"));
    assert.ok(pedido.includes("Dois fatores mais altos: D (Dominante) 87,5 e I (Influente) 68,8"));
    assert.ok(pedido.includes("Dois fatores mais baixos: C (Conforme) 20,8 (o mais baixo) e S (Estável) 22,9"));
    assert.ok(pedido.includes("alto1_baixo1: D (Dominante) alto × C (Conforme) baixo"));
    assert.ok(pedido.includes("alto1_baixo2: D (Dominante) alto × S (Estável) baixo"));
    assert.ok(pedido.includes("alto2_baixo1: I (Influente) alto × C (Conforme) baixo"));
    assert.ok(pedido.includes("alto2_baixo2: I (Influente) alto × S (Estável) baixo"));
  });

  it("pede a quantidade de paragrafos de cada chave", () => {
    for (const [chave, n] of Object.entries(PARAGRAFOS as Record<string, unknown>)) {
      if (typeof n === "number") assert.ok(pedido.includes(`- ${chave}: ${n}`), chave);
    }
  });

  it("o sistema e fixo e carrega regras de estilo e o banco de leituras", () => {
    assert.ok(!SISTEMA.includes("Adriana"), "nada do avaliado no system (cache)");
    assert.ok(SISTEMA.includes("travessão"));
    assert.ok(SISTEMA.includes("fórmula antitética"));
    assert.ok(SISTEMA.includes("NUNCA nomeie o documento"));
    for (const f of ["D", "I", "S", "C"] as const) {
      for (const l of LEITURAS[f]) assert.ok(SISTEMA.includes(l.titulo), l.titulo);
    }
  });
});

describe("narrativa MC: conferencia", () => {
  it("aceita a narrativa no pedido e acusa paragrafo a menos e texto longo demais", () => {
    const boa = narrativaValida();
    assert.deepEqual(conferirNarrativa(boa), []);
    const ruim = { ...boa, sintese_combinacao_natural: "um so paragrafo", mensagem_final: texto("mensagem_final", 400) };
    const problemas = conferirNarrativa(ruim);
    assert.ok(problemas.some((p) => p.startsWith("sintese_combinacao_natural veio com 1 parágrafo")));
    assert.ok(problemas.some((p) => p.startsWith("mensagem_final veio com")));
  });
});

describe("narrativa MC: geracao e gravacao", () => {
  it("resposta valida grava, com o modelo e o pedido certos, e depois nao gera de novo", async () => {
    const mapa = await mapaComResultado("ok");
    const boa = narrativaValida();
    const { cliente, pedidos } = simulado([async () => boa]);

    const gravada = await gerarNarrativaMC(mapa.id, { cliente });
    assert.ok(gravada.ok);
    assert.equal(gravada.reaproveitada, false);
    assert.deepEqual(gravada.avisos, []);
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0]!.model, MODELO_NARRATIVA_MC);
    assert.equal(MODELO_NARRATIVA_MC, "claude-sonnet-5");
    assert.equal(pedidos[0]!.system[0]!.text, SISTEMA);
    assert.ok(pedidos[0]!.messages[0]!.content.includes("D (Dominante): 87,5%"));

    const l = await linha(mapa.id);
    assert.deepEqual(l.narrativa, boa);
    assert.equal(l.narrativa_gerando_em, null);

    const segunda = simulado([]);
    const de_novo = await gerarNarrativaMC(mapa.id, { cliente: segunda.cliente });
    assert.ok(de_novo.ok && de_novo.reaproveitada);
    assert.equal(segunda.pedidos.length, 0, "idempotente: nenhuma chamada paga");
  });

  it("paragrafos a menos geram UMA nova tentativa, que diz o que corrigir", async () => {
    const mapa = await mapaComResultado("rt");
    const boa = narrativaValida();
    const curta = { ...boa, sintese_combinacao_natural: texto("mensagem_final", 350).replace(/\n\n/g, " ") };
    const { cliente, pedidos } = simulado([async () => curta, async () => boa]);

    const gravada = await gerarNarrativaMC(mapa.id, { cliente });
    assert.ok(gravada.ok);
    assert.equal(pedidos.length, 2);
    assert.match(pedidos[1]!.messages[0]!.content, /tentativa anterior saiu fora do pedido/);
    assert.match(pedidos[1]!.messages[0]!.content, /sintese_combinacao_natural veio com 1 parágrafo/);
    assert.deepEqual((await linha(mapa.id)).narrativa, boa);
  });

  it("o arrendamento impede a geracao dupla, inclusive com forcar", async () => {
    const mapa = await mapaComResultado("ar");
    let soltar!: () => void;
    const presa = new Promise<void>((r) => (soltar = r));
    let chamou!: () => void;
    const chamada = new Promise<void>((r) => (chamou = r));
    const a = simulado([async () => (chamou(), await presa, narrativaValida())]);

    const primeira = gerarNarrativaMC(mapa.id, { cliente: a.cliente });
    await chamada; // a primeira ja tem o arrendamento e esta "na API"

    const b = simulado([async () => narrativaValida()]);
    assert.deepEqual(await gerarNarrativaMC(mapa.id, { cliente: b.cliente }), { ok: false, erro: "em_geracao" });
    assert.deepEqual(await gerarNarrativaMC(mapa.id, { cliente: b.cliente, forcar: true }), { ok: false, erro: "em_geracao" });
    assert.equal(b.pedidos.length, 0);

    soltar();
    assert.ok((await primeira).ok);
    assert.equal((await linha(mapa.id)).narrativa_gerando_em, null, "arrendamento devolvido");
  });

  it("falha da API devolve o arrendamento na hora", async () => {
    const mapa = await mapaComResultado("fa");
    const { cliente } = simulado([() => Promise.reject(new Error("rede caiu"))]);
    await assert.rejects(gerarNarrativaMC(mapa.id, { cliente }), /rede caiu/);
    const l = await linha(mapa.id);
    assert.equal(l.narrativa, null);
    assert.equal(l.narrativa_gerando_em, null);
  });

  it("sem ANTHROPIC_API_KEY falha como configuracao, sem travar o mapa", async () => {
    const mapa = await mapaComResultado("sk");
    const chave = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await assert.rejects(
        gerarNarrativaMC(mapa.id),
        (e: unknown) => e instanceof FalhaNaNarrativaMC && e.causa === "configuracao",
      );
      assert.equal((await linha(mapa.id)).narrativa_gerando_em, null);

      // A action recusa com mensagem legivel, depois de conferir dono e versao.
      process.env.SESSAO_DEV_USUARIO_ID = facilitador;
      await assert.rejects(gerarRelatorioMC(mapa.token), /ANTHROPIC_API_KEY/);
    } finally {
      if (chave !== undefined) process.env.ANTHROPIC_API_KEY = chave;
    }
  });

  it("mapa sem resultado nao gera", async () => {
    const legado = await mapaComResultado("lg", "LEGADO");
    assert.deepEqual(await gerarNarrativaMC(legado.id, { cliente: simulado([]).cliente }), { ok: false, erro: "sem_resultado" });
  });
});

describe("narrativa MC: guarda da action", () => {
  it("mapa de outro facilitador e mapa legado sao recusados", async () => {
    const meu = await mapaComResultado("dn");
    const legado = await mapaComResultado("lx", "LEGADO");
    process.env.SESSAO_DEV_USUARIO_ID = outro;
    await assert.rejects(gerarRelatorioMC(meu.token), /Mapa não encontrado/);
    process.env.SESSAO_DEV_USUARIO_ID = facilitador;
    await assert.rejects(gerarRelatorioMC(legado.token), /questionário antigo/);
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(gerarRelatorioMC(meu.token), /Nao autenticado/);
  });
});
