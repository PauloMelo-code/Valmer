/**
 * Territorio da Empresa: o perfil coletivo de UMA empresa, montado a partir
 * dos inventarios (assessments) respondidos por gente daquela empresa.
 *
 * Hoje a tela le `data/dna.ts`, quatro empresas fixas com as medias escritas a
 * mao. Esta tabela existe para as medias sairem dos contadores dos mapas de
 * verdade — ver `lib/territorios.ts`.
 *
 * Duas tabelas, e nao uma. O vinculo territorio <-> assessment e tabela
 * PROPRIA (`territorios_assessments`) por tres razoes, e nenhuma delas e
 * simetria de modelagem:
 *
 * 1. O mesmo mapa entra em mais de um territorio. A tela oferece "adicionar
 *    inventario" um por um: o parceiro monta "Empresa toda" e "Diretoria" com
 *    a mesma pessoa dentro dos dois. Uma coluna `territorio_id` em
 *    `assessments` daria UM territorio por mapa e mataria isso.
 * 2. Desvincular nao pode mexer no mapa. Com coluna no assessment, tirar
 *    alguem de um territorio seria UPDATE na linha do mapa, e a trilha do mapa
 *    passaria a registrar alteracao em um mapa que ninguem alterou.
 * 3. O mapa nasce antes do territorio e sobrevive a ele. O territorio e uma
 *    LEITURA feita sobre mapas que ja existem; o ciclo de vida dos dois nao e
 *    o mesmo.
 *
 * O que NAO entra aqui: tabela de vinculo com `turmas`. O botao "Adicionar
 * grupo" da tela e um atalho — vincular um grupo e vincular os mapas dele
 * (`vincularGrupo`, em actions/territorios.ts), e o que o territorio consolida
 * sao mapas. Uma segunda tabela de vinculo criaria duas respostas para "quais
 * inventarios estao neste territorio?", e a do grupo desencontraria da outra
 * no primeiro mapa adicionado ou removido do grupo depois do vinculo.
 */
import {
  pgTable, uuid, text, boolean, timestamp, index, uniqueIndex, foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usuarios } from "./usuarios";
import { assessments } from "./assessments";
import { TEMPO } from "./tempo";

export const territorios = pgTable(
  "territorios",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    facilitador_id: uuid("facilitador_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    nome: text("nome").notNull(),
    /**
     * O que vai na URL /facilitador/territorio-da-empresa/<slug>.
     *
     * `turmas` recusou slug de proposito, porque slug derivado do nome COLIDE
     * entre parceiros e colisao ali e caminho de vazamento. Aqui ele existe
     * porque a rota do territorio ja e por slug desde a homologacao — e a
     * colisao esta fechada de outra forma: o indice unico e por (dono, slug) e
     * TODA leitura passa pelo recorte do dono, entao "matriz" de dois
     * parceiros sao duas linhas e cada um so alcanca a sua.
     *
     * Nao muda quando o nome muda: link ja enviado ao cliente continua
     * abrindo. Quem gera e `slugDoNome`, em validators/territorio.ts.
     */
    slug: text("slug").notNull(),
    /** Livre, opcional: a tela tem o campo e nada depende dele. */
    descricao: text("descricao"),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    // PARCIAL, pelas mesmas duas razoes de `uq_clientes_facilitador_email`: o
    // dono entra na chave (senao B descobre pelo erro que A ja tem essa
    // empresa) e o soft delete precisa liberar o slug de volta, senao quem
    // excluiu por engano nunca mais recadastra aquela empresa.
    uniqueIndex("uq_territorios_facilitador_slug")
      .on(t.facilitador_id, t.slug)
      .where(sql`${t.is_deleted} = false`),

    // Alvo das FKs compostas do vinculo abaixo. Escopo do dono na CHAVE, como
    // em turmas e assessments: WHERE alguem esquece de escrever, chave nao.
    uniqueIndex("uq_territorios_id_facilitador").on(t.id, t.facilitador_id),

    // Dono PRIMEIRO: consulta que esquecer o dono deixa de ser servida pelo
    // prefixo do indice, e o erro aparece como lentidao antes de aparecer como
    // vazamento.
    index("idx_territorios_dono").on(t.facilitador_id, t.is_deleted),
  ],
);

export const territoriosAssessments = pgTable(
  "territorios_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    territorio_id: uuid("territorio_id").notNull(),
    assessment_id: uuid("assessment_id").notNull(),
    /**
     * DENORMALIZADO dos dois lados, e nao redundancia por descuido: e a metade
     * comum das duas FKs compostas abaixo. Com ela, o BANCO exige que o
     * territorio e o mapa tenham o MESMO dono — um parceiro nao consegue
     * pendurar o mapa de um concorrente no territorio dele nem por insert
     * cru, e as medias nunca misturam dado de dois parceiros.
     */
    facilitador_id: uuid("facilitador_id").notNull(),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    foreignKey({
      name: "fk_territorios_assessments_territorio_dono",
      columns: [t.territorio_id, t.facilitador_id],
      foreignColumns: [territorios.id, territorios.facilitador_id],
    }).onDelete("restrict"),

    foreignKey({
      name: "fk_territorios_assessments_assessment_dono",
      columns: [t.assessment_id, t.facilitador_id],
      foreignColumns: [assessments.id, assessments.facilitador_id],
    }).onDelete("restrict"),

    // PARCIAL: o mesmo mapa nao entra duas vezes no mesmo territorio (a media
    // contaria a pessoa em dobro e puxaria o perfil do grupo para o dela), mas
    // desvincular e soft delete — e vincular de novo depois tem de funcionar.
    uniqueIndex("uq_territorios_assessments_vinculo")
      .on(t.territorio_id, t.assessment_id)
      .where(sql`${t.is_deleted} = false`),

    index("idx_territorios_assessments_territorio").on(t.territorio_id, t.is_deleted),
  ],
);

export type Territorio = typeof territorios.$inferSelect;
export type NovoTerritorio = typeof territorios.$inferInsert;
export type TerritorioAssessment = typeof territoriosAssessments.$inferSelect;
export type NovoTerritorioAssessment = typeof territoriosAssessments.$inferInsert;
