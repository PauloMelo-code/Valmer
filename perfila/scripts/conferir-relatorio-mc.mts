/**
 * Conferencia visual do relatorio MC 3.1: banco -> rota publica -> PDF -> PNGs.
 *
 *   npm run relatorio-mc:conferir [-- --saida <pasta>] [--url http://localhost:3000]
 *
 * 1. Garante o mapa MC-INV 2.2 concluido de `seed-mc.ts` (Adriana Prado, S4,
 *    69 telas, resultado do motor) e grava nele a narrativa de
 *    `tests/fixtures/narrativa-demonstracao.json`, sem chamar a API.
 *    Idempotente: o seed pula se ja existe, e a narrativa e regravada igual.
 * 2. Imprime `/relatorio/<token>` com o mesmo `salvarPdf` do CLI.
 *    Sem `--url`: roda `npm run build` e sobe `next start` numa porta livre,
 *    derrubado no fim. Build de producao, e nao dev server, porque o laco de
 *    correcao muda codigo a cada rodada e o PDF tem de sair do codigo atual,
 *    renderizado como em producao (sem compilacao sob demanda nem overlay).
 *    Com `--url`: usa a aplicacao que ja esta no ar, sem build (ela tem de
 *    estar com o codigo atual e no MESMO banco).
 * 3. Rasteriza cada pagina em <saida>/pNN.png a 110 dpi com PyMuPDF.
 * 4. Sai com erro se o PDF nao tiver 42 paginas A4.
 *
 * Pre-requisitos: Postgres do .env.local no ar e migrado (`npm run db:migrate`);
 * sem o mapa, a ferramenta roda `npm run db:seed` (o dono, Valmer, precisa de
 * 8 creditos na primeira vez);
 * `python` com PyMuPDF (`pip install pymupdf`); Chrome do Puppeteer instalado.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { config } from "dotenv";

const RAIZ = resolve(import.meta.dirname, "..");
process.chdir(RAIZ);
config({ path: [".env.local", ".env"] });

const PAGINAS = 42;
const DPI = 110;
const SAIDA_PADRAO =
  "C:/Users/Paulo/AppData/Local/Temp/claude/c--Users-Paulo-Desktop-Valmer/683a9725-792f-4f86-98cf-ea1be7a0aee9/scratchpad/qa/nosso";

function lerOpcoes(args: string[]) {
  const opcoes: { saida: string; url?: string } = { saida: SAIDA_PADRAO };
  for (let i = 0; i < args.length; i++) {
    const valor = args[i + 1];
    if (args[i] === "--saida" && valor) opcoes.saida = args[++i]!;
    else if (args[i] === "--url" && valor) opcoes.url = args[++i]!;
    else throw new Error(`Opcao invalida: ${args[i]}. Uso: npm run relatorio-mc:conferir -- [--saida <pasta>] [--url <base>]`);
  }
  opcoes.saida = resolve(opcoes.saida);
  return opcoes;
}

/** Passo 1: devolve o token do mapa de demonstracao, com narrativa gravada. */
async function garantirMapa(): Promise<string> {
  const { db } = await import("../src/lib/db");
  const { assessments, assessmentsResultados } = await import("../src/lib/db/schema");
  const { ID_CONCLUIDO } = await import("../src/lib/db/seed-mc");
  const { esquemaNarrativaMC } = await import("../src/lib/relatorio-mc/narrativa-esquema");
  const { and, eq } = await import("drizzle-orm");

  const buscar = () =>
    db
      .select({ token: assessments.token, situacao: assessments.situacao, nivel: assessments.tipo_relatorio })
      .from(assessments)
      .where(and(eq(assessments.id, ID_CONCLUIDO), eq(assessments.is_deleted, false)))
      .then((l) => l[0]);

  let mapa = await buscar();
  if (!mapa) {
    // O seed inteiro, e nao so `semearMapasMc`: num banco vazio falta o dono
    // (Valmer) e o saldo dele; num banco com gente, o seed so semeia os mapas MC.
    const seed = spawnSync("npm run db:seed", { stdio: "inherit", shell: true });
    if (seed.status !== 0) throw new Error(`npm run db:seed falhou (saida ${seed.status}).`);
    mapa = await buscar();
  }
  if (!mapa) throw new Error("O mapa de demonstracao nao foi semeado (veja a linha 'mapas MC-INV 2.2' do seed acima).");
  if (mapa.situacao !== "concluido" || mapa.nivel !== "S4") {
    throw new Error(`Mapa ${ID_CONCLUIDO} esta ${mapa.situacao}/${mapa.nivel}; esperado concluido/S4.`);
  }

  // O esquema da IA valida o exemplo (e descarta a chave `_exemplo`).
  const narrativa = esquemaNarrativaMC.parse(
    JSON.parse(readFileSync(join(RAIZ, "tests/fixtures/narrativa-demonstracao.json"), "utf8")),
  );
  const gravadas = await db
    .update(assessmentsResultados)
    .set({ narrativa, narrativa_gerando_em: null, updated_at: new Date(), modified_by: "00000000-0000-0000-0000-000000000000" })
    .where(and(eq(assessmentsResultados.assessment_id, ID_CONCLUIDO), eq(assessmentsResultados.is_deleted, false)))
    .returning({ id: assessmentsResultados.id });
  if (gravadas.length !== 1) throw new Error(`Mapa ${ID_CONCLUIDO} sem resultado vivo do motor.`);

  return mapa.token;
}

function portaLivre(): Promise<number> {
  return new Promise((ok, falha) => {
    const s = createServer().once("error", falha);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => ok(port));
    });
  });
}

/** Passo 2, sem --url: build + `next start` numa porta livre. */
async function subirApp(): Promise<{ url: string; filho: ChildProcess }> {
  console.log("npm run build ...");
  const build = spawnSync("npm run build", { stdio: "inherit", shell: true });
  if (build.status !== 0) throw new Error(`npm run build falhou (saida ${build.status}).`);

  const porta = await portaLivre();
  const url = `http://127.0.0.1:${porta}`;
  const filho = spawn(process.execPath, [join(RAIZ, "node_modules/next/dist/bin/next"), "start", "-p", String(porta)], {
    stdio: ["ignore", "inherit", "inherit"],
  });

  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    if (filho.exitCode !== null) throw new Error(`next start saiu com ${filho.exitCode}.`);
    try {
      await fetch(url);
      console.log(`next start no ar em ${url}`);
      return { url, filho };
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  derrubar(filho);
  throw new Error(`next start nao respondeu em ${url} em 60 s.`);
}

function derrubar(filho: ChildProcess) {
  if (filho.exitCode !== null || !filho.pid) return;
  // No Windows o kill nao alcanca os processos filhos do next; /T leva a arvore.
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { stdio: "ignore" });
  else filho.kill();
}

/** Passo 3 e 4: rasteriza e devolve o tamanho (pt) de cada pagina. */
function rasterizar(pdf: string, saida: string): Array<[number, number]> {
  const py = `
import sys, json, fitz
pdf, saida, dpi = sys.argv[1], sys.argv[2], int(sys.argv[3])
doc = fitz.open(pdf)
tam = []
for i, p in enumerate(doc):
    p.get_pixmap(dpi=dpi).save(f"{saida}/p{i+1:02d}.png")
    tam.append([p.rect.width, p.rect.height])
print(json.dumps(tam))
`;
  const r = spawnSync("python", ["-c", py, pdf, saida, String(DPI)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`PyMuPDF falhou: ${r.stderr || r.error?.message}`);
  return JSON.parse(r.stdout.trim().split("\n").pop()!);
}

async function main() {
  const opcoes = lerOpcoes(process.argv.slice(2));
  const token = await garantirMapa();
  console.log(`Mapa de demonstracao: /relatorio/${token}`);

  mkdirSync(opcoes.saida, { recursive: true });
  // PNGs de rodada anterior (um p43 de quando o PDF passou do ponto) enganariam a conferencia.
  for (const f of readdirSync(opcoes.saida)) if (/^p\d+\.png$/.test(f)) rmSync(join(opcoes.saida, f));
  const pdf = join(opcoes.saida, "relatorio-mc.pdf");

  const app = opcoes.url ? null : await subirApp();
  try {
    const { abrirNavegador, salvarPdf, urlDoRelatorio } = await import("../src/lib/relatorio/pdf");
    const navegador = await abrirNavegador();
    try {
      await salvarPdf(navegador, urlDoRelatorio(opcoes.url ?? app!.url, token), pdf);
    } finally {
      await navegador.close();
    }
  } finally {
    if (app) derrubar(app.filho);
  }

  const tamanhos = rasterizar(pdf, opcoes.saida);
  // A4 = 595,28 x 841,89 pt; 1 pt de folga para arredondamento do Chrome.
  const foraDoA4 = tamanhos
    .map(([l, a], i) => ({ pagina: i + 1, l, a }))
    .filter(({ l, a }) => Math.abs(l - 595.28) > 1 || Math.abs(a - 841.89) > 1);

  console.log(`${tamanhos.length} pagina(s) em ${opcoes.saida} (p01.png .. p${String(tamanhos.length).padStart(2, "0")}.png), PDF em ${pdf}`);

  const erros: string[] = [];
  if (tamanhos.length !== PAGINAS) erros.push(`o PDF tem ${tamanhos.length} paginas, e nao ${PAGINAS}`);
  for (const p of foraDoA4) erros.push(`a pagina ${p.pagina} mede ${p.l.toFixed(1)} x ${p.a.toFixed(1)} pt, e nao A4`);
  if (erros.length) throw new Error(`CONFERENCIA FALHOU: ${erros.join("; ")}.`);
  console.log(`OK: ${PAGINAS} paginas A4.`);
}

main()
  .catch((erro) => {
    console.error(`\n*** ${erro instanceof Error ? erro.message : erro}\n`);
    process.exitCode = 1;
  })
  // O pool do Postgres segura o processo aberto.
  .finally(() => process.exit(process.exitCode ?? 0));
