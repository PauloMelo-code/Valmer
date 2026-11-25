/**
 * Teste de integracao dos e-mails da plataforma, contra o banco local.
 *
 *   docker start valmer_db   (ou docker compose up -d db, na raiz)
 *   npm test
 *
 * O envio e trocado por uma caixa em memoria (`substituirEnvioParaTeste`):
 * nenhum teste fala com SMTP de verdade. O que se prova aqui e a REGRA ao redor
 * do envio — quem pode pedir, o que a falha nao desfaz, o que nao envia duas
 * vezes — e nao o nodemailer.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, auditoria, creditosTransacoes, turmas } = await import("@/lib/db/schema");
const { enviarEmail, substituirEnvioParaTeste } = await import("@/lib/email/enviar");
const { avisarConclusao, avisarRelatorioPronto } = await import("@/lib/email/avisos-do-mapa");
const facilitadores = await import("@/lib/actions/facilitadores");
const mapas = await import("@/lib/actions/assessments");
const lote = await import("@/lib/actions/envio-lote");
const { definirSenhaPeloLink } = await import("@/lib/actions/definir-senha");
const { auth } = await import("@/lib/auth/config");
const { and, eq, inArray } = await import("drizzle-orm");

type Email = { para: string; assunto: string; texto: string; html: string };

const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";
const SENHA = "senha-definida-pelo-link";

let adminId = "";
let donoId = "";
let outroId = "";
let inativoId = "";
const criadosPeloTeste: string[] = [];
const turmaIds: string[] = [];

let caixa: Email[] = [];
/** E-mails (destinatarios) para os quais o envio falha, ou "*" para todos. */
let falharPara: Set<string> | "*" = new Set();

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

async function novoUsuario(rotulo: string, extra: Record<string, unknown> = {}) {
  const [u] = await db
    .insert(usuarios)
    .values({
      nome: `${rotulo} do Teste`,
      email: `${rotulo.toLowerCase()}.${marca}@exemplo.com`,
      papel: "facilitador" as const,
      creditos: 0,
      modified_by: SISTEMA,
      ...extra,
    })
    .returning();
  return u!;
}

/** Facilitador com 10 creditos COM lastro no extrato (a trigger da 0005 confere). */
async function facilitadorComSaldo(rotulo: string) {
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(usuarios)
      .values({
        nome: `${rotulo} do Teste`,
        email: `${rotulo.toLowerCase()}.${marca}@exemplo.com`,
        papel: "facilitador" as const,
        creditos: 10,
        modified_by: SISTEMA,
      })
      .returning();
    await tx.insert(creditosTransacoes).values({
      usuario_id: u!.id,
      tipo: "bonus",
      quantidade: 10,
      descricao: "Saldo inicial do fixture",
      modified_by: SISTEMA,
    });
    return u!;
  });
}

before(async () => {
  const [admin] = await db
    .insert(usuarios)
    .values({
      nome: "Admin do Teste",
      email: `admin.${marca}@exemplo.com`,
      papel: "admin" as const,
      creditos: 0,
      modified_by: SISTEMA,
    })
    .returning();
  adminId = admin!.id;
  donoId = (await facilitadorComSaldo("Dono")).id;
  outroId = (await facilitadorComSaldo("Outro")).id;
  inativoId = (await novoUsuario("Inativo", { ativo: false })).id;

  substituirEnvioParaTeste(async (email) => {
    if (falharPara === "*" || falharPara.has(email.para)) throw new Error("SMTP fora do ar");
    caixa.push(email);
  });
});

beforeEach(() => {
  caixa = [];
  falharPara = new Set();
});

after(async () => {
  substituirEnvioParaTeste(null);
  const ids = [adminId, donoId, outroId, inativoId, ...criadosPeloTeste].filter(Boolean);
  const lista = `('${ids.join("','")}')`;
  const turmasLista = turmaIds.length ? `('${turmaIds.join("','")}')` : "('')";

  await db.transaction(async (tx) => {
    await tx.execute(`delete from auditoria where registro_id in (select id from assessments where facilitador_id in ${lista}) or user_id in ${lista} or registro_id in ${lista}`);
    await tx.execute(`delete from verificacoes where valor in ${lista}`);
    await tx.execute(`delete from sessoes where usuario_id in ${lista}`);
    await tx.execute(`delete from contas where usuario_id in ${lista}`);
    await tx.execute(`delete from creditos_transacoes where usuario_id in ${lista}`);
    await tx.execute(`delete from assessments where facilitador_id in ${lista}`);
    await tx.execute(`delete from turmas where id in ${turmasLista}`);
    await tx.execute(`delete from usuarios where id in ${lista}`);
  });
});

describe("enviarEmail", () => {
  it("sem as variaveis SMTP falha com erro claro, e nao finge sucesso", async () => {
    substituirEnvioParaTeste(null);
    const guardadas: Record<string, string | undefined> = {};
    for (const nome of ["SMTP_HOST", "SMTP_PORTA", "SMTP_USUARIO", "SMTP_SENHA", "EMAIL_REMETENTE"]) {
      guardadas[nome] = process.env[nome];
      delete process.env[nome];
    }
    try {
      await assert.rejects(
        () => enviarEmail({ para: "a@b.com", assunto: "x", texto: "x", html: "x" }),
        /Envio de e-mail não configurado/,
      );
    } finally {
      for (const [nome, valor] of Object.entries(guardadas)) {
        if (valor !== undefined) process.env[nome] = valor;
      }
      substituirEnvioParaTeste(async (email) => {
        if (falharPara === "*" || falharPara.has(email.para)) throw new Error("SMTP fora do ar");
        caixa.push(email);
      });
    }
  });
});

describe("acesso do parceiro por e-mail", () => {
  let parceiroId = "";
  let emailParceiro = "";
  let tokenDoAcesso = "";

  it("criar nao pede senha, cadastra e envia o acesso", async () => {
    entrarComo(adminId);
    emailParceiro = `novo.${marca}@exemplo.com`;
    const novo = await facilitadores.criar({
      nome: "Parceiro Novo",
      email: emailParceiro,
      empresa: "Consultoria Teste",
      pacote: "Starter",
    });
    parceiroId = novo.id;
    criadosPeloTeste.push(novo.id);

    assert.deepEqual(novo.acesso, { ok: true });
    assert.equal(caixa.length, 1);
    assert.equal(caixa[0]!.para, emailParceiro);
    assert.equal(caixa[0]!.assunto, "Seu acesso ao Perfila");
    assert.match(caixa[0]!.texto, /reset-password\//);
    tokenDoAcesso = /reset-password\/([^?\s]+)/.exec(caixa[0]!.texto)![1]!;
  });

  it("o parceiro define a senha pelo link, entra, e o link nao vale de novo", async () => {
    const token = tokenDoAcesso;

    const curta = await definirSenhaPeloLink(token, "curta", "curta");
    assert.equal(curta.ok, false);
    const diferente = await definirSenhaPeloLink(token, SENHA, `${SENHA}x`);
    assert.equal(diferente.ok, false);

    assert.deepEqual(await definirSenhaPeloLink(token, SENHA, SENHA), { ok: true });

    const sessao = await auth.api.signInEmail({
      body: { email: emailParceiro, password: SENHA },
      headers: new Headers(),
    });
    assert.equal((sessao.user as { id: string }).id, parceiroId);

    const reuso = await definirSenhaPeloLink(token, `${SENHA}-outra`, `${SENHA}-outra`);
    assert.equal(reuso.ok, false);
    assert.equal(!reuso.ok && reuso.linkInvalido, true);
  });

  it("falha de e-mail no cadastro NAO desfaz o parceiro", async () => {
    entrarComo(adminId);
    falharPara = "*";
    const email = `semsmtp.${marca}@exemplo.com`;
    const novo = await facilitadores.criar({
      nome: "Parceiro Sem Email",
      email,
      empresa: "Consultoria Teste",
      pacote: "Starter",
    });
    criadosPeloTeste.push(novo.id);

    assert.equal(novo.acesso.ok, false);
    assert.match(novo.acesso.ok ? "" : novo.acesso.erro, /SMTP fora do ar/);
    const [gravado] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    assert.equal(gravado?.creditos, 10, "o parceiro existe, com o pacote creditado");
  });

  it("reenviar acesso: recusa nao-admin e parceiro inativo", async () => {
    entrarComo(donoId);
    await assert.rejects(() => facilitadores.enviarAcessoDoParceiro(parceiroId), /Sem permissao/);

    entrarComo(adminId);
    await assert.rejects(() => facilitadores.enviarAcessoDoParceiro(inativoId), /inativo/i);
    assert.equal(caixa.length, 0, "nada saiu nas recusas");
  });

  it("reenviar acesso: envia, grava trilha sem token, e mostra o erro real do SMTP", async () => {
    entrarComo(adminId);
    const { email } = await facilitadores.enviarAcessoDoParceiro(parceiroId);
    assert.equal(email, emailParceiro);
    assert.equal(caixa.length, 1);

    const token = /reset-password\/([^?\s]+)/.exec(caixa[0]!.texto)![1]!;
    const trilha = await db.select().from(auditoria).where(eq(auditoria.registro_id, parceiroId));
    const linha = trilha.find((l) => l.detalhes.startsWith("Enviou o acesso por e-mail para"));
    assert.ok(linha, "o envio precisa aparecer na trilha");
    assert.ok(!JSON.stringify(trilha).includes(token), "o token nao pode ir para a trilha");

    falharPara = "*";
    await assert.rejects(
      () => facilitadores.enviarAcessoDoParceiro(parceiroId),
      /O e-mail não saiu: SMTP fora do ar/,
    );
  });
});

describe("convite do mapa", () => {
  async function criarMapa(nome: string) {
    entrarComo(donoId);
    const mapa = await mapas.criar({
      avaliado_nome: nome,
      avaliado_email: `${nome.toLowerCase().replace(/\s/g, ".")}.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
    });
    return mapa;
  }

  it("criar envia o convite com o link absoluto e a validade", async () => {
    const mapa = await criarMapa("Ana Convidada");
    assert.deepEqual(mapa.convite, { ok: true });
    assert.equal(caixa.length, 1);
    assert.equal(caixa[0]!.para, mapa.avaliado_email);
    assert.equal(caixa[0]!.assunto, "Você foi convidado para responder o seu mapa");
    assert.match(caixa[0]!.texto, new RegExp(`https?://[^\\s]+/avaliacao/${mapa.token}`));
    assert.match(caixa[0]!.texto, /Facilitador|Dono do Teste/, "diz quem convidou");
    assert.match(caixa[0]!.texto, /O link vale até \d{2}\/\d{2}\/\d{4}/);

    const trilha = await db.select().from(auditoria).where(eq(auditoria.registro_id, mapa.id));
    assert.ok(trilha.some((l) => l.detalhes.startsWith("Enviou o convite do mapa por e-mail para")));
    assert.ok(!JSON.stringify(trilha.map((l) => l.detalhes)).includes(mapa.token));
  });

  it("falha de envio NAO desfaz a criacao nem devolve credito", async () => {
    falharPara = "*";
    const [antes] = await db.select().from(usuarios).where(eq(usuarios.id, donoId));
    const mapa = await criarMapa("Bia Sem Email");

    assert.equal(mapa.convite.ok, false);
    const [existe] = await db.select().from(assessments).where(eq(assessments.id, mapa.id));
    assert.ok(existe, "o mapa continua criado");
    const [depois] = await db.select().from(usuarios).where(eq(usuarios.id, donoId));
    assert.equal(depois!.creditos, antes!.creditos - 1, "o credito continua gasto");
  });

  it("reenviar recusa mapa de outro facilitador", async () => {
    const mapa = await criarMapa("Caio Alheio");
    caixa = [];
    entrarComo(outroId);
    await assert.rejects(() => mapas.reenviarConvite(mapa.id), /nao encontrado/);
    assert.equal(caixa.length, 0);
  });

  it("reenviar recusa mapa respondido e mapa vencido; envia o valido", async () => {
    const mapa = await criarMapa("Duda Respondida");
    caixa = [];
    entrarComo(donoId);

    assert.deepEqual(await mapas.reenviarConvite(mapa.id), { email: mapa.avaliado_email });
    assert.equal(caixa.length, 1);
    assert.match(caixa[0]!.texto, new RegExp(`/avaliacao/${mapa.token}`), "o MESMO link");

    await db.update(assessments).set({ expira_em: new Date(Date.now() - 1000) }).where(eq(assessments.id, mapa.id));
    await assert.rejects(() => mapas.reenviarConvite(mapa.id), /expirou/);

    await db
      .update(assessments)
      .set({ situacao: "concluido", expira_em: new Date(Date.now() + 86_400_000) })
      .where(eq(assessments.id, mapa.id));
    await assert.rejects(() => mapas.reenviarConvite(mapa.id), /já foi respondido/);
    assert.equal(caixa.length, 1, "so o primeiro saiu");
  });

  it("reenviar mostra o erro real quando o SMTP falha", async () => {
    const mapa = await criarMapa("Edu Reenvio");
    entrarComo(donoId);
    falharPara = "*";
    const resposta = await mapas.reenviarConvitePelaTela(mapa.id).catch((e: Error) => e);
    // revalidatePath nao e usado aqui; a recusa volta como objeto.
    assert.ok(!(resposta instanceof Error));
    assert.equal(resposta.ok, false);
    assert.match(resposta.ok ? "" : resposta.erro, /SMTP fora do ar/);
  });

  it("lote: um e-mail que falha nao para os demais, e o resultado diz quais", async () => {
    entrarComo(donoId);
    const [turma] = await db
      .insert(turmas)
      .values({
        facilitador_id: donoId,
        nome: `Turma ${marca}`,
        area: "profissional" as const,
        tipo_relatorio: "S1" as const,
        modified_by: SISTEMA,
      })
      .returning();
    turmaIds.push(turma!.id);

    const destinatarios = ["um", "dois", "tres"].map((n) => ({
      avaliado_nome: `Pessoa ${n}`,
      avaliado_email: `${n}.lote.${marca}@exemplo.com`,
    }));
    falharPara = new Set([destinatarios[1]!.avaliado_email]);

    const resposta = await lote.criarLote({ turma_id: turma!.id, destinatarios });

    assert.equal(resposta.criados, 3, "os tres mapas existem");
    assert.equal(resposta.convites.enviados, 2);
    assert.deepEqual(
      resposta.convites.falhas.map((f) => f.email),
      [destinatarios[1]!.avaliado_email],
    );
    assert.equal(caixa.length, 2);
  });
});

describe("avisos do mapa concluido", () => {
  async function mapaConcluido(nome: string, donoDoMapa = donoId) {
    const [m] = await db
      .insert(assessments)
      .values({
        token: `${Math.random().toString(16).slice(2, 14)}`.padEnd(12, "0"),
        facilitador_id: donoDoMapa,
        avaliado_nome: nome,
        avaliado_email: `${nome.toLowerCase().replace(/\s/g, ".")}.${marca}@exemplo.com`,
        tipo_relatorio: "S1" as const,
        situacao: "concluido" as const,
        creditos_usados: 0,
        expira_em: new Date(Date.now() + 86_400_000),
        concluido_em: new Date(),
        versao_instrumento: "MC-INV 2.2",
        modified_by: SISTEMA,
      })
      .returning();
    return m!;
  }

  it("avisa o facilitador por padrao, e respeita a preferencia desligada", async () => {
    const mapa = await mapaConcluido("Fabi Conclui");

    await avisarConclusao(mapa.id);
    assert.equal(caixa.length, 1, "padrao ligado: quem nunca salvou preferencia recebe");
    assert.equal(caixa[0]!.assunto, "Fabi Conclui concluiu o mapa");

    await db
      .update(usuarios)
      .set({ preferencias_notificacao: { questionario: { email: false, whatsapp: false }, relatorio: { email: false, whatsapp: false }, recarga: { email: true, whatsapp: true } } })
      .where(eq(usuarios.id, donoId));
    caixa = [];
    await avisarConclusao(mapa.id);
    assert.equal(caixa.length, 0, "desligou: nao recebe");

    await db.update(usuarios).set({ preferencias_notificacao: null }).where(eq(usuarios.id, donoId));
  });

  it("falha de envio no aviso nao lanca", async () => {
    const mapa = await mapaConcluido("Gil Falha");
    falharPara = "*";
    await avisarConclusao(mapa.id);
    assert.equal(caixa.length, 0);
  });

  it("relatorio pronto: avaliado e facilitador recebem UMA vez so", async () => {
    const mapa = await mapaConcluido("Helo Pronta");

    await avisarRelatorioPronto(mapa.id);
    assert.equal(caixa.length, 2);
    const paraAvaliado = caixa.find((e) => e.para === mapa.avaliado_email)!;
    assert.match(paraAvaliado.texto, new RegExp(`/relatorio/${mapa.token}`));
    assert.ok(caixa.some((e) => e.para.startsWith("dono.")));

    await avisarRelatorioPronto(mapa.id);
    assert.equal(caixa.length, 2, "segunda chamada (retry da IA) nao duplica");
  });

  it("relatorio pronto: falha nao lanca e a proxima tentativa ainda envia", async () => {
    const mapa = await mapaConcluido("Ivo Retry");
    falharPara = "*";
    await avisarRelatorioPronto(mapa.id);
    assert.equal(caixa.length, 0);

    falharPara = new Set();
    await avisarRelatorioPronto(mapa.id);
    assert.equal(caixa.length, 2, "o carimbo foi devolvido, entao reenvia");
  });

  it("relatorio pronto: facilitador com o aviso desligado nao recebe, o avaliado recebe", async () => {
    const mapa = await mapaConcluido("Jana Sem Aviso", outroId);
    await db
      .update(usuarios)
      .set({ preferencias_notificacao: { questionario: { email: false, whatsapp: false }, relatorio: { email: false, whatsapp: false }, recarga: { email: true, whatsapp: true } } })
      .where(eq(usuarios.id, outroId));

    await avisarRelatorioPronto(mapa.id);
    assert.deepEqual(caixa.map((e) => e.para), [mapa.avaliado_email]);
  });

  it("trilha do aviso nao carrega token", async () => {
    const lista = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.user_id, SISTEMA), inArray(auditoria.tabela, ["assessments"])));
    const mapasDoTeste = await db.select({ token: assessments.token }).from(assessments).where(eq(assessments.facilitador_id, donoId));
    const texto = JSON.stringify(lista.map((l) => l.detalhes));
    for (const { token } of mapasDoTeste) assert.ok(!texto.includes(token));
  });
});
