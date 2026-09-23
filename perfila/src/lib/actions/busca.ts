/**
 * A busca da barra superior.
 *
 * Mesma estrutura das outras actions: sessao exigida na entrada, recorte por
 * dono no WHERE, validacao antes do banco. O recorte aqui e o ponto inteiro do
 * arquivo — uma busca sem dono no WHERE e o jeito mais rapido de vazar a
 * carteira de um concorrente, porque basta digitar um nome para receber os
 * clientes de outro parceiro.
 */
"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { assessments, turmas } from "@/lib/db/schema";
import { getSession, temPermissao, type Sessao } from "@/lib/auth";

/** Quantos resultados de cada tipo a lista mostra. */
const LIMITE = 5;

/**
 * Abaixo disto a busca nem consulta o banco.
 *
 * Uma letra casa com quase tudo: a consulta voltaria o limite inteiro em
 * qualquer base, a cada tecla digitada, sem dizer nada a quem procura.
 */
const MINIMO = 2;

export type ItemBusca = {
  tipo: "avaliado" | "turma";
  id: string;
  titulo: string;
  detalhe: string;
  /**
   * Tela onde o item aparece. Nulo quando o ambiente de quem busca nao tem
   * uma: o admin ve as turmas de todos os parceiros e nao tem tela de turmas.
   */
  href: string | null;
};

export type ResultadoBusca = {
  itens: ItemBusca[];
  /** Havia mais do que o limite em pelo menos um dos dois tipos. */
  truncado: boolean;
};

const VAZIO: ResultadoBusca = { itens: [], truncado: false };

/**
 * O termo digitado.
 *
 * O teto existe pela mesma razao do teto de senha: texto sem limite vindo do
 * cliente vira trabalho de servidor de graca. Nao ha minimo aqui porque termo
 * curto nao e erro de quem digita — e so uma busca que ainda nao comecou.
 */
const termoSchema = z.string().max(120);

/**
 * Escapa os curingas do LIKE.
 *
 * Sem isto, um `%` digitado casa com tudo e um `_` casa com qualquer letra: a
 * pessoa procura "10%" e recebe a lista inteira, sem entender por que.
 *
 * A ARMADILHA E DE JAVASCRIPT, e nao de SQL. A primeira versao era
 * `replace(/[%_]/g, "\$&")`, e ali a barra invertida nao escapa nada: em
 * string comum `"\$&"` VALE `"$&"`, que numa substituicao significa "o proprio
 * trecho casado". Cada % era trocado por um %, e a funcao fazia o contrario do
 * que o comentario acima promete. Passava despercebido porque o codigo parece
 * certo. Sao precisas DUAS barras na origem para uma chegar no resultado.
 *
 * A barra invertida entra na classe junto com os curingas: ela e o proprio
 * caractere de escape do LIKE no Postgres, entao quem digitasse `\` sem isto
 * escaparia o `%` que a gente poe em volta do termo.
 */
function escaparLike(termo: string): string {
  return termo.replace(/[%_\\]/g, "\\$&");
}

/**
 * Recorte por dono, o mesmo de `actions/assessments.ts`: o facilitador so
 * encontra o que e dele, o admin encontra tudo.
 *
 * Repetido aqui, e nao importado, porque aquele modulo e "use server" e so
 * pode exportar funcao assincrona — importar a condicao de la a transformaria
 * em endpoint POST publico.
 */
function escopoDeAssessments(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(assessments.facilitador_id, sessao.userId);
}

function escopoDeTurmas(sessao: Sessao) {
  return sessao.papel === "admin" ? undefined : eq(turmas.facilitador_id, sessao.userId);
}

/**
 * Procura avaliado (nome e e-mail) e turma (nome).
 *
 * NAO procura por id nem por token, de proposito. O token do assessment e a
 * credencial do respondente: um campo de busca que aceita token vira uma porta
 * — quem tiver um token na mao descobre por ele o dono e o resto do cadastro.
 * Id nao entra porque ninguem digita uuid, e aceitar um so serviria para
 * sondar a base alheia com o recorte por dono como unica barreira.
 */
export async function buscar(termo: unknown): Promise<ResultadoBusca> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  const validado = termoSchema.safeParse(termo);
  if (!validado.success) return VAZIO;

  const texto = validado.data.trim();
  if (texto.length < MINIMO) return VAZIO;

  const padrao = `%${escaparLike(texto)}%`;
  // Uma consulta a mais que o limite: e assim que se sabe que ha mais sem
  // contar a tabela inteira.
  const teto = LIMITE + 1;
  const listaDeMapas =
    sessao.papel === "admin" ? "/admin/assessments" : "/facilitador/acervo-de-mapas";

  const [avaliados, encontradas] = await Promise.all([
    temPermissao(sessao.papel, "assessments", "ler")
      ? db
          .select({
            id: assessments.id,
            nome: assessments.avaliado_nome,
            email: assessments.avaliado_email,
          })
          .from(assessments)
          .where(
            and(
              eq(assessments.is_deleted, false),
              escopoDeAssessments(sessao),
              or(
                ilike(assessments.avaliado_nome, padrao),
                ilike(assessments.avaliado_email, padrao),
              ),
            ),
          )
          .orderBy(desc(assessments.created_at))
          .limit(teto)
      : [],

    temPermissao(sessao.papel, "turmas", "ler")
      ? db
          .select({ id: turmas.id, nome: turmas.nome, area: turmas.area })
          .from(turmas)
          .where(
            and(eq(turmas.is_deleted, false), escopoDeTurmas(sessao), ilike(turmas.nome, padrao)),
          )
          .orderBy(desc(turmas.created_at))
          .limit(teto)
      : [],
  ]);

  const itens: ItemBusca[] = [
    ...avaliados.slice(0, LIMITE).map((linha) => ({
      tipo: "avaliado" as const,
      id: linha.id,
      titulo: linha.nome,
      detalhe: linha.email,
      // Leva a lista de mapas ja filtrada por este avaliado. O filtro da lista
      // casa por e-mail, que e o que separa dois homonimos.
      href: `${listaDeMapas}?q=${encodeURIComponent(linha.email)}`,
    })),
    ...encontradas.slice(0, LIMITE).map((linha) => ({
      tipo: "turma" as const,
      id: linha.id,
      titulo: linha.nome,
      detalhe: `Grupo · ${linha.area}`,
      href: sessao.papel === "admin" ? null : "/facilitador/grupos-de-mapeamento",
    })),
  ];

  return {
    itens,
    truncado: avaliados.length > LIMITE || encontradas.length > LIMITE,
  };
}
