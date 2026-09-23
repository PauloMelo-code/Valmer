/**
 * As duas operacoes da turma que MEXEM EM CREDITO: enviar os passaportes em
 * lote e remover os pendentes com estorno.
 *
 * Estrutura igual a de `actions/assessments.ts` e `actions/turmas.ts`, e de
 * proposito: sessao exigida na entrada, recorte por dono no WHERE, linha do
 * dono travada, trilha dentro da transacao e recusa de regra separada de
 * falha. Duas formas diferentes de fazer a mesma coisa viram duas respostas
 * diferentes para a mesma pergunta.
 *
 * POR QUE O LOTE INTEIRO CABE EM UMA TRANSACAO SO
 * -----------------------------------------------
 * A alternativa era uma transacao por mapa. Com 10 destinatarios e saldo para
 * 7, ela entrega 7 links e recusa 3 — e o parceiro fica sabendo que "falhou"
 * sem saber QUEM recebeu. Ele reenvia a lista inteira por seguranca, e as 7
 * primeiras pessoas recebem dois passaportes, cobrados duas vezes. Meia
 * entrega e o pior resultado possivel aqui, porque o estrago dela e invisivel:
 * ninguem consegue olhar a tela e dizer o que aconteceu.
 *
 * Com transacao unica ou os 10 nascem ou nenhum nasce, e a recusa diz quantos
 * creditos faltam — que e uma frase acionavel. O saldo e conferido UMA vez,
 * com a linha do dono travada, contra o custo TOTAL do lote: conferir por mapa
 * dentro da mesma transacao daria no mesmo numero e so esconderia a decisao.
 *
 * O preco disso e o teto de 50 do validador: enquanto o lote grava, a linha do
 * dono fica travada e nenhuma outra aba dele cria mapa. Cinquenta INSERTs num
 * COMMIT sao milissegundos; uma planilha inteira nao seria.
 */
"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { assessments, creditosTransacoes, turmas, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { novoToken, validadeDoLink } from "@/lib/assessment-link";
import { envioLoteSchema } from "@/lib/validators/envio-lote";
import { custoDoRelatorio } from "@/lib/precos";
import { RecusaDeRegra } from "./recusa";

/** A trilha registra o evento na TURMA: o que aconteceu foi com ela, em lote. */
const TABELA = "turmas";
const TELA = "/facilitador";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "assessments", acao)) {
    throw new Error(`Sem permissao para ${acao} mapas`);
  }
  return sessao;
}

/** Quem executa a leitura: o `db` normal ou o `tx` da transacao em curso. */
type Leitor = Pick<typeof db, "select">;

/**
 * A turma do pedido, ja recortada pelo dono.
 *
 * ESTA e a guarda que impede um parceiro de enviar para a turma de outro, e
 * ela mora aqui porque Server Action e endpoint POST publico: a tela so
 * oferece as turmas proprias, mas quem montar o POST na mao manda o uuid que
 * quiser. Devolver "Grupo de mapeamento nao encontrado" para o grupo
 * alheio — em vez de "sem permissao" — tambem evita confirmar que aquele uuid
 * existe.
 *
 * O dono do lote sai daqui, e nao da sessao: assim o admin, que enxerga todas
 * as turmas, envia em nome do parceiro certo e cobra do saldo certo, sem campo
 * extra no formulario para alguem forjar.
 */
async function turmaDoDono(tx: Leitor, id: string, sessao: Sessao) {
  const [turma] = await tx
    .select()
    .from(turmas)
    .where(
      and(
        eq(turmas.id, id),
        eq(turmas.is_deleted, false),
        sessao.papel === "admin" ? undefined : eq(turmas.facilitador_id, sessao.userId),
      ),
    )
    .limit(1);

  if (!turma) throw new RecusaDeRegra("Grupo de mapeamento nao encontrado");
  return turma;
}

/**
 * A linha do dono, TRAVADA.
 *
 * Sem o `.for("update")` duas operacoes simultaneas leem o mesmo saldo e
 * gastam o mesmo credito duas vezes. A trava vale ate o fim da transacao, que
 * e onde a CONSTRAINT TRIGGER da migration 0005 confere se o saldo bate com o
 * extrato.
 */
async function donoTravado(tx: Leitor, id: string) {
  const [dono] = await tx
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.is_deleted, false)))
    .limit(1)
    .for("update");

  if (!dono) throw new RecusaDeRegra("Facilitador nao encontrado");
  if (!dono.ativo) throw new RecusaDeRegra("Facilitador inativo");
  return dono;
}

/**
 * E-mails repetidos DENTRO do proprio lote.
 *
 * Conferido antes de qualquer gravacao, e nao no meio dela: a mesma pessoa
 * duas vezes na lista gera dois links e cobra dois creditos por um passaporte
 * so, e ela recebe dois convites sem saber qual responder. Nao ha indice unico
 * que pegue isso — o mesmo e-mail em turmas diferentes, ou na mesma turma
 * meses depois, e legitimo: a pessoa pode ser reavaliada.
 *
 * A comparacao usa o e-mail JA normalizado pelo zod (trim + minusculas), senao
 * "Ana@x.com" e "ana@x.com " passariam como dois destinatarios.
 */
function emailsRepetidos(destinatarios: { avaliado_email: string }[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();

  for (const { avaliado_email } of destinatarios) {
    if (vistos.has(avaliado_email)) repetidos.add(avaliado_email);
    vistos.add(avaliado_email);
  }

  return [...repetidos];
}

/**
 * Cria N mapas de uma vez na turma, todos com `turma_id` preenchido.
 *
 * Tudo-ou-nada: ver o cabecalho do arquivo. As escritas — os N assessments, o
 * saldo, as N linhas do extrato e a trilha — acontecem na MESMA transacao, com
 * a linha do dono travada.
 *
 * O extrato leva UMA linha por mapa, e nao uma linha somada do lote: e o
 * `assessment_id` de cada linha que permite, meses depois, responder "por que
 * este credito saiu" apontando o passaporte. A soma continua batendo com o
 * saldo, que e o que a trigger da 0005 confere no COMMIT.
 */
export async function criarLote(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = envioLoteSchema.parse(dados);

  const repetidos = emailsRepetidos(validado.destinatarios);
  if (repetidos.length > 0) {
    throw new RecusaDeRegra(
      `O mesmo e-mail aparece mais de uma vez no lote: ${repetidos.join(", ")}. Deixe um so de cada e envie de novo. Nenhum passaporte foi enviado.`,
    );
  }

  return db.transaction(async (tx) => {
    const turma = await turmaDoDono(tx, validado.turma_id, sessao);
    const dono = await donoTravado(tx, turma.facilitador_id);

    // O custo vem do tipo de relatorio DA TURMA: e ela que define o que cada
    // pessoa recebe, entao e ela que define o preco. O numero sai da tabela de
    // precos, lido DENTRO da transacao e com a linha do dono ja travada: o lote
    // inteiro e cobrado pelo preco de um instante so, e cada mapa guarda esse
    // preco em `creditos_usados` — mudanca de preco depois nao alcanca nenhum.
    const custoUnitario = await custoDoRelatorio(turma.tipo_relatorio, tx);
    const custoTotal = custoUnitario * validado.destinatarios.length;

    if (dono.creditos < custoTotal) {
      throw new RecusaDeRegra(
        `Saldo insuficiente: ${validado.destinatarios.length} passaporte(s) ${turma.tipo_relatorio} custam ${custoTotal} credito(s), o saldo e ${dono.creditos} e faltam ${custoTotal - dono.creditos}. Nenhum passaporte foi enviado.`,
      );
    }

    const agora = new Date();
    const expiraEm = validadeDoLink(agora);

    const novos = await tx
      .insert(assessments)
      .values(
        validado.destinatarios.map((destinatario) => ({
          token: novoToken(),
          facilitador_id: turma.facilitador_id,
          turma_id: turma.id,
          avaliado_nome: destinatario.avaliado_nome,
          avaliado_email: destinatario.avaliado_email,
          tipo_relatorio: turma.tipo_relatorio,
          situacao: "pendente" as const,
          creditos_usados: custoUnitario,
          expira_em: expiraEm,
          modified_by: sessao.userId,
        })),
      )
      .returning();

    await tx
      .update(usuarios)
      .set({
        creditos: dono.creditos - custoTotal,
        updated_at: agora,
        modified_by: sessao.userId,
      })
      .where(eq(usuarios.id, turma.facilitador_id));

    await tx.insert(creditosTransacoes).values(
      novos.map((novo) => ({
        usuario_id: turma.facilitador_id,
        tipo: "uso" as const,
        quantidade: -custoUnitario,
        descricao: `Passaporte ${turma.tipo_relatorio} de ${novo.avaliado_nome} (grupo "${turma.nome}")`,
        assessment_id: novo.id,
        modified_by: sessao.userId,
      })),
    );

    // UMA linha de trilha para o lote, na turma: o que aconteceu foi um envio
    // em lote, e N linhas iguais contariam N vezes o mesmo evento. Os mapas
    // criados vao inteiros em `dados_novos`, entao nada se perde.
    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: turma.id,
        detalhes: `Enviou ${novos.length} passaporte(s) ${turma.tipo_relatorio} na turma "${turma.nome}" (${custoTotal} credito(s))`,
        dadosNovos: novos,
      },
      tx,
    );

    return {
      turma: turma.nome,
      criados: novos.length,
      creditos: custoTotal,
      saldo: dono.creditos - custoTotal,
    };
  });
}

/**
 * Exclui (logico) os mapas ainda nao respondidos da turma e DEVOLVE o credito.
 *
 * "Ainda nao respondido" e tudo que nao esta concluido — pendente, em
 * andamento e vencido. E a mesma conta que a lista de turmas mostra como "N
 * pendentes", e ter duas definicoes de pendente faria a confirmacao prometer
 * um numero e a acao remover outro. Quem ja respondeu nao e tocado: o
 * relatorio dele existe, e ali o credito foi gasto de verdade.
 *
 * O estorno NAO soma no saldo direto: lanca uma linha `estorno` no extrato por
 * mapa devolvido, na MESMA transacao que mexe no saldo. A trigger da 0005
 * aborta o COMMIT se os dois lados nao fecharem — e assim o extrato continua
 * sendo o que EXPLICA o saldo, em vez de um numero que apareceu do nada.
 *
 * Devolve o `creditos_usados` de cada mapa, e nao o preco de hoje do tipo de
 * relatorio: se a tabela de precos mudar, devolver o preco novo criaria ou
 * destruiria credito na diferenca.
 */
export async function removerPendentes(turmaId: string) {
  const sessao = await exigirSessao("deletar");

  return db.transaction(async (tx) => {
    const turma = await turmaDoDono(tx, turmaId, sessao);
    const dono = await donoTravado(tx, turma.facilitador_id);

    const pendentes = await tx
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.turma_id, turma.id),
          eq(assessments.facilitador_id, turma.facilitador_id),
          eq(assessments.is_deleted, false),
          ne(assessments.situacao, "concluido"),
        ),
      );

    if (pendentes.length === 0) {
      throw new RecusaDeRegra(`O grupo "${turma.nome}" nao tem passaporte pendente para remover.`);
    }

    const estorno = pendentes.reduce((soma, mapa) => soma + mapa.creditos_usados, 0);
    const agora = new Date();

    await tx
      .update(assessments)
      .set({
        is_deleted: true,
        deleted_at: agora,
        updated_at: agora,
        modified_by: sessao.userId,
      })
      .where(
        inArray(
          assessments.id,
          pendentes.map((mapa) => mapa.id),
        ),
      );

    await tx.insert(creditosTransacoes).values(
      pendentes.map((mapa) => ({
        usuario_id: turma.facilitador_id,
        tipo: "estorno" as const,
        quantidade: mapa.creditos_usados,
        descricao: `Estorno do passaporte de ${mapa.avaliado_nome}, removido do grupo "${turma.nome}"`,
        assessment_id: mapa.id,
        modified_by: sessao.userId,
      })),
    );

    await tx
      .update(usuarios)
      .set({
        creditos: dono.creditos + estorno,
        updated_at: agora,
        modified_by: sessao.userId,
      })
      .where(eq(usuarios.id, turma.facilitador_id));

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "excluir",
        tabela: TABELA,
        registroId: turma.id,
        detalhes: `Removeu ${pendentes.length} passaporte(s) pendente(s) da turma "${turma.nome}" e estornou ${estorno} credito(s)`,
        dadosAnteriores: pendentes,
      },
      tx,
    );

    return {
      turma: turma.nome,
      removidos: pendentes.length,
      creditos: estorno,
      saldo: dono.creditos + estorno,
    };
  });
}

// --- portas da tela: recusa vira objeto, falha de verdade continua subindo ---

/**
 * Igual a `recusa.paraTela`, menos numa coisa: o `revalidatePath` aponta para
 * o LAYOUT.
 *
 * As duas operacoes daqui mexem no saldo, e o saldo aparece no chip da barra
 * lateral, que mora em `facilitador/layout.tsx`. Invalidando so a pagina, a
 * tela mostraria o saldo novo no corpo e o velho no chip ao mesmo tempo — e
 * numa tela cujo assunto e gasto de credito, dois saldos diferentes valem
 * menos que nenhum. Mesmo motivo de `assessments.criarPelaTela`.
 */
async function paraTelaComSaldo<T>(
  operacao: () => Promise<T>,
): Promise<{ ok: true; dado: T } | { ok: false; erro: string }> {
  try {
    const dado = await operacao();
    revalidatePath(TELA, "layout");
    return { ok: true, dado };
  } catch (erro) {
    if (erro instanceof RecusaDeRegra) return { ok: false, erro: erro.message };
    if (erro instanceof ZodError) {
      return { ok: false, erro: erro.issues[0]?.message ?? "Dados invalidos" };
    }
    throw erro;
  }
}

export async function criarLotePelaTela(dados: unknown) {
  return paraTelaComSaldo(() => criarLote(dados));
}

export async function removerPendentesPelaTela(turmaId: string) {
  return paraTelaComSaldo(() => removerPendentes(turmaId));
}
