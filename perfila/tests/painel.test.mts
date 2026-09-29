/**
 * Teste de integracao da camada de leitura das telas de gestao.
 *
 *   docker compose up -d db   (na raiz do repositorio)
 *   npm test
 *
 * Cobre as duas regras que as telas de /admin e /facilitador dependem e que
 * quebram caladas: o recorte por dono (o facilitador nao pode ver o assessment
 * de outro) e a expiracao derivada de `expira_em`, com concluido tendo
 * precedencia sobre vencido.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const { db } = await import("@/lib/db");
const { usuarios, assessments, assessmentsResultados, clientes, creditosTransacoes, devolutivas } =
  await import("@/lib/db/schema");
const painel = await import("@/lib/painel");
const { PRAZO_DA_GERACAO_MS: PRAZO_LEGADO } = await import("@/lib/relatorio/persistir");
const { PRAZO_DA_GERACAO_MS: PRAZO_MC } = await import("@/lib/relatorio-mc/narrativa");
const { eq } = await import("drizzle-orm");

const marca = `teste-${Date.now()}`;
const SISTEMA = "00000000-0000-0000-0000-000000000000";

const DIA = 24 * 60 * 60 * 1000;
const ONTEM = new Date(Date.now() - DIA);
const AMANHA = new Date(Date.now() + DIA);

let facilitadorA = "";
let facilitadorB = "";
let admin = "";
/** Conta velha o bastante para ter um ciclo anterior ao vigente. */
let facilitadorCiclo = "";

/** Ids dos assessments criados aqui, na ordem em que sao inseridos. */
let vencido = "";
let noPrazo = "";
let concluidoVencido = "";
let deOutroDono = "";

function entrarComo(id: string) {
  process.env.SESSAO_DEV_USUARIO_ID = id;
}

/**
 * O saldo do fixture nasce com lastro no extrato.
 *
 * A partir da 0005 o banco confere, no COMMIT, se `usuarios.creditos` bate com
 * a soma do extrato do usuario. Criar um facilitador com 10 creditos que
 * transacao nenhuma explica e o estado que a guarda existe para proibir — em
 * producao seria credito surgido do nada. As duas escritas vao na mesma
 * transacao, exatamente como `criar()` faz.
 */
async function criarUsuario(nome: string, papel: "admin" | "facilitador") {
  return db.transaction(async (tx) => {
    const [linha] = await tx
      .insert(usuarios)
      .values({
        nome,
        email: `${nome.toLowerCase().replace(/\s/g, ".")}.${marca}@exemplo.com`,
        papel,
        creditos: 10,
        modified_by: SISTEMA,
      })
      .returning();

    await tx.insert(creditosTransacoes).values({
      usuario_id: linha.id,
      tipo: "bonus",
      quantidade: 10,
      descricao: "Saldo inicial do fixture",
      modified_by: SISTEMA,
    });

    return linha.id;
  });
}

async function criarAssessment(dono: string, situacao: "pendente" | "concluido", expira: Date) {
  const [linha] = await db
    .insert(assessments)
    .values({
      token: `${marca}-${Math.random().toString(36).slice(2, 10)}`,
      facilitador_id: dono,
      avaliado_nome: "Avaliado de Teste",
      avaliado_email: `avaliado.${marca}@exemplo.com`,
      tipo_relatorio: "S1",
      situacao,
      creditos_usados: 1,
      expira_em: expira,
      concluido_em: situacao === "concluido" ? expira : null,
      modified_by: SISTEMA,
    })
    .returning();
  return linha.id;
}

before(async () => {
  facilitadorA = await criarUsuario("Facilitador Painel A", "facilitador");
  facilitadorB = await criarUsuario("Facilitador Painel B", "facilitador");
  admin = await criarUsuario("Admin Painel", "admin");

  vencido = await criarAssessment(facilitadorA, "pendente", ONTEM);
  noPrazo = await criarAssessment(facilitadorA, "pendente", AMANHA);
  concluidoVencido = await criarAssessment(facilitadorA, "concluido", ONTEM);
  deOutroDono = await criarAssessment(facilitadorB, "pendente", AMANHA);

  facilitadorCiclo = await criarParceiroComHistorico();

  // Carteira e devolutivas dos dois parceiros, para `resumoDaOperacao`: A com
  // dois clientes e duas sessoes (uma finalizada, uma em andamento), B com um
  // cliente e uma sessao. Sem o de B, um recorte de dono quebrado passaria.
  await db.insert(clientes).values([
    {
      facilitador_id: facilitadorA,
      nome: "Cliente A1",
      email: `a1.${marca}@exemplo.com`,
      modified_by: SISTEMA,
    },
    {
      facilitador_id: facilitadorA,
      nome: "Cliente A2",
      email: `a2.${marca}@exemplo.com`,
      modified_by: SISTEMA,
    },
    {
      facilitador_id: facilitadorB,
      nome: "Cliente B1",
      email: `b1.${marca}@exemplo.com`,
      modified_by: SISTEMA,
    },
  ]);

  await db.insert(devolutivas).values([
    {
      assessment_id: concluidoVencido,
      facilitador_id: facilitadorA,
      duracao_segundos: 3600 + 26 * 60,
      finalizada_em: ONTEM,
      modified_by: SISTEMA,
    },
    // Sem `finalizada_em`: cronometro rodando. Conta no tempo, nao no total.
    {
      assessment_id: noPrazo,
      facilitador_id: facilitadorA,
      duracao_segundos: 120,
      modified_by: SISTEMA,
    },
    {
      assessment_id: deOutroDono,
      facilitador_id: facilitadorB,
      duracao_segundos: 999,
      finalizada_em: ONTEM,
      modified_by: SISTEMA,
    },
  ]);
});

/**
 * Parceiro com dois ciclos de historico.
 *
 * A conta nasceu ha ~820 dias, entao o ciclo vigente comecou no aniversario de
 * ~90 dias atras. Os lancamentos ficam dos dois lados dessa fronteira de
 * proposito: e o unico jeito de provar que a janela corta.
 *
 * O saldo declarado (10) e a soma de TODAS as linhas, e nao das do ciclo — a
 * constraint `saldo_bate_com_extrato` conta o extrato inteiro. Que o saldo e o
 * progresso do programa contem coisas diferentes e o ponto: saldo e a vida
 * toda da conta, categoria e o ciclo corrente.
 */
async function criarParceiroComHistorico() {
  const diasAtras = (dias: number) => new Date(Date.now() - dias * DIA);

  return db.transaction(async (tx) => {
    const [linha] = await tx
      .insert(usuarios)
      .values({
        nome: "Facilitador Ciclo",
        email: `ciclo.${marca}@exemplo.com`,
        papel: "facilitador",
        creditos: 10,
        created_at: diasAtras(820),
        modified_by: SISTEMA,
      })
      .returning();

    const lancar = (
      tipo: "compra" | "uso" | "bonus",
      quantidade: number,
      dias: number,
      descricao: string,
    ) =>
      tx.insert(creditosTransacoes).values({
        usuario_id: linha.id,
        tipo,
        quantidade,
        descricao,
        created_at: diasAtras(dias),
        modified_by: SISTEMA,
      });

    // Ciclo ANTERIOR: nao pode contar para a categoria de hoje.
    await lancar("compra", 10, 500, "Compra do ciclo passado");
    await lancar("uso", -4, 500, "Uso do ciclo passado");

    // Ciclo VIGENTE.
    await lancar("compra", 5, 30, "Compra deste ciclo");
    await lancar("bonus", 2, 30, "Bonus deste ciclo");
    await lancar("uso", -3, 30, "Uso deste ciclo");

    return linha.id;
  });
}

after(async () => {
  // Limpeza de fixture, com SQL cru: e o unico lugar do projeto onde apagar
  // de verdade e o certo. A aplicacao nunca faz isso.
  //
  // Numa transacao so por causa da guarda da 0005: apagar o extrato num commit
  // deixaria, naquele instante, um usuario com saldo que transacao nenhuma
  // explica. Apagando tudo junto o usuario ja nao existe no COMMIT, e a
  // checagem pula quem sumiu.
  const ids = [facilitadorA, facilitadorB, admin, facilitadorCiclo];
  await db.transaction(async (tx) => {
    await tx.execute(`delete from creditos_transacoes where usuario_id in ('${ids.join("','")}')`);
    // Devolutiva aponta para assessment: sai antes dele.
    await tx.execute(`delete from devolutivas where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from clientes where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(
      `delete from assessments_resultados where assessment_id in (select id from assessments where facilitador_id in ('${ids.join("','")}'))`,
    );
    await tx.execute(`delete from assessments where facilitador_id in ('${ids.join("','")}')`);
    await tx.execute(`delete from usuarios where id in ('${ids.join("','")}')`);
  });
  delete process.env.SESSAO_DEV_USUARIO_ID;
});

describe("painel", () => {
  it("recusa quem nao tem sessao", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => painel.assessmentsVisiveis(), /Nao autenticado/);
    await assert.rejects(() => painel.contaAtual(), /Nao autenticado/);
  });

  it("facilitador nao ve o assessment de outro facilitador", async () => {
    entrarComo(facilitadorA);
    const ids = (await painel.assessmentsVisiveis()).map((item) => item.id);

    assert.ok(ids.includes(noPrazo), "deveria ver o proprio");
    assert.ok(!ids.includes(deOutroDono), "nao pode ver o de outro dono");
  });

  it("admin ve os assessments de todos os parceiros", async () => {
    entrarComo(admin);
    const ids = (await painel.assessmentsVisiveis()).map((item) => item.id);

    assert.ok(ids.includes(noPrazo));
    assert.ok(ids.includes(deOutroDono));
  });

  it("passou de expira_em sem conclusao aparece como expirado", async () => {
    entrarComo(facilitadorA);
    const itens = await painel.assessmentsVisiveis();

    assert.equal(itens.find((item) => item.id === vencido)?.situacao, "expirado");
    assert.equal(itens.find((item) => item.id === noPrazo)?.situacao, "pendente");
  });

  it("concluido tem precedencia sobre a data vencida", async () => {
    entrarComo(facilitadorA);
    const itens = await painel.assessmentsVisiveis();

    // Quem respondeu dentro do prazo nao pode virar "expirado" no dia
    // seguinte: o relatorio existe e a tela precisa continuar oferecendo.
    assert.equal(itens.find((item) => item.id === concluidoVencido)?.situacao, "concluido");
  });

  it("texto sendo escrito tira o botao de gerar, nas duas versoes, ate a trava vencer", async (t) => {
    entrarComo(facilitadorA);
    const [mc] = await db
      .insert(assessments)
      .values({
        token: `${marca}-mc`,
        facilitador_id: facilitadorA,
        avaliado_nome: "Avaliado MC",
        avaliado_email: `mc.${marca}@exemplo.com`,
        tipo_relatorio: "S4",
        situacao: "concluido",
        creditos_usados: 1,
        expira_em: AMANHA,
        concluido_em: new Date(),
        versao_instrumento: "MC-INV 2.2",
        modified_by: SISTEMA,
      })
      .returning();
    // Mesmo se um assert falhar: os contadores dos testes seguintes contam UM
    // mapa concluido de A, e uma falha aqui nao pode virar duas.
    t.after(async () => {
      await db.update(assessments).set({ is_deleted: true, deleted_at: new Date() }).where(eq(assessments.id, mc.id));
      await db.update(assessments).set({ narrativa_gerando_em: null }).where(eq(assessments.id, concluidoVencido));
    });
    const [resultado] = await db
      .insert(assessmentsResultados)
      .values({
        assessment_id: mc.id,
        versao_instrumento: "MC-INV 2.2",
        versao_motor: "teste",
        resultado: {},
        nat_d: 50, nat_i: 50, nat_s: 50, nat_c: 50,
        ada_d: 50, ada_i: 50, ada_s: 50, ada_c: 50,
        perfil_natural: "DI",
        perfil_adaptado: "DI",
        tipo_jung: "ENT",
        confiabilidade: "alta",
        narrativa_gerando_em: new Date(),
        modified_by: SISTEMA,
      })
      .returning();
    // O legado guarda a trava no proprio mapa.
    await db.update(assessments).set({ narrativa_gerando_em: new Date() }).where(eq(assessments.id, concluidoVencido));

    const agora = await painel.assessmentsVisiveis();
    assert.equal(agora.find((i) => i.id === mc.id)?.gerandoTexto, true);
    assert.equal(agora.find((i) => i.id === mc.id)?.temNarrativa, false);
    assert.equal(agora.find((i) => i.id === concluidoVencido)?.gerandoTexto, true);
    assert.equal(agora.find((i) => i.id === noPrazo)?.gerandoTexto, false, "mapa sem trava nao esta gerando");

    // Processo que morreu no meio: a trava vence no prazo de cada gerador, e o
    // botao volta. Um segundo a mais que o prazo, e nao um numero solto.
    await db
      .update(assessmentsResultados)
      .set({ narrativa_gerando_em: new Date(Date.now() - PRAZO_MC - 1000) })
      .where(eq(assessmentsResultados.id, resultado.id));
    await db
      .update(assessments)
      .set({ narrativa_gerando_em: new Date(Date.now() - PRAZO_LEGADO - 1000) })
      .where(eq(assessments.id, concluidoVencido));

    const depois = await painel.assessmentsVisiveis();
    assert.equal(depois.find((i) => i.id === mc.id)?.gerandoTexto, false);
    assert.equal(depois.find((i) => i.id === concluidoVencido)?.gerandoTexto, false);
  });

  it("listarFacilitadores e listarTransacoes sao so do admin", async () => {
    entrarComo(facilitadorA);
    await assert.rejects(() => painel.listarFacilitadores(), /Sem permissao/);
    await assert.rejects(() => painel.listarTransacoes(), /Sem permissao/);

    entrarComo(admin);
    const parceiros = await painel.listarFacilitadores();
    assert.ok(parceiros.some((item) => item.id === facilitadorA));
    assert.ok(!parceiros.some((item) => item.id === admin), "admin nao e parceiro");
  });

  it("contaAtual devolve o saldo de quem esta logado", async () => {
    entrarComo(facilitadorB);
    const conta = await painel.contaAtual();

    assert.equal(conta.id, facilitadorB);
    assert.equal(conta.creditos, 10);
  });

  it("transacoesDaConta traz so o extrato de quem esta logado", async () => {
    entrarComo(facilitadorA);
    const meu = await painel.transacoesDaConta();

    assert.ok(meu.length > 0, "o saldo do fixture tem lastro no extrato");
    assert.ok(
      meu.every((movimento) => movimento.facilitadorId === facilitadorA),
      "nenhum movimento de outro dono atravessa o recorte",
    );

    // O admin nao e excecao aqui: esta e a tela "meus creditos". Para ver o
    // dos outros existe /admin/creditos, que usa listarTransacoes().
    entrarComo(admin);
    const doAdmin = await painel.transacoesDaConta();
    assert.ok(doAdmin.every((movimento) => movimento.facilitadorId === admin));
  });

  it("o extrato exibido explica o saldo exibido", async () => {
    entrarComo(facilitadorA);
    const [conta, extrato] = await Promise.all([
      painel.contaAtual(),
      painel.transacoesDaConta(),
    ]);

    // E o invariante que a tela de creditos mostra em texto: recebidos menos
    // consumidos da o saldo. O banco garante com a constraint
    // `saldo_bate_com_extrato`; aqui se confere que as DUAS leituras que a
    // tela usa continuam contando a mesma historia — uma consulta com o
    // recorte errado quebraria isto sem quebrar a constraint.
    const soma = extrato.reduce((total, movimento) => total + movimento.quantidade, 0);
    assert.equal(soma, conta.creditos);
  });

  it("sem sessao nao ha extrato", async () => {
    delete process.env.SESSAO_DEV_USUARIO_ID;
    await assert.rejects(() => painel.transacoesDaConta(), /Nao autenticado/);
  });

  it("o programa conta so o ciclo vigente, e bonus nao e compra", async () => {
    entrarComo(facilitadorCiclo);
    const programa = await painel.progressoDoPrograma();

    // O parceiro comprou 15 e usou 7 na vida da conta. No ciclo vigente:
    // comprou 5 e usou 3. O que o ciclo passado moveu ficou para tras — e a
    // categoria de hoje nao pode ser paga com credito do ano retrasado.
    assert.equal(programa.comprados.atual, 5, "compra do ciclo anterior nao entra");
    assert.equal(programa.utilizados.atual, 3, "uso do ciclo anterior nao entra");

    // Os 2 de bonus estao DENTRO do ciclo e mesmo assim nao contam: a regra
    // premia credito comprado, e bonus e cortesia. Se contasse, daria para
    // subir de categoria recebendo presente.
    assert.notEqual(programa.comprados.atual, 7, "bonus nao conta como comprado");

    assert.equal(programa.categoria, "Parceiro");
    assert.equal(programa.proximaCategoria, "Formador");
    assert.equal(programa.faltam.comprados, 115, "faltam 120 - 5 para Formador");
    assert.equal(programa.faltam.utilizados, 77, "faltam 80 - 3 para Formador");
  });

  it("o saldo e a vida toda da conta; a categoria e so o ciclo", async () => {
    entrarComo(facilitadorCiclo);
    const [conta, extrato, programa] = await Promise.all([
      painel.contaAtual(),
      painel.transacoesDaConta(),
      painel.progressoDoPrograma(),
    ]);

    // As duas leituras contam coisas diferentes de proposito, e as duas
    // aparecem na mesma tela. O saldo fecha com o extrato INTEIRO (invariante
    // do banco); o progresso fecha so com a janela. Confundir as duas faria a
    // tela de creditos e a de beneficios discordarem sem ninguem estar errado.
    const soma = extrato.reduce((total, movimento) => total + movimento.quantidade, 0);
    assert.equal(soma, conta.creditos, "saldo = extrato inteiro");
    assert.equal(extrato.length, 5, "as cinco linhas continuam visiveis no extrato");
    assert.ok(
      programa.comprados.atual < 15,
      "o programa olha uma janela menor que o extrato",
    );
  });

  it("o ciclo vigente comeca no aniversario da conta", async () => {
    entrarComo(facilitadorCiclo);
    const programa = await painel.progressoDoPrograma();

    // Conta de ~820 dias: o ciclo corrente e o terceiro, e termina um ano
    // depois de comecar. Datas ja formatadas para a tela (dd/mm/aaaa).
    const [diaI, mesI, anoI] = programa.cicloIniciadoEm.split("/").map(Number);
    const [diaF, mesF, anoF] = programa.expiraEm.split("/").map(Number);

    assert.equal(diaF, diaI, "mesmo dia do mes");
    assert.equal(mesF, mesI, "mesmo mes");
    assert.equal(anoF, anoI! + 1, "um ano de janela");
  });

  /**
   * Os quatro numeros do topo do painel do parceiro.
   *
   * Antes eles vinham de arquivo fixo (227 clientes, 42h26) e nenhum teste
   * podia falhar por isso. O que se prova aqui e o que quebra calado: o recorte
   * por dono nos DOIS lados, e que "finalizada" e `finalizada_em` preenchido e
   * nao a existencia da linha — a sessao em andamento entra no tempo e fica
   * fora da contagem.
   */
  it("resumoDaOperacao conta a carteira e as devolutivas do dono", async () => {
    entrarComo(facilitadorA);
    const resumo = await painel.resumoDaOperacao();

    assert.equal(resumo.clientes, 2, "so os clientes de A");
    assert.equal(resumo.devolutivasFinalizadas, 1, "a sessao sem finalizada_em nao conta");
    // 3600 + 26*60 da sessao finalizada, mais os 120s da que ainda roda.
    assert.equal(resumo.devolutivasTempo, "1h28");
    assert.equal(resumo.mapasConcluidos, 1, "so o assessment concluido de A");

    entrarComo(facilitadorB);
    const deB = await painel.resumoDaOperacao();
    assert.equal(deB.clientes, 1, "B nao ve a carteira de A");
    assert.equal(deB.devolutivasFinalizadas, 1);
    assert.equal(deB.mapasConcluidos, 0, "B nao tem mapa concluido");
  });

  it("resumoDaOperacao formata zero como 0h00, e nao como travessao", async () => {
    // O parceiro novo abre o painel antes de ter qualquer coisa: os quatro
    // cartoes precisam mostrar zero, e nao quebrar nem sumir.
    entrarComo(facilitadorCiclo);
    const resumo = await painel.resumoDaOperacao();

    assert.equal(resumo.clientes, 0);
    assert.equal(resumo.devolutivasFinalizadas, 0);
    assert.equal(resumo.devolutivasTempo, "0h00");
    assert.equal(resumo.mapasConcluidos, 0);
  });

  it("empresasPorId resolve os nomes numa consulta so", async () => {
    entrarComo(admin);
    const nomes = await painel.empresasPorId([facilitadorA, facilitadorB]);

    assert.equal(Object.keys(nomes).length, 2);
    assert.ok(nomes[facilitadorA]);
    assert.deepEqual(await painel.empresasPorId([]), {});
  });
});
