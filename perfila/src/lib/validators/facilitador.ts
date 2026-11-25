import { z } from "zod";
import { emailPessoa, nomePessoa } from "./assessment";
import { empresaOpcional, telefoneOpcional } from "./perfil";

/**
 * Fronteira das duas escritas que movem dinheiro: cadastrar o parceiro e
 * vender credito para ele.
 *
 * O formulario manda o NOME do pacote, nunca a quantidade de creditos. Aceitar
 * `creditos` cru da tela deixaria o admin creditar qualquer quantidade por um
 * campo escondido, e o preco do pacote — que e o que justifica o lancamento no
 * extrato — nao viria de lugar nenhum.
 *
 * O nome deixou de ser `z.enum` da lista fixa de `data/planos.ts` porque os
 * pacotes agora sao linha de `precos_pacotes`, editavel pelo admin: um enum
 * congelado no build recusaria o pacote criado ontem e aceitaria o
 * descontinuado. Quem confere a EXISTENCIA e `lib/precos.ts:pacotePorNome`,
 * contra o banco e dentro da mesma transacao que credita — mais perto da
 * escrita, e nao mais longe. Aqui fica so o formato.
 */
const nomeDePacote = z
  .string()
  .trim()
  .min(2, "Escolha um pacote")
  .max(60, "Nome de pacote invalido");

export const criarFacilitadorSchema = z.object({
  nome: nomePessoa,
  email: emailPessoa,
  empresa: z
    .string()
    .trim()
    .min(2, "Informe a empresa ou consultoria")
    .max(160, "Nome da empresa muito longo"),
  pacote: nomeDePacote,
  // Sem senha: o parceiro a define pelo link enviado por e-mail.
});

export const venderCreditosSchema = z.object({
  facilitador_id: z.string().uuid(),
  pacote: nomeDePacote,
});

export type CriarFacilitador = z.infer<typeof criarFacilitadorSchema>;

/**
 * Fronteira da edicao do parceiro pelo admin — /admin/facilitadores/[id].
 *
 * `creditos` NAO esta aqui, e nao e campo esquecido. O saldo e materializacao
 * da soma de `creditos_transacoes`, e a migration 0005 instalou uma CONSTRAINT
 * TRIGGER DEFERRABLE que aborta o COMMIT quando os dois lados divergem: um
 * UPDATE em `usuarios.creditos` sem a linha do extrato na mesma transacao
 * derruba a transacao inteira, e o admin veria "Saldo de creditos nao bate com
 * o extrato" — erro de banco, no meio de um formulario de cadastro. Saldo so se
 * move lancando extrato, e o caminho e a venda: `venderCreditos`, na tela
 * /admin/creditos. Por isso a tela mostra o saldo como LEITURA, com link para la.
 *
 * `strictObject`, e nao `object`: o zod normalmente DESCARTA chave desconhecida
 * em silencio, e uma action que recebe `creditos: 9999` e nao reclama parece ter
 * aceitado. Aqui a chave a mais e recusada com nome. A segunda camada e o
 * UPDATE da action, que lista as cinco colunas a mao — `papel` e `creditos`
 * continuam sem caminho ate o banco mesmo que este schema afrouxe.
 *
 * Empresa e telefone entram OPCIONAIS, ao contrario do cadastro: a coluna e
 * nula para quem o seed criou sem elas e para quem as apagou no proprio perfil,
 * e um campo obrigatorio aqui trancaria a edicao dessas linhas — o admin nao
 * conseguiria nem corrigir um nome sem inventar uma empresa.
 */
export const atualizarFacilitadorSchema = z.strictObject({
  nome: nomePessoa,
  /**
   * O e-mail e a CREDENCIAL de login: troca-lo troca por onde o parceiro entra.
   * Muda so por aqui, com o admin sabendo — o proprio parceiro nao alcanca este
   * campo (ver `atualizarPerfilSchema`).
   */
  email: emailPessoa,
  empresa: empresaOpcional,
  telefone: telefoneOpcional,
  /** Situacao da conta. `lib/auth/config.ts` recusa o login de quem esta `false`. */
  ativo: z.boolean(),
});

export type AtualizarFacilitador = z.infer<typeof atualizarFacilitadorSchema>;
