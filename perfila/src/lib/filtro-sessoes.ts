/**
 * Regras da barra de busca da tela de Sessao de Leitura.
 *
 * Mora aqui, e nao dentro do componente, por dois motivos: a tela e "use
 * client" e importa CSS, o que o runner de teste nao carrega; e a comparacao de
 * datas tem regra de verdade (fuso e dia que nao existe), do tipo que quebra
 * calada.
 *
 * O filtro roda sobre o que a tela JA recebeu do servidor. Nao ha ida nova ao
 * banco: a lista de sessoes de um parceiro e pequena, e o recorte por dono ja
 * foi aplicado no WHERE de `actions/devolutivas.listar`.
 */

export type FiltroSessoes = {
  nome: string;
  email: string;
  /** Um dos valores de `opcoes.status`: "Todos", "Finalizada" ou "Pausado". */
  status: string;
  /** dd/mm/aaaa, ou vazio. */
  de: string;
  ate: string;
};

export type LinhaFiltravel = {
  nome: string;
  email: string;
  finalizada: boolean;
  /** Instante de abertura em ms — o mesmo que a tela mostra em "Criado em". */
  abertaEm: number;
};

export const FILTRO_VAZIO: FiltroSessoes = {
  nome: "",
  email: "",
  status: "Todos",
  de: "",
  ate: "",
};

/**
 * O dia do instante NO FUSO DE BRASILIA, como aaaa-mm-dd.
 *
 * E o fuso em que a tela imprime "Criado em" (a pagina formata com
 * `America/Sao_Paulo`). Comparar com o dia local do navegador faria a linha de
 * 21h de ontem sumir do filtro "de hoje" para quem abre a tela na Europa,
 * enquanto a coluna ao lado continua mostrando a data de ontem.
 *
 * Texto, e nao Date: aaaa-mm-dd ordena como string, entao a comparacao de
 * intervalo e `<=` direto, sem construir meia-noite de nada.
 */
const PARTES_BRASILIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function diaEmBrasilia(ms: number): string {
  const partes: Record<string, string> = {};
  for (const parte of PARTES_BRASILIA.formatToParts(ms)) partes[parte.type] = parte.value;
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/**
 * dd/mm/aaaa digitado -> aaaa-mm-dd. Nulo quando aquilo nao e um dia.
 *
 * O 31/02 casa com a expressao regular e NAO existe no calendario. Date NAO
 * recusa: `Date.UTC(2026, 1, 31)` devolve 03/03, um dia valido e diferente do
 * que foi digitado — medido, nao suposto. Por isso a conferencia e ler o dia de
 * VOLTA do Date: sem ela o campo aceitaria 31/02 e o filtro recortaria por uma
 * faixa que ninguem pediu.
 */
export function diaDigitado(texto: string): string | null {
  const casou = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!casou) return null;

  const [, dia, mes, ano] = casou;
  // Meio-dia em UTC, e nao meia-noite: nenhum ajuste de fuso de nenhum ambiente
  // empurra o dia para tras no meio da conferencia.
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia), 12));
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(mes) - 1 ||
    data.getUTCDate() !== Number(dia)
  ) {
    return null;
  }

  return `${ano}-${mes}-${dia}`;
}

/**
 * A mensagem do primeiro problema do filtro, ou nulo quando ele esta usavel.
 *
 * Campo de data vazio nao e problema — e o filtro desligado. O que e problema e
 * texto digitado pela metade: buscar ignorando o que a pessoa escreveu devolve
 * uma lista que parece filtrada e nao esta.
 */
export function erroDoFiltro(filtro: FiltroSessoes): string | null {
  const de = filtro.de.trim();
  const ate = filtro.ate.trim();

  if (de && !diaDigitado(de)) return "Data inicial inválida. Use dd/mm/aaaa.";
  if (ate && !diaDigitado(ate)) return "Data final inválida. Use dd/mm/aaaa.";
  if (de && ate && diaDigitado(de)! > diaDigitado(ate)!) {
    return "A data inicial é depois da data final.";
  }
  return null;
}

/**
 * Se o filtro recorta algo.
 *
 * Compara o CONTEUDO, e nao a identidade do objeto: digitar um nome e apaga-lo
 * de novo produz um objeto novo e igual ao vazio, e pela identidade a tela
 * continuaria anunciando uma busca que nao existe mais.
 */
export function filtroAtivo(filtro: FiltroSessoes): boolean {
  return (
    filtro.nome.trim() !== "" ||
    filtro.email.trim() !== "" ||
    filtro.status !== FILTRO_VAZIO.status ||
    filtro.de.trim() !== "" ||
    filtro.ate.trim() !== ""
  );
}

/** As linhas que passam pelo filtro, na ordem em que chegaram. */
export function filtrarSessoes<T extends LinhaFiltravel>(itens: T[], filtro: FiltroSessoes): T[] {
  const nome = filtro.nome.trim().toLowerCase();
  const email = filtro.email.trim().toLowerCase();
  const de = diaDigitado(filtro.de);
  const ate = diaDigitado(filtro.ate);

  return itens.filter((item) => {
    if (nome && !item.nome.toLowerCase().includes(nome)) return false;
    if (email && !item.email.toLowerCase().includes(email)) return false;
    // "Pausado" e o rotulo do campo de filtro; na linha da tabela a mesma
    // situacao aparece como "Pausada". Os dois saem de `finalizada_em` vazio.
    if (filtro.status === "Finalizada" && !item.finalizada) return false;
    if (filtro.status === "Pausado" && item.finalizada) return false;

    if (de || ate) {
      const dia = diaEmBrasilia(item.abertaEm);
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;
    }
    return true;
  });
}
