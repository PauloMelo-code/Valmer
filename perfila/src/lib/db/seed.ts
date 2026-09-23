/**
 * Seed de desenvolvimento.
 *
 * Carrega no banco os dados de exemplo de src/data/, que ate aqui eram os
 * dados fixos do prototipo. Roda uma vez sobre o banco recem-migrado:
 *
 *   npm run db:seed
 *
 * Se ja houver usuarios, nao faz nada. Para semear de novo, recrie o banco
 * (docker compose down -v && docker compose up -d db && npm run db:migrate).
 *
 * Duas diferencas em relacao aos numeros do prototipo, ambas deliberadas:
 *
 * - O extrato fixo nao explicava os saldos (Valmer tinha 182 creditos e um
 *   extrato que somava 194). Aqui o saldo E a soma das transacoes, que e a
 *   invariante documentada em schema/creditos.ts, entao o seed a cumpre.
 * - As linhas de uso nao vem da lista fixa de transacoes, e sim dos proprios
 *   assessments: todo assessment consumiu creditos ao ser criado, mas dois
 *   deles (Fernando e Antonio) nao tinham linha de uso no extrato fixo.
 *
 * Os concluidos ficam sem respostas por questao: o prototipo guarda so os
 * contadores deles, e inventar 28 respostas para casar com contadores ja
 * fixados seria dado falso. O em andamento e a excecao — ver
 * `respostasEmAndamento`.
 *
 * E ficam sem NARRATIVA gravada, pelo mesmo motivo. O seed chegou a inserir
 * `data/narrativa-exemplo.ts` como v1 do mapa do Elias, mas aquele texto foi
 * escrito para o Paulo: gravado, ele vira relatorio de homologacao chamando a
 * pessoa pelo nome errado, e nenhuma checagem de NODE_ENV alcanca uma linha que
 * ja esta no banco. Mapa concluido sem narrativa tem tela propria
 * (`components/relatorio/TextoPendente.tsx`) e o botao de gerar esta na lista
 * do parceiro — o caminho de verdade, que a demo passa a exercitar.
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  assessments as tabelaAssessments,
  assessmentsRespostas,
  creditosTransacoes,
  precosPacotes,
  precosRelatorios,
  usuarios,
} from "./schema";
import { assessments as dadosAssessments, facilitadores, transacoes } from "../../data/facilitadores";
import { pacotesCreditos, tiposRelatorio } from "../../data/planos";
import { novoToken } from "../assessment-link";

config({ path: [".env.local", ".env"] });

/**
 * Ids fixos para o seed ser referenciavel: as FKs abaixo apontam para eles,
 * e rodar duas vezes nao cria registros duplicados com ids novos.
 */
const idUsuario: Record<string, string> = {
  valmer: "5e0d7c9a-4f21-4b8e-9c3d-1a6f8e2b7d40",
  "beatriz-nunes": "b3f2a8c1-7d5e-4a90-8f16-c4e9d2a75b31",
  "rogerio-lima": "9c81d4f7-2b3a-4e65-a7d8-f01e6c5b9a22",
  "carla-menezes": "d7a45e92-6c1f-4d38-b5a0-8e3f7c2d1b13",
};

const idAssessment: Record<string, string> = {
  a1: "1a7f3b58-9d2c-4e61-b4a5-6c8d0e9f2a04",
  a2: "2b8e4c69-0a3d-4f72-95b6-7d9e1f0a3b15",
  a3: "3c9f5d70-1b4e-4a83-a6c7-8e0f2a1b4c26",
  a4: "4d0a6e81-2c5f-4b94-b7d8-9f1a3b2c5d37",
  a5: "5e1b7f92-3d6a-4ca5-88e9-0a2b4c3d6e48",
};

/**
 * Senha de todos os usuarios semeados.
 *
 * Vale so no banco de desenvolvimento, que nasce e morre com `docker compose
 * down -v`. Nenhum usuario de producao passa por aqui: a criacao de verdade e
 * pela tela do admin, que exige senha propria.
 */
const SENHA_DEV = "perfila-dev-2026";

/** Converte a data dd/mm/aaaa do prototipo em Date, ao meio-dia local. */
function dataBr(valor: string): Date {
  const [dia, mes, ano] = valor.split("/").map(Number);
  return new Date(ano!, mes! - 1, dia!, 12);
}

/** Mesma validade que `criar()` aplica em actions/assessments.ts. */
const DIAS_VALIDADE = 7;

/**
 * Assina as respostas do respondente, como manda o ADR-0002.
 *
 * Repetida aqui em vez de importada de actions/avaliacao.ts: aquele arquivo e
 * "use server", e o seed e um script node solto. Continua sendo o mesmo valor,
 * e a decisao de nao criar um modulo de sentinelas esta no ADR.
 */
const RESPONDENTE = "00000000-0000-0000-0000-000000000000";

/**
 * Respostas do unico assessment em andamento (token p7xa20).
 *
 * Sem elas a tela deriva "retomado" de zero respostas e oferece "Comecar" num
 * link que o proprio seed diz estar em andamento — a demo nunca exercitava a
 * retomada. Cinco questoes bastam. Os contadores continuam nulos de proposito:
 * quem os calcula e `concluir()`, a partir destas linhas.
 */
const respostasEmAndamento = [
  { questao_codigo: "Q01", fator: "D" as const },
  { questao_codigo: "Q02", fator: "I" as const },
  { questao_codigo: "Q03", fator: "S" as const },
  { questao_codigo: "Q04", fator: "C" as const },
  { questao_codigo: "Q05", fator: "I" as const },
];

/**
 * Link ainda aberto nasce com data relativa; link morto mantem a data fixa.
 *
 * As datas de src/data/facilitadores.ts sao fixas, entao o token `demo` viraria
 * tela de "link expirado" uma semana depois de qualquer seed, sem ninguem ter
 * tocado em codigo. Concluido e expirado precisam mesmo estar no passado.
 */
function expiraEm(situacao: string, valor: string): Date {
  if (situacao === "pendente" || situacao === "em_andamento") {
    return new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000);
  }
  return dataBr(valor);
}

/**
 * O que a compra custou, pelo pacote que a descricao nomeia.
 *
 * O valor vai GRAVADO na linha, como manda `schema/creditos.ts`, e nao e
 * reconstruido depois pelo preco vigente: o seed e a unica foto do passado que
 * este banco tem, e ele nao pode nascer contando a historia que a coluna existe
 * para impedir. Bonus e estorno nao cobram nada e ficam nulos.
 */
function valorCobrado(tipo: string, descricao: string): number | null {
  if (tipo !== "compra") return null;
  return pacotesCreditos.find((pacote) => descricao === `Pacote ${pacote.nome}`)?.preco ?? null;
}

// Compras, bonus e estornos vem da lista fixa; os usos vem dos assessments,
// para toda linha de consumo apontar o assessment que a causou.
const linhasCompra = transacoes
  .filter((transacao) => transacao.tipo !== "uso")
  .map((transacao) => ({
    usuario_id: idUsuario[transacao.facilitadorId]!,
    tipo: transacao.tipo,
    quantidade: transacao.quantidade,
    valor_cobrado: valorCobrado(transacao.tipo, transacao.descricao),
    descricao: transacao.descricao,
    created_at: dataBr(transacao.data),
    modified_by: idUsuario[transacao.facilitadorId]!,
  }));

const linhasUso = dadosAssessments.map((assessment) => ({
  usuario_id: idUsuario[assessment.facilitadorId]!,
  tipo: "uso" as const,
  quantidade: -assessment.creditosUsados,
  descricao: `Assessment ${assessment.tipoRelatorio} · ${assessment.avaliadoNome}`,
  assessment_id: idAssessment[assessment.id]!,
  created_at: dataBr(assessment.criadoEm),
  modified_by: idUsuario[assessment.facilitadorId]!,
}));

const linhasTransacao = [...linhasCompra, ...linhasUso];

/** Saldo = soma do extrato, a invariante de schema/creditos.ts. */
function saldo(facilitadorId: string): number {
  const usuario = idUsuario[facilitadorId]!;
  return linhasTransacao
    .filter((linha) => linha.usuario_id === usuario)
    .reduce((soma, linha) => soma + linha.quantidade, 0);
}

/**
 * A tabela comercial: as linhas que ate aqui eram `data/planos.ts`.
 *
 * Vai no SEED, e nao na migration, por dois motivos. A migration cria
 * ESTRUTURA e roda em todo ambiente, inclusive naquele em que o preco ja foi
 * ajustado — reinserir o preco de especificacao ali seria desfazer a decisao
 * comercial de alguem num deploy. E preco e dado, e dado se semeia.
 *
 * Roda ANTES e FORA do `if (existentes)` que protege os usuarios: um banco que
 * ja tem gente e que acabou de migrar continua sem preco nenhum, e sem preco
 * `actions/assessments.ts` recusa todo mapa novo. Cada tabela olha para a
 * propria vazia, entao rodar de novo nao duplica nem sobrescreve o que o admin
 * ja editou.
 *
 * `modified_by` e o dono da plataforma, que e quem definiria estes precos.
 */
async function semearPrecos(db: ReturnType<typeof drizzle>): Promise<void> {
  const dono = idUsuario.valmer!;

  const [temRelatorio] = await db.select({ id: precosRelatorios.id }).from(precosRelatorios).limit(1);
  if (!temRelatorio) {
    await db.insert(precosRelatorios).values(
      tiposRelatorio.map((tipo) => ({
        codigo: tipo.codigo,
        nome: tipo.nome,
        creditos: tipo.creditos,
        conteudo: tipo.conteudo,
        revenda_min: tipo.revendaMin,
        revenda_max: tipo.revendaMax,
        modified_by: dono,
      })),
    );
    console.log(`  precos_relatorios: ${tiposRelatorio.length}`);
  }

  const [temPacote] = await db.select({ id: precosPacotes.id }).from(precosPacotes).limit(1);
  if (!temPacote) {
    await db.insert(precosPacotes).values(
      pacotesCreditos.map((pacote) => ({
        nome: pacote.nome,
        creditos: pacote.creditos,
        preco: pacote.preco,
        publico: pacote.publico,
        modified_by: dono,
      })),
    );
    console.log(`  precos_pacotes:    ${pacotesCreditos.length}`);
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    await semearPrecos(db);

    // Sem filtro de is_deleted, de proposito: um usuario soft-deletado ainda
    // ocupa o e-mail no indice unico, entao re-semear por cima estouraria.
    const existentes = await db.select({ id: usuarios.id }).from(usuarios).limit(1);
    if (existentes.length > 0) {
      console.log("Banco ja tem usuarios; nada a fazer.");
      return;
    }

    // Tudo numa transacao so: a partir da 0005 o banco confere no COMMIT se
    // usuarios.creditos bate com a soma do extrato. Semear os usuarios com saldo
    // num commit e as transacoes em outro deixaria o primeiro commit fora da
    // invariante. De quebra, seed que falha no meio nao deixa banco pela metade.
    // Sorteados FORA da transacao: o log do fim precisa dos MESMOS valores, e
    // sortear de novo la imprimiria links que nao existem no banco.
    const tokenSemeado: Record<string, string> = Object.fromEntries(
      dadosAssessments.map((assessment) => [assessment.id, novoToken()]),
    );

    await db.transaction(async (tx) => {
      await tx.insert(usuarios).values(
        facilitadores.map((facilitador) => ({
          id: idUsuario[facilitador.id]!,
          nome: facilitador.nome,
          email: facilitador.email,
          // O dono e o unico admin; tambem aplica assessments como os demais.
          papel: facilitador.id === "valmer" ? ("admin" as const) : ("facilitador" as const),
          empresa: facilitador.empresa,
          telefone: facilitador.telefone,
          creditos: saldo(facilitador.id),
          ativo: facilitador.ativo,
          created_at: dataBr(facilitador.criadoEm),
          modified_by: idUsuario.valmer!,
        })),
      );

      await tx.insert(tabelaAssessments).values(
      dadosAssessments.map((assessment) => ({
          id: idAssessment[assessment.id]!,
          // O TOKEN E SORTEADO, e nao o do arquivo de dados.
          //
          // `data/facilitadores.ts` trazia tokens escritos a mao — "demo" e
          // "expirado" entre eles. O token e a UNICA credencial do avaliado
          // (ver `actions/avaliacao.ts`): quem digitar /avaliacao/demo no
          // endereco de homologacao responde e CONCLUI o mapa de uma pessoa
          // real. Palavra curta e adivinhavel nao e link secreto.
          //
          // `novoToken()` e o mesmo gerador da criacao de verdade — doze
          // hexadecimais de `randomBytes`. Os tokens sorteados sao impressos no
          // fim do seed, entao quem semeou continua tendo os links em maos.
          token: tokenSemeado[assessment.id]!,
          facilitador_id: idUsuario[assessment.facilitadorId]!,
          avaliado_nome: assessment.avaliadoNome,
          avaliado_email: assessment.avaliadoEmail,
          tipo_relatorio: assessment.tipoRelatorio,
          situacao: assessment.situacao,
          creditos_usados: assessment.creditosUsados,
          expira_em: expiraEm(assessment.situacao, assessment.expiraEm),
          concluido_em: assessment.concluidoEm ? dataBr(assessment.concluidoEm) : null,
          contador_d: assessment.contadores?.D ?? null,
          contador_i: assessment.contadores?.I ?? null,
          contador_s: assessment.contadores?.S ?? null,
          contador_c: assessment.contadores?.C ?? null,
          created_at: dataBr(assessment.criadoEm),
          modified_by: idUsuario[assessment.facilitadorId]!,
        })),
      );

      await tx.insert(assessmentsRespostas).values(
        respostasEmAndamento.map((resposta) => ({
          assessment_id: idAssessment.a3!,
          questao_codigo: resposta.questao_codigo,
          fator: resposta.fator,
          modified_by: RESPONDENTE,
        })),
      );

      await tx.insert(creditosTransacoes).values(linhasTransacao);
    });

    // Fora da transacao acima: o Better Auth abre a propria conexao, entao nao
    // teria como participar dela. Roda depois, com os usuarios ja gravados.
    //
    // As credenciais vao por ele, e nao por INSERT: assim a senha e derivada
    // exatamente como no cadastro real, e o login do seed exercita o mesmo
    // caminho de producao em vez de um atalho que so existe aqui.
    const { definirSenha } = await import("../auth/senha");
    for (const facilitador of facilitadores) {
      await definirSenha(idUsuario[facilitador.id]!, SENHA_DEV);
    }

    console.log("Seed concluido:");
    console.log(`  usuarios:     ${facilitadores.length}`);
    console.log(`  assessments:  ${dadosAssessments.length}`);
    console.log(`  transacoes:   ${linhasTransacao.length}`);
    console.log(`  respostas:    ${respostasEmAndamento.length} (mapa em andamento)`);
    console.log(`  senha de todos: ${SENHA_DEV}`);
    // Os links precisam ser impressos: sem os tokens escritos a mao, esta e a
    // unica forma de quem semeou chegar a um mapa ou a um relatorio de exemplo.
    console.log("  links de exemplo:");
    for (const assessment of dadosAssessments) {
      const caminho = assessment.situacao === "concluido" ? "relatorio" : "avaliacao";
      console.log(
        `    /${caminho}/${tokenSemeado[assessment.id]}  (${assessment.avaliadoNome}, ${assessment.situacao})`,
      );
    }
    for (const facilitador of facilitadores) {
      console.log(`  saldo ${facilitador.nome}: ${saldo(facilitador.id)}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
