/**
 * O e-mail "Seu acesso a <marca>" e o canal por onde o resultado do envio
 * volta ao chamador.
 *
 * O Better Auth chama `sendResetPassword` por dentro de `requestPasswordReset`
 * e ENGOLE o erro dele (loga e responde 200 igual, para nao revelar se o e-mail
 * existe). Sem um canal de volta, o admin veria "enviado" com o SMTP fora do ar.
 * O AsyncLocalStorage acompanha a chamada atraves dos awaits: quem pede o envio
 * abre o contexto, e o hook de `lib/auth/config.ts` escreve nele.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Email } from "./enviar";
import { NOME_MARCA } from "@/components/layout/MarcaImpacto";
import { montarEmail, saudar } from "./modelo";

export type ResultadoDoEnvio = { enviado: boolean; erro?: string };

export const resultadoDoEnvio = new AsyncLocalStorage<ResultadoDoEnvio>();

export function montarEmailDeAcesso(nome: string, url: string): Omit<Email, "para"> {
  return montarEmail({
    assunto: `Seu acesso à ${NOME_MARCA}`,
    saudacao: saudar(nome),
    paragrafos: [`Seu acesso à ${NOME_MARCA} foi liberado. Para entrar pela primeira vez, defina a sua senha no link abaixo.`],
    botao: { rotulo: "Definir minha senha", url },
    rodape:
      "O link vale por 48 horas e só funciona uma vez. Passou do prazo? Peça um novo envio ao administrador. Se você não esperava este e-mail, pode ignorá-lo.",
  });
}
