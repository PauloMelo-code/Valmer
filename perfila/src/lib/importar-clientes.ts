/**
 * Leitura do CSV de clientes — a entrada, espelho de `lib/exportar.ts`.
 *
 * O arquivo que a tela ACEITA e o mesmo que o botao Exportar PRODUZ: ponto e
 * virgula, BOM, CRLF, campo entre aspas e o apostrofo que protege o Excel de
 * formula. Quem exporta, corrige na planilha e sobe de volta tem de ver o
 * proprio arquivo entrar — e por isso a leitura conhece as mesmas convencoes
 * daquele modulo, e nao um formato inventado aqui.
 *
 * O que este arquivo faz e SO a forma: achar as colunas, separar os campos e
 * dizer em que LINHA cada valor estava. O conteudo (nome curto, e-mail
 * invalido, e-mail repetido na carteira) e julgado depois, por
 * `validators/cliente.ts` e pela action — duas regras de e-mail no projeto
 * viram duas respostas para o mesmo endereco.
 *
 * Por isso a recusa daqui e do arquivo INTEIRO (cabecalho que nao da para
 * entender, lista vazia, lista gigante) e a recusa de uma linha so sai da
 * action, com o numero que este modulo carregou ate la.
 */

/** Uma linha de cliente lida do arquivo, com a linha fisica onde ela comeca. */
export type LinhaDeCliente = {
  numero: number;
  nome: string;
  email: string;
  celular: string;
};

export type LeituraDeClientes =
  | { ok: true; linhas: LinhaDeCliente[] }
  | { ok: false; erro: string };

/**
 * Teto de linhas por importacao.
 *
 * Cada linha e uma transacao propria (ver `actions/importar-clientes.ts`),
 * entao o limite nao e de COMMIT como no envio em lote: e para uma planilha de
 * dez mil linhas colada por engano nao virar dez mil idas ao banco dentro de
 * uma requisicao que o navegador ja desistiu de esperar.
 *
 * ponytail: teto fixo; se aparecer importacao grande de verdade, o caminho e
 * fila/lote em vez de aumentar o numero.
 */
const MAX_LINHAS = 200;

/**
 * Separadores possiveis, do mais provavel para o menos.
 *
 * O Excel em portugues do Brasil grava com ponto e virgula — e o que a
 * exportacao usa — mas planilha do Google e export de outro sistema saem com
 * virgula, e quem copia da tela cola com tabulacao. Escolher pelo cabecalho
 * custa tres contagens e evita a recusa mais burra possivel: arquivo certo,
 * separador diferente.
 */
const SEPARADORES = [";", ",", "\t"];

/**
 * Primeiro caractere que faz o Excel tratar a celula como formula — a MESMA
 * lista de `lib/exportar.ts`, porque e ela que decide quando o apostrofo de
 * protecao foi escrito.
 */
const FORMULA = /^[=+\-@\t\r]/;

/**
 * Desfaz a protecao contra CSV injection da exportacao.
 *
 * `'=Total` volta a ser `=Total`. O apostrofo so cai quando o que vem depois
 * dele e um inicio de formula: um nome que realmente comeca com apostrofo
 * (`'Tonho`) nao e mexido, porque aquele apostrofo nunca foi protecao nenhuma.
 */
function desarmar(valor: string): string {
  return valor.startsWith("'") && FORMULA.test(valor.slice(1)) ? valor.slice(1) : valor;
}

/** Cabecalho comparavel: sem acento, sem pontuacao, minusculo. */
function chave(celula: string): string {
  return celula
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type Registro = { numero: number; celulas: string[] };

/**
 * Quebra o texto em registros, no formato do RFC 4180.
 *
 * Um `split` por linha e por separador parece bastar e nao basta: nome com
 * ponto e virgula, ou endereco com quebra de linha, sai da exportacao entre
 * aspas — e o split partiria a pessoa em duas colunas ou em duas linhas, sem
 * avisar. E o `numero` acompanha a linha FISICA justamente porque um campo
 * entre aspas pode consumir varias, e "linha 7" tem de ser a linha 7 do
 * arquivo que a pessoa abre no editor, nao o setimo registro.
 */
function registros(texto: string, separador: string): Registro[] {
  const saida: Registro[] = [];
  let celulas: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  let linha = 1;
  let inicio = 1;

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i]!;

    if (dentroDeAspas) {
      if (caractere === '"') {
        // Aspas dobradas sao uma aspas do conteudo (RFC 4180); uma sozinha fecha.
        if (texto[i + 1] === '"') {
          atual += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        if (caractere === "\n") linha += 1;
        atual += caractere;
      }
      continue;
    }

    if (caractere === '"' && atual === "") {
      dentroDeAspas = true;
      continue;
    }

    if (caractere === separador) {
      celulas.push(atual);
      atual = "";
      continue;
    }

    if (caractere === "\r") continue;

    if (caractere === "\n") {
      celulas.push(atual);
      saida.push({ numero: inicio, celulas });
      celulas = [];
      atual = "";
      linha += 1;
      inicio = linha;
      continue;
    }

    atual += caractere;
  }

  if (atual !== "" || celulas.length > 0) {
    celulas.push(atual);
    saida.push({ numero: inicio, celulas });
  }

  // Linha em branco no meio ou no fim do arquivo nao e erro de quem mandou: e
  // o que todo editor deixa. Recusar por causa dela seria recusar o arquivo
  // certo.
  return saida.filter((registro) => registro.celulas.some((celula) => celula.trim() !== ""));
}

/** O separador que aparece mais vezes na primeira linha. */
function separadorDe(primeiraLinha: string): string {
  return SEPARADORES.reduce((melhor, candidato) =>
    primeiraLinha.split(candidato).length > primeiraLinha.split(melhor).length ? candidato : melhor,
  );
}

/**
 * As linhas de cliente do arquivo, ou a recusa do arquivo inteiro.
 *
 * As colunas sao achadas PELO NOME, nao pela posicao: o arquivo exportado tem
 * cinco colunas (com "Cadastrado em" e "Parceiro"), e exigir exatamente tres
 * recusaria justamente o arquivo que o proprio sistema gerou. Coluna que nao
 * conhecemos e ignorada — "Parceiro" em especial, porque o dono de quem
 * importa e a sessao, e nao uma celula do arquivo.
 */
export function lerClientesCsv(texto: string): LeituraDeClientes {
  // O BOM que a exportacao escreve viria preso no primeiro cabecalho e faria
  // "Nome" nao casar com "nome".
  const limpo = texto.replace(/^\ufeff/, "");
  if (limpo.trim() === "") {
    return { ok: false, erro: "Nao ha nada para importar: escolha um arquivo ou cole a lista." };
  }

  const linhas = registros(limpo, separadorDe(limpo.split(/\r?\n/, 1)[0] ?? ""));
  const cabecalho = linhas[0];
  if (!cabecalho) {
    return { ok: false, erro: "Nao ha nada para importar: escolha um arquivo ou cole a lista." };
  }

  const colunas = cabecalho.celulas.map((celula) => chave(desarmar(celula)));
  const iNome = colunas.indexOf("nome");
  // "E-mail", "Email" e "e_mail" viram a mesma chave; o resto nao e adivinhado.
  const iEmail = colunas.indexOf("email");
  const iCelular = colunas.findIndex((coluna) => coluna === "celular" || coluna === "telefone");

  if (iNome === -1 || iEmail === -1) {
    return {
      ok: false,
      erro:
        "A primeira linha do arquivo precisa ser o cabecalho, com as colunas Nome e E-mail " +
        "(Celular e opcional). E o formato que o botao Exportar gera.",
    };
  }

  const dados = linhas.slice(1);
  if (dados.length === 0) {
    return {
      ok: false,
      erro: "O arquivo so tem o cabecalho: nenhuma linha de cliente para importar.",
    };
  }
  if (dados.length > MAX_LINHAS) {
    return {
      ok: false,
      erro: `Sao ${dados.length} linhas, e o limite e ${MAX_LINHAS} por importacao. Divida o arquivo e importe em partes.`,
    };
  }

  return {
    ok: true,
    linhas: dados.map((registro) => ({
      numero: registro.numero,
      // Celula que nao existe na linha (linha curta) chega como string vazia, e
      // e o validador que recusa — com a mensagem dele, que e a mesma do
      // formulario de cadastro.
      nome: desarmar((registro.celulas[iNome] ?? "").trim()),
      email: desarmar((registro.celulas[iEmail] ?? "").trim()),
      celular: iCelular === -1 ? "" : desarmar((registro.celulas[iCelular] ?? "").trim()),
    })),
  };
}
