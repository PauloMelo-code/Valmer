/**
 * Leitura da planilha de destinatarios do Envio Expresso.
 *
 * Roda no NAVEGADOR, antes de qualquer gravacao: o arquivo apenas PREENCHE a
 * lista da tela, e quem grava continua sendo `actions/envio-lote.ts`, com o
 * mesmo tudo-ou-nada e as mesmas guardas. Importar nao cria nada no banco, e e
 * por isso que esta funcao nao precisa de sessao nem de permissao.
 *
 * Nome e e-mail passam pelo MESMO zod da digitacao manual (`validators/
 * assessment.ts`): a planilha nao e uma porta mais larga que o formulario. Uma
 * regra propria aqui aceitaria pela importacao o endereco que a action recusa
 * no envio, e o lote inteiro cairia no fim por causa de uma linha.
 *
 * Linha ruim NAO derruba a importacao: ela volta em `recusas`, com o numero da
 * linha como o Excel numera, e a tela mostra o que entrou e o que ficou de
 * fora. Ou a pessoa corrige a planilha, ou digita as duas que faltaram.
 *
 * CSV e nao xlsx: xlsx exigiria dependencia nova para ler o que o Excel salva
 * nativamente em CSV — a mesma decisao de `lib/exportar.ts`, que escreve.
 */
import { emailPessoa, nomePessoa } from "@/lib/validators/assessment";

export type DestinatarioLido = { avaliado_nome: string; avaliado_email: string };

/**
 * `ok: false` e defeito do ARQUIVO (vazio, sem as colunas): nada foi lido e a
 * tela mostra uma frase. `ok: true` pode vir com recusas — o arquivo servia, e
 * algumas linhas dele nao.
 */
export type Leitura =
  | { ok: false; erro: string }
  | { ok: true; aceitos: DestinatarioLido[]; recusas: string[] };

/**
 * O Excel em portugues do Brasil salva CSV com PONTO E VIRGULA (a virgula e o
 * separador decimal daqui), o de outras regioes com virgula, e quem exporta do
 * Google Sheets as vezes manda TAB. Descobrir pelo cabecalho cobre os tres sem
 * perguntar nada a quem importa.
 */
const SEPARADORES = [";", ",", "\t"] as const;

const quantidade = (texto: string, separador: string) =>
  texto.split(separador).length - 1;

/**
 * Marcas de acento soltas depois do `normalize("NFD")`.
 *
 * `\p{Diacritic}` e nao a faixa de codigos escrita a mao: a faixa colada no
 * codigo-fonte fica INVISIVEL no editor, e caractere que ninguem enxerga e
 * caractere que alguem apaga sem perceber (mesmo motivo do BOM abaixo).
 */
const ACENTOS = /\p{Diacritic}/gu;

/**
 * O BOM que o proprio Excel escreve no comeco do arquivo, pelo codigo do
 * caractere — igual a `lib/exportar.ts`, que o escreve na exportacao.
 */
const BOM = String.fromCharCode(0xfeff);

/**
 * Nome de coluna comparavel: sem acento, sem maiuscula, sem pontuacao.
 * "E-mail", "email" e "EMAIL " sao a mesma coluna para quem preenche.
 */
function chave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(ACENTOS, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/**
 * Os campos de UMA linha, respeitando aspas duplas (RFC 4180): "Silva, Joao"
 * e um campo so, e "" dentro das aspas e uma aspa literal.
 *
 * ponytail: campo com QUEBRA DE LINHA dentro das aspas nao e suportado — a
 * linha e a unidade aqui. Se aparecer planilha assim, o caminho e trocar este
 * separador por um parser de documento inteiro, nao remendar a funcao.
 */
function campos(linha: string, separador: string): string[] {
  const saida: string[] = [];
  let atual = "";
  let entreAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i];

    if (entreAspas) {
      if (caractere !== '"') atual += caractere;
      else if (linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else entreAspas = false;
      continue;
    }

    // Aspas valem como delimitador so quando abrem o campo; no meio do texto
    // sao caractere comum (Consultor 5" de tela).
    if (caractere === '"' && atual === "") entreAspas = true;
    else if (caractere === separador) {
      saida.push(atual.trim());
      atual = "";
    } else atual += caractere;
  }

  saida.push(atual.trim());
  return saida;
}

/** Aparece na frase de erro do cabecalho, e no aviso da tela. */
export const COLUNAS_ESPERADAS =
  'A primeira linha da planilha precisa ter as colunas "nome" e "email".';

/**
 * Le o conteudo de texto de um CSV e devolve o que serve e o que nao serve.
 *
 * Recebe o texto, e nao o `File`, para poder ser testado sem navegador.
 */
export function lerDestinatarios(conteudo: string): Leitura {
  const linhas = (conteudo.startsWith(BOM) ? conteudo.slice(BOM.length) : conteudo)
    // Sem tirar o BOM acima, a primeira coluna passaria a se chamar
    // "<BOM>nome" e o cabecalho nunca seria reconhecido.
    .split(/\r?\n/)
    .filter((linha) => linha.trim() !== "");

  if (linhas.length === 0) return { ok: false, erro: "O arquivo está vazio." };

  const cabecalhoCru = linhas[0]!;
  const separador = SEPARADORES.reduce((melhor, candidato) =>
    quantidade(cabecalhoCru, candidato) > quantidade(cabecalhoCru, melhor) ? candidato : melhor,
  );

  const cabecalho = campos(cabecalhoCru, separador).map(chave);
  const colunaNome = cabecalho.indexOf("nome");
  const colunaEmail = cabecalho.indexOf("email");

  if (colunaNome === -1 || colunaEmail === -1) {
    return {
      ok: false,
      erro: `${COLUNAS_ESPERADAS} Foi lido: ${cabecalho.filter(Boolean).join(", ") || "(nada)"}.`,
    };
  }

  const aceitos: DestinatarioLido[] = [];
  const recusas: string[] = [];
  const vistos = new Set<string>();

  linhas.slice(1).forEach((linha, indice) => {
    // +2 porque o cabecalho e a linha 1: e o numero que a pessoa ve no Excel.
    const numero = indice + 2;
    const valores = campos(linha, separador);

    const nome = nomePessoa.safeParse(valores[colunaNome] ?? "");
    if (!nome.success) {
      recusas.push(`Linha ${numero}: ${nome.error.issues[0]!.message}`);
      return;
    }

    const email = emailPessoa.safeParse(valores[colunaEmail] ?? "");
    if (!email.success) {
      recusas.push(`Linha ${numero}: ${email.error.issues[0]!.message}`);
      return;
    }

    // Repetido na propria planilha. A action recusaria o lote inteiro por isso
    // (o mesmo e-mail duas vezes na mesma turma), entao a segunda copia fica
    // de fora aqui, com a linha dita.
    if (vistos.has(email.data)) {
      recusas.push(`Linha ${numero}: ${email.data} repetido na planilha.`);
      return;
    }

    vistos.add(email.data);
    aceitos.push({ avaliado_nome: nome.data, avaliado_email: email.data });
  });

  return { ok: true, aceitos, recusas };
}
