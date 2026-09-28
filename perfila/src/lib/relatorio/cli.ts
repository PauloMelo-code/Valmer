/**
 * Gera relatorios pela linha de comando, um ou em lote.
 *
 *   npm run relatorio:gerar -- <token> [<token>...] [opcoes]
 *   npm run relatorio:gerar -- --arquivo tokens.txt --pdf ./pdfs
 *
 * Opcoes:
 *   --arquivo <caminho>   le os tokens de um arquivo, um por linha (`#` comenta)
 *   --pdf <pasta>         alem da narrativa, grava <token>.pdf na pasta
 *   --url <base>          onde a aplicacao esta no ar (padrao http://localhost:3000)
 *   --concorrencia <n>    tokens em paralelo (padrao 4)
 *   --forcar              refaz mesmo que a narrativa e o PDF ja existam
 *   --falhas <caminho>    grava os tokens que falharam, um por linha
 *
 * Token de mapa MC-INV 2.2 gera a narrativa do relatorio MC 3.1 e o PDF dele
 * (42 folhas A4 sangradas); o legado segue como antes.
 *
 * Existe porque a geracao custa dinheiro e ainda nao tem dono na interface:
 * quem dispara e um operador com acesso ao banco e a chave, nao um clique
 * anonimo. Ver o cabecalho de persistir.ts.
 *
 * O lote e retomavel. Token que ja tem narrativa gravada nao chama a API de
 * novo, e token que ja tem PDF na pasta nao volta ao Chrome, entao rodar o
 * mesmo comando depois de uma queda continua de onde parou em vez de pagar
 * tudo outra vez. `--forcar` desliga as duas retomadas.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const MOTIVO: Record<string, string> = {
  invalido: "token nao encontrado",
  nao_concluido: "o assessment ainda nao foi concluido",
  sem_contadores: "o assessment esta concluido mas sem os contadores",
  sem_resultado: "o mapa MC esta concluido mas sem resultado do motor",
  em_geracao: "outro processo esta escrevendo esta narrativa agora",
};

/**
 * Narrativa do relatorio MC 3.1 pelo token, no mesmo formato de desfecho do
 * legado. Devolve null quando o token nao e de um mapa MC-INV 2.2 vivo.
 *
 * O CLI traz a propria autorizacao (quem roda tem o banco e a chave), como
 * no legado. `gerarNarrativaMC` nao chama a API quando ja ha texto gravado,
 * entao a retomada do lote vale igual; `--forcar` reescreve, respeitando o
 * arrendamento. Importado aqui dentro pelo mesmo motivo do `persistir`.
 */
async function caminhoMC() {
  const { db } = await import("@/lib/db");
  const { assessments } = await import("@/lib/db/schema");
  const { VERSAO_INSTRUMENTO } = await import("@/data/inventario-mc");
  const { gerarNarrativaMC } = await import("@/lib/relatorio-mc/narrativa");
  const { and, eq } = await import("drizzle-orm");

  type Desfecho = { ok: true; reaproveitada: boolean; versao: string } | { ok: false; erro: string };

  async function narrativaMCDoToken(token: string, forcar: boolean): Promise<Desfecho | null> {
    const [mapa] = await db
      .select({ id: assessments.id, situacao: assessments.situacao })
      .from(assessments)
      .where(
        and(
          eq(assessments.token, token),
          eq(assessments.is_deleted, false),
          eq(assessments.versao_instrumento, VERSAO_INSTRUMENTO),
        ),
      )
      .limit(1);
    if (!mapa) return null;
    if (mapa.situacao !== "concluido") return { ok: false, erro: "nao_concluido" };

    const gravada = await gerarNarrativaMC(mapa.id, { forcar });
    if (!gravada.ok) return gravada;
    const avisos = gravada.avisos.length ? `, ${gravada.avisos.length} aviso(s)` : "";
    return { ok: true, reaproveitada: gravada.reaproveitada, versao: `MC 3.1${avisos}` };
  }

  return { narrativaMCDoToken };
}

const USO = `Uso: npm run relatorio:gerar -- <token>... [--arquivo lista.txt] [--pdf pasta]
             [--url http://localhost:3000] [--concorrencia 4] [--forcar] [--falhas falhas.txt]`;

type Opcoes = {
  tokens: string[];
  arquivo?: string;
  pdf?: string;
  url: string;
  concorrencia: number;
  forcar: boolean;
  falhas?: string;
};

/** Lanca em opcao desconhecida: um `--forca` digitado errado nao pode virar token. */
function lerOpcoes(args: string[]): Opcoes {
  const opcoes: Opcoes = {
    tokens: [],
    url: process.env.RELATORIO_BASE_URL ?? "http://localhost:3000",
    concorrencia: 4,
    forcar: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith("--")) {
      opcoes.tokens.push(arg);
      continue;
    }

    if (arg === "--forcar") {
      opcoes.forcar = true;
      continue;
    }

    const valor = args[++i];
    if (valor === undefined) throw new Error(`${arg} espera um valor.`);

    switch (arg) {
      case "--arquivo":
        opcoes.arquivo = valor;
        break;
      case "--pdf":
        opcoes.pdf = valor;
        break;
      case "--url":
        opcoes.url = valor;
        break;
      case "--falhas":
        opcoes.falhas = valor;
        break;
      case "--concorrencia": {
        const n = Number(valor);
        if (!Number.isInteger(n) || n < 1) throw new Error("--concorrencia pede um inteiro >= 1.");
        opcoes.concorrencia = n;
        break;
      }
      default:
        throw new Error(`Opcao desconhecida: ${arg}`);
    }
  }

  return opcoes;
}

async function main(): Promise<void> {
  const opcoes = lerOpcoes(process.argv.slice(2));

  // Importados aqui dentro, e nao no topo: `@/lib/db` le DATABASE_URL assim que
  // e avaliado, e um import estatico correria antes do config() acima.
  const { gerarESalvar } = await import("./persistir");
  const { emLote, tokensDoTexto, mensagemDoErro } = await import("./lote");
  const { narrativaMCDoToken } = await caminhoMC();

  const doArquivo = opcoes.arquivo ? tokensDoTexto(readFileSync(opcoes.arquivo, "utf8")) : [];
  const tokens = [...new Set([...opcoes.tokens, ...doArquivo])];

  if (tokens.length === 0) {
    console.error(USO);
    process.exitCode = 1;
    return;
  }

  if (opcoes.pdf) mkdirSync(opcoes.pdf, { recursive: true });

  // O navegador so sobe quando ha PDF a fazer, e o import fica aqui para que
  // quem gera so a narrativa nao carregue o Puppeteer inteiro.
  const pdf = opcoes.pdf
    ? await import("./pdf").then(async (mod) => ({ mod, navegador: await mod.abrirNavegador() }))
    : null;

  console.log(
    `${tokens.length} token(s), ${opcoes.concorrencia} em paralelo${opcoes.pdf ? `, PDF em ${opcoes.pdf}` : ""}.`,
  );

  // Uma linha por token, na hora em que ele termina. Um lote de 700 leva horas:
  // guardar o log para o fim deixaria o operador sem saber se anda ou travou.
  let feitos = 0;
  const progresso = (token: string, desfecho: string, falhou = false) => {
    const linha = `[${++feitos}/${tokens.length}] ${token}: ${desfecho}`;
    if (falhou) console.error(linha);
    else console.log(linha);
  };

  try {
    const resultados = await emLote(tokens, opcoes.concorrencia, async (token) => {
      try {
        // Mapa MC-INV 2.2 tem outra narrativa, em outra tabela (ADR-0007 D3);
        // null = mapa legado, que segue exatamente o caminho de antes.
        const mc = await narrativaMCDoToken(token, opcoes.forcar);
        const gravada = mc ?? (await gerarESalvar(token, { forcar: opcoes.forcar }));
        if (!gravada.ok) throw new Error(MOTIVO[gravada.erro] ?? gravada.erro);

        let notaPdf = "";

        if (pdf && opcoes.pdf) {
          const destino = join(opcoes.pdf, `${token}.pdf`);
          // ponytail: a retomada confia no arquivo existir, sem abrir para
          // conferir. Vale porque `salvarPdf` so cria o destino por rename,
          // entao truncado com este nome nao sai daqui. Um PDF corrompido por
          // outro caminho (disco cheio, copia pela metade) continua sendo
          // pulado. Se isso aparecer, valide o `%%EOF` antes de pular.
          if (!opcoes.forcar && existsSync(destino)) {
            notaPdf = " · pdf ja existia";
          } else {
            const url = pdf.mod.urlDoRelatorio(opcoes.url, token);
            await pdf.mod.salvarPdf(pdf.navegador, url, destino);
            notaPdf = " · pdf gravado";
          }
        }

        const nota = gravada.reaproveitada ? "narrativa reaproveitada" : "narrativa gerada";
        // Legado: numero da versao gravada; MC: a coluna guarda so a atual.
        const versao = typeof gravada.versao === "number" ? `v${gravada.versao}` : gravada.versao;
        const desfecho = `${nota} (${versao})${notaPdf}`;
        progresso(token, desfecho);
        return desfecho;
      } catch (erro) {
        progresso(token, `FALHOU · ${mensagemDoErro(erro)}`, true);
        throw erro;
      }
    });

    const falharam = resultados.filter((r) => !r.ok).map((r) => r.item);

    console.log(`\n${tokens.length - falharam.length} de ${tokens.length} concluido(s).`);

    if (falharam.length > 0) {
      console.error(`${falharam.length} falhou(ram):`);
      for (const token of falharam) console.error(`  ${token}`);

      if (opcoes.falhas) {
        writeFileSync(opcoes.falhas, `${falharam.join("\n")}\n`, "utf8");
        console.error(`Lista em ${opcoes.falhas}. Repita com --arquivo ${opcoes.falhas}.`);
      }

      process.exitCode = 1;
    }
  } catch (erro) {
    console.error(mensagemDoErro(erro));
    process.exitCode = 1;
  } finally {
    await pdf?.navegador.close();
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  // O pool do Postgres segura o processo aberto depois do trabalho terminar.
  .finally(() => process.exit(process.exitCode ?? 0));
