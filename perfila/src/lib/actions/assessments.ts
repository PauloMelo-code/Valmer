/**
 * Regra de negocio dos assessments, em um lugar so.
 *
 * Toda tela — portal do facilitador, painel do admin, envio expresso — chama
 * estas funcoes. Nenhuma delas repete a regra de credito, de escopo ou de
 * auditoria: se a regra mudar aqui, muda em todas.
 */
"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ZodError } from "zod";
import { db } from "@/lib/db";
import { assessments, creditosTransacoes, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { RecusaDeRegra } from "./recusa";
import { novoToken, validadeDoLink } from "@/lib/assessment-link";
import {
  atualizarAssessmentSchema,
  criarAssessmentSchema,
} from "@/lib/validators/assessment";
import { custoDoRelatorio } from "@/lib/precos";

const TABELA = "assessments";

async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "assessments", acao)) {
    throw new Error(`Sem permissao para ${acao} mapas`);
  }
  return sessao;
}

/**
 * Recorte por dono: o facilitador so enxerga e mexe nos assessments dele.
 * O admin enxerga os de todos os parceiros, que e o que o painel dele mostra.
 */
function escopoDoDono(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(assessments.facilitador_id, sessao.userId);
}

/** Lista os assessments visiveis para a sessao, do mais novo ao mais antigo. */
export async function listar() {
  const sessao = await exigirSessao("ler");

  return db
    .select()
    .from(assessments)
    .where(and(eq(assessments.is_deleted, false), escopoDoDono(sessao)))
    .orderBy(desc(assessments.created_at));
}

/** Um assessment pelo id, respeitando o escopo do dono. */
export async function obter(id: string) {
  const sessao = await exigirSessao("ler");

  const [registro] = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.is_deleted, false), escopoDoDono(sessao)))
    .limit(1);

  return registro ?? null;
}

/**
 * Cria o assessment e consome os creditos do facilitador.
 *
 * As QUATRO escritas — assessment, saldo, extrato e trilha — acontecem na mesma
 * transacao, com a linha do facilitador travada. Sem a trava, duas criacoes
 * simultaneas leem o mesmo saldo e gastam o mesmo credito duas vezes. E com a
 * trilha fora da transacao, uma falha ao grava-la derrubaria a action DEPOIS
 * do commit: a tela mostraria erro, o facilitador refaria, e o credito sairia
 * duas vezes por um assessment que ja existia.
 *
 * DEGUSTACAO paga com o outro bolso: consome 1 de `usuarios.creditos_degustacao`,
 * grava `creditos_usados = 0` e NAO lanca extrato. Sao tres escritas em vez de
 * quatro, e a mesma trava de linha protege os dois saldos.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarAssessmentSchema.parse(dados);

  const facilitadorId = validado.facilitador_id ?? sessao.userId;
  if (sessao.papel !== "admin" && facilitadorId !== sessao.userId) {
    throw new Error("Sem permissao para criar mapa em nome de outro facilitador");
  }

  const expiraEm = validadeDoLink(new Date());

  const criado = await db.transaction(async (tx) => {
    const [dono] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, facilitadorId), eq(usuarios.is_deleted, false)))
      .limit(1)
      .for("update");

    // Recusas de regra, e nao falhas: sao estados que a tela precisa mostrar
    // ao facilitador com o nome que eles tem. Ver `criarPelaTela` abaixo.
    if (!dono) throw new RecusaDeRegra("Facilitador nao encontrado");
    if (!dono.ativo) throw new RecusaDeRegra("Facilitador inativo");

    /**
     * O custo vem da tabela de precos (`precos_relatorios`), lido DENTRO da
     * transacao e com a linha do dono ja travada: o numero que recusa por saldo
     * curto e o mesmo que vai para `creditos_usados` e para o extrato. Se o
     * admin mudar o preco no meio, esta transacao ja escolheu o seu.
     *
     * Degustacao custa ZERO credito: ela sai do saldo de amostras, que e outro
     * bolso e nao tem extrato — ver `usuarios.creditos_degustacao`.
     */
    const custo = validado.degustacao
      ? 0
      : await custoDoRelatorio(validado.tipo_relatorio, tx);

    if (validado.degustacao) {
      if (dono.creditos_degustacao < 1) {
        throw new RecusaDeRegra(
          "Sem testes grátis disponíveis. Os testes gratuitos acabaram; envie este mapa normalmente ou peça mais testes grátis ao administrador.",
        );
      }
    } else if (dono.creditos < custo) {
      throw new RecusaDeRegra(
        `Saldo insuficiente: ${validado.tipo_relatorio} custa ${custo} credito(s) e o saldo e ${dono.creditos}.`,
      );
    }

    const [novo] = await tx
      .insert(assessments)
      .values({
        token: novoToken(),
        facilitador_id: facilitadorId,
        avaliado_nome: validado.avaliado_nome,
        avaliado_email: validado.avaliado_email,
        tipo_relatorio: validado.tipo_relatorio,
        situacao: "pendente",
        creditos_usados: custo,
        degustacao: validado.degustacao,
        expira_em: expiraEm,
        modified_by: sessao.userId,
      })
      .returning();

    if (validado.degustacao) {
      /**
       * So o saldo de amostras se move. O UPDATE nao lista `creditos`, entao a
       * CONSTRAINT TRIGGER da migration 0005 — que dispara em `UPDATE OF
       * creditos` — nem e acionada, e nao ha extrato a lancar: a degustacao nao
       * e dinheiro. A trilha de auditoria abaixo e o registro do movimento.
       */
      await tx
        .update(usuarios)
        .set({
          creditos_degustacao: dono.creditos_degustacao - 1,
          updated_at: new Date(),
          modified_by: sessao.userId,
        })
        .where(eq(usuarios.id, facilitadorId));
    } else {
      await tx
        .update(usuarios)
        .set({
          creditos: dono.creditos - custo,
          updated_at: new Date(),
          modified_by: sessao.userId,
        })
        .where(eq(usuarios.id, facilitadorId));

      await tx.insert(creditosTransacoes).values({
        usuario_id: facilitadorId,
        tipo: "uso",
        quantidade: -custo,
        descricao: `Mapa ${validado.tipo_relatorio} de ${validado.avaliado_nome}`,
        assessment_id: novo.id,
        modified_by: sessao.userId,
      });
    }

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: novo.id,
        detalhes: validado.degustacao
          ? `Criou assessment ${novo.tipo_relatorio} de DEGUSTACAO para ${novo.avaliado_email} (1 amostra, 0 credito)`
          : `Criou assessment ${novo.tipo_relatorio} para ${novo.avaliado_email} (${custo} credito(s))`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo;
  });

  return criado;
}

/**
 * Criacao a partir do formulario da tela.
 *
 * Mesma regra de `criar()` — esta funcao nao decide nada, so traduz a resposta.
 * Uma Server Action que lanca entrega ao navegador um digest opaco em
 * producao: a tela receberia "Server Components render error" tanto para saldo
 * insuficiente quanto para o banco fora do ar, e mostraria a mensagem errada
 * numa das duas vezes. Recusa de regra volta como objeto; falha de verdade
 * continua subindo, porque ai a tela quebrada e a resposta honesta.
 *
 * Devolve o token porque o link do avaliado e o produto desta tela: sem ele o
 * facilitador nao tem o que entregar.
 *
 * A invalidacao aponta para o LAYOUT porque e la que mora o saldo que ficava
 * velho: o subtitulo da lista vem da pagina, mas o chip da barra lateral vem
 * de `facilitador/layout.tsx`, e numa navegacao pelo cliente o Next
 * reaproveita o layout compartilhado. Sem invalidar do servidor, a tela
 * mostrava "11 creditos" no subtitulo e "12 creditos" no chip ao mesmo tempo
 * — e numa tela cujo proposito e decidir gasto de credito, dois saldos
 * diferentes valem menos que nenhum.
 *
 * Nao adianta `router.refresh()` antes do `push`: ele atualiza a rota que esta
 * saindo, nao a que vai entrar.
 *
 * Por causa disto esta funcao exige uma requisicao em curso: `revalidatePath`
 * lanca fora de uma. Quem chama de script ou de teste usa `criar()` direto.
 */
export async function criarPelaTela(
  dados: unknown,
): Promise<{ ok: true; token: string } | { ok: false; erro: string }> {
  try {
    const criado = await criar(dados);
    revalidatePath("/facilitador", "layout");
    return { ok: true, token: criado.token };
  } catch (erro) {
    if (erro instanceof RecusaDeRegra) return { ok: false, erro: erro.message };

    // Zod ja explica o campo errado em portugues; a primeira mensagem basta,
    // porque o formulario tem dois campos e o usuario corrige um por vez.
    if (erro instanceof ZodError) {
      return { ok: false, erro: erro.issues[0]?.message ?? "Dados invalidos" };
    }

    throw erro;
  }
}

/**
 * Atualiza nome e e-mail do avaliado, com optimistic locking.
 *
 * O WHERE compara `updated_at` com o valor que a tela leu. Se outro usuario
 * gravou nesse meio tempo, nenhuma linha casa e a gravacao e recusada em vez
 * de sobrescrever o trabalho alheio.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarAssessmentSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new Error("Mapa nao encontrado");

  const resultado = await db
    .update(assessments)
    .set({
      avaliado_nome: validado.avaliado_nome,
      avaliado_email: validado.avaliado_email,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(assessments.id, id),
        eq(assessments.updated_at, updatedAtOriginal),
        eq(assessments.is_deleted, false),
        escopoDoDono(sessao),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new Error("Registro alterado por outro usuario. Recarregue e tente novamente.");
  }

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou o avaliado do assessment ${id}`,
    dadosAnteriores: anterior,
    dadosNovos: resultado[0],
  });

  return resultado[0];
}

/**
 * Delete logico. Nunca apaga a linha.
 *
 * O credito consumido NAO volta: o link ja foi gerado e pode ter sido
 * enviado. Estorno e decisao do admin, pela tela de creditos.
 */
export async function excluir(id: string) {
  const sessao = await exigirSessao("deletar");

  const anterior = await obter(id);
  if (!anterior) throw new Error("Mapa nao encontrado");

  const resultado = await db
    .update(assessments)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(assessments.id, id), eq(assessments.is_deleted, false), escopoDoDono(sessao)))
    .returning();

  if (resultado.length === 0) throw new Error("Mapa nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "excluir",
    tabela: TABELA,
    registroId: id,
    detalhes: `Excluiu (logico) o assessment de ${anterior.avaliado_email}`,
    dadosAnteriores: anterior,
  });

  return resultado[0];
}
