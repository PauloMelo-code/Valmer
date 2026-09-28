/**
 * Inventario MC-INV 2.2: as respostas tela a tela e o resultado calculado.
 *
 * Nomenclatura hierarquica: assessments -> assessments_telas,
 * assessments -> assessments_resultados. Os mapas LEGADO continuam em
 * `assessments_respostas` (28 questoes, um fator por questao) e nao passam
 * por aqui — ver ADR-0007, D3.
 *
 * R6 LGPD: nenhuma das duas tabelas tem nome, e-mail ou qualquer dado da
 * pessoa. Resposta bruta e resultado ficam presos ao id do mapa; quem precisa
 * do nome faz o join, e o join passa pelo escopo do dono.
 */
import {
  pgTable, uuid, text, smallint, boolean, timestamp, jsonb, doublePrecision,
  foreignKey, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { assessments } from "./assessments";
import { TEMPO } from "./tempo";

/**
 * Uma linha por TELA: 16 + 16 + 27 + 10 = 69 por aplicacao.
 *
 * Por tela, e nao por item: a unidade que o respondente envia e a tela, e o
 * que a secao 3 manda gravar (ordem final, se mexeu, entrada e saida) e da
 * tela. Uma linha por item repetiria os tempos quatro ou seis vezes.
 */
export const assessmentsTelas = pgTable(
  "assessments_telas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    assessment_id: uuid("assessment_id").notNull(),
    /** 1 DISC natural · 2 DISC adaptado · 3 Jung · 4 valores. */
    etapa: smallint("etapa").notNull(),
    /** "G07" (etapas 1 e 2) · "NS04" (etapa 3) · "V03" (etapa 4). */
    tela: text("tela").notNull(),
    /**
     * Etapas 1, 2 e 4: os ids na ordem escolhida, 1o = o que mais combina.
     * Guarda a ORDEM, e nao os pontos: pontos sao conta do motor, e a resposta
     * bruta precisa sobreviver a qualquer mudanca de formula (secao 8).
     */
    ordem_final: jsonb("ordem_final").$type<string[]>(),
    /** Etapa 3: de que lado da tela o polo A apareceu. Sorteado por par. */
    lado_polo_a: text("lado_polo_a").$type<"esquerda" | "direita">(),
    /** Etapa 3: o botao clicado, 0 = muito esquerda ... 3 = muito direita. */
    resposta_exibida: smallint("resposta_exibida"),
    /**
     * Etapa 3: a resposta ja virada para o polo A (3 = muito A ... 0 = muito
     * B). Derivada de `lado_polo_a` e `resposta_exibida`, e mesmo assim
     * gravada: V5 (resposta em linha) precisa do botao; o motor precisa do
     * polo. O CHECK abaixo garante que as duas nunca discordam.
     */
    resposta_polo_a: smallint("resposta_polo_a"),
    /** Falso se enviou na ordem inicial sorteada. Base da validade V3. */
    moveu_item: boolean("moveu_item").notNull(),
    entrou_em: timestamp("entrou_em", TEMPO).notNull(),
    saiu_em: timestamp("saiu_em", TEMPO).notNull(),
    /** Copia da versao do mapa. A FK composta garante que e a mesma. */
    versao_instrumento: text("versao_instrumento").notNull(),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    // (mapa, versao) -> uq_assessments_id_versao: a tela so entra na versao
    // do proprio mapa. Faz tambem o papel da FK simples para assessments.id.
    foreignKey({
      name: "fk_assessments_telas_assessment_versao",
      columns: [t.assessment_id, t.versao_instrumento],
      foreignColumns: [assessments.id, assessments.versao_instrumento],
    }).onDelete("restrict"),

    // Reenvio da mesma tela e correcao, nao linha nova (secao 9). Parcial em
    // `is_deleted` para uma tela anulada nao prender o par para sempre.
    // Tambem serve as leituras por mapa: `assessment_id` e o prefixo.
    uniqueIndex("uq_assessments_telas_tela")
      .on(t.assessment_id, t.etapa, t.tela)
      .where(sql`${t.is_deleted} = false`),

    // A regra de forma mora no banco, e nao so no zod: a resposta bruta e
    // guardada para sempre e recalculada quando o motor mudar (secao 8). Uma
    // linha torta aceita hoje vira um resultado errado daqui a um ano, calado.
    check("ck_assessments_telas_etapa", sql`${t.etapa} BETWEEN 1 AND 4`),
    // O COALESCE de fora NAO e enfeite (mesma armadilha de ck_cargos_alvo):
    // etapa 1 com `ordem_final` nulo faz `jsonb_typeof(NULL) = 'array'` dar
    // NULL, o OR inteiro vira NULL, e CHECK que resulta em NULL ACEITA a linha.
    check(
      "ck_assessments_telas_forma",
      sql`COALESCE((${t.etapa} IN (1, 2)
            AND ${t.tela} ~ '^G[0-9]{2}$'
            AND jsonb_typeof(${t.ordem_final}) = 'array'
            AND jsonb_array_length(${t.ordem_final}) = 4
            AND ${t.lado_polo_a} IS NULL AND ${t.resposta_exibida} IS NULL
            AND ${t.resposta_polo_a} IS NULL)
        OR (${t.etapa} = 4
            AND ${t.tela} ~ '^V[0-9]{2}$'
            AND jsonb_typeof(${t.ordem_final}) = 'array'
            AND jsonb_array_length(${t.ordem_final}) = 6
            AND ${t.lado_polo_a} IS NULL AND ${t.resposta_exibida} IS NULL
            AND ${t.resposta_polo_a} IS NULL)
        OR (${t.etapa} = 3
            AND ${t.tela} ~ '^(EI|NS|TF)[0-9]{2}$'
            AND ${t.ordem_final} IS NULL
            AND ${t.lado_polo_a} IN ('esquerda', 'direita')
            AND ${t.resposta_exibida} BETWEEN 0 AND 3), false)`,
    ),
    // Secao 23 do blueprint: esquerda -> 3 - botao; direita -> botao.
    // `IS NOT DISTINCT FROM` porque fora da etapa 3 os dois lados sao NULL, e
    // um `=` com NULL daria NULL — que CHECK aceita, mas por acidente.
    check(
      "ck_assessments_telas_polo_a",
      sql`${t.resposta_polo_a} IS NOT DISTINCT FROM (CASE ${t.lado_polo_a}
            WHEN 'esquerda' THEN 3 - ${t.resposta_exibida}
            WHEN 'direita' THEN ${t.resposta_exibida} END)`,
    ),
    check("ck_assessments_telas_tempo", sql`${t.saiu_em} >= ${t.entrou_em}`),
  ],
);

/**
 * O resultado do motor: uma linha viva por aplicacao.
 *
 * O contrato inteiro da secao 7 vai em `resultado`, como o motor devolveu —
 * e ele que o relatorio e o prompt da IA leem. As colunas soltas sao COPIA de
 * pedacos dele, so para o portal filtrar e ordenar ("todos os D natural acima
 * de 70", "confiabilidade baixa") sem abrir JSON linha a linha. Nao sao uma
 * segunda fonte: nascem na mesma gravacao, do mesmo objeto.
 */
export const assessmentsResultados = pgTable(
  "assessments_resultados",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    assessment_id: uuid("assessment_id").notNull(),
    versao_instrumento: text("versao_instrumento").notNull(),
    /** "2.2.0". O resultado so e recalculavel se soubermos qual motor o fez. */
    versao_motor: text("versao_motor").notNull(),
    /** O JSON da secao 7 do AGENTE, integral. */
    resultado: jsonb("resultado").notNull(),

    nat_d: doublePrecision("nat_d").notNull(),
    nat_i: doublePrecision("nat_i").notNull(),
    nat_s: doublePrecision("nat_s").notNull(),
    nat_c: doublePrecision("nat_c").notNull(),
    ada_d: doublePrecision("ada_d").notNull(),
    ada_i: doublePrecision("ada_i").notNull(),
    ada_s: doublePrecision("ada_s").notNull(),
    ada_c: doublePrecision("ada_c").notNull(),
    /** "DI" · "D" · "EQUILIBRADO". */
    perfil_natural: text("perfil_natural").notNull(),
    perfil_adaptado: text("perfil_adaptado").notNull(),
    /** "ENT". */
    tipo_jung: text("tipo_jung").notNull(),
    confiabilidade: text("confiabilidade").$type<"alta" | "media" | "baixa">().notNull(),

    /** Narrativa da IA (secao 18 do blueprint). Nula ate a fila escrever. */
    narrativa: jsonb("narrativa"),
    /**
     * Arrendamento da escrita da narrativa, o mesmo de
     * `assessments.narrativa_gerando_em` e pelo mesmo motivo: a chamada e paga,
     * leva minutos e nao cabe numa transacao aberta.
     */
    narrativa_gerando_em: timestamp("narrativa_gerando_em", TEMPO),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    foreignKey({
      name: "fk_assessments_resultados_assessment_versao",
      columns: [t.assessment_id, t.versao_instrumento],
      foreignColumns: [assessments.id, assessments.versao_instrumento],
    }).onDelete("restrict"),

    // Um resultado VIVO por mapa. Recalcular (motor novo) e soft delete do
    // antigo e linha nova: o resultado que foi entregue continua auditavel.
    uniqueIndex("uq_assessments_resultados_assessment")
      .on(t.assessment_id)
      .where(sql`${t.is_deleted} = false`),

    // Secao 5.1: "a soma e sempre 200 (+-0,2). Se nao for, a resposta esta
    // corrompida: rejeite". O banco rejeita tambem, para o motor que um dia
    // tiver bug nao gravar um resultado impossivel.
    check(
      "ck_assessments_resultados_natural",
      sql`${t.nat_d} BETWEEN 0 AND 100 AND ${t.nat_i} BETWEEN 0 AND 100
        AND ${t.nat_s} BETWEEN 0 AND 100 AND ${t.nat_c} BETWEEN 0 AND 100
        AND abs(${t.nat_d} + ${t.nat_i} + ${t.nat_s} + ${t.nat_c} - 200) <= 0.2`,
    ),
    check(
      "ck_assessments_resultados_adaptado",
      sql`${t.ada_d} BETWEEN 0 AND 100 AND ${t.ada_i} BETWEEN 0 AND 100
        AND ${t.ada_s} BETWEEN 0 AND 100 AND ${t.ada_c} BETWEEN 0 AND 100
        AND abs(${t.ada_d} + ${t.ada_i} + ${t.ada_s} + ${t.ada_c} - 200) <= 0.2`,
    ),
    check(
      "ck_assessments_resultados_perfis",
      sql`${t.perfil_natural} ~ '^(EQUILIBRADO|[DISC]{1,2})$'
        AND ${t.perfil_adaptado} ~ '^(EQUILIBRADO|[DISC]{1,2})$'`,
    ),
    check("ck_assessments_resultados_tipo_jung", sql`${t.tipo_jung} ~ '^[EI][NS][TF]$'`),
    check(
      "ck_assessments_resultados_confiabilidade",
      sql`${t.confiabilidade} IN ('alta', 'media', 'baixa')`,
    ),
  ],
);

export type AssessmentTela = typeof assessmentsTelas.$inferSelect;
export type NovaAssessmentTela = typeof assessmentsTelas.$inferInsert;
export type AssessmentResultado = typeof assessmentsResultados.$inferSelect;
export type NovoAssessmentResultado = typeof assessmentsResultados.$inferInsert;
