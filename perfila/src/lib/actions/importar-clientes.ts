/**
 * Importacao de clientes — a porta de entrada do CSV que a carteira exporta.
 *
 * NAO grava nada por conta propria: cada linha entra por `clientes.criar`, a
 * MESMA funcao do formulario. E ela quem confere a sessao, a permissao do RBAC,
 * o dono (o cliente nasce do `facilitador_id` da sessao, nunca de uma celula do
 * arquivo), a duplicidade de e-mail dentro da carteira e a trilha de auditoria.
 * Um INSERT proprio aqui seria o segundo lugar do projeto que decide quem pode
 * ter cliente — e o lugar onde o recorte por dono e esquecido.
 *
 * POR QUE A IMPORTACAO NAO E TUDO-OU-NADA
 * ---------------------------------------
 * O envio em lote (`actions/envio-lote.ts`) e tudo-ou-nada porque mexe em
 * CREDITO: meia entrega la cobra pela metade de um trabalho que ninguem
 * consegue auditar na tela. Aqui nao ha credito nem efeito externo — cadastro
 * de cliente nao manda e-mail, nao gasta saldo e da desfazer pelo botao de
 * remover. Entao 18 linhas boas gravadas mais "linha 7: e-mail invalido" e um
 * resultado melhor que recusar o arquivo inteiro por causa de uma celula: quem
 * importou corrige as tres linhas nomeadas em vez de cacar o erro numa planilha
 * de 200.
 *
 * O laco e sequencial de proposito: em paralelo, duas linhas com o mesmo e-mail
 * passariam as duas pela consulta de duplicidade antes de qualquer INSERT, e a
 * segunda morreria no indice unico como FALHA em vez de virar recusa com o
 * numero da linha.
 */
"use server";

import { revalidatePath } from "next/cache";

import { lerClientesCsv } from "@/lib/importar-clientes";
import { criar } from "./clientes";
import { comoRecusa } from "./recusa";

const TELA = "/facilitador/meus-clientes";

export type ResultadoImportacao =
  | { ok: false; erro: string }
  | { ok: true; gravados: number; recusas: string[] };

/**
 * Le o CSV e grava o que passar, linha por linha.
 *
 * `texto` vem da tela como conteudo de arquivo ou lista colada — da no mesmo,
 * e por isso a assinatura e uma string e nao um upload: o arquivo e lido no
 * navegador, que ja tem a API para isso.
 *
 * `comoRecusa` traduz recusa de regra, erro de validacao do zod e colisao do
 * indice unico; qualquer outra coisa (banco fora do ar, bug) continua subindo,
 * porque nao e informacao que a pessoa resolve corrigindo a planilha.
 */
export async function importarClientesPelaTela(texto: unknown): Promise<ResultadoImportacao> {
  if (typeof texto !== "string") {
    return { ok: false, erro: "Nao ha nada para importar: escolha um arquivo ou cole a lista." };
  }

  const leitura = lerClientesCsv(texto);
  if (!leitura.ok) return leitura;

  let gravados = 0;
  const recusas: string[] = [];

  for (const linha of leitura.linhas) {
    try {
      await criar({ nome: linha.nome, email: linha.email, celular: linha.celular });
      gravados += 1;
    } catch (erro) {
      const motivo = comoRecusa(erro);
      if (motivo === null) throw erro;
      recusas.push(`Linha ${linha.numero}: ${motivo}`);
    }
  }

  if (gravados > 0) revalidatePath(TELA);

  return { ok: true, gravados, recusas };
}
