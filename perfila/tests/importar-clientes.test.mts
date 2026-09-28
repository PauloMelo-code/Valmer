/**
 * Teste da leitura do CSV de clientes.
 *
 *   node --import tsx --test tests/importar-clientes.test.mts
 *
 * Nao toca no banco de proposito: o que este modulo decide e FORMA — onde estao
 * as colunas, onde termina um campo e em que LINHA do arquivo cada valor
 * estava. Quem julga conteudo e `validators/cliente.ts`, e quem grava e
 * `actions/importar-clientes.ts` pelo mesmo `criar` do formulario, ja coberto
 * por `cadastros.test.mts`.
 *
 * O caso que manda aqui e o do numero da linha: e ele que a tela mostra para
 * quem vai corrigir a planilha. Um parser que acerta os campos e erra a linha
 * manda a pessoa consertar a linha errada.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { lerClientesCsv } = await import("@/lib/importar-clientes");

/** Igual ao que a rota de exportacao entrega: BOM, ponto e virgula, CRLF. */
const EXPORTADO =
  "\ufeffNome;E-mail;Celular;Cadastrado em;Parceiro\r\n" +
  "Ana Souza;ana@empresa.com;11999990000;23/09/2026;Consultoria X\r\n" +
  "Bruno Lima;bruno@empresa.com;;23/09/2026;Consultoria X\r\n";

function ok(texto: string) {
  const leitura = lerClientesCsv(texto);
  assert.equal(leitura.ok, true, `recusou: ${leitura.ok ? "" : leitura.erro}`);
  return leitura.ok ? leitura.linhas : [];
}

function recusa(texto: string): string {
  const leitura = lerClientesCsv(texto);
  assert.equal(leitura.ok, false, "aceitou o que deveria recusar");
  return leitura.ok ? "" : leitura.erro;
}

describe("leitura do CSV de clientes", () => {
  it("le de volta o arquivo que a propria exportacao gera", () => {
    const linhas = ok(EXPORTADO);

    assert.deepEqual(linhas, [
      { numero: 2, nome: "Ana Souza", email: "ana@empresa.com", celular: "11999990000" },
      { numero: 3, nome: "Bruno Lima", email: "bruno@empresa.com", celular: "" },
    ]);
  });

  it("aceita virgula e o cabecalho escrito de outra forma", () => {
    const linhas = ok("nome,email,telefone\nAna Souza,ana@empresa.com,11 99999-0000\n");

    assert.deepEqual(linhas, [
      { numero: 2, nome: "Ana Souza", email: "ana@empresa.com", celular: "11 99999-0000" },
    ]);
  });

  it("nao parte o campo entre aspas, e a linha seguinte continua sendo a do arquivo", () => {
    const linhas = ok(
      'Nome;E-mail\r\n' +
        '"Souza; Ana Maria";ana@empresa.com\r\n' +
        '"Bruno\r\nLima";bruno@empresa.com\r\n' +
        'Carla Dias;carla@empresa.com\r\n',
    );

    assert.deepEqual(
      linhas.map((linha) => [linha.numero, linha.nome]),
      [
        [2, "Souza; Ana Maria"],
        // O campo entre aspas consumiu duas linhas fisicas: quem vem depois
        // esta na linha 5, e nao na 4.
        [3, "Bruno\r\nLima"],
        [5, "Carla Dias"],
      ],
    );
  });

  it("desfaz o apostrofo de protecao, e so ele", () => {
    const linhas = ok("Nome;E-mail\n'=Ana;'=ana@empresa.com\n'Tonho;tonho@empresa.com\n");

    assert.deepEqual(
      linhas.map((linha) => [linha.nome, linha.email]),
      [
        // Escrito pela exportacao para o Excel nao tratar a celula como formula.
        ["=Ana", "=ana@empresa.com"],
        // Apostrofo que faz parte do nome: nunca foi protecao, e fica.
        ["'Tonho", "tonho@empresa.com"],
      ],
    );
  });

  it("ignora linha em branco no meio e no fim", () => {
    const linhas = ok("Nome;E-mail\n\nAna Souza;ana@empresa.com\n;;\n\n");

    assert.deepEqual(
      linhas.map((linha) => linha.numero),
      [3],
    );
  });

  it("entrega a celula vazia em vez de sumir com a linha curta", () => {
    // O validador e que recusa nome/e-mail em branco, com a mesma mensagem do
    // formulario — e a action a etiqueta com o numero da linha.
    const linhas = ok("Nome;E-mail;Celular\nAna Souza\n");

    assert.deepEqual(linhas, [{ numero: 2, nome: "Ana Souza", email: "", celular: "" }]);
  });

  it("recusa o arquivo sem as colunas obrigatorias", () => {
    assert.match(recusa("Pessoa;Contato\nAna;ana@empresa.com\n"), /Nome e E-mail/);
  });

  it("recusa o arquivo vazio e o que so tem cabecalho", () => {
    assert.match(recusa("   \n"), /nada para importar/);
    assert.match(recusa("Nome;E-mail\n"), /so tem o cabecalho/);
  });

  it("recusa a lista acima do teto, sem gravar nada antes", () => {
    const gigante =
      "Nome;E-mail\n" +
      Array.from({ length: 201 }, (_, i) => `Pessoa ${i};pessoa${i}@empresa.com`).join("\n");

    assert.match(recusa(gigante), /limite e 200/);
  });
});
