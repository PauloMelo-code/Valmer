/**
 * As telas do Territorio da Empresa gravam de verdade?
 *
 *   node --import tsx --test tests/territorio-telas.test.mts
 *
 * Nao toca no banco, e no estilo de `telas-honestas.test.mts`: o que se verifica
 * aqui e o TEXTO-FONTE das tres telas, porque era ele que mentia. As actions ja
 * tem teste de integracao em `territorios.test.mts` — o que nenhum teste de
 * action pega e a tela parar de chamar essas actions e voltar ao prototipo.
 *
 * O prototipo era `src/data/dna.ts`: quatro empresas fixas, quatro respondentes
 * fixos e a media `{ D: 52, I: 57, S: 47, C: 45 }`, escrita a mao, que soma 201
 * e nao descrevia nenhum dos respondentes listados ao lado. Enquanto aquilo
 * estiver importado por uma tela, a tela mostra numero inventado a um cliente.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PASTA = join("src", "app", "facilitador", "territorio-da-empresa");

const TELAS = {
  lista: join(PASTA, "page.tsx"),
  listaCliente: join(PASTA, "ListaTerritorios.tsx"),
  nova: join(PASTA, "novo", "page.tsx"),
  detalhe: join(PASTA, "[slug]", "page.tsx"),
  detalheCliente: join(PASTA, "[slug]", "DnaDetalhe.tsx"),
  escolher: join(PASTA, "[slug]", "EscolherInventario.tsx"),
} as const;

const fonte = Object.fromEntries(
  Object.entries(TELAS).map(([nome, caminho]) => [nome, readFileSync(caminho, "utf8")]),
) as Record<keyof typeof TELAS, string>;

describe("telas do territorio", () => {
  it("nenhuma tela do territorio le o prototipo de data/dna", () => {
    // `FatorDisc` e `FATORES_DISC` continuam vindo de la, e sao vocabulario: o
    // tipo das quatro letras e o rotulo dos quatro cartoes. O que nao pode
    // voltar e o DADO — empresa, respondente e media escritos a mao.
    const proibidos = /\b(dnas|getDna|mediasDisc|respondentes)\b\s*[,}]/;

    for (const [nome, texto] of Object.entries(fonte)) {
      const importacoes = texto.match(/import[^;]*from ['"]@\/data\/dna['"]/g) ?? [];
      for (const linha of importacoes) {
        assert.ok(!proibidos.test(linha), `${nome} voltou a ler o prototipo: ${linha}`);
      }
    }
  });

  it("o prototipo nao existe mais nem no arquivo de origem", () => {
    const dna = readFileSync(join("src", "data", "dna.ts"), "utf8");
    assert.ok(!/mediasDisc/.test(dna), "a media escrita a mao voltou para data/dna.ts");
    assert.ok(!/slug:/.test(dna), "as empresas fixas voltaram para data/dna.ts");
  });

  it("o breadcrumb nao depende mais da lista fixa de empresas", () => {
    const rotas = readFileSync(join("src", "lib", "routes.ts"), "utf8");
    assert.ok(!/@\/data\/dna/.test(rotas), "routes.ts voltou a importar o prototipo");
  });

  it("cada tela chama a action que ela promete", () => {
    // Uma por uma, porque cada aba foi um botao morto diferente: a lista
    // avisava que nao gravava ao excluir, a tela nova avisava que nao salvava,
    // e o detalhe nao tinha como vincular nada.
    assert.match(fonte.lista, /from '@\/lib\/actions\/territorios'/);
    assert.match(fonte.listaCliente, /atualizarPelaTela/);
    assert.match(fonte.listaCliente, /excluirPelaTela/);
    assert.match(fonte.nova, /criarPelaTela/);
    assert.match(fonte.detalhe, /inventariosDisponiveis/);
    assert.match(fonte.detalheCliente, /desvincularInventarioPelaTela/);
    assert.match(fonte.detalheCliente, /vincularGrupoPelaTela/);
    assert.match(fonte.escolher, /vincularInventarioPelaTela/);
  });

  it("excluir e desvincular perguntam antes", () => {
    // Exclusao logica no banco continua sumindo da tela na hora: um clique
    // errado na lixeira ao lado do lapis nao pode tirar a empresa da lista sem
    // aviso. Mesmo criterio de `AcoesTurma.tsx`.
    assert.match(fonte.listaCliente, /window\.confirm/);
    assert.match(fonte.detalheCliente, /window\.confirm/);
  });

  it("o que ainda nao existe continua avisando, e no tom de aviso", () => {
    // Relatorio coletivo, graficos e PDF do territorio sao tela nova, e nao
    // botao: nao ha gerador de narrativa de GRUPO nem pagina de impressao do
    // territorio. O aviso honesto fica ate existirem — trocar por um toast de
    // sucesso, ou por uma tela vazia, e o que este teste impede.
    for (const nome of ["listaCliente", "detalheCliente"] as const) {
      const avisos = fonte[nome].match(/toast\([^)]*ainda n[ãa]o[^)]*\)/g) ?? [];
      assert.ok(avisos.length > 0, `${nome} perdeu o aviso do relatorio/PDF do territorio`);
      for (const aviso of avisos) {
        assert.ok(aviso.includes("'aviso'"), `${nome}: recusa com selo de sucesso — ${aviso}`);
      }
    }
  });
});
