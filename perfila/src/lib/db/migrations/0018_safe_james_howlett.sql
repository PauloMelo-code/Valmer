CREATE TABLE "territorios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facilitador_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"descricao" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"modified_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territorios_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"territorio_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"facilitador_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"modified_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "territorios" ADD CONSTRAINT "territorios_facilitador_id_usuarios_id_fk" FOREIGN KEY ("facilitador_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_territorios_id_facilitador" ON "territorios" USING btree ("id","facilitador_id");
--> statement-breakpoint
ALTER TABLE "territorios_assessments" ADD CONSTRAINT "fk_territorios_assessments_territorio_dono" FOREIGN KEY ("territorio_id","facilitador_id") REFERENCES "public"."territorios"("id","facilitador_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "territorios_assessments" ADD CONSTRAINT "fk_territorios_assessments_assessment_dono" FOREIGN KEY ("assessment_id","facilitador_id") REFERENCES "public"."assessments"("id","facilitador_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_territorios_facilitador_slug" ON "territorios" USING btree ("facilitador_id","slug") WHERE "territorios"."is_deleted" = false;
--> statement-breakpoint
CREATE INDEX "idx_territorios_dono" ON "territorios" USING btree ("facilitador_id","is_deleted");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_territorios_assessments_vinculo" ON "territorios_assessments" USING btree ("territorio_id","assessment_id") WHERE "territorios_assessments"."is_deleted" = false;
--> statement-breakpoint
CREATE INDEX "idx_territorios_assessments_territorio" ON "territorios_assessments" USING btree ("territorio_id","is_deleted");