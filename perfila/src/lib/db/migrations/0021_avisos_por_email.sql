ALTER TABLE "usuarios" ADD COLUMN "preferencias_notificacao" jsonb;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "relatorio_avaliado_enviado_em" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "relatorio_facilitador_enviado_em" timestamp (3) with time zone;