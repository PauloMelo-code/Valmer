/**
 * Usuarios da plataforma: o admin e os facilitadores (parceiros).
 *
 * A especificacao do cliente chama esta tabela de `users` e trata os dois
 * papeis na mesma entidade — os campos sao os mesmos e o que muda e o
 * acesso. Mantido assim.
 *
 * E tambem o modelo `user` do Better Auth, mapeado em `lib/auth/config.ts`.
 * A senha NAO mora aqui: ela fica em `contas`, com o resto das credenciais,
 * que e como o Better Auth organiza. Ver ADR-0004.
 */
import { pgTable, uuid, text, integer, boolean, timestamp, check, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TEMPO } from "./tempo";
import { papelUsuario, tipoRelatorio } from "./enums";

/**
 * Quantas amostras gratuitas todo parceiro recebe ao abrir a conta.
 *
 * E o numero que a tela /facilitador/experimente-gratis ja mostrava fixo em
 * um arquivo fixo — trazido para o banco como DEFAULT da coluna, e nao como
 * regra de action nenhuma. Assim o comportamento de hoje (todo mundo tem 180)
 * continua identico, e o parceiro criado amanha nasce com o mesmo saldo sem
 * depender de ninguem lembrar de conceder.
 */
export const DEGUSTACOES_INICIAIS = 180;

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    /** Exigido pelo Better Auth. Sem fluxo de confirmacao por e-mail ainda. */
    emailVerified: boolean("email_verificado").notNull().default(false),
    /**
     * Foto de perfil: a CHAVE do objeto no armazenamento, nunca a URL.
     *
     * O endereco assinado nasce no clique e expira em minutos. Guardar URL
     * aqui quebraria TODA foto de uma vez no dia em que o bucket mudar de
     * dominio — e o de hoje e o subdominio padrao do provedor.
     */
    image: text("imagem"),
    papel: papelUsuario("papel").notNull().default("facilitador"),
    empresa: text("empresa"),
    /**
     * Contato impresso na capa e no rodape do relatorio. E o do facilitador,
     * nao o da plataforma: o relatorio chega ao cliente final por ele.
     */
    telefone: text("telefone"),
    /** Saldo de creditos. Derivado das transacoes, materializado para leitura. */
    creditos: integer("creditos").notNull().default(0),
    /**
     * Saldo de DEGUSTACAO: amostras gratuitas do relatorio, para o parceiro
     * mostrar o produto antes de vender (/facilitador/experimente-gratis). Uma
     * degustacao consome 1 daqui e ZERO de `creditos` — ver
     * `actions/assessments.ts:criar` e `assessments.degustacao`.
     *
     * POR QUE FICA AQUI E NAO EM `creditos_transacoes`
     * ------------------------------------------------
     * A migration 0005 instalou uma CONSTRAINT TRIGGER que aborta o COMMIT
     * quando `usuarios.creditos` nao bate com a soma de `creditos_transacoes`.
     * Ela dispara em `UPDATE OF creditos` — esta coluna nao a alcanca, entao a
     * degustacao NAO tem extrato. Isso e deliberado, e por dois motivos:
     *
     * 1. O extrato existe porque credito e DINHEIRO: e vendido, estornado e
     *    precisa de uma linha que explique cada centavo. Degustacao nao e
     *    vendida nem estornada — e concedida uma vez, igual para todos.
     * 2. O que explicaria o saldo ja e consultavel sem tabela nova: concedido
     *    (`DEGUSTACOES_INICIAIS`, o default abaixo) menos
     *    `count(assessments where degustacao and not is_deleted)`. Um extrato
     *    proprio guardaria a mesma conta duas vezes.
     *
     * A alternativa — lancar a degustacao em `creditos_transacoes` — obrigaria
     * a reescrever a trigger da 0005 para somar dois subconjuntos contra duas
     * colunas. Mais SQL no caminho do dinheiro por um saldo que nao tem
     * dinheiro. E se alguem um dia mexer nas duas colunas no mesmo UPDATE, a
     * trigger dispara e PASSA: `creditos` nao se moveu, e o extrato dele
     * continua fechando.
     *
     * ponytail: teto conhecido — sem extrato, "para onde foram minhas
     * degustacoes" se responde por consulta, e nao por leitura de linha. No dia
     * em que degustacao for vendida, expirar ou for estornada, ela virou
     * dinheiro: ai entra `degustacao boolean` em `creditos_transacoes` e a
     * trigger passa a conferir os dois saldos contra os dois subconjuntos.
     */
    creditos_degustacao: integer("creditos_degustacao")
      .notNull()
      .default(DEGUSTACOES_INICIAIS),
    /**
     * Qual nivel de relatorio ESTE parceiro oferece como amostra em
     * /facilitador/experimente-gratis. Configuracao dele, e nao da plataforma: quem
     * vende para RH mostra o S1, quem vende para executivo mostra o S3, e a
     * escolha nao muda preco nenhum — degustacao custa 1 amostra em qualquer
     * nivel (ver `creditos_degustacao` acima).
     *
     * Coluna aqui, e nao tabela de configuracao: e UM campo por parceiro, na
     * linha que ja e lida em toda tela do portal. Uma tabela `configuracoes`
     * com uma linha por parceiro seria um JOIN a mais para guardar quatro
     * letras.
     *
     * DEFAULT 'S1' porque a tabela ja tem linhas em homologacao e a coluna
     * nasce NOT NULL — e porque o nivel de entrada e o que se oferece de
     * graca.
     */
    degustacao_relatorio: tipoRelatorio("degustacao_relatorio").notNull().default("S1"),
    ativo: boolean("ativo").notNull().default(true),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    uniqueIndex("uq_usuarios_email").on(t.email),
    index("idx_usuarios_ativos").on(t.is_deleted),
    // A degustacao nao tem trigger conferindo o saldo (ver a coluna acima).
    // Esta e a guarda que sobra, e ela e a que importa: saldo negativo seria
    // amostra distribuida de graca sem lastro nenhum.
    check("ck_usuarios_degustacao_nao_negativa", sql`${t.creditos_degustacao} >= 0`),
  ],
);

export type Usuario = typeof usuarios.$inferSelect;
export type NovoUsuario = typeof usuarios.$inferInsert;
