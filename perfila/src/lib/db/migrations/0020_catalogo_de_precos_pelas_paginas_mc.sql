-- O catalogo de precos passa a descrever os niveis pelas paginas do MC 3.1.
--
-- A 0012 gravou em `precos_relatorios.conteudo` os textos antigos ("dashboard
-- online do avaliado + historico de evolucao"), que a ADR-0007 (D9) aposentou:
-- o nivel so recorta paginas (S1 = 01-16, S2 = 01-28, S3 = 01-36, S4 = 01-42).
-- O texto novo mora em `data/planos.ts`, mas so chegava ao banco pelo seed, que
-- pula tabela nao vazia — e a 0012 garante que ela nunca nasce vazia. Como o
-- deploy so roda migrate, HML e PRD ficariam com a vitrine antiga para sempre.
--
-- O WHERE pelo texto ANTIGO preserva o que o admin ja tiver editado em
-- /admin/precos: so troca a linha que ainda diz exatamente o que a 0012 gravou.
-- Os textos abaixo repetem `tiposRelatorio` de `data/planos.ts`.
UPDATE "precos_relatorios" SET "conteudo" = 'Páginas 01 a 16: perfil DISC natural e adaptado, mapa de intensidade, combinação natural, custo da adaptação, os quatro fatores, forças, tensões e gatilhos', "updated_at" = now()
WHERE "codigo" = 'S1' AND "conteudo" = 'DISC + narrativa por IA básica + encaixe de cargos' AND "is_deleted" = false;
--> statement-breakpoint
UPDATE "precos_relatorios" SET "conteudo" = 'S1 + páginas 17 a 28: tipos psicológicos e hierarquia funcional, os seis valores, leitura integrada das três camadas e resumo do perfil', "updated_at" = now()
WHERE "codigo" = 'S2' AND "conteudo" = 'S1 + estilo de liderança + como gerir este perfil' AND "is_deleted" = false;
--> statement-breakpoint
UPDATE "precos_relatorios" SET "conteudo" = 'S2 + páginas 29 a 36: estilo de liderança, mapa de competências, pontos a desenvolver e o início do guia de comunicação (perfis DOMINANTE e INFLUENTE)', "updated_at" = now()
WHERE "codigo" = 'S3' AND "conteudo" = 'S2 + Plano de Desenvolvimento Individual (PDI)' AND "is_deleted" = false;
--> statement-breakpoint
UPDATE "precos_relatorios" SET "conteudo" = 'Relatório completo, 42 páginas: S3 + comunicação com os perfis ESTÁVEL e CONFORME, como liderar cada perfil e o fechamento', "updated_at" = now()
WHERE "codigo" = 'S4' AND "conteudo" = 'S3 + dashboard online do avaliado + histórico de evolução' AND "is_deleted" = false;
