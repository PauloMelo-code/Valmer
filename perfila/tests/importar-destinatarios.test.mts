/**
 * A leitura da planilha do Envio Expresso.
 *
 *   npm test
 *
 * Puro: nao toca banco nem navegador. O que se prova aqui e o que quebra
 * CALADO numa importacao — separador lido errado (a planilha inteira vira uma
 * coluna e ninguem entra), coluna reconhecida so quando escrita de um jeito, e
 * linha ruim que passa e derruba o lote inteiro depois, na action, quando o
 * credito ja esta na conta da pessoa.
 *
 * A regra que estes testes seguram: importar nao pode ser uma porta mais larga
 * que a digitacao manual.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { lerDestinatarios } = await import("@/lib/importar-destinatarios");

/**
 * O BOM pelo codigo do caractere, e nao colado no fonte: literal ele fica
 * INVISIVEL no editor, e um caractere que ninguem enxerga e um caractere que
 * alguem apaga sem perceber — o mesmo motivo de `lib/exportar.ts`.
 */
const BOM = String.fromCharCode(0xfeff);

/** Aceitos, em pares curtos, para comparar sem escrever o objeto todo. */
function pares(conteudo: string) {
  const leitura = lerDestinatarios(conteudo);
  assert.ok(leitura.ok, "esperava arquivo aceito");
  return {
    aceitos: leitura.aceitos.map((item) => `${item.avaliado_nome}|${item.avaliado_email}`),
    recusas: leitura.recusas,
  };
}

describe("importacao de destinatarios", () => {
  it("le o CSV do Excel brasileiro, com ponto e virgula", () => {
    const { aceitos, recusas } = pares("nome;email\nMaria Silva;maria@exemplo.com\n");
    assert.deepEqual(aceitos, ["Maria Silva|maria@exemplo.com"]);
    assert.deepEqual(recusas, []);
  });

  it("le tambem virgula e tabulacao, sem perguntar nada", () => {
    assert.deepEqual(pares("nome,email\nMaria Silva,maria@exemplo.com").aceitos, [
      "Maria Silva|maria@exemplo.com",
    ]);
    assert.deepEqual(pares("nome\temail\nMaria Silva\tmaria@exemplo.com").aceitos, [
      "Maria Silva|maria@exemplo.com",
    ]);
  });

  it("reconhece o cabecalho como a pessoa escreve, e na ordem que ela quiser", () => {
    // BOM na frente, acento, maiuscula, espaco e as colunas trocadas de lugar:
    // tudo isso e a MESMA planilha para quem preenche.
    const { aceitos } = pares(
      BOM + "E-mail; NOME \nmaria@exemplo.com;Maria Silva",
    );
    assert.deepEqual(aceitos, ["Maria Silva|maria@exemplo.com"]);
  });

  it("recusa o arquivo sem as colunas, dizendo o que leu", () => {
    const leitura = lerDestinatarios("cliente;endereco\nMaria;maria@exemplo.com");
    assert.equal(leitura.ok, false);
    assert.match(leitura.ok ? "" : leitura.erro, /"nome" e "email"/);
    assert.match(leitura.ok ? "" : leitura.erro, /cliente, endereco/);
  });

  it("recusa o arquivo vazio", () => {
    assert.equal(lerDestinatarios("").ok, false);
    assert.equal(lerDestinatarios("\r\n \r\n").ok, false);
  });

  it("campos entre aspas, como o Excel escreve, entram sem as aspas", () => {
    const { aceitos } = pares('"nome";"email"\n"Maria Silva";"maria@exemplo.com"');
    assert.deepEqual(aceitos, ["Maria Silva|maria@exemplo.com"]);
  });

  it("virgula dentro das aspas e UM campo, e cai na regra de nome, nao vira coluna extra", () => {
    // Se as aspas fossem ignoradas, "Silva, Maria" seria lido como dois campos
    // e o e-mail escorregaria para a coluna errada — a linha entraria com o
    // sobrenome no lugar do endereco. A recusa aqui e a do NOME, e prova que o
    // campo ficou inteiro e passou pela mesma regra da digitacao manual.
    const { aceitos, recusas } = pares('nome,email\n"Silva, Maria",maria@exemplo.com');
    assert.deepEqual(aceitos, []);
    assert.deepEqual(recusas, [
      "Linha 2: Nome deve conter apenas letras, espacos, ponto, hifen e apostrofo",
    ]);
  });

  it("recusa a linha ruim dizendo qual, e fica com o resto", () => {
    const { aceitos, recusas } = pares(
      [
        "nome;email",
        "Maria Silva;maria@exemplo.com",
        "Jo;jo@exemplo.com", // nome curto demais
        "Ana Souza;ana@sem-ponto", // e-mail sem dominio valido
        ";vazio@exemplo.com", // sem nome
        "Ana Souza;ANA@Exemplo.com", // esta serve: o e-mail desce para minuscula
      ].join("\n"),
    );

    assert.deepEqual(aceitos, [
      "Maria Silva|maria@exemplo.com",
      "Ana Souza|ana@exemplo.com",
    ]);
    assert.deepEqual(recusas, [
      "Linha 3: Nome muito curto",
      "Linha 4: E-mail invalido",
      "Linha 5: Nome muito curto",
    ]);
  });

  it("o mesmo e-mail duas vezes na planilha entra uma vez, e a segunda e dita", () => {
    // A action recusaria o lote INTEIRO por e-mail repetido na turma. Deixar a
    // segunda copia entrar aqui gastaria a viagem e voltaria sem lote nenhum.
    const { aceitos, recusas } = pares(
      "nome;email\nMaria Silva;maria@exemplo.com\nMaria S Silva; MARIA@exemplo.com \n",
    );
    assert.deepEqual(aceitos, ["Maria Silva|maria@exemplo.com"]);
    assert.deepEqual(recusas, ["Linha 3: maria@exemplo.com repetido na planilha."]);
  });
});
