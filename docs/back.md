# Backend - Documentacao

## Stack

- **Runtime**: Node.js (via Next.js server-side)
- **ORM**: Drizzle ORM (https://orm.drizzle.team/)
- **Banco**: PostgreSQL 16+
- **Validacao**: Zod
- **Auth**: Next.js Middleware + Cookies (session-based)

## Estrutura de Pastas

```
src/
  lib/
    db/
      index.ts              # Conexao com banco (drizzle instance)
      schema/
        index.ts             # Re-exporta todos schemas
        usuarios.ts
        contratos.ts
        lancamentos.ts
        categorias.ts
        auditoria.ts
      migrations/            # Migracoes geradas pelo Drizzle Kit
    actions/
      usuarios.ts            # Server Actions de usuarios
      contratos.ts           # Server Actions de contratos
      lancamentos.ts         # Server Actions de lancamentos - CENTRALIZADO
    validators/
      lancamento.schema.ts   # Schemas Zod para validacao
      contrato.schema.ts
      usuario.schema.ts
    auth/
      rbac.ts               # Controle de acesso por role
      session.ts            # Gerenciamento de sessao
      middleware.ts          # Middleware de autenticacao
    audit/
      logger.ts             # Registro de auditoria
      versioning.ts         # Versionamento de documentos/PDFs
    utils/
      soft-delete.ts        # Helper de soft delete padronizado
      pagination.ts         # Helper de paginacao
```

## Drizzle ORM - Configuracao

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

## Padrao de Schema (Template)

Toda tabela segue este padrao:

```typescript
// src/lib/db/schema/[entidade].ts
import { pgTable, uuid, text, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const entidade = pgTable('entidade', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Colunas especificas...
  nome: text('nome').notNull(),
  
  // FK com constraint — NUNCA cascade em dados criticos
  organizacao_id: uuid('organizacao_id')
    .notNull()
    .references(() => organizacoes.id, { onDelete: 'restrict' }),
  
  // === COLUNAS OBRIGATORIAS ===
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),
  is_deleted: boolean('is_deleted').notNull().default(false),
  modified_by: uuid('modified_by').notNull(),
});

// Relations (para queries com join)
export const entidadeRelations = relations(entidade, ({ one, many }) => ({
  organizacao: one(organizacoes, {
    fields: [entidade.organizacao_id],
    references: [organizacoes.id],
  }),
}));
```

## Padrao de Server Action (Template)

```typescript
// src/lib/actions/[entidade].ts
'use server';

import { db } from '@/lib/db';
import { entidade } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { temPermissao } from '@/lib/auth/rbac';
import { registrarAuditoria } from '@/lib/audit/logger';
import { entidadeSchema } from '@/lib/validators/entidade.schema';

// LISTAR - sempre filtrar is_deleted
export async function listarEntidades() {
  const session = await getSession();
  if (!temPermissao(session.user.role, 'entidade', 'ler')) {
    throw new Error('Sem permissao');
  }
  
  return db.select()
    .from(entidade)
    .where(and(
      eq(entidade.is_deleted, false),
      eq(entidade.organizacao_id, session.user.organizacao_id),
    ))
    .orderBy(desc(entidade.created_at));
}

// CRIAR - validar + auditar
export async function criarEntidade(dados: FormData) {
  const session = await getSession();
  if (!temPermissao(session.user.role, 'entidade', 'criar')) {
    throw new Error('Sem permissao');
  }
  
  const parsed = entidadeSchema.safeParse(Object.fromEntries(dados));
  if (!parsed.success) {
    return { erro: parsed.error.flatten() };
  }
  
  const [novo] = await db.insert(entidade)
    .values({
      ...parsed.data,
      organizacao_id: session.user.organizacao_id,
      modified_by: session.user.id,
    })
    .returning();
  
  await registrarAuditoria({
    userId: session.user.id,
    acao: 'criar',
    tabela: 'entidade',
    registroId: novo.id,
    detalhes: `Criou entidade: ${parsed.data.nome}`,
    dadosNovos: parsed.data,
  });
  
  return { sucesso: true, id: novo.id };
}

// ATUALIZAR - validar + auditar com dados anteriores
export async function atualizarEntidade(id: string, dados: FormData) {
  const session = await getSession();
  if (!temPermissao(session.user.role, 'entidade', 'atualizar')) {
    throw new Error('Sem permissao');
  }
  
  const [anterior] = await db.select()
    .from(entidade)
    .where(and(eq(entidade.id, id), eq(entidade.is_deleted, false)));
  
  if (!anterior) throw new Error('Registro nao encontrado');
  
  const parsed = entidadeSchema.safeParse(Object.fromEntries(dados));
  if (!parsed.success) {
    return { erro: parsed.error.flatten() };
  }
  
  await db.update(entidade)
    .set({
      ...parsed.data,
      updated_at: new Date(),
      modified_by: session.user.id,
    })
    .where(eq(entidade.id, id));
  
  await registrarAuditoria({
    userId: session.user.id,
    acao: 'atualizar',
    tabela: 'entidade',
    registroId: id,
    detalhes: `Atualizou entidade: ${anterior.nome}`,
    dadosAnteriores: anterior,
    dadosNovos: parsed.data,
  });
  
  return { sucesso: true };
}

// EXCLUIR - SEMPRE soft delete + auditar
export async function excluirEntidade(id: string) {
  const session = await getSession();
  if (!temPermissao(session.user.role, 'entidade', 'deletar')) {
    throw new Error('Sem permissao');
  }
  
  const [anterior] = await db.select()
    .from(entidade)
    .where(and(eq(entidade.id, id), eq(entidade.is_deleted, false)));
  
  if (!anterior) throw new Error('Registro nao encontrado');
  
  // SOFT DELETE - nunca delete fisico
  await db.update(entidade)
    .set({
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
      modified_by: session.user.id,
    })
    .where(eq(entidade.id, id));
  
  await registrarAuditoria({
    userId: session.user.id,
    acao: 'excluir',
    tabela: 'entidade',
    registroId: id,
    detalhes: `Excluiu (logico) entidade: ${anterior.nome}`,
    dadosAnteriores: anterior,
  });
  
  return { sucesso: true };
}
```

## Tabela de Auditoria

```typescript
// src/lib/db/schema/auditoria.ts
export const auditoria = pgTable('auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  acao: text('acao').notNull(), // 'criar' | 'atualizar' | 'excluir'
  tabela: text('tabela').notNull(),
  registro_id: uuid('registro_id').notNull(),
  detalhes: text('detalhes').notNull(),
  dados_anteriores: text('dados_anteriores'), // JSON stringified
  dados_novos: text('dados_novos'), // JSON stringified
  created_at: timestamp('created_at').notNull().defaultNow(),
});
```

## E-mail (SMTP da Hostinger)

`src/lib/email/enviar.ts` expoe `enviarEmail({ para, assunto, texto, html })`
(nodemailer; `secure` quando `SMTP_PORTA` = 465). Variaveis, lidas NA CHAMADA
(o build nao precisa delas; sem elas o envio falha com "Envio de e-mail nao
configurado"): `SMTP_HOST`, `SMTP_PORTA`, `SMTP_USUARIO`, `SMTP_SENHA`,
`EMAIL_REMETENTE`. O link dos e-mails usa `BETTER_AUTH_URL` como origem publica.

Fluxos (todos depois do commit; falha de e-mail nunca desfaz nada — RN-108 a 110):

- **Acesso do parceiro**: `facilitadores.criar` / `enviarAcessoDoParceiro` ->
  `lib/auth/enviar-acesso.ts` -> `auth.api.requestPasswordReset` (token 48h) ->
  `sendResetPassword` em `lib/auth/config.ts` envia o e-mail. A biblioteca
  engole o erro do envio; ele volta pelo `AsyncLocalStorage` de
  `lib/email/acesso.ts`. O link do e-mail aponta para
  `/api/auth/reset-password/<token>`, que redireciona a `/definir-senha?token=`
  (ou `?error=INVALID_TOKEN`); a pagina grava por `auth.api.resetPassword`
  (`actions/definir-senha.ts`). Os endpoints HTTP de pedir/gravar seguem em
  `disabledPaths`.
- **Convite do mapa**: `assessments.criar`, `envio-lote.criarLote` e
  `assessments.reenviarConvite` -> `lib/email/avisos-do-mapa.ts:enviarConvite`.
- **Conclusao e relatorio pronto**: `avisarConclusao` (fecho DISC/MC, via
  `after`) e `avisarRelatorioPronto` (ao gravar a narrativa), este com
  idempotencia por carimbo em `assessments`.

Testes trocam o envio por `substituirEnvioParaTeste` (`tests/emails.test.mts`).

## Comandos

```bash
# Gerar migracao
npx drizzle-kit generate

# Aplicar migracao
npx drizzle-kit migrate

# Abrir studio (visualizar banco)
npx drizzle-kit studio

# Rodar banco local
docker compose up -d
```

## Regras

1. Toda logica de negocio fica em `src/lib/actions/` — centralizada
2. Validacao fica em `src/lib/validators/` — separada da action
3. Acesso ao banco SEMPRE via `db` exportado de `src/lib/db/index.ts`
4. NUNCA acessar banco diretamente em componentes ou API routes
5. NUNCA retornar dados sem verificar RBAC e filtrar `is_deleted`
