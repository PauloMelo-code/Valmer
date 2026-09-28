/**
 * O codigo MC-AAAA-MMDD-XX de mapa NOVO: a parte que os dois caminhos de
 * criacao (`actions/assessments.ts`, que tambem cria a degustacao, e
 * `actions/envio-lote.ts`) dividem.
 *
 * Mora fora deles porque os dois sao "use server", e la toda funcao exportada
 * vira endpoint POST publico. A regra do codigo em si (iniciais, data de
 * Brasilia, sufixo) continua em `lib/inventario/codigo.ts`; aqui so o lote e a
 * nova tentativa.
 */
import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";
import { codigoBase, proximoCodigo } from "@/lib/inventario/codigo";

type Executor = Pick<typeof db, "select">;

/**
 * Um codigo por nome, para mapas inseridos NUM INSERT SO.
 *
 * `gerarCodigo` olha so o banco, e os mapas do lote ainda nao estao nele: duas
 * "Ana Souza" no mesmo lote sairiam as duas com MC-...-AS e o indice unico
 * derrubaria o lote inteiro, toda vez. Aqui os codigos ja escolhidos no lote
 * entram na lista de ocupados, e o banco e consultado uma vez por base.
 */
export async function codigosDoLote(
  executor: Executor,
  nomes: readonly string[],
  quando: Date,
): Promise<string[]> {
  const ocupadosPorBase = new Map<string, string[]>();
  const codigos: string[] = [];

  for (const nome of nomes) {
    const base = codigoBase(nome, quando);
    let ocupados = ocupadosPorBase.get(base);
    if (!ocupados) {
      // Mesma consulta de `gerarCodigo`: todas as linhas, SEM filtro de
      // is_deleted de proposito, porque codigo impresso nao volta a circular.
      const linhas = await executor
        .select({ codigo: assessments.codigo })
        .from(assessments)
        .where(like(assessments.codigo, `${base}%`));
      ocupados = linhas.map((l) => l.codigo!);
      ocupadosPorBase.set(base, ocupados);
    }
    const codigo = proximoCodigo(base, ocupados);
    ocupados.push(codigo);
    codigos.push(codigo);
  }

  return codigos;
}

/** O erro (em qualquer nivel do `cause`, onde o Drizzle o embrulha) e a colisao do codigo? */
function colisaoDeCodigo(erro: unknown): boolean {
  let atual: unknown = erro;
  for (let salto = 0; atual && salto < 5; salto += 1) {
    const alvo = atual as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (alvo.code === "23505") return alvo.constraint === "uq_assessments_codigo";
    atual = alvo.cause;
  }
  return false;
}

const TENTATIVAS = 3;

/**
 * Roda a TRANSACAO de criacao de novo quando o codigo colide.
 *
 * Duas criacoes simultaneas com as mesmas iniciais no mesmo dia escolhem o
 * mesmo codigo livre, e o `uq_assessments_codigo` recusa a segunda (23505).
 * A tentativa e a transacao inteira, e nao so o INSERT: depois de um erro o
 * Postgres aborta a transacao, e o credito debitado nela ja foi desfeito junto.
 * Na volta a segunda criacao ja ve o codigo da primeira e pega o sufixo -2.
 */
export async function comNovaTentativaDeCodigo<T>(criar: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await criar();
    } catch (erro) {
      if (tentativa >= TENTATIVAS || !colisaoDeCodigo(erro)) throw erro;
    }
  }
}
