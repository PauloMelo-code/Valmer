/**
 * Cadastro, edicao e venda de credito do parceiro, em um lugar so.
 *
 * As telas do admin — /admin/facilitadores (lista, novo e [id]) e /admin/creditos —
 * chamam daqui, porque as duas fazem a mesma coisa por baixo: somam credito no
 * saldo de alguem. E saldo neste sistema nao e um numero solto: a partir da
 * migration 0005 o banco confere no COMMIT se `usuarios.creditos` bate com a
 * soma de `creditos_transacoes` daquele usuario. Quem move o saldo grava o
 * extrato na MESMA transacao — igual a `actions/assessments.ts:criar`, que
 * gasta o credito pelo mesmo contrato.
 *
 * ponytail: o arquivo vive perto do teto de 500 linhas do projeto
 * (scripts/check-compliance.mjs). `comoRecusa` ja subiu para actions/recusa.ts,
 * que era o corte barato. O proximo, quando faltar espaco de novo, e tirar a
 * edicao (obter/atualizar/definirSenhaDoParceiro e as portas de tela) para
 * actions/facilitadores-edicao.ts, que hoje nao depende mais de nada daqui.
 */
"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { creditosTransacoes, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Acao, type Sessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { definirSenha } from "@/lib/auth/senha";
import { enviarAcessoPorEmail, type EnvioDeAcesso } from "@/lib/auth/enviar-acesso";
import { pacotePorNome } from "@/lib/precos";
import { senhaNovaSchema } from "@/lib/validators/auth";
import {
  atualizarFacilitadorSchema,
  criarFacilitadorSchema,
  venderCreditosSchema,
} from "@/lib/validators/facilitador";
import { comoRecusa, RecusaDeRegra } from "./recusa";

const TABELA = "usuarios";

/**
 * Nao ha permissao propria de credito no rbac, e nem precisa haver: vender
 * credito e escrever em `usuarios.creditos`. Quem pode atualizar o parceiro
 * pode creditar, e hoje isso e so o admin. Um recurso "creditos" separado
 * seria uma segunda chave para a mesma porta.
 */
async function exigirSessao(acao: Acao): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, TABELA, acao)) {
    throw new Error(`Sem permissao para ${acao} usuarios`);
  }
  return sessao;
}

/**
 * Cria o parceiro com o pacote ja creditado.
 *
 * Usuario, saldo, extrato e trilha entram na mesma transacao. O e-mail de
 * acesso e a unica coisa de fora, e por um motivo do Better Auth: o token de
 * primeiro acesso nasce em `verificacoes` por conexao propria, que nao enxerga
 * esta transacao — gerado aqui dentro, apontaria para um usuario que o COMMIT
 * ainda pode desfazer.
 */
export async function criar(dados: unknown) {
  const sessao = await exigirSessao("criar");
  const validado = criarFacilitadorSchema.parse(dados);

  const criado = await db.transaction(async (tx) => {
    // O pacote vem da tabela `precos_pacotes`, e nao mais de data/planos.ts:
    // lido dentro da transacao que credita, ele recusa nome descontinuado e a
    // quantidade continua vindo do pacote, nunca da tela. Ver lib/precos.ts.
    const pacote = await pacotePorNome(validado.pacote, tx);
    // O indice unico de e-mail ja recusaria, mas com erro de banco: a tela
    // mostraria "duplicate key value violates unique constraint" para o que e
    // uma decisao de negocio banal. A consulta antes existe para a recusa ter
    // nome; o indice continua sendo a garantia.
    const [existente] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, validado.email))
      .limit(1);

    if (existente) {
      throw new RecusaDeRegra(`Ja existe um usuario com o e-mail ${validado.email}.`);
    }

    const [novo] = await tx
      .insert(usuarios)
      .values({
        nome: validado.nome,
        email: validado.email,
        papel: "facilitador",
        empresa: validado.empresa,
        creditos: pacote.creditos,
        modified_by: sessao.userId,
      })
      .returning();

    await tx.insert(creditosTransacoes).values({
      usuario_id: novo.id,
      tipo: "compra",
      quantidade: pacote.creditos,
      // O preco COBRADO fica na linha, junto da quantidade, pelo mesmo motivo
      // que o custo do mapa fica em `assessments.creditos_usados`: o painel
      // recalculava a receita com o pacote vigente, entao o admin mexer em
      // /admin/precos reescrevia o faturamento do mes passado. Ver
      // `schema/creditos.ts`.
      valor_cobrado: pacote.preco,
      descricao: `Pacote ${pacote.nome} na abertura da conta`,
      modified_by: sessao.userId,
    });

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "criar",
        tabela: TABELA,
        registroId: novo.id,
        detalhes: `Criou o parceiro ${novo.email} com o pacote ${pacote.nome} (${pacote.creditos} creditos)`,
        dadosNovos: novo,
      },
      tx,
    );

    return novo;
  });

  // O parceiro nasce SEM senha: recebe por e-mail um link de uso unico para
  // definir a propria (o admin nunca escolhe a senha de outra pessoa).
  //
  // ponytail: o envio e depois do COMMIT e sem fila. Se o SMTP falhar o
  // cadastro fica de pe (com credito) e o motivo volta em `acesso`: o admin
  // usa "Reenviar acesso" na lista. Fila com nova tentativa so se o volume de
  // cadastros justificar. `definirSenhaDoParceiro` segue como plano B.
  const acesso = await enviarAcessoPorEmail(criado, sessao.userId);

  return { ...criado, acesso };
}

/**
 * Reenvia o link de acesso ao parceiro (botao "Reenviar acesso" da lista).
 *
 * Parceiro inativo nao recebe: o link serviria a quem o admin acabou de trancar
 * para fora. A recusa de envio sobe como `RecusaDeRegra` com o motivo real.
 */
export async function enviarAcessoDoParceiro(id: string) {
  const sessao = await exigirSessao("atualizar");

  const parceiro = await obter(id);
  if (!parceiro) throw new RecusaDeRegra("Parceiro nao encontrado");
  if (!parceiro.ativo) throw new RecusaDeRegra("Parceiro inativo: reative a conta antes de enviar o acesso.");

  const envio = await enviarAcessoPorEmail(parceiro, sessao.userId);
  if (!envio.ok) throw new RecusaDeRegra(`O e-mail não saiu: ${envio.erro}.`);

  return { email: parceiro.email };
}

/**
 * Venda de um pacote a um parceiro que ja existe.
 *
 * A linha do parceiro entra travada (`for update`) pelo mesmo motivo do gasto
 * em assessments: duas vendas simultaneas leem o mesmo saldo e a segunda
 * sobrescreve a primeira — o extrato somaria dois pacotes e o saldo mostraria
 * um, que e exatamente o que a trigger da 0005 aborta.
 */
export async function venderCreditos(dados: unknown) {
  const sessao = await exigirSessao("atualizar");
  const validado = venderCreditosSchema.parse(dados);

  return db.transaction(async (tx) => {
    const pacote = await pacotePorNome(validado.pacote, tx);
    const [parceiro] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, validado.facilitador_id), eq(usuarios.is_deleted, false)))
      .limit(1)
      .for("update");

    if (!parceiro) throw new RecusaDeRegra("Parceiro nao encontrado");
    if (!parceiro.ativo) throw new RecusaDeRegra("Parceiro inativo");

    const saldo = parceiro.creditos + pacote.creditos;

    await tx
      .update(usuarios)
      .set({ creditos: saldo, updated_at: new Date(), modified_by: sessao.userId })
      .where(eq(usuarios.id, parceiro.id));

    await tx.insert(creditosTransacoes).values({
      usuario_id: parceiro.id,
      tipo: "compra",
      quantidade: pacote.creditos,
      // Mesma copia de preco de `criar`: os dois sao caminhos de venda, e um
      // deles sem o valor gravado deixaria metade da receita sem lastro.
      valor_cobrado: pacote.preco,
      descricao: `Pacote ${pacote.nome}`,
      modified_by: sessao.userId,
    });

    await registrarAuditoria(
      {
        userId: sessao.userId,
        acao: "atualizar",
        tabela: TABELA,
        registroId: parceiro.id,
        detalhes: `Vendeu o pacote ${pacote.nome} (${pacote.creditos} creditos) para ${parceiro.email}: saldo ${parceiro.creditos} -> ${saldo}`,
        dadosAnteriores: parceiro,
        dadosNovos: { ...parceiro, creditos: saldo },
      },
      tx,
    );

    return { nome: parceiro.nome, creditos: pacote.creditos, saldo };
  });
}

/**
 * Um parceiro pelo id.
 *
 * Nao ha `escopoDoDono` como em `clientes.ts` ou `turmas.ts` porque `usuarios`
 * nao tem dono: o recorte inteiro e o RBAC, e `usuarios:ler` e so do admin.
 *
 * O WHERE limita a `papel = 'facilitador'` de proposito. Esta e a tela de
 * PARCEIRO, e deixar um admin passar por ela seria dar ao formulario o poder de
 * desativar a unica conta capaz de reativar as outras. O admin muda o proprio
 * cadastro em /facilitador/perfil.
 */
export async function obter(id: string) {
  await exigirSessao("ler");

  // O id vem do endereco da tela, e um segmento que nao e uuid faz o Postgres
  // lancar "invalid input syntax for type uuid" — 500 onde o certo e 404.
  if (!z.string().uuid().safeParse(id).success) return null;

  const [linha] = await db
    .select()
    .from(usuarios)
    .where(
      and(eq(usuarios.id, id), eq(usuarios.is_deleted, false), eq(usuarios.papel, "facilitador")),
    )
    .limit(1);

  return linha ?? null;
}

/**
 * Atualiza o cadastro do parceiro: nome, e-mail, empresa, telefone e situacao.
 *
 * Optimistic locking por `updated_at`, como em `clientes.ts` e `turmas.ts`: o
 * WHERE compara com o valor que a tela leu, e se outra aba gravou nesse meio
 * tempo nenhuma linha casa e a gravacao e recusada.
 *
 * `creditos` nao entra — nem por campo de formulario, nem por chave a mais na
 * chamada. Ver `atualizarFacilitadorSchema`: o saldo e a soma do extrato, e a
 * trigger da 0005 aborta o COMMIT de quem mexe num lado so. Saldo se move
 * vendendo pacote (`venderCreditos`), que lanca a linha do extrato junto.
 *
 * Desativar aqui tem efeito de verdade: `lib/auth/config.ts` recusa o login de
 * quem esta `ativo = false`, antes de a sessao nascer.
 */
export async function atualizar(id: string, dados: unknown, updatedAtOriginal: Date) {
  const sessao = await exigirSessao("atualizar");
  const validado = atualizarFacilitadorSchema.parse(dados);

  const anterior = await obter(id);
  if (!anterior) throw new RecusaDeRegra("Parceiro nao encontrado");

  // A consulta exclui a propria linha — senao o parceiro colidiria consigo
  // mesmo ao ter so o nome corrigido — e nao filtra `is_deleted`, porque
  // `uq_usuarios_email` e indice TOTAL: a linha excluida continua ocupando o
  // endereco. Isto existe para a recusa ter NOME; quem garante a unicidade e o
  // indice, e a corrida dele volta traduzida por `comoRecusa`.
  const [repetido] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.email, validado.email), ne(usuarios.id, id)))
    .limit(1);

  if (repetido) {
    throw new RecusaDeRegra(`Ja existe um usuario com o e-mail ${validado.email}.`);
  }

  const resultado = await db
    .update(usuarios)
    .set({
      nome: validado.nome,
      email: validado.email,
      empresa: validado.empresa,
      telefone: validado.telefone,
      ativo: validado.ativo,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(
      and(
        eq(usuarios.id, id),
        eq(usuarios.updated_at, updatedAtOriginal),
        eq(usuarios.is_deleted, false),
        eq(usuarios.papel, "facilitador"),
      ),
    )
    .returning();

  if (resultado.length === 0) {
    throw new RecusaDeRegra(
      "Este parceiro foi alterado por outra aba. Recarregue a pagina e tente de novo.",
    );
  }

  const salvo = resultado[0]!;

  // A troca de e-mail e a de situacao entram NA FRASE, e nao so nos objetos:
  // as duas mudam por onde a pessoa entra, e quem procura na trilha "quem
  // tirou o acesso do parceiro" le a coluna de detalhes.
  const mudou = [
    anterior.email === salvo.email ? null : `e-mail ${anterior.email} -> ${salvo.email}`,
    anterior.ativo === salvo.ativo ? null : salvo.ativo ? "reativou a conta" : "desativou a conta",
  ].filter(Boolean);

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: id,
    detalhes: `Atualizou o parceiro ${salvo.email}${mudou.length ? ` (${mudou.join("; ")})` : ""}`,
    dadosAnteriores: anterior,
    dadosNovos: salvo,
  });

  return salvo;
}

/**
 * Da uma senha nova ao parceiro.
 *
 * Plano B do e-mail de acesso (`enviarAcessoDoParceiro`): quando o SMTP esta
 * fora do ar ou o parceiro nao recebe, o admin ainda consegue destravar a conta.
 *
 * Nao exige a senha atual, ao contrario de `perfil.trocarSenha`, e nao e
 * descuido: o admin nao tem a senha do parceiro — o caso que isto resolve e
 * justamente a conta em que ela nao existe. Quem autoriza e o RBAC
 * (`usuarios:atualizar`, so admin), nao o conhecimento do segredo.
 *
 * Fora de transacao pelo mesmo motivo de `criar`, e a trilha registra o EVENTO,
 * nunca a senha: a coluna de detalhes e texto que o admin le, e senha em log e
 * senha vazada.
 */
export async function definirSenhaDoParceiro(id: string, senha: unknown) {
  const sessao = await exigirSessao("atualizar");
  const validada = senhaNovaSchema.parse(senha);

  const parceiro = await obter(id);
  if (!parceiro) throw new RecusaDeRegra("Parceiro nao encontrado");

  await definirSenha(parceiro.id, validada);

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: parceiro.id,
    detalhes: `Definiu uma nova senha para o parceiro ${parceiro.email}`,
  });
}

/**
 * O que o formulario de novo parceiro chama.
 *
 * Mesma traducao de `assessments.criarPelaTela`, pelo mesmo motivo: uma Server
 * Action que lanca chega ao navegador como digest opaco em producao, e a tela
 * mostraria a mesma coisa para "e-mail ja cadastrado" e para "banco fora do
 * ar". Recusa de regra volta como objeto; falha de verdade continua subindo.
 *
 * A invalidacao aponta para o layout de /admin porque a lista de parceiros, o
 * extrato e as metricas do painel mudam todos com esta gravacao, e cada um
 * mora numa rota diferente.
 */
export async function criarPelaTela(
  dados: unknown,
): Promise<
  | { ok: true; id: string; nome: string; creditos: number; acesso: EnvioDeAcesso }
  | { ok: false; erro: string }
> {
  try {
    const criado = await criar(dados);
    revalidatePath("/admin", "layout");
    return { ok: true, id: criado.id, nome: criado.nome, creditos: criado.creditos, acesso: criado.acesso };
  } catch (erro) {
    const recusa = comoRecusa(erro);
    if (recusa) return { ok: false, erro: recusa };
    throw erro;
  }
}

/** Venda a partir da tela de creditos. Mesmo contrato de `criarPelaTela`. */
export async function venderPelaTela(
  dados: unknown,
): Promise<
  { ok: true; nome: string; creditos: number; saldo: number } | { ok: false; erro: string }
> {
  try {
    const venda = await venderCreditos(dados);
    revalidatePath("/admin", "layout");
    return { ok: true, ...venda };
  } catch (erro) {
    const recusa = comoRecusa(erro);
    if (recusa) return { ok: false, erro: recusa };
    throw erro;
  }
}

type Resposta = { ok: true } | { ok: false; erro: string };

/**
 * Casca das tres portas de edicao. Nao usa `recusa.paraTela` porque aquela nao
 * conhece a traducao do 23505 — a corrida do indice unico de e-mail chegaria a
 * tela como "duplicate key value violates unique constraint".
 *
 * A invalidacao aponta para o layout de /admin porque a lista, o seletor da
 * tela de creditos e as metricas do painel mudam todos com esta gravacao, e
 * cada um mora numa rota diferente.
 */
async function pelaTela(operacao: () => Promise<unknown>): Promise<Resposta> {
  try {
    await operacao();
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (erro) {
    const recusa = comoRecusa(erro);
    if (recusa) return { ok: false, erro: recusa };
    throw erro;
  }
}

/** Edicao a partir de /admin/facilitadores/[id]. */
export async function atualizarPelaTela(
  id: string,
  dados: unknown,
  updatedAtOriginal: Date,
): Promise<Resposta> {
  return pelaTela(() => atualizar(id, dados, updatedAtOriginal));
}

/** Reenvio do acesso a partir da lista. Devolve o e-mail para o toast. */
export async function enviarAcessoPelaTela(
  id: string,
): Promise<{ ok: true; email: string } | { ok: false; erro: string }> {
  let email = "";
  const resposta = await pelaTela(async () => {
    email = (await enviarAcessoDoParceiro(id)).email;
  });
  return resposta.ok ? { ok: true, email } : resposta;
}

/** Senha nova a partir da mesma tela. */
export async function definirSenhaPelaTela(id: string, senha: unknown): Promise<Resposta> {
  return pelaTela(() => definirSenhaDoParceiro(id, senha));
}

/**
 * O interruptor de ativar/desativar da lista.
 *
 * Passa pela MESMA action de edicao, e nao por um UPDATE proprio: dois
 * escritores para `ativo` seriam duas chances de um deles esquecer a trilha, o
 * `modified_by` ou o `updated_at`. O cadastro que viaja junto e o que acabou de
 * ser lido aqui, entao a linha nao perde nada ao ser regravada.
 *
 * Recebe a situacao DESEJADA, e nao "inverta": com "inverta", dois cliques de
 * abas que leram a mesma lista se cancelam e o parceiro fica no estado que
 * ninguem pediu.
 */
export async function definirSituacaoPelaTela(id: string, ativo: boolean): Promise<Resposta> {
  return pelaTela(async () => {
    const anterior = await obter(id);
    if (!anterior) throw new RecusaDeRegra("Parceiro nao encontrado");

    // Coluna nula vira string vazia porque o schema aceita o campo em branco e
    // o transforma de volta em NULL. Sem isto, desativar um parceiro sem
    // empresa cadastrada seria recusado por um campo que a lista nem mostra.
    return atualizar(
      id,
      {
        nome: anterior.nome,
        email: anterior.email,
        empresa: anterior.empresa ?? "",
        telefone: anterior.telefone ?? "",
        ativo,
      },
      anterior.updated_at,
    );
  });
}
