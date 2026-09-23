/**
 * Leituras das telas de gestao: portal do facilitador e painel do admin.
 *
 * Devolve os dados no MESMO formato que `src/data/facilitadores.ts` entregava
 * ao prototipo (`Facilitador`, `Assessment`, `Transacao`), entao as tabelas e
 * os cartoes continuam iguais — o que muda e de onde os numeros vem. Enquanto
 * o formato for o mesmo, trocar a fonte nao arrasta a interface junto.
 *
 * Nao e "use server": quem chama sao Server Components, que ja rodam no
 * servidor. Transformar leitura de tela em endpoint POST publico so aumentaria
 * a superficie exposta.
 */
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assessments,
  assessmentsRelatorios,
  clientes,
  creditosTransacoes,
  DEGUSTACOES_INICIAIS,
  devolutivas,
  usuarios,
} from "@/lib/db/schema";
import { getSession, temPermissao, type Sessao } from "@/lib/auth";
import { initials } from "@/lib/text";
import { categoriaAtingida, cicloDe, faltamPara, metaDaBarra } from "@/lib/beneficios";
import type { Assessment, Facilitador, Transacao } from "@/data/facilitadores";
import type { FatorDisc } from "@/data/dna";

const DATA_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
});

function data(valor: Date): string {
  return DATA_BR.format(valor);
}

async function exigirSessao(recurso: string): Promise<Sessao> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");
  if (!temPermissao(sessao.papel, recurso, "ler")) {
    throw new Error(`Sem permissao para ler ${recurso}`);
  }
  return sessao;
}

type LinhaAssessment = typeof assessments.$inferSelect;

/**
 * Converte a linha do banco no formato que as telas esperam.
 *
 * Os contadores so entram quando os quatro existem: um assessment em andamento
 * tem os quatro nulos, e montar `{D: 0, I: 0, S: 0, C: 0}` faria a lista exibir
 * "Perfil DI" para quem ainda nao respondeu nada.
 */
function paraAssessment(linha: LinhaAssessment, comNarrativa?: Set<string>): Assessment {
  const { contador_d, contador_i, contador_s, contador_c } = linha;
  const completo =
    contador_d !== null && contador_i !== null && contador_s !== null && contador_c !== null;

  const contadores: Record<FatorDisc, number> | undefined = completo
    ? { D: contador_d, I: contador_i, S: contador_s, C: contador_c }
    : undefined;

  // Expiracao e DERIVADA de `expira_em`, nunca lida de um campo gravado, e
  // concluido tem precedencia sobre vencido: quem respondeu no prazo nao pode
  // aparecer como "expirado" no dia seguinte. Mesma regra de
  // `actions/avaliacao.ts` — la ela nao da para importar, porque aquele modulo
  // e "use server" e so exporta actions.
  const situacao: Assessment["situacao"] =
    linha.situacao !== "concluido" && linha.expira_em.getTime() < Date.now()
      ? "expirado"
      : linha.situacao;

  return {
    id: linha.id,
    token: linha.token,
    facilitadorId: linha.facilitador_id,
    avaliadoNome: linha.avaliado_nome,
    avaliadoEmail: linha.avaliado_email,
    tipoRelatorio: linha.tipo_relatorio,
    situacao,
    creditosUsados: linha.creditos_usados,
    criadoEm: data(linha.created_at),
    expiraEm: data(linha.expira_em),
    concluidoEm: linha.concluido_em ? data(linha.concluido_em) : undefined,
    contadores,
    temNarrativa: comNarrativa?.has(linha.id) ?? false,
  };
}

/**
 * Quais destes assessments ja tem narrativa gravada.
 *
 * Uma consulta para a lista inteira, e nao uma por linha: a lista de mapas de
 * um parceiro passa de centenas, e uma consulta por linha e o mesmo N+1 que
 * derruba a tela quando a conta cresce.
 */
async function comNarrativaGravada(linhas: LinhaAssessment[]): Promise<Set<string>> {
  const ids = linhas.filter((l) => l.situacao === "concluido").map((l) => l.id);
  if (ids.length === 0) return new Set();

  const gravados = await db
    .selectDistinct({ id: assessmentsRelatorios.assessment_id })
    .from(assessmentsRelatorios)
    .where(
      and(
        inArray(assessmentsRelatorios.assessment_id, ids),
        eq(assessmentsRelatorios.is_deleted, false),
      ),
    );

  return new Set(gravados.map((g) => g.id));
}

function paraFacilitador(linha: typeof usuarios.$inferSelect): Facilitador {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    empresa: linha.empresa ?? "",
    telefone: linha.telefone ?? "",
    creditos: linha.creditos,
    ativo: linha.ativo,
    criadoEm: data(linha.created_at),
    iniciais: initials(linha.nome),
  };
}

/**
 * Assessments visiveis para quem esta logado.
 *
 * O recorte por dono e o mesmo de `actions/assessments.ts`: o facilitador ve
 * os dele, o admin ve os de todos os parceiros. A regra fica no WHERE, e nao
 * numa filtragem depois da consulta, para nao existir caminho em que a linha
 * de outro chegue a ser carregada.
 */
export async function assessmentsVisiveis(): Promise<Assessment[]> {
  const sessao = await exigirSessao("assessments");

  const linhas = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.is_deleted, false),
        sessao.papel === "admin" ? undefined : eq(assessments.facilitador_id, sessao.userId),
      ),
    )
    .orderBy(desc(assessments.created_at));

  const comNarrativa = await comNarrativaGravada(linhas);
  return linhas.map((linha) => paraAssessment(linha, comNarrativa));
}

/**
 * Os mapas de UMA turma, para a tela de detalhe dela.
 *
 * O recorte por dono continua no WHERE, junto do filtro de turma: a rota de
 * detalhe recebe o uuid pela URL, e um uuid de turma alheia colado ali tem de
 * devolver lista vazia, e nao a turma do concorrente. `actions/turmas.obter`
 * ja recusa a turma em si; esta consulta recusa os mapas dela pelo mesmo
 * criterio, para as duas portas fecharem sozinhas.
 *
 * Devolve no mesmo formato de `assessmentsVisiveis`, entao a tela de detalhe
 * reaproveita `TabelaAssessments` sem uma segunda conversao.
 */
export async function assessmentsDaTurma(turmaId: string): Promise<Assessment[]> {
  const sessao = await exigirSessao("assessments");

  const linhas = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.turma_id, turmaId),
        eq(assessments.is_deleted, false),
        sessao.papel === "admin" ? undefined : eq(assessments.facilitador_id, sessao.userId),
      ),
    )
    .orderBy(desc(assessments.created_at));

  const comNarrativa = await comNarrativaGravada(linhas);
  return linhas.map((linha) => paraAssessment(linha, comNarrativa));
}

/** Os facilitadores, para o painel do admin. */
export async function listarFacilitadores(): Promise<Facilitador[]> {
  await exigirSessao("usuarios");

  const linhas = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.is_deleted, false), eq(usuarios.papel, "facilitador")))
    .orderBy(desc(usuarios.created_at));

  return linhas.map(paraFacilitador);
}

function paraTransacao(linha: typeof creditosTransacoes.$inferSelect): Transacao {
  return {
    id: linha.id,
    facilitadorId: linha.usuario_id,
    tipo: linha.tipo,
    quantidade: linha.quantidade,
    valorCobrado: linha.valor_cobrado,
    descricao: linha.descricao,
    data: data(linha.created_at),
  };
}

/** Extrato de creditos de todos os parceiros, do mais novo ao mais antigo. */
export async function listarTransacoes(): Promise<Transacao[]> {
  await exigirSessao("usuarios");

  const linhas = await db
    .select()
    .from(creditosTransacoes)
    .where(eq(creditosTransacoes.is_deleted, false))
    .orderBy(desc(creditosTransacoes.created_at));

  return linhas.map(paraTransacao);
}

/**
 * Extrato de quem esta logado.
 *
 * Existe separada de `listarTransacoes` de proposito: aquela e do admin e
 * devolve o extrato de todos os parceiros. O recorte por dono vai no WHERE,
 * como em `assessmentsVisiveis` — filtrar depois da consulta significaria
 * carregar o extrato da plataforma inteira para mostrar o de uma conta, e
 * bastaria um `.filter` esquecido para o dinheiro de um parceiro aparecer na
 * tela de outro.
 *
 * Nao ha excecao para o admin aqui: esta e a tela "meus creditos", e o extrato
 * dele e o dele. Para ver o dos outros existe /admin/creditos.
 */
export async function transacoesDaConta(): Promise<Transacao[]> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  const linhas = await db
    .select()
    .from(creditosTransacoes)
    .where(
      and(
        eq(creditosTransacoes.is_deleted, false),
        eq(creditosTransacoes.usuario_id, sessao.userId),
      ),
    )
    .orderBy(desc(creditosTransacoes.created_at));

  return linhas.map(paraTransacao);
}

/** A conta de quem esta logado: saldo e dados do cabecalho das telas. */
export async function contaAtual(): Promise<Facilitador> {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  const [linha] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .limit(1);

  if (!linha) throw new Error("Usuario da sessao nao encontrado");

  return paraFacilitador(linha);
}

/**
 * A tela de degustacao de quem esta logado: saldo de amostras e qual nivel de
 * relatorio ele oferece.
 *
 * Separada de `contaAtual` porque a `Facilitador` que ela devolve e o formato
 * que TODAS as telas de gestao consomem — inflar aquele tipo com dois campos
 * que so uma tela usa faria a tabela do admin carregar informacao que ela nao
 * mostra.
 *
 * `utilizadas` e DERIVADA, e nao um contador gravado: o saldo nasce do DEFAULT
 * da coluna e so desce (cada degustacao consome exatamente 1), entao concedido
 * menos saldo e o numero exato. Um contador proprio seria a mesma conta
 * guardada duas vezes, com a chance de as duas divergirem. Ver o porque de nao
 * haver extrato de degustacao em `schema/usuarios.ts`.
 */
export async function degustacaoDaConta() {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  const [linha] = await db
    .select({
      saldo: usuarios.creditos_degustacao,
      relatorio: usuarios.degustacao_relatorio,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .limit(1);

  if (!linha) throw new Error("Usuario da sessao nao encontrado");

  return {
    saldo: linha.saldo,
    relatorio: linha.relatorio,
    concedidas: DEGUSTACOES_INICIAIS,
    utilizadas: DEGUSTACOES_INICIAIS - linha.saldo,
  };
}

/**
 * Os indicadores do topo do painel do parceiro.
 *
 * Os tres numeros vinham de um arquivo fixo (`data/creditos.ts`, ja removido):
 * 227 clientes, 42h26 de devolutiva e um faturamento que ninguem calculava.
 * Eram o mesmo defeito ja corrigido no credito e na degustacao — numero
 * inventado ao lado de numero real, na mesma tela, sem como a pessoa saber
 * qual valia. As duas tabelas existem desde a migration 0008; era so ler.
 *
 * FATURAMENTO NAO ENTRA, E NAO E ESQUECIMENTO: a plataforma nao sabe por
 * quanto o parceiro revende. `precos_relatorios.revenda_min/max` e faixa
 * SUGERIDA, nao cobranca. Um cartao de receita aqui so poderia mostrar zero
 * para sempre ou um numero inventado. No lugar dele vai o mapa concluido, que
 * e o trabalho entregue e sai da mesma tabela que a lista da tela ao lado.
 *
 * Tres COUNT numa consulta so seria um join de tres tabelas sem relacao entre
 * si, multiplicando linha. Sao tres consultas curtas, cada uma sobre o proprio
 * indice de dono, disparadas juntas.
 */
export async function resumoDaOperacao() {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  // O admin ve a plataforma inteira; o parceiro, so o que e dele. Mesmo
  // recorte das outras leituras deste arquivo.
  const doAdmin = sessao.papel === "admin";

  const [carteira, sessoes, mapas] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(clientes)
      .where(
        and(
          eq(clientes.is_deleted, false),
          doAdmin ? undefined : eq(clientes.facilitador_id, sessao.userId),
        ),
      ),
    db
      .select({
        // `finalizada_em` preenchido e a definicao de finalizada — nao ha
        // coluna de situacao. Ver o cabecalho de `schema/devolutivas.ts`.
        total: sql<number>`count(*) filter (where ${devolutivas.finalizada_em} is not null)::int`,
        segundos: sql<number>`coalesce(sum(${devolutivas.duracao_segundos}), 0)::int`,
      })
      .from(devolutivas)
      .where(
        and(
          eq(devolutivas.is_deleted, false),
          doAdmin ? undefined : eq(devolutivas.facilitador_id, sessao.userId),
        ),
      ),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(assessments)
      .where(
        and(
          eq(assessments.is_deleted, false),
          eq(assessments.situacao, "concluido"),
          doAdmin ? undefined : eq(assessments.facilitador_id, sessao.userId),
        ),
      ),
  ]);

  const segundos = sessoes[0]?.segundos ?? 0;

  return {
    clientes: carteira[0]?.total ?? 0,
    devolutivasFinalizadas: sessoes[0]?.total ?? 0,
    /** Total cronometrado, no formato "42h26". Zero vira "0h00", e nao "—". */
    devolutivasTempo: `${Math.floor(segundos / 3600)}h${String(
      Math.floor((segundos % 3600) / 60),
    ).padStart(2, "0")}`,
    mapasConcluidos: mapas[0]?.total ?? 0,
  };
}

/**
 * Nome de exibicao por id de facilitador, para a coluna do painel do admin.
 *
 * Uma consulta so para a lista inteira: buscar um por linha faria a tela do
 * admin disparar uma consulta por assessment exibido.
 */
export async function empresasPorId(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};

  const linhas = await db
    .select({ id: usuarios.id, empresa: usuarios.empresa, nome: usuarios.nome })
    .from(usuarios)
    .where(and(inArray(usuarios.id, ids), eq(usuarios.is_deleted, false)));

  return Object.fromEntries(linhas.map((linha) => [linha.id, linha.empresa ?? linha.nome]));
}

/**
 * Situacao do parceiro nos Niveis de Credenciamento, no ciclo vigente.
 *
 * As somas acontecem no banco, com a janela do ciclo no WHERE: o que a tela
 * precisa sao dois totais, e trazer o extrato inteiro para soma-lo aqui viraria
 * uma leitura que cresce todo ano sem que a tela mostre uma linha a mais.
 *
 * Bonus nao entra em "comprados": a regra do programa fala em credito
 * COMPRADO, e bonus e concessao. Contar bonus ali daria categoria a quem
 * recebeu cortesia, que e o oposto do que o programa recompensa.
 */
export async function progressoDoPrograma() {
  const sessao = await getSession();
  if (!sessao) throw new Error("Nao autenticado");

  const [dono] = await db
    .select({ criadoEm: usuarios.created_at })
    .from(usuarios)
    .where(and(eq(usuarios.id, sessao.userId), eq(usuarios.is_deleted, false)))
    .limit(1);

  if (!dono) throw new Error("Usuario da sessao nao encontrado");

  const ciclo = cicloDe(dono.criadoEm, new Date());

  const [totais] = await db
    .select({
      comprados: sql<number>`coalesce(sum(case when ${creditosTransacoes.tipo} = 'compra' then ${creditosTransacoes.quantidade} else 0 end), 0)::int`,
      utilizados: sql<number>`coalesce(sum(case when ${creditosTransacoes.tipo} = 'uso' then abs(${creditosTransacoes.quantidade}) else 0 end), 0)::int`,
    })
    .from(creditosTransacoes)
    .where(
      and(
        eq(creditosTransacoes.is_deleted, false),
        eq(creditosTransacoes.usuario_id, sessao.userId),
        gte(creditosTransacoes.created_at, ciclo.inicio),
        lt(creditosTransacoes.created_at, ciclo.fim),
      ),
    );

  const comprados = totais?.comprados ?? 0;
  const utilizados = totais?.utilizados ?? 0;
  const { atual, proxima } = categoriaAtingida(comprados, utilizados);
  const meta = metaDaBarra(atual, proxima);

  return {
    categoria: atual.name,
    proximaCategoria: proxima?.name ?? null,
    cicloIniciadoEm: data(ciclo.inicio),
    expiraEm: data(ciclo.fim),
    comprados: { atual: comprados, meta: meta.comprados },
    utilizados: { atual: utilizados, meta: meta.utilizados },
    faltam: faltamPara(proxima, comprados, utilizados),
  };
}
