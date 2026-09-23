/**
 * Leitura do relatorio pronto, e a geracao do texto dele.
 *
 * As duas moram no mesmo arquivo e tem regras de acesso OPOSTAS, de proposito:
 *
 * - `carregarRelatorio` e do avaliado. O relatorio e o artefato que o
 *   facilitador entrega ao cliente dele, entao quem tem o link le, sem sessao:
 *   o token e a credencial.
 * - `gerarRelatorio` e do parceiro, custa dinheiro a cada chamada e por isso
 *   exige sessao, permissao e recorte por dono AQUI DENTRO. Server Action e
 *   endpoint POST publico: sem a checagem no corpo da funcao, um script de
 *   terceiro esvaziaria a conta da API repetindo a requisicao.
 *
 * A tela publica do relatorio NAO chama a geracao, e nao deve passar a chamar:
 * ela nao tem sessao para conferir, e quem abrisse o link pagaria minutos de
 * espera por uma pagina em branco. O texto e escrito quando o respondente
 * CONCLUI o mapa (`actions/avaliacao.ts`, fora da transacao), e a lista de
 * mapas mantem o botao manual como segunda tentativa quando aquilo falha.
 */
"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsRelatorios, usuarios } from "@/lib/db/schema";
import { getSession, temPermissao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { esquemaNarrativa, type NarrativaRelatorio } from "@/lib/relatorio/tipos";
import { FalhaNaNarrativa } from "@/lib/relatorio/gerar";
import { gerarESalvar, type FalhaPersistencia } from "@/lib/relatorio/persistir";
import { paraTela, RecusaDeRegra } from "./recusa";
import type { CodigoRelatorio } from "@/data/planos";
import type { FatorDisc } from "@/data/dna";

export type RelatorioCarregado = {
  avaliado: { nome: string; email: string };
  facilitador: { nome: string; empresa: string; telefone: string };
  /** Data da conclusao; a pagina formata. */
  emitidoEm: Date;
  tipoRelatorio: CodigoRelatorio;
  contadores: Record<FatorDisc, number>;
  /** Nula enquanto a geracao por IA nao rodou para este assessment. */
  narrativa: NarrativaRelatorio | null;
};

/**
 * Devolve null quando nao ha relatorio a mostrar, e a pagina transforma isso em
 * 404. Sao tres casos, de proposito indistinguiveis para quem chama: token que
 * nao existe, assessment ainda nao concluido, e concluido sem contadores. O
 * ultimo nao deveria acontecer — `concluir()` grava os quatro na mesma transacao
 * em que fecha o assessment — mas um relatorio com numero inventado e pior que
 * um 404, entao a leitura desconfia em vez de completar com zero.
 */
export async function carregarRelatorio(token: string): Promise<RelatorioCarregado | null> {
  const [linha] = await db
    .select({
      id: assessments.id,
      nome: assessments.avaliado_nome,
      email: assessments.avaliado_email,
      tipo_relatorio: assessments.tipo_relatorio,
      situacao: assessments.situacao,
      concluido_em: assessments.concluido_em,
      created_at: assessments.created_at,
      contador_d: assessments.contador_d,
      contador_i: assessments.contador_i,
      contador_s: assessments.contador_s,
      contador_c: assessments.contador_c,
      facilitador_nome: usuarios.nome,
      facilitador_empresa: usuarios.empresa,
      facilitador_telefone: usuarios.telefone,
    })
    .from(assessments)
    .innerJoin(usuarios, eq(usuarios.id, assessments.facilitador_id))
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1);

  if (!linha || linha.situacao !== "concluido") return null;

  const { contador_d, contador_i, contador_s, contador_c } = linha;
  if (contador_d === null || contador_i === null || contador_s === null || contador_c === null) {
    return null;
  }

  // A ultima versao e a que vale: o versionamento existe para guardar historico,
  // e quem abre o link quer o documento atual.
  const [ultima] = await db
    .select({ narrativa: assessmentsRelatorios.narrativa })
    .from(assessmentsRelatorios)
    .where(
      and(
        eq(assessmentsRelatorios.assessment_id, linha.id),
        eq(assessmentsRelatorios.is_deleted, false),
      ),
    )
    .orderBy(desc(assessmentsRelatorios.versao))
    .limit(1);

  // Narrativa fora do formato e tratada como ausente, e nao como erro: o
  // relatorio inteiro nao pode sumir porque um campo mudou de forma entre
  // versoes do gerador. O resto do documento continua correto.
  const validada = ultima ? esquemaNarrativa.safeParse(ultima.narrativa) : null;

  return {
    avaliado: { nome: linha.nome, email: linha.email },
    facilitador: {
      nome: linha.facilitador_nome,
      empresa: linha.facilitador_empresa ?? "",
      telefone: linha.facilitador_telefone ?? "",
    },
    // Concluido sempre tem data, mas a coluna aceita nulo: cair na criacao
    // imprime uma data plausivel em vez de quebrar a capa.
    emitidoEm: linha.concluido_em ?? linha.created_at,
    tipoRelatorio: linha.tipo_relatorio,
    contadores: { D: contador_d, I: contador_i, S: contador_s, C: contador_c },
    narrativa: validada?.success ? validada.data : null,
  };
}

/** O que a tela mostra quando o assessment nao rende relatorio. */
const MOTIVO: Record<FalhaPersistencia, string> = {
  invalido: "Mapa nao encontrado.",
  nao_concluido: "Este mapa ainda nao foi respondido.",
  sem_contadores: "Este mapa nao tem resultado calculado.",
  // Nao e erro: outro processo esta escrevendo o mesmo texto agora — o
  // `after()` da conclusao, quase sempre. A frase manda esperar em vez de
  // mandar tentar de novo, porque tentar de novo cai na mesma recusa.
  em_geracao: "O texto deste relatorio ja esta sendo escrito. Recarregue a pagina em instantes.",
};

/**
 * Escreve a narrativa deste assessment e grava, versionada.
 *
 * A checagem mora aqui dentro porque uma Server Action e endpoint POST
 * publico: quem passar um token qualquer nao pode gastar a chave da API da
 * empresa. Sessao, permissao e recorte por dono, na mesma ordem de
 * `actions/turmas.ts`.
 *
 * Sem chave, RECUSA. Nao existe plano B que caia na narrativa de exemplo: foi
 * exatamente esse fallback que fez todo relatorio sair com o nome e o texto de
 * outra pessoa.
 *
 * Gerar de novo nao sobrescreve nada. `persistir.ts` grava cada geracao como
 * versao nova e `carregarRelatorio` le a ultima; e sem `forcar`, um token que
 * ja tem narrativa devolve a gravada em vez de pagar de novo pelo mesmo texto.
 *
 * Lanca `RecusaDeRegra` no que o parceiro resolve sozinho. Sem revalidate:
 * quem chama de teste ou de script nao tem requisicao em curso. A tela usa
 * `gerarPelaTela`.
 */
export async function gerarRelatorio(
  token: string,
): Promise<{ versao: number; reaproveitada: boolean }> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, "assessments", "atualizar")) {
    throw new Error("Sem permissao para gerar relatorios");
  }

  const [alvo] = await db
    .select({
      id: assessments.id,
      nome: assessments.avaliado_nome,
      dono: assessments.facilitador_id,
    })
    .from(assessments)
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1);

  // Recorte por dono: o parceiro so gera o relatorio dos mapas dele, e o admin
  // gera o de todos. "Nao existe" e "e de outro parceiro" dao a MESMA resposta
  // — distinguir as duas transformaria a action num teste de existencia de
  // token alheio.
  if (!alvo || (sessao.papel !== "admin" && alvo.dono !== sessao.userId)) {
    throw new RecusaDeRegra(MOTIVO.invalido);
  }

  // Checado antes de qualquer escrita: sem chave nada e gravado, e a mensagem
  // diz o que falta em vez de deixar a tela adivinhar.
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new RecusaDeRegra(
      "Falta a ANTHROPIC_API_KEY no servidor. Sem ela o texto nao pode ser escrito.",
    );
  }

  let gravada;
  try {
    gravada = await gerarESalvar(token);
  } catch (erro) {
    // Falha de negocio da API vira recusa legivel; queda de rede continua
    // subindo como falha de verdade.
    if (erro instanceof FalhaNaNarrativa) {
      throw new RecusaDeRegra(
        erro.causa === "configuracao"
          ? "Falta a ANTHROPIC_API_KEY no servidor. Sem ela o texto nao pode ser escrito."
          : "A IA nao devolveu o relatorio desta vez. Tente de novo em alguns minutos.",
      );
    }
    throw erro;
  }

  if (!gravada.ok) throw new RecusaDeRegra(MOTIVO[gravada.erro]);

  // Auditoria da geracao, com a PESSOA que mandou gerar. A linha que
  // `persistir.ts` grava e assinada pelo gerador, que nao e ninguem: sem esta,
  // a trilha nao responde quem gastou a chamada paga. So quando houve geracao
  // de fato — reaproveitar o texto ja gravado nao gera nada.
  if (!gravada.reaproveitada) {
    await registrarAuditoria({
      userId: sessao.userId,
      acao: "criar",
      tabela: "assessments_relatorios",
      registroId: alvo.id,
      detalhes: `Gerou pela tela a narrativa v${gravada.versao} do relatorio de ${alvo.nome}`,
    });
  }

  return { versao: gravada.versao, reaproveitada: gravada.reaproveitada };
}

/**
 * `gerarRelatorio` para a lista de mapas: recusa vira objeto e a lista
 * revalida. Mesmo contrato de `turmas.criarPelaTela`.
 */
export async function gerarPelaTela(token: string) {
  return paraTela("/facilitador/acervo-de-mapas", () => gerarRelatorio(token));
}
