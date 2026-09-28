CREATE TABLE "assessments_resultados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"versao_instrumento" text NOT NULL,
	"versao_motor" text NOT NULL,
	"resultado" jsonb NOT NULL,
	"nat_d" double precision NOT NULL,
	"nat_i" double precision NOT NULL,
	"nat_s" double precision NOT NULL,
	"nat_c" double precision NOT NULL,
	"ada_d" double precision NOT NULL,
	"ada_i" double precision NOT NULL,
	"ada_s" double precision NOT NULL,
	"ada_c" double precision NOT NULL,
	"perfil_natural" text NOT NULL,
	"perfil_adaptado" text NOT NULL,
	"tipo_jung" text NOT NULL,
	"confiabilidade" text NOT NULL,
	"narrativa" jsonb,
	"narrativa_gerando_em" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"modified_by" uuid NOT NULL,
	CONSTRAINT "ck_assessments_resultados_natural" CHECK ("assessments_resultados"."nat_d" BETWEEN 0 AND 100 AND "assessments_resultados"."nat_i" BETWEEN 0 AND 100
        AND "assessments_resultados"."nat_s" BETWEEN 0 AND 100 AND "assessments_resultados"."nat_c" BETWEEN 0 AND 100
        AND abs("assessments_resultados"."nat_d" + "assessments_resultados"."nat_i" + "assessments_resultados"."nat_s" + "assessments_resultados"."nat_c" - 200) <= 0.2),
	CONSTRAINT "ck_assessments_resultados_adaptado" CHECK ("assessments_resultados"."ada_d" BETWEEN 0 AND 100 AND "assessments_resultados"."ada_i" BETWEEN 0 AND 100
        AND "assessments_resultados"."ada_s" BETWEEN 0 AND 100 AND "assessments_resultados"."ada_c" BETWEEN 0 AND 100
        AND abs("assessments_resultados"."ada_d" + "assessments_resultados"."ada_i" + "assessments_resultados"."ada_s" + "assessments_resultados"."ada_c" - 200) <= 0.2),
	CONSTRAINT "ck_assessments_resultados_perfis" CHECK ("assessments_resultados"."perfil_natural" ~ '^(EQUILIBRADO|[DISC]{1,2})$'
        AND "assessments_resultados"."perfil_adaptado" ~ '^(EQUILIBRADO|[DISC]{1,2})$'),
	CONSTRAINT "ck_assessments_resultados_tipo_jung" CHECK ("assessments_resultados"."tipo_jung" ~ '^[EI][NS][TF]$'),
	CONSTRAINT "ck_assessments_resultados_confiabilidade" CHECK ("assessments_resultados"."confiabilidade" IN ('alta', 'media', 'baixa'))
);
--> statement-breakpoint
CREATE TABLE "assessments_telas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"etapa" smallint NOT NULL,
	"tela" text NOT NULL,
	"ordem_final" jsonb,
	"lado_polo_a" text,
	"resposta_exibida" smallint,
	"resposta_polo_a" smallint,
	"moveu_item" boolean NOT NULL,
	"entrou_em" timestamp (3) with time zone NOT NULL,
	"saiu_em" timestamp (3) with time zone NOT NULL,
	"versao_instrumento" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"modified_by" uuid NOT NULL,
	CONSTRAINT "ck_assessments_telas_etapa" CHECK ("assessments_telas"."etapa" BETWEEN 1 AND 4),
	CONSTRAINT "ck_assessments_telas_forma" CHECK (COALESCE(("assessments_telas"."etapa" IN (1, 2)
            AND "assessments_telas"."tela" ~ '^G[0-9]{2}$'
            AND jsonb_typeof("assessments_telas"."ordem_final") = 'array'
            AND jsonb_array_length("assessments_telas"."ordem_final") = 4
            AND "assessments_telas"."lado_polo_a" IS NULL AND "assessments_telas"."resposta_exibida" IS NULL
            AND "assessments_telas"."resposta_polo_a" IS NULL)
        OR ("assessments_telas"."etapa" = 4
            AND "assessments_telas"."tela" ~ '^V[0-9]{2}$'
            AND jsonb_typeof("assessments_telas"."ordem_final") = 'array'
            AND jsonb_array_length("assessments_telas"."ordem_final") = 6
            AND "assessments_telas"."lado_polo_a" IS NULL AND "assessments_telas"."resposta_exibida" IS NULL
            AND "assessments_telas"."resposta_polo_a" IS NULL)
        OR ("assessments_telas"."etapa" = 3
            AND "assessments_telas"."tela" ~ '^(EI|NS|TF)[0-9]{2}$'
            AND "assessments_telas"."ordem_final" IS NULL
            AND "assessments_telas"."lado_polo_a" IN ('esquerda', 'direita')
            AND "assessments_telas"."resposta_exibida" BETWEEN 0 AND 3), false)),
	CONSTRAINT "ck_assessments_telas_polo_a" CHECK ("assessments_telas"."resposta_polo_a" IS NOT DISTINCT FROM (CASE "assessments_telas"."lado_polo_a"
            WHEN 'esquerda' THEN 3 - "assessments_telas"."resposta_exibida"
            WHEN 'direita' THEN "assessments_telas"."resposta_exibida" END)),
	CONSTRAINT "ck_assessments_telas_tempo" CHECK ("assessments_telas"."saiu_em" >= "assessments_telas"."entrou_em")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "versao_instrumento" text DEFAULT 'LEGADO' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "codigo" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "semente_ordem" integer;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "consentimento_em" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "iniciado_em" timestamp (3) with time zone;--> statement-breakpoint
-- Reordenado a mao: o drizzle-kit gera as FKs compostas antes deste indice,
-- e o Postgres recusa FK que aponta para colunas sem indice unico.
CREATE UNIQUE INDEX "uq_assessments_id_versao" ON "assessments" USING btree ("id","versao_instrumento");--> statement-breakpoint
ALTER TABLE "assessments_resultados" ADD CONSTRAINT "fk_assessments_resultados_assessment_versao" FOREIGN KEY ("assessment_id","versao_instrumento") REFERENCES "public"."assessments"("id","versao_instrumento") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments_telas" ADD CONSTRAINT "fk_assessments_telas_assessment_versao" FOREIGN KEY ("assessment_id","versao_instrumento") REFERENCES "public"."assessments"("id","versao_instrumento") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessments_resultados_assessment" ON "assessments_resultados" USING btree ("assessment_id") WHERE "assessments_resultados"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessments_telas_tela" ON "assessments_telas" USING btree ("assessment_id","etapa","tela") WHERE "assessments_telas"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessments_codigo" ON "assessments" USING btree ("codigo") WHERE "assessments"."codigo" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "ck_assessments_codigo" CHECK ("assessments"."codigo" IS NULL OR "assessments"."codigo" ~ '^MC-[0-9]{4}-[0-9]{4}-[A-Z]{2}(-[0-9]+)?$');