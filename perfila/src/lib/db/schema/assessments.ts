/**
 * Assessment aplicado, as respostas e os relatorios gerados.
 *
 * Nomenclatura hierarquica: assessments -> assessments_respostas,
 * assessments -> assessments_relatorios.
 */
import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, foreignKey, index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usuarios } from "./usuarios";
import { turmas } from "./turmas";
import { fatorDisc, situacaoAssessment, tipoRelatorio } from "./enums";
import { TEMPO } from "./tempo";

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    /** Vai na URL /avaliacao/<token>. E o unico acesso do respondente. */
    token: text("token").notNull(),
    facilitador_id: uuid("facilitador_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    /**
     * A turma que originou este assessment. Nulo para o que foi criado avulso,
     * pela tela de novo mapa, que e como todos os assessments existentes
     * nasceram — por isso opcional, e nao NOT NULL.
     *
     * Existe desde ja porque sem ele a exclusao de turma nao tem como recusar:
     * o soft delete deixaria assessment vivo apontando para turma invisivel.
     * A FK COMPOSTA (turma_id, facilitador_id) -> uq_turmas_id_facilitador,
     * que e o que impede um assessment de cruzar de dono, ja esta declarada
     * abaixo: entrou com o Envio Rapido, o fluxo que passou a gravar a coluna.
     */
    turma_id: uuid("turma_id").references(() => turmas.id, { onDelete: "restrict" }),
    avaliado_nome: text("avaliado_nome").notNull(),
    avaliado_email: text("avaliado_email").notNull(),
    tipo_relatorio: tipoRelatorio("tipo_relatorio").notNull(),
    situacao: situacaoAssessment("situacao").notNull().default("pendente"),
    /**
     * Quanto ESTE mapa custou, no momento em que nasceu.
     *
     * Copia do preco vigente na criacao, e nao um join com `precos_relatorios`:
     * o credito ja saiu do saldo e a linha do extrato ja foi lancada com este
     * numero. Se o custo viesse do preco de hoje, mudar o preco de S1
     * reescreveria o passado e o extrato pararia de explicar o saldo — que e o
     * COMMIT que a trigger da migration 0005 aborta. Preco novo vale para o
     * proximo mapa; este aqui esta pago.
     *
     * Zero quando `degustacao` e true: nenhum credito saiu da carteira, saiu
     * uma amostra do saldo de degustacao. Guardar o custo "equivalente" aqui
     * faria `removerPendentes` (actions/envio-lote.ts) estornar credito de
     * verdade por um mapa que nunca custou credito nenhum.
     */
    creditos_usados: integer("creditos_usados").notNull().default(0),
    /**
     * Amostra gratuita: o mapa nao consome credito, consome uma degustacao do
     * saldo do proprio parceiro (`usuarios.creditos_degustacao`).
     *
     * Coluna, e nao tabela: o que separa um mapa de degustacao de um mapa
     * normal e de onde saiu o pagamento. Todo o resto — token, respostas,
     * relatorio, validade — e identico, e uma tabela paralela seria o mesmo
     * fluxo escrito duas vezes.
     *
     * DEFAULT false porque a tabela ja tem linhas em homologacao: todo mapa
     * que existe hoje foi pago com credito.
     */
    degustacao: boolean("degustacao").notNull().default(false),
    expira_em: timestamp("expira_em", TEMPO).notNull(),
    concluido_em: timestamp("concluido_em", TEMPO),
    /**
     * Quando alguem COMECOU a escrever a narrativa deste mapa. Um arrendamento,
     * nao um estado.
     *
     * Escrever a narrativa e a unica operacao PAGA do sistema, leva minutos e
     * tem dois gatilhos independentes: o `after()` da conclusao
     * (`actions/avaliacao.ts`) e o botao "Gerar relatorio" da lista do parceiro.
     * Os dois olham "ja existe narrativa?" antes de comecar, e nesse intervalo a
     * resposta e nao para os dois — a plataforma paga a API duas vezes pelo
     * mesmo texto. O dado nao corrompe (o indice unico de versao e o
     * `for update` de `salvarNarrativa` seguram isso); o que se perde e dinheiro.
     *
     * Nao da para resolver com transacao: ela ficaria aberta durante a chamada,
     * segurando a linha e a conexao do pool por minutos. Nem com
     * `pg_advisory_lock`, que e preso a CONEXAO — com pool, travar e destravar
     * podem cair em conexoes diferentes.
     *
     * Entao o arrendamento: quem vai gerar carimba a hora aqui, numa transacao
     * curta com a linha travada, e quem chega depois ve o carimbo e desiste. Ele
     * VENCE (`PRAZO_DA_GERACAO_MS`), porque processo que morre no meio nao
     * apaga carimbo nenhum, e sem vencimento o mapa ficaria travado para sempre.
     */
    narrativa_gerando_em: timestamp("narrativa_gerando_em", TEMPO),

    /**
     * Quantas das 28 respostas cairam em cada fator. Somam 28, entao os
     * percentuais derivados somam 100.
     *
     * Guarda os contadores, e nao o perfil pronto: lista e relatorio
     * derivam do mesmo numero com `resultadoDeContadores` e nao podem
     * divergir. NAO reintroduzir uma coluna `perfil` calculada — ver
     * CONTINUIDADE.md. Nulos ate o assessment ser concluido.
     */
    contador_d: integer("contador_d"),
    contador_i: integer("contador_i"),
    contador_s: integer("contador_s"),
    contador_c: integer("contador_c"),

    // --- inventario MC-INV 2.2 (ADR-0007) ---
    /**
     * Qual inventario este mapa usa, do comeco ao fim (secao 8 do AGENTE).
     *
     * DEFAULT 'LEGADO', e nao 'MC-INV 2.2' como no blueprint: todo mapa que ja
     * existe foi respondido no inventario de 28 questoes, e a criacao continua
     * nascendo LEGADO ate a onda que liga o fluxo novo (D3). Trocar o default
     * aqui mudaria o fluxo de quem cria mapa hoje sem ninguem ter pedido.
     *
     * Sem CHECK de lista fechada de proposito: cada versao nova do instrumento
     * viraria migration. A trava que importa e a FK composta das telas (ver
     * `uq_assessments_id_versao`), que impede a versao de mudar no meio.
     */
    versao_instrumento: text("versao_instrumento").notNull().default("LEGADO"),
    /**
     * Codigo humano do mapa, impresso na capa: MC-AAAA-MMDD-XX. Quem gera e
     * `gerarCodigo` (lib/inventario/codigo.ts). Nulo nos mapas LEGADO, que
     * nunca tiveram codigo.
     */
    codigo: text("codigo"),
    /**
     * Semente da ordem aleatoria de telas e itens, sorteada uma vez no
     * primeiro acesso do respondente. Gravada porque V3 (secao 6) compara a
     * ordem enviada com a ordem sorteada: sem a semente nao ha como provar que
     * alguem enviou sem mexer em nada.
     */
    semente_ordem: integer("semente_ordem"),
    /** R6 LGPD: o aceite explicito, antes da primeira tela. */
    consentimento_em: timestamp("consentimento_em", TEMPO),
    /** Inicio do inventario. Base do tempo total da validade V1. */
    iniciado_em: timestamp("iniciado_em", TEMPO),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    // Escopo do dono na CHAVE. Aponta para `uq_turmas_id_facilitador`: o BANCO
    // recusa um assessment de um parceiro apontando para a turma de outro, em
    // vez de depender do WHERE da action. WHERE alguem esquece, chave nao.
    //
    // MATCH SIMPLE (o padrao) e o que faz o mapa avulso continuar valendo: com
    // `turma_id` nulo a checagem nem roda, e os assessments criados pela tela
    // de novo mapa — que nunca tiveram turma — seguem legais.
    foreignKey({
      name: "fk_assessments_turma_dono",
      columns: [t.turma_id, t.facilitador_id],
      foreignColumns: [turmas.id, turmas.facilitador_id],
    }).onDelete("restrict"),

    uniqueIndex("uq_assessments_token").on(t.token),
    // NAO e redundante com a PK. E o alvo da FK COMPOSTA de devolutivas
    // (assessment_id, facilitador_id): com ela, o banco RECUSA uma devolutiva
    // de um parceiro sobre o assessment de outro. Escopo na chave, e nao so no
    // WHERE — WHERE alguem esquece de escrever, chave nao. E o mesmo papel que
    // `uq_turmas_id_facilitador` cumpre para os assessments.
    uniqueIndex("uq_assessments_id_facilitador").on(t.id, t.facilitador_id),
    index("idx_assessments_facilitador").on(t.facilitador_id),
    index("idx_assessments_ativos").on(t.is_deleted),

    // Parcial: os mapas LEGADO nao tem codigo, e NULL nao colide com NULL de
    // qualquer jeito — o WHERE so deixa isso escrito. SEM `is_deleted` no
    // WHERE de proposito: o codigo vai impresso num PDF que ja saiu, e um mapa
    // excluido nao pode ceder o dele para outra pessoa.
    uniqueIndex("uq_assessments_codigo").on(t.codigo).where(sql`${t.codigo} IS NOT NULL`),
    check(
      "ck_assessments_codigo",
      sql`${t.codigo} IS NULL OR ${t.codigo} ~ '^MC-[0-9]{4}-[0-9]{4}-[A-Z]{2}(-[0-9]+)?$'`,
    ),
    // Alvo das FKs COMPOSTAS de assessments_telas e assessments_resultados
    // (schema/inventario.ts). Com elas o banco garante a regra da secao 8 —
    // "iniciada numa versao, termina na mesma": uma tela gravada com versao
    // diferente da do mapa e recusada, e a versao do mapa nao muda mais depois
    // da primeira tela (ON UPDATE NO ACTION, o padrao).
    uniqueIndex("uq_assessments_id_versao").on(t.id, t.versao_instrumento),
  ],
);

export const assessmentsRespostas = pgTable(
  "assessments_respostas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    assessment_id: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "restrict" }),
    /** Codigo da especificacao: Q01 ... Q28. */
    questao_codigo: text("questao_codigo").notNull(),
    /** Fator da opcao escolhida. Cada questao vale +1 para um unico fator. */
    fator: fatorDisc("fator").notNull(),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [
    // O progresso e salvo a cada resposta e o link pode ser retomado: a
    // segunda gravacao da mesma questao e uma correcao, nao uma linha nova.
    uniqueIndex("uq_respostas_assessment_questao").on(t.assessment_id, t.questao_codigo),
  ],
);

export const assessmentsRelatorios = pgTable(
  "assessments_relatorios",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- colunas de dominio ---
    assessment_id: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "restrict" }),
    /** Versao incremental: v1, v2, v3. A ultima e a que o usuario ve. */
    versao: integer("versao").notNull().default(1),
    /** Narrativa gerada pela IA, no formato validado em lib/relatorio/gerar.ts. */
    narrativa: jsonb("narrativa").notNull(),

    // --- colunas de auditoria OBRIGATORIAS (nunca omitir) ---
    created_at: timestamp("created_at", TEMPO).notNull().defaultNow(),
    updated_at: timestamp("updated_at", TEMPO).notNull().defaultNow(),
    deleted_at: timestamp("deleted_at", TEMPO),
    is_deleted: boolean("is_deleted").notNull().default(false),
    modified_by: uuid("modified_by").notNull(),
  },
  (t) => [uniqueIndex("uq_relatorios_assessment_versao").on(t.assessment_id, t.versao)],
);

export type Assessment = typeof assessments.$inferSelect;
export type NovoAssessment = typeof assessments.$inferInsert;
export type AssessmentResposta = typeof assessmentsRespostas.$inferSelect;
export type NovaAssessmentResposta = typeof assessmentsRespostas.$inferInsert;
export type AssessmentRelatorio = typeof assessmentsRelatorios.$inferSelect;
export type NovoAssessmentRelatorio = typeof assessmentsRelatorios.$inferInsert;
