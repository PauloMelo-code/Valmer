/**
 * Teste de integracao do fluxo do respondente, contra o banco local.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Cobre o caminho critico de /avaliacao/<token>: token como credencial, upsert
 * por questao, ressurreicao de resposta soft-deletada, contadores calculados no
 * servidor e a precedencia de concluido sobre expirado.
 *
 * As fixtures entram por INSERT direto, e nao por acoes.criar(): criar consome
 * credito e exige SESSAO_DEV_USUARIO_ID, e o fluxo do respondente nao tem
 * sessao nenhuma. Menos acoplamento, teste mais honesto.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsRespostas, assessmentsRelatorios, auditoria } =
  await import("@/lib/db/schema");
const acoes = await import("@/lib/actions/avaliacao");
const { questoes } = await import("@/data/assessment");
const { and, eq } = await import("drizzle-orm");

type FatorDisc = (typeof questoes)[number]["opcoes"][number]["fator"];

/** Marca as linhas desta rodada, para a limpeza no fim nao levar nada alheio. */
const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

/**
 * Distribuicao conhecida: D=10, I=8, S=6, C=4, somando as 28 questoes.
 *
 * Os quatro numeros sao diferentes de proposito — com 7/7/7/7 uma troca entre
 * contador_i e contador_s passaria despercebida.
 */
function fatorPlanejado(indice: number): FatorDisc {
  if (indice < 10) return "D";
  if (indice < 18) return "I";
  if (indice < 24) return "S";
  return "C";
}

const DIA = 24 * 60 * 60 * 1000;

let facilitador = "";
let tokenAberto = "";
let tokenExpirado = "";
let tokenConcluidoVencido = "";
let tokenBorda = "";
let idAberto = "";
let idBorda = "";
let tokenMc = "";
let idMc = "";

async function inserirAssessment(
  token: string,
  situacao: "pendente" | "em_andamento" | "concluido" | "expirado",
  expiraEm: Date,
  versao = "LEGADO",
): Promise<string> {
  const [linha] = await db
    .insert(assessments)
    .values({
      token,
      facilitador_id: facilitador,
      avaliado_nome: "Respondente Teste",
      avaliado_email: `${token}@exemplo.com`,
      tipo_relatorio: "S1",
      situacao,
      expira_em: expiraEm,
      versao_instrumento: versao,
      modified_by: SISTEMA,
    })
    .returning();

  return linha!.id;
}

before(async () => {
  const [dono] = await db
    .insert(usuarios)
    .values({
      nome: "Facilitador do Respondente",
      email: `resp.${marca}@exemplo.com`,
      papel: "facilitador",
      creditos: 0,
      modified_by: SISTEMA,
    })
    .returning();

  facilitador = dono!.id;

  tokenAberto = `ab${marca}`;
  tokenExpirado = `ex${marca}`;
  tokenConcluidoVencido = `cv${marca}`;
  tokenBorda = `bo${marca}`;

  idAberto = await inserirAssessment(tokenAberto, "pendente", new Date(Date.now() + 7 * DIA));
  await inserirAssessment(tokenExpirado, "pendente", new Date(Date.now() - DIA));
  await inserirAssessment(tokenConcluidoVencido, "concluido", new Date(Date.now() - DIA));
  // Link perfeitamente respondivel, reservado a entrada adulterada: numa
  // fixture ja concluida ou vencida a recusa poderia vir do estado, e o teste
  // de validacao passaria mesmo se o schema sumisse.
  idBorda = await inserirAssessment(tokenBorda, "pendente", new Date(Date.now() + 7 * DIA));
  tokenMc = `mc${marca}`;
  idMc = await inserirAssessment(tokenMc, "pendente", new Date(Date.now() + 7 * DIA), "MC-INV 2.2");
});

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar de
  // verdade e o certo. A aplicacao nunca faz isso — ver excluir().
  //
  // Numa transacao so por causa de `saldo_bate_com_extrato`, a constraint da
  // 0005: apagar o extrato num commit deixaria, naquele instante, um usuario
  // com saldo que lancamento nenhum explica, e o banco recusaria o teardown.
  // Hoje este fixture tem saldo zero e o delete nao pega linha nenhuma, entao
  // passaria de qualquer jeito — mas passaria por sorte, e o dia em que alguem
  // der credito a este facilitador a suite quebraria dentro do `after`, com
  // erro que nao aponta para a causa. Apagando tudo junto o usuario ja nao
  // existe no COMMIT e a checagem pula quem sumiu.
  const tokens = [tokenAberto, tokenExpirado, tokenConcluidoVencido, tokenBorda, tokenMc];
  const lista = tokens.map((token) => `'${token}'`).join(",");

  await db.transaction(async (tx) => {
    await tx.execute(
      `delete from auditoria where registro_id in (select id from assessments where token in (${lista}))`,
    );
    await tx.execute(
      `delete from assessments_respostas where assessment_id in (select id from assessments where token in (${lista}))`,
    );
    await tx.execute(`delete from creditos_transacoes where usuario_id = '${facilitador}'`);
    await tx.execute(`delete from assessments where token in (${lista})`);
    await tx.execute(`delete from auditoria where user_id = '${facilitador}'`);
    await tx.execute(`delete from usuarios where id = '${facilitador}'`);
  });
});

describe("avaliacao", () => {
  it("nao encontra token inexistente", async () => {
    const inexistente = `nao-existe-${marca}`;
    assert.equal(await acoes.carregarAvaliacao(inexistente), null);

    const gravacao = await acoes.salvarResposta(inexistente, questoes[0]!.codigo, "D");
    assert.deepEqual(gravacao, { ok: false, erro: "invalido" });
  });

  it("carrega um link pendente sem respostas", async () => {
    const carregado = await acoes.carregarAvaliacao(tokenAberto);
    assert.equal(carregado?.estado, "responder");
    assert.deepEqual(carregado!.estado === "responder" ? carregado.respostas : null, {});
  });

  it("a primeira resposta grava a linha e tira de pendente", async () => {
    const gravacao = await acoes.salvarResposta(tokenAberto, "Q01", "D");
    assert.deepEqual(gravacao, { ok: true });

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(
        and(
          eq(assessmentsRespostas.assessment_id, idAberto),
          eq(assessmentsRespostas.questao_codigo, "Q01"),
        ),
      );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.fator, "D");
    assert.equal(linhas[0]!.modified_by, SISTEMA, "assinada pela sentinela do respondente");

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idAberto));
    assert.equal(linha!.situacao, "em_andamento");
  });

  it("responder a mesma questao corrige em vez de duplicar", async () => {
    await acoes.salvarResposta(tokenAberto, "Q01", "I");

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(
        and(
          eq(assessmentsRespostas.assessment_id, idAberto),
          eq(assessmentsRespostas.questao_codigo, "Q01"),
        ),
      );
    assert.equal(linhas.length, 1, "o indice unico impede a segunda linha");
    assert.equal(linhas[0]!.fator, "I");
  });

  it("retoma devolvendo exatamente o que foi gravado", async () => {
    const carregado = await acoes.carregarAvaliacao(tokenAberto);
    assert.equal(carregado?.estado, "responder");
    assert.deepEqual(carregado!.estado === "responder" ? carregado.respostas : null, { Q01: "I" });
  });

  it("ressuscita a resposta soft-deletada em vez de travar a questao", async () => {
    await db.execute(
      `update assessments_respostas set is_deleted = true, deleted_at = now() where assessment_id = '${idAberto}' and questao_codigo = 'Q01'`,
    );

    const gravacao = await acoes.salvarResposta(tokenAberto, "Q01", "D");
    assert.deepEqual(gravacao, { ok: true });

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(
        and(
          eq(assessmentsRespostas.assessment_id, idAberto),
          eq(assessmentsRespostas.questao_codigo, "Q01"),
        ),
      );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.is_deleted, false);
    assert.equal(linhas[0]!.deleted_at, null);
    assert.equal(linhas[0]!.fator, "D");
  });

  it("recusa concluir com uma questao em branco", async () => {
    // Q01 ja esta gravada; sobram Q02..Q27 para chegar a 27 das 28.
    for (let indice = 1; indice < questoes.length - 1; indice += 1) {
      await acoes.salvarResposta(tokenAberto, questoes[indice]!.codigo, fatorPlanejado(indice));
    }

    const fecho = await acoes.concluir(tokenAberto);
    assert.deepEqual(fecho, { ok: false, erro: "incompleto" });

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idAberto));
    assert.equal(linha!.situacao, "em_andamento", "nada foi gravado");
    assert.equal(linha!.contador_d, null);
    assert.equal(linha!.concluido_em, null);
  });

  it("conclui gravando os contadores contados no banco", async () => {
    const ultima = questoes.length - 1;
    await acoes.salvarResposta(tokenAberto, questoes[ultima]!.codigo, fatorPlanejado(ultima));

    const fecho = await acoes.concluir(tokenAberto);
    assert.equal(fecho.ok, true);
    assert.deepEqual(fecho.ok ? fecho.contadores : null, { D: 10, I: 8, S: 6, C: 4 });

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idAberto));
    assert.equal(linha!.situacao, "concluido");
    assert.equal(linha!.contador_d, 10);
    assert.equal(linha!.contador_i, 8);
    assert.equal(linha!.contador_s, 6);
    assert.equal(linha!.contador_c, 4);
    assert.ok(linha!.concluido_em instanceof Date);

    const trilha = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.registro_id, idAberto), eq(auditoria.acao, "atualizar")));
    assert.equal(trilha.length, 1, "conclusao gravada na auditoria");
  });

  it("o fecho nao espera a IA nem quebra sem contexto de requisicao", async () => {
    // `concluir` agenda a escrita da narrativa com `after`, que so existe
    // dentro de uma requisicao do Next. Aqui nao ha nenhuma, entao a chamada
    // lanca — e o fecho acima devolveu ok assim mesmo. E o ponto: os
    // contadores sao o produto, e perder o assessment por causa do texto seria
    // trocar o produto por um efeito colateral dele.
    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idAberto));
    assert.equal(linha!.situacao, "concluido", "o fecho sobreviveu ao agendamento");

    // E nenhuma narrativa foi gravada DENTRO da transacao: a chamada paga leva
    // minutos, e presa ali seguraria a linha travada e a conexao do pool o
    // tempo todo. Em producao ela e escrita depois da resposta ir embora.
    const versoes = await db
      .select()
      .from(assessmentsRelatorios)
      .where(eq(assessmentsRelatorios.assessment_id, idAberto));
    assert.equal(versoes.length, 0, "a geracao nao roda dentro do fecho");
  });

  it("nao materializa perfil pronto em coluna", async () => {
    // concluir() grava os quatro contadores e nada mais. Perfil primario,
    // secundario e percentuais saem de resultadoDeContadores, entao lista e
    // relatorio derivam do mesmo numero. Uma coluna calculada seria a segunda
    // fonte de verdade que CONTINUIDADE.md manda nao reintroduzir — e ela
    // entraria calada, porque nada mais no projeto olha para isso.
    const { rows } = await db.execute(
      `select column_name from information_schema.columns where table_name = 'assessments'`,
    );
    const prontas = rows
      .map((linha) => String(linha.column_name))
      .filter((nome) => nome.startsWith("perfil") || nome.startsWith("percentual"))
      .sort();

    assert.deepEqual(prontas, [], "os contadores sao a unica fonte de verdade");
  });

  it("recusa concluir de novo", async () => {
    const fecho = await acoes.concluir(tokenAberto);
    assert.deepEqual(fecho, { ok: false, erro: "concluido" });
  });

  it("recusa gravar resposta depois de concluido", async () => {
    // O token continua valido depois do envio, entao uma aba velha ainda
    // consegue disparar a gravacao. Aceitar aqui mudaria uma resposta ja
    // contada e os contadores gravados deixariam de bater com as linhas.
    const gravacao = await acoes.salvarResposta(tokenAberto, "Q01", "S");
    assert.deepEqual(gravacao, { ok: false, erro: "concluido" });

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(
        and(
          eq(assessmentsRespostas.assessment_id, idAberto),
          eq(assessmentsRespostas.questao_codigo, "Q01"),
        ),
      );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0]!.fator, "D", "a resposta ja contada continua intacta");

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idAberto));
    assert.equal(linha!.contador_d, 10, "contador nao foi recalculado");
  });

  it("recusa gravar e concluir em link vencido", async () => {
    const carregado = await acoes.carregarAvaliacao(tokenExpirado);
    assert.equal(carregado?.estado, "expirado");

    const gravacao = await acoes.salvarResposta(tokenExpirado, "Q01", "D");
    assert.deepEqual(gravacao, { ok: false, erro: "expirado" });

    const fecho = await acoes.concluir(tokenExpirado);
    assert.deepEqual(fecho, { ok: false, erro: "expirado" });
  });

  it("recusa questao e fator fora da especificacao", async () => {
    // /avaliacao/<token> e a unica entrada publica e sem login do sistema, e a
    // Server Action recebe o que vier da rede — o tipo de `fator` some na
    // fronteira. Entrada adulterada lanca de proposito: a recusa em objeto e
    // para estado invalido esperado (expirado, concluido), nao para isso.
    const forjar = (codigo: string, fator: string) =>
      acoes.salvarResposta(tokenBorda, codigo, fator as FatorDisc);

    await assert.rejects(() => forjar("Q29", "D"), "questao fora de Q01..Q28");
    await assert.rejects(() => forjar("Q00", "D"), "questao fora de Q01..Q28");
    await assert.rejects(() => forjar("Q1", "D"), "codigo com formato errado");
    await assert.rejects(() => forjar("", "D"), "codigo vazio");
    await assert.rejects(() => forjar("Q01", "X"), "fator fora de D/I/S/C");
    await assert.rejects(() => forjar("Q01", "d"), "fator em minuscula");
    await assert.rejects(() => forjar("Q01", ""), "fator vazio");

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(eq(assessmentsRespostas.assessment_id, idBorda));
    assert.equal(linhas.length, 0, "recusa antes de tocar o banco");

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idBorda));
    assert.equal(linha!.situacao, "pendente", "nem a situacao mudou");

    // O link continua respondivel: a recusa foi da entrada, e nao do estado.
    assert.deepEqual(await acoes.salvarResposta(tokenBorda, "Q01", "D"), { ok: true });
  });

  it("recusa mapa MC-INV 2.2: o questionario antigo nao responde nem fecha", async () => {
    // Sem a guarda, 28 respostas + concluir fechavam o mapa novo sem
    // consentimento, sem as 69 telas e sem resultado (ADR-0007, D3).
    assert.deepEqual(await acoes.salvarResposta(tokenMc, "Q01", "D"), { ok: false, erro: "invalido" });
    assert.deepEqual(await acoes.concluir(tokenMc), { ok: false, erro: "invalido" });

    const linhas = await db
      .select()
      .from(assessmentsRespostas)
      .where(eq(assessmentsRespostas.assessment_id, idMc));
    assert.equal(linhas.length, 0);

    const [linha] = await db.select().from(assessments).where(eq(assessments.id, idMc));
    assert.equal(linha!.situacao, "pendente");
  });

  it("concluido tem precedencia sobre a data vencida", async () => {
    // Dizer "seu link expirou" a quem ja respondeu seria errado e assustador.
    const carregado = await acoes.carregarAvaliacao(tokenConcluidoVencido);
    assert.equal(carregado?.estado, "concluido");
  });
});
