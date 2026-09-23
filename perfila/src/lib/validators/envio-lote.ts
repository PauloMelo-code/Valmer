import { z } from "zod";
import { emailPessoa, nomePessoa } from "./assessment";

/**
 * Um envio expresso: um grupo de mapeamento e os destinatarios que recebem o
 * passaporte.
 *
 * Nome e e-mail passam pelas MESMAS regras da tela de novo mapa — sao os
 * mesmos campos, na mesma tabela, impressos na mesma capa de relatorio. Duas
 * regras de e-mail no projeto viram duas respostas diferentes para o mesmo
 * endereco.
 *
 * O tipo de relatorio NAO entra aqui: quem manda nele e a turma, e e por isso
 * que ela e obrigatoria. Aceitar o tipo do cliente permitiria enviar um S4
 * para uma turma criada como S1, e a turma deixaria de responder "que
 * relatorio esta pessoa recebe".
 *
 * O teto de 50 e da TRANSACAO, nao do formulario: o lote inteiro nasce num
 * COMMIT so (ver `actions/envio-lote.ts`), e uma lista colada de mil linhas
 * seguraria a linha do dono travada enquanto mil INSERTs acontecem — todo o
 * resto da conta fica parado nesse tempo. Quem precisa de mais manda em duas
 * levas, e cada leva e tudo-ou-nada por si.
 */
export const envioLoteSchema = z.object({
  turma_id: z.string().uuid("Escolha o grupo de mapeamento que vai receber os passaportes"),
  destinatarios: z
    .array(z.object({ avaliado_nome: nomePessoa, avaliado_email: emailPessoa }))
    .min(1, "Adicione ao menos um destinatario")
    .max(50, "Envie no maximo 50 destinatarios por lote"),
});

export type EnvioLote = z.infer<typeof envioLoteSchema>;
