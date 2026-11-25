/**
 * Better Auth, ligado ao schema que ja existia.
 *
 * O projeto nao adotou as tabelas padrao da biblioteca: `usuarios` ja tinha
 * dados, FKs de `assessments` e `creditos_transacoes` apontando para ela, e
 * colunas de dominio (papel, creditos, empresa, telefone) que o produto usa em
 * toda tela. Em vez de duplicar pessoas em duas tabelas, o mapeamento abaixo
 * ensina a biblioteca a usar as nossas. Ver ADR-0004.
 */
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contas, sessoes, usuarios, verificacoes } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/audit/logger";
import { montarEmailDeAcesso, resultadoDoEnvio } from "@/lib/email/acesso";
import { enviarEmail } from "@/lib/email/enviar";

const segredo = process.env.BETTER_AUTH_SECRET;
if (!segredo) {
  // Sem segredo o Better Auth assina cookie com um valor previsivel, e sessao
  // assinada com segredo conhecido nao vale nada. Falhar no boot e melhor que
  // subir uma plataforma que so parece autenticada.
  throw new Error(
    "BETTER_AUTH_SECRET nao definida. Gere uma com `openssl rand -base64 32` e coloque em .env.local.",
  );
}

/** So o caminho de credencial passa por aqui; os demais seguem intactos. */
const ENTRAR = "/sign-in/email";

/**
 * Limite de tentativas por CONTA, e nao por IP.
 *
 * O Map vai no escopo global pelo mesmo motivo do pool em `lib/db`: o Next
 * instancia este modulo UMA VEZ POR BUNDLE, e a Server Action e a rota
 * /api/auth/* estao em bundles diferentes. Com o Map no escopo do modulo,
 * cada porta contava a sua propria conta — travar por um caminho deixava o
 * outro zerado, que e exatamente o buraco que este hook veio fechar. Medido:
 * seis falhas no endpoint davam 429 la e 401 na action.
 *
 * ponytail: contador em memoria, por processo. Segura o ataque de uma origem
 * so; nao sobrevive a restart nem enxerga as outras instancias. Trocar por
 * Redis (ou pelo secondaryStorage do Better Auth) quando houver mais de um
 * processo servindo login.
 */
const TENTATIVAS_MAX = 5;
const JANELA_MS = 15 * 60 * 1000;

type Tentativa = { contador: number; ate: number };
const escopoGlobal = globalThis as unknown as { __valmerTentativasLogin?: Map<string, Tentativa> };
const tentativas = (escopoGlobal.__valmerTentativasLogin ??= new Map<string, Tentativa>());

function registrarTentativa(chave: string): boolean {
  const agora = Date.now();
  const atual = tentativas.get(chave);

  if (!atual || agora > atual.ate) {
    tentativas.set(chave, { contador: 1, ate: agora + JANELA_MS });
    return true;
  }

  atual.contador += 1;
  return atual.contador <= TENTATIVAS_MAX;
}

/** Codigo proprio: e por ele que a tela distingue "travado" de "senha errada". */
export const MUITAS_TENTATIVAS = "MUITAS_TENTATIVAS";

function emailDoCorpo(corpo: unknown): string {
  const email = (corpo as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export const auth = betterAuth({
  secret: segredo,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  database: drizzleAdapter(db, {
    provider: "pg",
    // As chaves precisam bater com os `modelName` abaixo, e nao com os nomes
    // internos da biblioteca: e por elas que o adapter acha cada tabela.
    schema: { usuarios, sessoes, contas, verificacoes },
  }),

  emailAndPassword: {
    enabled: true,
    // Sem confirmacao de e-mail: quem cria a conta e o admin, que ja conhece o
    // parceiro, e o link de acesso (abaixo) ja prova que o e-mail e dele.
    requireEmailVerification: false,
    minPasswordLength: 10,
    // Primeiro acesso: o parceiro recebe por e-mail um link para DEFINIR a
    // propria senha (o admin nunca escolhe nem ve a senha de outra pessoa, e
    // senha nao viaja por e-mail). 48h porque o e-mail pode ser lido so no dia
    // seguinte; o token e de uso unico. Passou do prazo, o admin usa "Reenviar
    // acesso". Ver docs/seguranca-login.md.
    resetPasswordTokenExpiresIn: 48 * 60 * 60,
    // Quem redefine a senha derruba as sessoes antigas.
    revokeSessionsOnPasswordReset: true,
    // O erro daqui NAO sobe para quem chamou `requestPasswordReset` (a
    // biblioteca o engole): ele volta pelo AsyncLocalStorage, ver
    // lib/email/acesso.ts. Nada que tenha o link e logado.
    sendResetPassword: async ({ user, url }) => {
      const estado = resultadoDoEnvio.getStore();
      try {
        await enviarEmail({ para: user.email, ...montarEmailDeAcesso(user.name, url) });
        if (estado) estado.enviado = true;
      } catch (erro) {
        if (estado) estado.erro = erro instanceof Error ? erro.message : "falha no envio";
        throw erro;
      }
    },
    // Trilha de quem definiu a senha pelo link. Sem senha nem token no texto.
    onPasswordReset: async ({ user }) => {
      await registrarAuditoria({
        userId: user.id,
        acao: "atualizar",
        tabela: "usuarios",
        registroId: user.id,
        detalhes: `${user.email} definiu a senha pelo link enviado por e-mail`,
      });
    },
    // Conta na plataforma se cria pelo admin, nunca pela internet. Sem isto o
    // catch-all publica POST /api/auth/sign-up/email, e o que hoje impede o
    // cadastro e so o NOT NULL de usuarios.modified_by — uma constraint de
    // auditoria, que nao e cadeado de autorizacao e pode ganhar default a
    // qualquer momento sem ninguem ligar uma coisa a outra.
    disableSignUp: true,
  },

  user: {
    modelName: "usuarios",
    fields: {
      // A esquerda o nome do Better Auth, a direita a chave no nosso schema.
      name: "nome",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      // `input: false` em todos: sao decisoes do negocio, e nenhum deles pode
      // chegar pelo corpo de um POST de cadastro. Papel e saldo definidos pelo
      // proprio usuario seriam escalonamento de privilegio e credito de graca.
      papel: { type: "string", required: false, defaultValue: "facilitador", input: false },
      empresa: { type: "string", required: false, input: false },
      telefone: { type: "string", required: false, input: false },
      creditos: { type: "number", required: false, defaultValue: 0, input: false },
      ativo: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },

  session: {
    modelName: "sessoes",
    // O docs/oauth.md pede 24h; o Better Auth conta em segundos.
    expiresIn: 24 * 60 * 60,
    // Renova a sessao quando faltar menos de uma hora, para quem esta usando a
    // plataforma nao ser deslogado no meio de um trabalho.
    updateAge: 60 * 60,
  },

  account: { modelName: "contas" },
  verification: { modelName: "verificacoes" },

  advanced: {
    database: {
      // Deixa o Postgres gerar o id. Sem isto o Better Auth gera uma string
      // propria, que nao cabe numa coluna uuid — e as FKs de assessments e
      // creditos_transacoes apontam para uuid.
      generateId: false,
    },
  },

  /**
   * A rota catch-all publica 30 endpoints do Better Auth. O produto usa quatro:
   * entrar, sair, ler a sessao e listar as proprias sessoes. O resto — editar
   * perfil, trocar senha, apagar conta, recuperar senha, OAuth — nao tem tela,
   * nao tem cliente e nao tem provedor configurado. Endpoint que ninguem chama
   * e superficie que so o atacante usa.
   *
   * A lista abaixo e o COMPLEMENTO de uma allowlist: fica de pe o que um
   * cliente HTTP legitimo da biblioteca precisa, cai o que so existe porque a
   * biblioteca traz. `disabledPaths` vale SO para o router HTTP — `auth.api.*`
   * nao consulta a lista —, entao ela nunca alcanca as Server Actions, o seed
   * nem os testes, que falam com a biblioteca em processo.
   *
   * `/sign-in/email` fica ABERTO de proposito, e e seguro por causa dos hooks
   * abaixo: sem eles este endpoint seria a segunda porta, sem limite por conta
   * e emitindo cookie para conta desativada. A protecao esta na regra, nao em
   * esconder a rota.
   *
   * MEDIDO: `disabledPaths` compara a string do caminho, entao padrao com
   * parametro nao casa e NAO da para desligar por aqui. Ficam de pe
   * `/callback/:id` (302 para /api/auth/error?error=state_not_found, sem
   * provedor configurado) e `/reset-password/:token` — este ULTIMO e o link do
   * e-mail de acesso: valida o token e redireciona para /definir-senha?token=
   * (ou ?error=INVALID_TOKEN). Quem GRAVA a senha nao e HTTP: e a Server Action
   * de /definir-senha por `auth.api.resetPassword`, que `disabledPaths` nao
   * alcanca. Por isso `/request-password-reset` e `/reset-password` (POST)
   * seguem desligados abaixo: pedir link so o admin pode, por action com RBAC.
   *
   * ponytail: lista explicita, escrita a mao. Uma versao nova da biblioteca que
   * traga endpoint novo o publica por padrao — ao subir o Better Auth, rodar
   * `grep -rhoE 'createAuthEndpoint\(\s*"/[a-z0-9/:_.-]+"' node_modules/better-auth/dist/api`
   * e conferir se apareceu caminho fora desta lista. O teste
   * "a rota HTTP responde" em tests/auth.test.mts trava o outro lado: se algum
   * dia alguem desligar demais, ele quebra.
   */
  disabledPaths: [
    // Cadastro: conta se cria pelo admin. Redundante com disableSignUp acima,
    // e de proposito — as duas linhas dizem a mesma coisa em camadas diferentes.
    "/sign-up/email",
    "/verify-password",

    // Sessao alheia: encerrar e listar a propria sessao continuam abertos
    // (/sign-out, /list-sessions); mexer em sessao por id, nao.
    "/update-session",
    "/revoke-session",
    "/revoke-sessions",
    "/revoke-other-sessions",

    // Conta e perfil: quem edita usuario e a tela do admin, com sessao e RBAC.
    // Aberto aqui, o /update-user seria o caminho para trocar o proprio e-mail
    // sem passar por regra nenhuma do produto.
    "/update-user",
    "/change-email",
    "/change-password",
    "/delete-user",
    "/delete-user/callback",
    "/account-info",
    "/list-accounts",

    // Recuperacao e verificacao por e-mail: o envio existe (SMTP), mas pedir
    // o link e privilegio do admin (actions/facilitadores.ts), nao endpoint
    // publico — "esqueci a senha" aberto seria disparo de e-mail por qualquer um.
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/verify-email",

    // OAuth: nao ha provedor configurado. Reabrir junto com o primeiro.
    // (`/callback/:id` nao entra: ver a nota sobre parametros acima.)
    "/sign-in/social",
    "/link-social",
    "/unlink-account",
    "/get-access-token",
    "/refresh-token",
  ],


  /**
   * As duas regras de negocio do login moram aqui, e nao na Server Action.
   *
   * Motivo: a rota catch-all publica `POST /api/auth/sign-in/email`, que nao
   * passa por `actions/auth.ts`. Com as regras la, bastava chamar o endpoint
   * direto para gastar tentativas infinitas e para uma conta desativada
   * receber cookie valido de 24h. Hooks sao o unico ponto por onde as DUAS
   * portas passam — o dispatch do Better Auth roda os mesmos hooks para o
   * router HTTP e para `auth.api.*` — entao a regra vale para as duas, e
   * para qualquer cliente que apareca depois.
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== ENTRAR) return;

      const email = emailDoCorpo(ctx.body);
      if (!email) return;

      if (!registrarTentativa(email)) {
        throw new APIError("TOO_MANY_REQUESTS", {
          code: MUITAS_TENTATIVAS,
          message: "Muitas tentativas. Espere alguns minutos e tente de novo.",
        });
      }

      // Conta desativada nao entra. `ativo` e coluna nossa: a biblioteca
      // autentica a credencial, nao a regra de negocio. A recusa sai ANTES da
      // sessao nascer, e com a MESMA mensagem de credencial invalida — dizer
      // "conta desativada" confirmaria a quem tentou que o e-mail existe.
      const [usuario] = await db
        .select({ ativo: usuarios.ativo })
        .from(usuarios)
        .where(and(eq(usuarios.email, email), eq(usuarios.is_deleted, false)))
        .limit(1);

      if (usuario && !usuario.ativo) {
        throw new APIError("UNAUTHORIZED", {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        });
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== ENTRAR) return;

      // Credencial aceita zera o contador. Sem isto o limite contaria acertos
      // junto com erros, e cinco logins legitimos em quinze minutos — duas
      // abas, um restart de aba — trancariam a pessoa para fora.
      if (ctx.context.returned instanceof APIError) return;
      tentativas.delete(emailDoCorpo(ctx.body));
    }),
  },

  // Sem isto, chamar signIn de dentro de uma Server Action nao grava o cookie:
  // o Set-Cookie da resposta se perde no caminho.
  plugins: [nextCookies()],
});

export type SessaoBetterAuth = typeof auth.$Infer.Session;
