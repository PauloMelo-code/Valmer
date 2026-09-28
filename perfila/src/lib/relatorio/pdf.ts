/**
 * PDF do relatorio, renderizado no servidor.
 *
 * O Puppeteer abre a MESMA rota `/relatorio/<token>` que a pessoa ve na tela e
 * imprime com as regras de `@media print` que ja existem em page.module.css.
 * Um caminho so evita o classico de o PDF sair diferente do que foi revisado.
 *
 * Roda SOMENTE fora do Next: quem chama e o CLI (`npm run relatorio:gerar`),
 * com a aplicacao no ar em `--url`. Nao importe daqui de dentro de uma rota:
 * cada chamada sobe um Chrome, e a rota do relatorio e publica.
 */
import { renameSync, rmSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer";

/**
 * Espelha o `@page { size: A4; margin: 20mm }` de page.module.css.
 *
 * Quem manda de verdade e o CSS: quando a pagina declara `@page`, o Chrome
 * ignora a margem passada aqui (medido — trocar este valor por zero produz PDF
 * identico, byte a byte). Estes numeros sao a rede de seguranca para o dia em
 * que a regra sair do CSS, e por isso precisam continuar iguais aos de la.
 */
const MARGEM = "20mm";

const MARGENS = { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM };

/**
 * Relatorio MC 3.1 (mapa MC-INV 2.2): o molde e sangrado, cada `.page` ja mede
 * a A4 inteira e declara `@page mc31 { margin: 0 }`. A margem aqui repete o CSS
 * pelo mesmo motivo de MARGEM acima.
 */
const SEM_MARGEM = { top: "0", right: "0", bottom: "0", left: "0" };

/**
 * Prepara a folha do relatorio MC 3.1 para imprimir. Devolve false quando a
 * pagina nao e do MC (o legado segue como sempre foi).
 *
 * A deteccao e pelo proprio DOM, e nao por consulta ao banco: a rota
 * `/relatorio/<token>` ja decide a versao (ADR-0007 D3), e o PDF so imprime o
 * que ela desenhou. Serve igual para o modelo do admin.
 *
 * Espera as fontes e o `data-ajuste="pronto"` que `ajustarPaginas` grava ao
 * terminar: o ajuste mede o texto, e imprimir antes dele (ou com a fonte
 * reserva) corta paragrafo da IA no `overflow: hidden` da folha.
 *
 * Depois deixa so o `.mc31` no body. A barra de acoes, a casca do admin e
 * qualquer caixa com rolagem em volta nao entram no documento, e o Chrome nao
 * pagina o conteudo de uma caixa com `overflow` (o modelo do admin mora numa):
 * sem isto o PDF sairia com uma folha so.
 */
async function prepararMC(pagina: Page): Promise<boolean> {
  if (!(await pagina.$(".mc31"))) return false;
  await pagina.evaluate(() => document.fonts.ready.then(() => undefined));
  await pagina.waitForSelector('.mc31[data-ajuste="pronto"]', { timeout: 60_000 });
  // `ajustarPaginas` reduz ate 0,88 o bloco que nao cabe; o que nem assim
  // coube fica marcado. Sai no log com o numero da pagina, porque o que passa
  // da folha e cortado pelo overflow e ninguem veria no PDF que faltou texto.
  const transbordadas = await pagina.evaluate(() =>
    Array.from(document.querySelectorAll('.mc31 .zw[data-transborda]')).map(
      (z) => z.closest('section.page')?.id ?? '?',
    ),
  );
  if (transbordadas.length > 0) {
    console.warn(`aviso: texto não coube nem reduzido em ${transbordadas.join(', ')} de ${pagina.url()}`);
  }
  await pagina.evaluate(() => {
    const raiz = document.querySelector(".mc31")!;
    document.body.replaceChildren(raiz);
    for (const el of [document.documentElement, document.body]) {
      el.style.cssText = "margin:0;padding:0;background:none;height:auto;min-height:0;overflow:visible;display:block";
    }
  });
  return true;
}

/**
 * Um navegador para o lote inteiro, e nao um por relatorio: subir o Chrome leva
 * cerca de um segundo, e 700 vezes isso e o dobro do tempo total do lote.
 */
export async function abrirNavegador(): Promise<Browser> {
  return puppeteer.launch({
    // A VPS roda o processo como root dentro do container, onde o sandbox do
    // Chrome nao sobe. O conteudo renderizado e a nossa propria pagina.
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

export function urlDoRelatorio(base: string, token: string): string {
  return new URL(`/relatorio/${encodeURIComponent(token)}`, base).toString();
}

/**
 * Grava o PDF de uma URL. Uma aba por chamada, fechada no fim: abas abertas
 * acumulam memoria e derrubam o Chrome antes do fim de um lote grande.
 */
export async function salvarPdf(navegador: Browser, url: string, destino: string): Promise<void> {
  const pagina = await navegador.newPage();

  // Grava num parcial e renomeia no fim. O rename dentro da mesma pasta e
  // atomico, entao o destino ou existe inteiro ou nao existe. Sem isso um
  // processo morto no meio da gravacao, que e exatamente o caso para o qual a
  // retomada existe, deixaria um PDF truncado no disco; na rodada seguinte a
  // retomada veria o arquivo, pularia o token e chamaria aquilo de sucesso.
  const parcial = `${destino}.parcial`;

  try {
    const resposta = await pagina.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

    // Token invalido devolve 404, e o 404 tambem renderiza. Sem esta checagem o
    // lote gravaria PDFs bem formatados da pagina de erro e diria que deu certo.
    if (!resposta?.ok()) {
      throw new Error(`HTTP ${resposta?.status() ?? "sem resposta"} em ${url}`);
    }

    const mc = await prepararMC(pagina);

    await pagina.pdf({
      path: parcial,
      format: "A4",
      margin: mc ? SEM_MARGEM : MARGENS,
      // A capa e os destaques do relatorio sao area preenchida. Sem isto o
      // Chrome descarta todo fundo e o documento sai em branco e preto.
      printBackground: true,
    });

    renameSync(parcial, destino);
  } finally {
    await pagina.close();
    // Depois de um rename bem-sucedido o parcial nao existe mais, e `force`
    // faz disto um no-op. O que ele limpa e o parcial da tentativa que falhou.
    rmSync(parcial, { force: true });
  }
}
