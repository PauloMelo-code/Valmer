/**
 * Fecho do inventario MC-INV 2.2: confere as 69 telas, roda o motor e grava o
 * resultado — tudo numa transacao so, com a linha do mapa travada.
 *
 * Mesmo padrao de `concluir` em actions/avaliacao.ts (fluxo LEGADO): estado
 * esperado volta como recusa em objeto, e a narrativa da IA e agendada depois
 * do commit, porque e consequencia do fecho, nao parte dele.
 */
import { after } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments, assessmentsResultados, assessmentsTelas } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { GRUPOS_DISC, GRUPOS_VALORES, PARES_JUNG, telaDoGrupo } from "@/data/inventario-mc";
import { RespostaInvalida, calcularResultado, respostasDasTelas, type TelaGravada } from "@/lib/motor";
import type { Etapa } from "@/lib/validators/inventario-mc";
import { RESPONDENTE, recusou, travarMapa, type RecusaInventario } from "./aplicacao";

export type TelaFaltando = { etapa: Etapa; tela: string };

export type RecusaFinalizacao =
  | RecusaInventario
  /** Alguma das 69 telas nao foi salva. A lista inteira, de uma vez. */
  | { ok: false; erro: "incompleto"; faltando: TelaFaltando[] }
  /** O motor recusou o que esta gravado (RespostaInvalida). Nao deveria acontecer. */
  | { ok: false; erro: "resposta_invalida"; motivo: string };

/** As 69 telas que tem de existir, lidas do inventario. */
const TELAS_ESPERADAS: readonly TelaFaltando[] = [
  ...GRUPOS_DISC.map((g) => ({ etapa: 1 as const, tela: telaDoGrupo("G", g.grupo) })),
  ...GRUPOS_DISC.map((g) => ({ etapa: 2 as const, tela: telaDoGrupo("G", g.grupo) })),
  ...PARES_JUNG.map((p) => ({ etapa: 3 as const, tela: p.id })),
  ...GRUPOS_VALORES.map((g) => ({ etapa: 4 as const, tela: telaDoGrupo("V", g.grupo) })),
];

/**
 * Agenda a narrativa da IA para depois da resposta. `after` e nao `await`
 * pelo mesmo motivo de avaliacao.ts: a transacao ja fechou, o avaliado nao
 * espera a IA para ver a conclusao, e a chamada paga nao segura o pool.
 *
 * `import()` dinamico e catch amplo: a narrativa carrega o SDK da IA, que o
 * caminho do fecho nao precisa, e pode falhar. Nada disso desfaz um resultado
 * ja gravado — o erro vai para o log e o texto se gera de novo pelo portal.
 */
function agendarNarrativa(assessmentId: string): void {
  const escrever = async () => {
    try {
      const { gerarNarrativaMC } = await import("@/lib/relatorio-mc/narrativa");
      const r = await gerarNarrativaMC(assessmentId);
      if (!r.ok) console.error(`[relatorio-mc] narrativa de ${assessmentId} recusada: ${r.erro}`);
    } catch (erro) {
      console.error(`[relatorio-mc] narrativa de ${assessmentId} nao foi gerada`, erro);
    }
  };
  try {
    after(escrever);
  } catch {
    // Fora de uma requisicao do Next (teste, CLI) `after` lanca: nao ha o que
    // agendar, e o fecho nao pode falhar por causa do texto.
  }
}

/**
 * Fecha o mapa. Idempotente na pratica: o segundo pedido (duas abas, reenvio
 * depois de a rede cair) encontra o mapa concluido e recebe "concluido" — quem
 * chama trata isso como sucesso.
 */
export async function finalizarAplicacao(
  token: string,
): Promise<{ ok: true; assessmentId: string } | RecusaFinalizacao> {
  const fecho = await db.transaction(async (tx): Promise<{ ok: true; assessmentId: string } | RecusaFinalizacao> => {
    const mapa = await travarMapa(tx, token);
    if (recusou(mapa)) return mapa;
    if (!mapa.consentimento_em) return { ok: false, erro: "sem_consentimento" };

    const linhas = await tx
      .select()
      .from(assessmentsTelas)
      .where(and(eq(assessmentsTelas.assessment_id, mapa.id), eq(assessmentsTelas.is_deleted, false)));

    // O motor recusaria a primeira falta; aqui a lista sai inteira, para a
    // tela levar a pessoa direto ao que falta.
    const gravadas = new Set(linhas.map((l) => `${l.etapa}:${l.tela}`));
    const faltando = TELAS_ESPERADAS.filter((t) => !gravadas.has(`${t.etapa}:${t.tela}`));
    if (faltando.length > 0) return { ok: false, erro: "incompleto", faltando };

    const telas: TelaGravada[] = linhas.map((l) => ({
      etapa: l.etapa,
      tela: l.tela,
      ordem_final: l.ordem_final,
      resposta_exibida: l.resposta_exibida,
      resposta_polo_a: l.resposta_polo_a,
      moveu_item: l.moveu_item,
      entrou_em: l.entrou_em,
      saiu_em: l.saiu_em,
    }));

    // Antes de qualquer escrita: um return aqui COMMITA, entao a recusa so e
    // segura porque nada foi gravado ainda.
    let resultado;
    try {
      resultado = calcularResultado(respostasDasTelas(telas), telas);
    } catch (erro) {
      if (erro instanceof RespostaInvalida) return { ok: false, erro: "resposta_invalida", motivo: erro.message };
      throw erro;
    }

    const agora = new Date();
    const { natural, adaptado } = resultado.disc;
    const colunas = {
      versao_instrumento: mapa.versao_instrumento,
      versao_motor: resultado.versao_motor,
      resultado,
      nat_d: natural.escore.D,
      nat_i: natural.escore.I,
      nat_s: natural.escore.S,
      nat_c: natural.escore.C,
      ada_d: adaptado.escore.D,
      ada_i: adaptado.escore.I,
      ada_s: adaptado.escore.S,
      ada_c: adaptado.escore.C,
      perfil_natural: natural.perfil,
      perfil_adaptado: adaptado.perfil,
      tipo_jung: resultado.jung.tipo,
      confiabilidade: resultado.validade.confiabilidade,
      modified_by: RESPONDENTE,
    };

    // Upsert pelo indice parcial "um resultado vivo por mapa". Com o mapa
    // travado e a recusa de "concluido" acima, o conflito so acontece se
    // alguem gravou resultado por fora; nesse caso vale o calculo de agora.
    await tx
      .insert(assessmentsResultados)
      .values({ assessment_id: mapa.id, ...colunas })
      .onConflictDoUpdate({
        target: assessmentsResultados.assessment_id,
        targetWhere: sql`${assessmentsResultados.is_deleted} = false`,
        set: { ...colunas, updated_at: agora },
      });

    await tx
      .update(assessments)
      .set({ situacao: "concluido", concluido_em: agora, updated_at: agora, modified_by: RESPONDENTE })
      .where(eq(assessments.id, mapa.id));

    // Sem nome na trilha, como no consentimento (R6).
    await registrarAuditoria(
      {
        userId: RESPONDENTE,
        acao: "atualizar",
        tabela: "assessments",
        registroId: mapa.id,
        detalhes: `Respondente concluiu o inventario ${mapa.versao_instrumento}`,
        dadosNovos: {
          situacao: "concluido",
          concluido_em: agora,
          versao_motor: resultado.versao_motor,
          confiabilidade: resultado.validade.confiabilidade,
        },
      },
      tx,
    );

    return { ok: true, assessmentId: mapa.id };
  });

  if (fecho.ok) agendarNarrativa(fecho.assessmentId);
  return fecho;
}
