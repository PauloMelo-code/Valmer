/**
 * "Gerar" e "gerar de novo" o texto do relatorio MC 3.1, pelo facilitador.
 *
 * Mesma guarda de `gerarRelatorio` (actions/relatorio.ts), e pelo mesmo
 * motivo: Server Action e endpoint POST publico e cada chamada gasta a chave
 * da API. Sessao, permissao e recorte por dono moram AQUI DENTRO.
 *
 * So atende mapa MC-INV 2.2. O mapa LEGADO continua no botao antigo
 * (ADR-0007, D3): o texto dele sai de outro prompt e vai para outra tabela.
 */
"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";
import { getSession, temPermissao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit/logger";
import { VERSAO_INSTRUMENTO } from "@/data/inventario-mc";
import { FalhaNaNarrativaMC, gerarNarrativaMC, type FalhaGeracaoMC } from "@/lib/relatorio-mc/narrativa";
import { paraTela, RecusaDeRegra } from "./recusa";

const SEM_CHAVE = "Falta a ANTHROPIC_API_KEY no servidor. Sem ela o texto não pode ser escrito.";

const MOTIVO: Record<FalhaGeracaoMC | "invalido" | "legado", string> = {
  invalido: "Mapa não encontrado.",
  legado: "Este mapa é do questionário antigo. Use o botão de relatório dele.",
  sem_resultado: "Este mapa ainda não tem resultado calculado.",
  // Outro processo esta escrevendo o mesmo texto agora: esperar, e nao
  // tentar de novo, que cairia na mesma recusa.
  em_geracao: "O texto deste relatório já está sendo escrito. Recarregue a página em instantes.",
};

/**
 * Escreve (ou, com `forcar`, reescreve) a narrativa da IA deste mapa.
 *
 * Sem `forcar`, um mapa que ja tem texto devolve o gravado sem pagar de novo.
 * `avisos` lista o que o texto gravado tem fora do pedido (paragrafos ou
 * tamanho) mesmo depois da segunda tentativa; vazio no caso normal.
 *
 * Lanca `RecusaDeRegra` no que o facilitador resolve sozinho. A tela usa
 * `gerarRelatorioMCPelaTela`.
 */
export async function gerarRelatorioMC(
  token: string,
  forcar = false,
): Promise<{ reaproveitada: boolean; avisos: string[] }> {
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
      versao: assessments.versao_instrumento,
    })
    .from(assessments)
    .where(and(eq(assessments.token, token), eq(assessments.is_deleted, false)))
    .limit(1);

  // "Nao existe" e "e de outro parceiro" dao a MESMA resposta, para a action
  // nao virar teste de existencia de token alheio.
  if (!alvo || (sessao.papel !== "admin" && alvo.dono !== sessao.userId)) {
    throw new RecusaDeRegra(MOTIVO.invalido);
  }
  if (alvo.versao !== VERSAO_INSTRUMENTO) throw new RecusaDeRegra(MOTIVO.legado);
  if (!process.env.ANTHROPIC_API_KEY) throw new RecusaDeRegra(SEM_CHAVE);

  let gravada;
  try {
    gravada = await gerarNarrativaMC(alvo.id, { forcar });
  } catch (erro) {
    // Falha de negocio da API vira recusa legivel; queda de rede continua subindo.
    if (erro instanceof FalhaNaNarrativaMC) {
      throw new RecusaDeRegra(
        erro.causa === "configuracao"
          ? SEM_CHAVE
          : "A IA não devolveu o texto desta vez. Tente de novo em alguns minutos.",
      );
    }
    throw erro;
  }

  if (!gravada.ok) throw new RecusaDeRegra(MOTIVO[gravada.erro]);

  // A linha gravada e assinada pelo gerador; esta diz QUEM mandou gastar a
  // chamada paga. So quando houve geracao de fato.
  if (!gravada.reaproveitada) {
    await registrarAuditoria({
      userId: sessao.userId,
      acao: "atualizar",
      tabela: "assessments_resultados",
      registroId: alvo.id,
      detalhes: `${forcar ? "Gerou de novo" : "Gerou"} pela tela a narrativa MC 3.1 de ${alvo.nome}`,
    });
  }

  return { reaproveitada: gravada.reaproveitada, avisos: gravada.avisos };
}

/** `gerarRelatorioMC` para a lista de mapas: recusa vira objeto e a lista revalida. */
export async function gerarRelatorioMCPelaTela(token: string, forcar = false) {
  return paraTela("/facilitador/acervo-de-mapas", () => gerarRelatorioMC(token, forcar));
}
