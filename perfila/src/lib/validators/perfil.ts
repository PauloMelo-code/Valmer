import { z } from "zod";
import { criarAssessmentSchema, nomePessoa } from "./assessment";
import { senhaNovaSchema } from "./auth";

/**
 * Fronteira do que o PROPRIO parceiro pode mudar na conta dele.
 *
 * A lista e curta e fechada de proposito: nome, empresa e telefone. Papel,
 * creditos, situacao (`ativo`) e e-mail sao decisao do dono da plataforma e
 * mudam so pelas telas do admin — os quatro juntos definem quanto a conta pode
 * gastar e o que ela enxerga.
 *
 * O E-MAIL fica de fora porque e a CREDENCIAL de login e a chave da auditoria.
 * Trocar sem reverificar tranca a pessoa para fora da propria conta ao primeiro
 * erro de digitacao, e reverificar exige envio de e-mail, que o projeto ainda
 * nao tem (falta o Resend — ver a nota de `emailAndPassword` em
 * lib/auth/config.ts). Nao e campo esquecido: quando houver envio de e-mail,
 * o caminho e "pedir a troca -> confirmar no endereco novo", nunca um input a
 * mais neste schema.
 *
 * `strictObject`, e nao `object`: o zod normalmente DESCARTA chave
 * desconhecida em silencio, e uma action que recebe `papel: "admin"` e nao
 * reclama parece ter aceitado. Aqui a chave a mais e recusada com nome, que e
 * o que a tela — e o teste de escalada de privilegio — precisam ver. A segunda
 * camada e o UPDATE, que lista as tres colunas a mao.
 */
const TELEFONE_RE = /^[\d\s()+-]{8,20}$/;

/**
 * Campo de texto opcional: vazio vira NULL, e nao string vazia.
 *
 * As duas colunas ja nascem nulas para quem o admin cadastrou sem elas, e
 * gravar "" faria a mesma ausencia ter duas representacoes — a tela mostra
 * "Sem empresa" para uma e nada para a outra.
 */
const vazioVirandoNulo = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? null : valor));

/**
 * Exportados porque o formato e da COLUNA, e nao do papel de quem edita: o
 * admin muda empresa e telefone do parceiro por
 * `validators/facilitador.ts:atualizarFacilitadorSchema`, na mesma tabela e nas
 * mesmas duas colunas. Mesma razao de `nomePessoa` morar em `./assessment` —
 * duas regras para o mesmo campo viram duas respostas para a mesma pergunta, e
 * a que estiver errada e a que ninguem olha.
 */
export const empresaOpcional = vazioVirandoNulo.refine(
  (valor) => valor === null || (valor.length >= 2 && valor.length <= 160),
  "Empresa: informe de 2 a 160 caracteres, ou deixe em branco",
);

export const telefoneOpcional = vazioVirandoNulo.refine(
  (valor) => valor === null || TELEFONE_RE.test(valor),
  "Telefone invalido: use DDD e numero, de 8 a 20 caracteres",
);

export const atualizarPerfilSchema = z.strictObject({
  nome: nomePessoa,
  empresa: empresaOpcional,
  telefone: telefoneOpcional,
});

/**
 * Configuracao da degustacao: qual nivel de relatorio o parceiro oferece de
 * amostra em /facilitador/experimente-gratis.
 *
 * O enum e EMPRESTADO de `criarAssessmentSchema`, e nao redigitado: o nivel
 * configurado aqui e exatamente o que vai para `tipo_relatorio` na criacao do
 * mapa. Duas listas de niveis viravam duas respostas para "S5 existe?".
 *
 * `strictObject` pelo mesmo motivo do schema acima: esta action escreve na
 * linha de `usuarios`, e uma chave a mais aceita em silencio e o comeco de uma
 * escalada. O UPDATE tambem lista a coluna a mao.
 */
export const configDegustacaoSchema = z.strictObject({
  tipo_relatorio: criarAssessmentSchema.shape.tipo_relatorio,
});

export const trocarSenhaSchema = z.strictObject({
  senha_atual: z.string().min(1, "Informe a senha atual").max(200),
  senha_nova: senhaNovaSchema,
});

export type AtualizarPerfil = z.infer<typeof atualizarPerfilSchema>;
