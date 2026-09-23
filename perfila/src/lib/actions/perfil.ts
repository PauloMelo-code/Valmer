/**
 * O que o parceiro muda na propria conta: cadastro e senha.
 *
 * Mesma estrutura de `actions/assessments.ts` e `actions/turmas.ts`: sessao
 * exigida na entrada, recorte por dono no WHERE, validacao zod, recusa de
 * regra separada de falha e trilha em toda escrita.
 *
 * O recorte por dono aqui e mais curto que nos outros modulos e por isso mais
 * severo: o WHERE e sempre `id = sessao.userId`. Nao ha id vindo do cliente
 * para conferir, porque nao ha caso em que esta action escreva na linha de
 * outra pessoa — nem para o admin, que edita parceiro pelas telas de /admin.
 */
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { getSession, temPermissao, type Sessao } from "@/lib/auth";
import { conferirSenha, definirSenha } from "@/lib/auth/senha";
import { registrarAuditoria } from "@/lib/audit/logger";
import {
  atualizarPerfilSchema,
  configDegustacaoSchema,
  trocarSenhaSchema,
} from "@/lib/validators/perfil";
import { apagarObjeto, enviarImagem } from "@/lib/storage";
import { RecusaDeRegra } from "./recusa";

const TABELA = "usuarios";

async function exigirSessao(): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "perfil", "atualizar")) {
    throw new Error("Sem permissao para atualizar o perfil");
  }
  return sessao;
}

/** A propria linha, viva. Nulo nunca acontece pelo caminho normal. */
async function meuCadastro(sessao: Sessao) {
  const [linha] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .limit(1);

  return linha ?? null;
}

/**
 * Atualiza nome, empresa e telefone de quem esta logado.
 *
 * O SET lista as tres colunas a mao, e nao espalha o objeto validado: e a
 * segunda camada contra escalada de privilegio. Mesmo que alguem troque o
 * `strictObject` do schema por um `object` — que descarta chave desconhecida
 * em silencio —, `papel`, `creditos`, `ativo` e `email` continuam sem caminho
 * ate o UPDATE. Ver o teste de escalada em tests/perfil.test.mts.
 */
export async function atualizar(dados: unknown) {
  const sessao = await exigirSessao();
  const validado = atualizarPerfilSchema.parse(dados);

  const anterior = await meuCadastro(sessao);
  if (!anterior) throw new RecusaDeRegra("Cadastro nao encontrado");

  const [novo] = await db
    .update(usuarios)
    .set({
      nome: validado.nome,
      empresa: validado.empresa,
      telefone: validado.telefone,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .returning();

  if (!novo) throw new RecusaDeRegra("Cadastro nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: sessao.userId,
    detalhes: `Atualizou o proprio cadastro (${novo.email})`,
    dadosAnteriores: anterior,
    dadosNovos: novo,
  });

  return novo;
}

/**
 * Grava a configuracao da degustacao: qual nivel de relatorio o parceiro
 * oferece como amostra em /facilitador/experimente-gratis.
 *
 * Mora aqui, e nao numa action nova, porque e o que ja define este arquivo: o
 * que o PROPRIO parceiro muda na propria linha de `usuarios`. Mesmo recorte
 * (`id = sessao.userId`), mesma permissao (`perfil:atualizar`) e mesma trilha.
 *
 * O SET lista a coluna a mao, como em `atualizar`: `creditos`,
 * `creditos_degustacao` e `papel` nao tem caminho ate o UPDATE nem se o schema
 * for afrouxado um dia.
 *
 * SEM OPTIMISTIC LOCKING, DE PROPOSITO. `updated_at` desta linha se move a
 * cada degustacao enviada (o debito de `creditos_degustacao` a toca), entao
 * comparar o `updated_at` que a tela leu recusaria a gravacao da configuracao
 * so porque o parceiro enviou uma amostra antes de clicar em Salvar — uma
 * recusa que ele nao teria como entender. O que a trava protege nas outras
 * actions e escrita concorrente de DUAS pessoas; aqui so o dono escreve, e o
 * campo e um so: o ultimo clique dele e a vontade dele.
 */
export async function salvarConfigDegustacao(dados: unknown) {
  const sessao = await exigirSessao();
  const validado = configDegustacaoSchema.parse(dados);

  const anterior = await meuCadastro(sessao);
  if (!anterior) throw new RecusaDeRegra("Cadastro nao encontrado");

  const [novo] = await db
    .update(usuarios)
    .set({
      degustacao_relatorio: validado.tipo_relatorio,
      updated_at: new Date(),
      modified_by: sessao.userId,
    })
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .returning();

  if (!novo) throw new RecusaDeRegra("Cadastro nao encontrado");

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: sessao.userId,
    detalhes: `Passou a oferecer ${novo.degustacao_relatorio} na degustacao (era ${anterior.degustacao_relatorio})`,
    dadosAnteriores: anterior,
    dadosNovos: novo,
  });

  return novo;
}

/**
 * Troca a senha de quem esta logado, mediante a senha atual.
 *
 * A senha atual e conferida ANTES de qualquer escrita, pelo Better Auth
 * (`conferirSenha`). Sem essa exigencia, uma sessao aberta esquecida numa
 * maquina vira tomada de conta: quem passar troca a senha, e o dono so
 * descobre quando o cookie dele vencer.
 *
 * A trilha registra o EVENTO, nunca as senhas — nem a velha, nem a nova, nem
 * o hash. `dadosAnteriores`/`dadosNovos` sao gravados como texto na tabela de
 * auditoria, que o admin le; senha em log e senha vazada.
 *
 * As demais sessoes do usuario NAO sao encerradas. Encerra-las e a resposta
 * certa para "trocaram minha senha porque a conta estava comprometida", mas
 * hoje nao ha tela que explique o logout nos outros dispositivos, e derrubar
 * em silencio parece defeito. Quando houver, o caminho e
 * `internalAdapter.deleteUserSessions` seguido de sessao nova para esta aba,
 * como faz o `/change-password` da biblioteca com `revokeOtherSessions`.
 */
export async function trocarSenha(dados: unknown) {
  const sessao = await exigirSessao();
  const validado = trocarSenhaSchema.parse(dados);

  const cadastro = await meuCadastro(sessao);
  if (!cadastro) throw new RecusaDeRegra("Cadastro nao encontrado");

  if (!(await conferirSenha(sessao.userId, validado.senha_atual))) {
    throw new RecusaDeRegra("Senha atual incorreta.");
  }

  await definirSenha(sessao.userId, validado.senha_nova);

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: sessao.userId,
    detalhes: `Trocou a propria senha (${cadastro.email})`,
  });
}

/**
 * Troca a foto de perfil de quem esta logado.
 *
 * A sessao e exigida na PRIMEIRA linha, e nao depois de ler o arquivo: Server
 * Action e um POST publico, e uma que sobe arquivo antes de saber quem pediu e
 * um deposito aberto na internet — qualquer um enche o bucket.
 *
 * O banco recebe a CHAVE do objeto, nunca a URL. Ver a nota de `lib/storage.ts`:
 * o endereco de hoje e o subdominio padrao do EasyPanel, e no dia em que virar
 * dominio proprio toda URL gravada quebraria de uma vez.
 *
 * A ORDEM e: sobe a nova, grava a chave, so entao apaga a antiga. Apagar antes
 * deixaria a pessoa sem foto nenhuma se o envio falhasse no meio. O preco desta
 * ordem e um objeto orfao quando o UPDATE falha depois do upload — barato perto
 * de perder a foto de quem so queria trocar.
 *
 * Sem esta limpeza o armazenamento cresce para sempre com arquivo que ninguem
 * mais alcanca: cada troca deixaria o anterior no bucket, sem nenhuma linha do
 * banco apontando para ele.
 */
export async function trocarFoto(dados: FormData) {
  const sessao = await exigirSessao();

  const arquivo = dados.get("foto");
  if (!(arquivo instanceof File)) throw new RecusaDeRegra("Escolha uma imagem.");

  const anterior = await meuCadastro(sessao);
  if (!anterior) throw new RecusaDeRegra("Cadastro nao encontrado");

  const chave = await enviarImagem({
    prefixo: `perfil/${sessao.userId}`,
    arquivo,
  });

  const [novo] = await db
    .update(usuarios)
    .set({ image: chave, updated_at: new Date(), modified_by: sessao.userId })
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .returning();

  if (!novo) throw new RecusaDeRegra("Cadastro nao encontrado");

  await apagarObjeto(anterior.image);

  await registrarAuditoria({
    userId: sessao.userId,
    acao: "atualizar",
    tabela: TABELA,
    registroId: sessao.userId,
    detalhes: `Trocou a propria foto de perfil (${novo.email})`,
    dadosAnteriores: anterior,
    dadosNovos: novo,
  });

  return novo;
}

type Resposta = { ok: true } | { ok: false; erro: string };

/**
 * O que os formularios da tela chamam.
 *
 * Mesma traducao de `assessments.criarPelaTela`, pelo mesmo motivo: uma Server
 * Action que lanca chega ao navegador como digest opaco em producao, e "senha
 * atual incorreta" apareceria com a mesma cara de "o banco caiu". Recusa de
 * regra volta como objeto; falha de verdade continua subindo.
 *
 * A invalidacao aponta para o LAYOUT: o nome e a empresa que acabaram de mudar
 * aparecem na barra superior e na lateral, que sao do layout — sem isso a tela
 * salvava e continuava mostrando o nome antigo no canto.
 */
export async function atualizarPelaTela(dados: unknown): Promise<Resposta> {
  try {
    await atualizar(dados);
    revalidarMolduras();
    return { ok: true };
  } catch (erro) {
    return comoResposta(erro);
  }
}

/** Troca de foto a partir da tela. Mesmo contrato de `atualizarPelaTela`. */
export async function trocarFotoPelaTela(dados: FormData): Promise<Resposta> {
  try {
    await trocarFoto(dados);
    revalidarMolduras();
    return { ok: true };
  } catch (erro) {
    return comoResposta(erro);
  }
}

/**
 * Invalida as duas molduras, e nao so a do parceiro.
 *
 * Nome, empresa e foto aparecem na barra superior, que e do LAYOUT — sem isso
 * a tela salva e continua mostrando o dado antigo no canto. Sao dois layouts
 * porque o dono da plataforma edita o proprio cadastro por /admin/perfil e o
 * parceiro por /facilitador/perfil: invalidar so um deixava metade das contas
 * com a barra desatualizada ate o proximo recarregamento.
 */
function revalidarMolduras() {
  revalidatePath("/facilitador", "layout");
  revalidatePath("/admin", "layout");
}

/**
 * Configuracao da degustacao a partir da tela. Mesmo contrato de
 * `atualizarPelaTela`.
 *
 * A invalidacao e so da propria tela: o nivel oferecido nao aparece na barra
 * lateral nem no cabecalho, entao derrubar o layout inteiro recarregaria as
 * outras telas do portal para nada.
 */
export async function salvarConfigDegustacaoPelaTela(dados: unknown): Promise<Resposta> {
  try {
    await salvarConfigDegustacao(dados);
    revalidatePath("/facilitador/experimente-gratis");
    return { ok: true };
  } catch (erro) {
    return comoResposta(erro);
  }
}

/** Troca de senha a partir da tela. Mesmo contrato de `atualizarPelaTela`. */
export async function trocarSenhaPelaTela(dados: unknown): Promise<Resposta> {
  try {
    await trocarSenha(dados);
    return { ok: true };
  } catch (erro) {
    return comoResposta(erro);
  }
}

function comoResposta(erro: unknown): Resposta {
  if (erro instanceof RecusaDeRegra) return { ok: false, erro: erro.message };
  // Zod ja explica o campo errado em portugues, e o formulario tem poucos
  // campos: a primeira mensagem basta, porque a pessoa corrige um por vez.
  if (erro instanceof ZodError) {
    return { ok: false, erro: erro.issues[0]?.message ?? "Dados invalidos" };
  }
  throw erro;
}
