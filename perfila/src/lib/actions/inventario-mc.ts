/**
 * Server Actions publicas do inventario MC-INV 2.2, por token.
 *
 * Casca fina sobre lib/inventario: o token E a credencial (nada pede sessao,
 * como em actions/avaliacao.ts), estado esperado volta como recusa em objeto e
 * so entrada adulterada lanca (zod, dentro de salvarTela). A regra mora em
 * lib/inventario, que nao e "use server" para poder exportar tipos.
 */
"use server";

import {
  estadoDaAplicacao,
  registrarConsentimento,
  salvarTela as gravarTela,
  type EstadoAplicacao,
  type RecusaInventario,
} from "@/lib/inventario/aplicacao";
import { finalizarAplicacao, type RecusaFinalizacao } from "@/lib/inventario/finalizar";
import { textoProntoDoToken } from "@/lib/texto-do-mapa";

/** Aceite do consentimento LGPD. Idempotente. */
export async function consentir(token: string): Promise<{ ok: true } | RecusaInventario> {
  const r = await registrarConsentimento(token);
  // A data do aceite e prova juridica do servidor; a tela nao precisa dela.
  return r.ok ? { ok: true } : r;
}

/** Onde a pessoa parou, a semente do roteiro e o que ja respondeu. */
export async function estado(token: string): Promise<EstadoAplicacao | RecusaInventario> {
  return estadoDaAplicacao(token);
}

/**
 * Uma tela. O cliente manda a escolha e os carimbos; lado do polo A e
 * `moveu_item` o servidor tira do roteiro da semente (ver salvarTela).
 */
export async function salvarTela(token: string, payload: unknown): Promise<{ ok: true } | RecusaInventario> {
  return gravarTela(token, payload);
}

/**
 * Fecha o mapa. "concluido" vira sucesso: e o reenvio de quem perdeu a
 * resposta do primeiro pedido, ou a segunda aba — o resultado ja esta gravado.
 * O id do mapa nao sai daqui: o navegador nao precisa dele.
 */
export async function finalizar(
  token: string,
): Promise<{ ok: true } | Exclude<RecusaFinalizacao, { erro: "concluido" }>> {
  const r = await finalizarAplicacao(token);
  if (r.ok || r.erro === "concluido") return { ok: true };
  return r;
}

/**
 * A tela final pergunta, de tempos em tempos, se o relatorio ja pode ser
 * aberto. So sim ou nao (ver `textoProntoDoToken`). Server Action e POST
 * publico: o token chega do navegador e e conferido antes de ir ao banco.
 */
export async function relatorioPronto(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > 64) return false;
  return textoProntoDoToken(token);
}
