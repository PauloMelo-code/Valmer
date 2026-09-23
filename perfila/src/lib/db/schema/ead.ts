/**
 * O programa do curso: modulo e aula, que ate agora eram TEXTO CORRIDO.
 *
 * O modulo morava dentro de `cursos.conteudo` — um textarea cujo placeholder
 * pedia "Programa, modulos e os enderecos das aulas". Programa digitado como
 * prosa nao da para ordenar, nao da para dizer qual aula tem video e nao da
 * para espelhar em outra tela: era por isso que /facilitador/biblioteca-gravada mostrava sete
 * titulos escritos no codigo, com a aula 1 marcada como concluida em
 * `data/aprendizado.ts` e um "1 de 7" que era constante de build.
 *
 * `cursos.conteudo` CONTINUA existindo, e continua sendo texto: ele e a ementa,
 * a prosa que descreve o curso. O que sai dele e a obrigacao de o modulo ser
 * prosa tambem.
 *
 * ESTAS DUAS TABELAS NAO TEM `facilitador_id`, E ISSO NAO E ESQUECIMENTO
 * ---------------------------------------------------------------------
 * Mesmo raciocinio ja escrito em `db/schema/precos.ts`, e vale palavra por
 * palavra aqui: o curso e da PLATAFORMA. Quem escreve e publica e o dono do
 * negocio (`cursos:*` no rbac, so admin), e o que o parceiro ve e o mesmo para
 * todos. Um `facilitador_id` aqui significaria trilha de EAD por parceiro — um
 * produto diferente do que existe hoje, e que ninguem pediu.
 *
 * A leitura e aberta de proposito, pelo mesmo motivo de `lib/precos.ts`: a aba
 * do parceiro precisa mostrar o que o admin publicou, e quem barra visitante e
 * a guarda de sessao do proprio layout de /facilitador.
 */
import { pgTable, uuid, text, integer, boolean, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TEMPO } from "./tempo";
import { cursos } from "./cursos";

export const cursoModulos = pgTable(
  "curso_modulos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    curso_id: uuid("curso_id")
      .notNull()
      .references(() => cursos.id, { onDelete: "restrict" }),
    titulo: text("titulo").notNull(),
    /**
     * Posicao do modulo dentro do curso. Ver a nota de `curso_aulas.ordem`:
     * a mesma decisao vale para os dois, e esta escrita la uma vez so.
     */
    ordem: integer("ordem").notNull().default(0),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  // As duas telas perguntam sempre a mesma coisa: os modulos vivos de um
  // curso, na ordem. As tres colunas do indice sao as tres do WHERE + ORDER BY.
  (t) => [index("idx_curso_modulos_curso").on(t.curso_id, t.is_deleted, t.ordem)],
);

export const cursoAulas = pgTable(
  "curso_aulas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    modulo_id: uuid("modulo_id")
      .notNull()
      .references(() => cursoModulos.id, { onDelete: "restrict" }),
    titulo: text("titulo").notNull(),
    /**
     * Posicao da aula dentro do modulo, e a razao de ela ser um NUMERO em vez
     * de a ordem sair do `created_at`: aula gravada depois pode ter que entrar
     * no meio, e a data de criacao nao se reescreve.
     *
     * REORDENAR NAO REESCREVE A TABELA. Subir uma aula troca o `ordem` dela com
     * o da vizinha — DUAS linhas, sempre duas, qualquer que seja o tamanho do
     * modulo. Renumerar a lista inteira a cada clique seria N updates para uma
     * mudanca de uma posicao, e com o optimistic locking do projeto cada uma
     * dessas N linhas viraria uma chance de recusar a gravacao.
     *
     * Nao ha indice unico em (modulo_id, ordem) de proposito: a troca grava as
     * duas linhas dentro da mesma transacao e passa por um estado intermediario
     * em que as duas tem o mesmo numero. Com indice unico nao-adiavel, o COMMIT
     * abortaria. O desempate do ORDER BY e `created_at`, entao empate nao
     * embaralha a lista — so decide quem fica na frente.
     */
    ordem: integer("ordem").notNull().default(0),
    /**
     * A CHAVE do objeto no MinIO (`cursos/videos/<aula>/<uuid>.mp4`), nunca a
     * URL — ver a nota 2 de `lib/storage.ts`. NULO enquanto o video nao subiu,
     * e esse nulo e um estado de produto, nao um defeito: a aula ja aparece no
     * programa, marcada como pendente, antes de existir gravacao.
     */
    video_chave: text("video_chave"),
    /**
     * Duracao em segundos, LIDA DO PROPRIO ARQUIVO pelo navegador que enviou
     * (`HTMLVideoElement.duration`). Escrever "07:05" a mao era exatamente o
     * que a tela antiga fazia — e o numero nunca mais era conferido contra o
     * video. Nulo quando o navegador nao soube dizer; ai a tela nao mostra
     * duracao nenhuma, em vez de mostrar um numero inventado.
     */
    duracao_segundos: integer("duracao_segundos"),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    index("idx_curso_aulas_modulo").on(t.modulo_id, t.is_deleted, t.ordem),
    // Duracao zero ou negativa e leitura falhada do navegador chegando como
    // numero, e somada no total do curso ela encolhe o tempo sem nada acusar.
    // O caminho para "nao sei" e NULL, que a tela ja sabe desenhar.
    check("ck_curso_aulas_duracao", sql`${t.duracao_segundos} IS NULL OR ${t.duracao_segundos} > 0`),
  ],
);

export type CursoModulo = typeof cursoModulos.$inferSelect;
export type NovoCursoModulo = typeof cursoModulos.$inferInsert;
export type CursoAula = typeof cursoAulas.$inferSelect;
export type NovaCursoAula = typeof cursoAulas.$inferInsert;
