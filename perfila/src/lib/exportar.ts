/**
 * Exportacao em CSV — o unico gerador de arquivo do projeto.
 *
 * Escrito UMA vez e ligado em todas as telas que ja prometiam "Exportar":
 * /admin/facilitadores, /admin/assessments, /admin/creditos, /admin/questoes,
 * /facilitador/grupos-de-mapeamento e /facilitador/meus-clientes. O arquivo sai pela rota
 * `app/api/exportar/[tipo]`, porque Server Action nao devolve resposta com
 * Content-Disposition.
 *
 * CSV, e nao xlsx: xlsx seria uma dependencia nova para resolver o que o Excel
 * abre nativamente.
 *
 * A REGRA QUE SEGURA O RESTO: cada exportacao chama a MESMA leitura que a tela
 * usa — `lib/painel.ts` e as actions. Nenhuma consulta nova nasce aqui.
 * Consulta escrita so para exportar e onde o filtro de dono e esquecido, e ai
 * o arquivo leva a carteira do concorrente inteira, em disco, para fora do
 * sistema.
 */
import { ORDEM_FATORES, questoes } from "@/data/assessment";
import { ROTULO_SITUACAO, ROTULO_TIPO } from "@/data/facilitadores";
import { listar as listarClientes } from "@/lib/actions/clientes";
import { listar as listarTurmas } from "@/lib/actions/turmas";
import { resultadoDeContadores } from "@/lib/disc";
import {
  assessmentsDaTurma,
  assessmentsVisiveis,
  empresasPorId,
  listarFacilitadores,
  listarTransacoes,
} from "@/lib/painel";

type Valor = string | number | null | undefined;

export type Planilha = { colunas: string[]; linhas: Valor[][] };

export type Exportacao = {
  /** Comeco do nome do arquivo; a rota acrescenta a data. */
  arquivo: string;
  /** Recurso do rbac que a rota confere, com a acao "ler". */
  recurso: string;
  /**
   * Os parametros da URL, para as exportacoes que precisam de um recorte —
   * hoje so a da turma, que recebe `?turma=<uuid>`. As demais ignoram o
   * argumento, e por isso ele nem aparece na assinatura delas.
   */
  montar: (busca: URLSearchParams) => Promise<Planilha>;
};

/**
 * Ponto e virgula, e nao virgula.
 *
 * O Excel em portugues do Brasil usa a virgula como separador DECIMAL, entao
 * ele so quebra o arquivo em colunas quando o separador e o ponto e virgula —
 * com virgula, a planilha inteira abre numa coluna so.
 */
const SEPARADOR = ";";

/**
 * Primeiro caractere que faz o Excel tratar a celula como FORMULA.
 *
 * O arquivo carrega nome, e-mail e descricao digitados por terceiros: alguem
 * cadastrado como `=HYPERLINK("http://mau.site")` viraria link clicavel na
 * planilha de quem exportou. E a falha conhecida como CSV injection. Tabulacao
 * e retorno de carro entram na lista porque o Excel os pula antes de ler o
 * `=` que vem depois.
 */
const FORMULA = /^[=+\-@\t\r]/;

/**
 * BOM UTF-8, escrito pelo codigo do caractere de proposito: colado como
 * literal ele fica INVISIVEL no editor, e um caractere que ninguem enxerga e
 * um caractere que alguem apaga sem perceber.
 */
const BOM = String.fromCharCode(0xfeff);

/**
 * Uma celula pronta para o arquivo.
 *
 * Numero sai como numero: o apostrofo de protecao vale para TEXTO, e aplica-lo
 * a um `-5` do extrato viraria o valor em texto e quebraria a soma da
 * planilha. O sinal negativo de um numero nao e formula.
 */
function celula(valor: Valor): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return String(valor);

  const texto = FORMULA.test(valor) ? `'${valor}` : valor;

  // Aspas dentro do campo dobram, e o campo inteiro vai entre aspas quando
  // contem o separador, aspas ou quebra de linha (RFC 4180).
  return /["\n\r]/.test(texto) || texto.includes(SEPARADOR)
    ? `"${texto.replaceAll('"', '""')}"`
    : texto;
}

/**
 * A planilha inteira, com BOM.
 *
 * Sem o BOM o Excel no Windows le o arquivo na codificacao da maquina e mostra
 * "JoÃ£o" onde estava "João" — o arquivo inteiro parece defeito. CRLF pelo
 * mesmo motivo: e o fim de linha que o Excel espera.
 */
export function csv({ colunas, linhas }: Planilha): string {
  return (
    BOM +
    [colunas, ...linhas].map((linha) => linha.map(celula).join(SEPARADOR)).join("\r\n") +
    "\r\n"
  );
}

const DATA_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
});

/** Data no fuso de Sao Paulo, como as telas mostram. */
function data(valor: Date): string {
  return DATA_BR.format(valor);
}

/** Formato de uuid, para validar o recorte que chega pela URL. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EXPORTACOES: Record<string, Exportacao> = {
  facilitadores: {
    arquivo: "facilitadores",
    recurso: "usuarios",
    async montar() {
      const itens = await listarFacilitadores();

      return {
        colunas: [
          "Nome",
          "E-mail",
          "Empresa",
          "Telefone",
          "Creditos",
          "Situacao",
          "Cadastrado em",
        ],
        linhas: itens.map((item) => [
          item.nome,
          item.email,
          item.empresa,
          item.telefone,
          item.creditos,
          item.ativo ? "Ativo" : "Inativo",
          item.criadoEm,
        ]),
      };
    },
  },

  assessments: {
    arquivo: "mapas-comportamentais",
    recurso: "assessments",
    async montar() {
      const itens = await assessmentsVisiveis();
      // Os nomes dos parceiros saem da mesma consulta em lote da tela: um por
      // linha seria uma ida ao banco por assessment exportado.
      const empresas = await empresasPorId([...new Set(itens.map((item) => item.facilitadorId))]);

      return {
        colunas: [
          "Avaliado",
          "E-mail",
          "Parceiro",
          "Relatorio",
          "Situacao",
          "Creditos",
          "Criado em",
          "Expira em",
          "Concluido em",
        ],
        linhas: itens.map((item) => [
          item.avaliadoNome,
          item.avaliadoEmail,
          empresas[item.facilitadorId] ?? item.facilitadorId,
          item.tipoRelatorio,
          ROTULO_SITUACAO[item.situacao],
          item.creditosUsados,
          item.criadoEm,
          item.expiraEm,
          item.concluidoEm,
        ]),
      };
    },
  },

  creditos: {
    arquivo: "extrato-creditos",
    recurso: "usuarios",
    async montar() {
      const itens = await listarTransacoes();
      const nomes = await empresasPorId([...new Set(itens.map((item) => item.facilitadorId))]);

      return {
        colunas: ["Data", "Parceiro", "Movimento", "Descricao", "Creditos"],
        linhas: itens.map((item) => [
          item.data,
          nomes[item.facilitadorId] ?? item.facilitadorId,
          ROTULO_TIPO[item.tipo],
          item.descricao,
          // Com sinal, como na tela: sem ele "2" tanto pode ser compra quanto
          // consumo, e o extrato deixa de explicar o saldo.
          item.quantidade,
        ]),
      };
    },
  },

  turmas: {
    arquivo: "grupos-de-mapeamento",
    recurso: "turmas",
    async montar() {
      const itens = await listarTurmas();

      return {
        colunas: [
          "Nome",
          "Area",
          "Relatorio",
          "Criado em",
          "Criado por",
          "Enviados",
          "Respondidos",
          "Download liberado",
        ],
        linhas: itens.map((item) => [
          item.nome,
          item.area,
          item.tipo_relatorio,
          data(item.created_at),
          item.criada_por,
          item.total,
          item.respondidos,
          item.permite_download ? "Sim" : "Nao",
        ]),
      };
    },
  },

  /**
   * As respostas de UM grupo: o download da linha da lista de grupos de
   * mapeamento.
   *
   * Reusa `assessmentsDaTurma`, a mesma leitura da tela de detalhe, com o
   * recorte por dono dentro. O uuid vem da URL, que e fronteira: um valor que
   * nao e uuid iria ao driver como texto e voltaria como erro 500, entao ele
   * e barrado aqui e o arquivo sai so com o cabecalho. Turma de outro parceiro
   * cai no mesmo lugar pelo WHERE da leitura — sem linha nenhuma, sem
   * confirmar que aquele uuid existe.
   *
   * O nome do arquivo nao leva o nome da turma de proposito: buscar a turma so
   * para batizar o CSV seria uma segunda consulta para uma informacao que quem
   * clicou ja tem na tela.
   */
  turma: {
    arquivo: "respostas-do-grupo",
    recurso: "turmas",
    async montar(busca) {
      const colunas = [
        "Avaliado",
        "E-mail",
        "Relatorio",
        "Situacao",
        "Perfil",
        "Creditos",
        "Criado em",
        "Expira em",
        "Concluido em",
      ];

      const turmaId = busca.get("turma") ?? "";
      if (!UUID.test(turmaId)) return { colunas, linhas: [] };

      const itens = await assessmentsDaTurma(turmaId);

      return {
        colunas,
        linhas: itens.map((item) => [
          item.avaliadoNome,
          item.avaliadoEmail,
          item.tipoRelatorio,
          ROTULO_SITUACAO[item.situacao],
          // O perfil e DERIVADO dos contadores, pelo mesmo helper da tela.
          // Quem ainda nao respondeu nao tem contador, e a celula fica vazia
          // em vez de exibir um "DI" que nao veio de resposta nenhuma.
          item.contadores ? resultadoDeContadores(item.contadores).combinado : "",
          item.creditosUsados,
          item.criadoEm,
          item.expiraEm,
          item.concluidoEm,
        ]),
      };
    },
  },

  clientes: {
    arquivo: "clientes",
    recurso: "clientes",
    async montar() {
      const itens = await listarClientes();

      return {
        colunas: ["Nome", "E-mail", "Celular", "Cadastrado em", "Parceiro"],
        linhas: itens.map((item) => [
          item.nome,
          item.email,
          item.celular,
          data(item.created_at),
          item.dono,
        ]),
      };
    },
  },

  /**
   * O banco de questoes vem de `data/assessment.ts`, e nao do banco de dados:
   * e conteudo de codigo. Passa pela mesma biblioteca mesmo assim — um segundo
   * gerador de arquivo so para este caso teria a propria versao do escape, e
   * protecao que existe em um lugar so e a que nao diverge.
   */
  questoes: {
    arquivo: "banco-de-questoes",
    recurso: "questoes",
    async montar() {
      return {
        colunas: ["Bloco", "Codigo", "Enunciado", ...ORDEM_FATORES.map((f) => `Opcao ${f}`)],
        linhas: questoes.map((questao) => [
          questao.bloco,
          questao.codigo,
          questao.enunciado,
          ...ORDEM_FATORES.map(
            (fator) => questao.opcoes.find((opcao) => opcao.fator === fator)?.texto,
          ),
        ]),
      };
    },
  },
};
