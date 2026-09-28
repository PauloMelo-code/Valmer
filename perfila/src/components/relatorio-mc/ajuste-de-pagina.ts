/**
 * Ajuste de pagina do relatorio MC 3.1 — porte do <script> do molde
 * (contexto/referencias/mc-3.1/Mapa_Comportamental_MC_3_1_v3_editavel.html).
 *
 * O molde e desenhado para A4 fixo com `overflow: hidden`: texto que nao cabe
 * nao quebra para a folha seguinte, some. Com texto da IA, que muda de tamanho
 * a cada avaliado, isso aconteceria calado. O molde resolve medindo depois de
 * renderizar, e este arquivo faz a mesma coisa, com tres diferencas:
 *
 * - Fica restrito a `raiz` (o container `.mc31`), e nao ao documento todo:
 *   o app tem outros h1 que nao sao do relatorio.
 * - Espera as fontes e as imagens em vez do `load` da janela. As fontes do
 *   molde vinham embutidas; aqui vem de /relatorio-mc/fontes e podem chegar
 *   depois do primeiro paint, e medir com a fonte reserva daria zoom errado.
 * - Pode rodar mais de uma vez (StrictMode monta duas vezes, e o texto da IA
 *   pode chegar depois): desfaz o ajuste anterior antes de medir.
 *
 * Ao terminar, marca `data-ajuste="pronto"` na raiz. O gerador de PDF roda em
 * outro processo e nao enxerga a Promise; ele espera por
 * `page.waitForSelector('.mc31[data-ajuste="pronto"]')`.
 */

/** Menor fonte, em px, a que um h1 pode descer. Valor do molde. */
const H1_FONTE_MINIMA_PX = 14;
/** Passo de reducao do h1, em px. Valor do molde. */
const H1_PASSO_PX = 0.6;
/** Maior ampliacao de um bloco .zw que sobra espaco. Valor do molde. */
const ZW_ZOOM_MAXIMO = 1.3;
/**
 * Menor reducao de um bloco .zw que nao cabe. O molde nao reduzia: la o texto
 * era fixo e cabia por construcao. Aqui o texto e da IA, que pode vir ate 40%
 * acima do pedido e passar na conferencia (narrativa.ts), e o que passasse da
 * folha era cortado pelo `overflow: hidden` sem ninguem saber. 0,88 leva o
 * corpo de 9,7pt a ~8,5pt, o piso de legibilidade que o redesign da pagina 07
 * pede para o A4.
 */
const ZW_ZOOM_MINIMO = 0.88;

/**
 * O maior zoom com que o bloco cabe, entre `minimo` e `maximo`. Funcao pura
 * (recebe o teste de encaixe), para ser testada sem navegador.
 *
 * Cabe em `maximo`: usa `maximo`. Cabe em 1: amplia o que der. Nao cabe em 1:
 * reduz o que precisar, ate `minimo`. Nem em `minimo`: devolve `minimo` e
 * `transborda`, que e o sinal para o PDF avisar em vez de sair cortado calado.
 */
export function escolherZoom(
  cabe: (zoom: number) => boolean,
  minimo = ZW_ZOOM_MINIMO,
  maximo = ZW_ZOOM_MAXIMO,
): { zoom: number; transborda: boolean } {
  if (cabe(maximo)) return { zoom: maximo, transborda: false };
  let [cabeEm, naoCabeEm] = cabe(1) ? [1, maximo] : [minimo, 1];
  if (cabeEm === minimo && !cabe(minimo)) return { zoom: minimo, transborda: true };
  for (let i = 0; i < 14; i++) {
    const meio = (cabeEm + naoCabeEm) / 2;
    if (cabe(meio)) cabeEm = meio;
    else naoCabeEm = meio;
  }
  return { zoom: cabeEm, transborda: false };
}

/**
 * Reduz o h1 que estoura a largura. Titulo com <br> foi quebrado a mao no
 * molde e fica como esta.
 */
function ajustarTitulos(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLElement>("h1").forEach((h) => {
    h.style.fontSize = "";
    if (h.querySelector("br")) return;
    let tamanho = parseFloat(getComputedStyle(h).fontSize);
    let guarda = 0;
    while (h.scrollWidth > h.clientWidth + 1 && tamanho > H1_FONTE_MINIMA_PX && guarda < 120) {
      tamanho -= H1_PASSO_PX;
      h.style.fontSize = `${tamanho}px`;
      guarda++;
    }
  });
}

/**
 * Ajusta o bloco .zw a altura que a pagina da a ele — amplia ate 1,3 quando
 * sobra espaco, reduz ate 0,88 quando falta (ver `escolherZoom`) — e devolve a
 * folga aos .spacer de dentro. Devolve quantos blocos nao couberam nem
 * reduzidos; esses ficam marcados com `data-transborda`.
 */
function ajustarBlocos(raiz: ParentNode): number {
  let transbordados = 0;
  raiz.querySelectorAll<HTMLElement>(".zw").forEach((z) => {
    const espacadores = z.querySelectorAll<HTMLElement>(".spacer");
    z.style.zoom = "";
    z.style.height = "";
    z.style.flex = "";
    espacadores.forEach((e) => (e.style.flex = ""));

    const disponivel = z.getBoundingClientRect().height;
    z.style.flex = "0 0 auto";
    espacadores.forEach((e) => (e.style.flex = "0 0 0"));

    const cabe = (k: number): boolean => {
      z.style.zoom = String(k);
      return z.getBoundingClientRect().height <= disponivel - 4 && z.scrollWidth <= z.clientWidth + 1;
    };

    const { zoom, transborda } = escolherZoom(cabe);

    z.style.zoom = String(zoom);
    z.style.height = `${disponivel / zoom}px`;
    espacadores.forEach((e) => (e.style.flex = "1"));
    z.setAttribute("data-zoom", zoom.toFixed(3));
    if (transborda) {
      z.setAttribute("data-transborda", "sim");
      transbordados++;
    } else {
      z.removeAttribute("data-transborda");
    }
  });
  return transbordados;
}

/** Espera as imagens do container: a altura dos blocos depende delas. */
function imagensCarregadas(raiz: ParentNode): Promise<unknown> {
  const imagens = Array.from(raiz.querySelectorAll("img"));
  return Promise.all(imagens.map((img) => (img.complete ? null : img.decode().catch(() => null))));
}

/**
 * Ajusta titulos e blocos das paginas dentro de `raiz` (o elemento `.mc31`).
 * Chame num `useEffect` depois de montar, e de novo se o conteudo mudar.
 */
export async function ajustarPaginas(raiz: HTMLElement): Promise<void> {
  raiz.removeAttribute("data-ajuste");
  await document.fonts.ready;
  await imagensCarregadas(raiz);
  ajustarTitulos(raiz);
  // Lido pelo gerador de PDF (pdf.ts), que roda em outro processo: pagina com
  // texto que nem reduzido coube sai com aviso, e nao cortada em silencio.
  raiz.setAttribute("data-transborda", String(ajustarBlocos(raiz)));
  raiz.setAttribute("data-ajuste", "pronto");
}
