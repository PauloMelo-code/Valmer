/**
 * Mapas MC-INV 2.2 de homologacao: um concluido e um pendente do Valmer, e um
 * concluido da Beatriz num territorio misto.
 *
 * Arquivo proprio, e nao mais um bloco em `seed.ts`, pelo limite de 500
 * linhas. Roda DEPOIS dos usuarios, e tambem num banco que ja tinha gente:
 * `seed.ts` para cedo quando ha usuarios, e sem isso nenhum ambiente ja
 * semeado ganharia o mapa novo. Ids fixos tornam a chamada repetivel.
 *
 * O CONCLUIDO e a avaliada ficticia de `tests/fixtures/caso-demonstracao.json`
 * (Adriana Prado), com as 69 telas gravadas e o resultado calculado AQUI pelo
 * motor — o mesmo `calcularResultado` da finalizacao, e nao o "esperado" do
 * arquivo copiado. Fica SEM narrativa: ela sai pelo botao "Gerar relatorio" da
 * lista, o caminho de verdade (mesmo motivo do cabecalho de `seed.ts`).
 *
 * O PENDENTE serve para responder o inventario pelo link. A semente da ordem
 * fica nula: e sorteada no primeiro acesso (`lib/inventario/aplicacao.ts`).
 * E outro avaliado ficticio, e nao a Adriana: linhas de mesmo nome e e-mail em
 * /admin/assessments confundiam quem homologa.
 *
 * O DA BEATRIZ existe porque o Valmer e admin, e o portal do facilitador manda
 * o admin para /admin: sem ele, nenhum facilitador do seed via um mapa novo.
 * Entra no territorio "Empresa Mista" com o legado concluido do Eduardo Salles
 * — o caso de escalas misturadas (MC-INV 2.2 soma 200, legado soma 100). Tem as
 * respostas do caso, com outro nome ficticio.
 *
 * Todos custam credito como qualquer mapa: saldo, extrato e mapa na mesma
 * transacao, com o dono travado, porque a guarda da 0005 confere no COMMIT se
 * o saldo bate com o extrato.
 */
import { randomInt } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  assessments,
  assessmentsResultados,
  assessmentsTelas,
  creditosTransacoes,
  territorios,
  territoriosAssessments,
  usuarios,
} from "./schema";
import caso from "../../../tests/fixtures/caso-demonstracao.json";
import { VERSAO_INSTRUMENTO } from "../../data/inventario-mc";
import { getTipoRelatorio } from "../../data/planos";
import { novoToken } from "../assessment-link";
import { calcularResultado, respostasDasTelas, type TelaGravada } from "../motor";

/** Sentinela do respondente (ver `seed.ts` e `lib/inventario/aplicacao.ts`). */
const RESPONDENTE = "00000000-0000-0000-0000-000000000000";

export const ID_CONCLUIDO = "6f2c8a03-4e5b-4d71-9a86-0b3c5d7e9f59";
const ID_PENDENTE = "7a3d9b14-5f6c-4e82-8b97-1c4d6e8f0a6a";
const ID_DA_BEATRIZ = "8b4eac25-6a7d-4f93-9ca8-2d5e7f9a1b7b";
const ID_TERRITORIO_MISTO = "9c5fbd36-7b8e-4a04-8db9-3e6f8a0b2c8c";
const TIPO = "S4" as const;
const CUSTO = getTipoRelatorio(TIPO).creditos;

type Avaliado = { nome: string; email: string };
const PENDENTE: Avaliado = { nome: "Otávio Ramos", email: "otavio.ramos@example.com" };
const DA_BEATRIZ: Avaliado = { nome: "Helena Vasconcelos", email: "helena.vasconcelos@example.com" };

type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

const SEGUNDOS_POR_TELA = 14;
const dois = (n: number) => String(n).padStart(2, "0");

/**
 * As respostas do caso viram as 69 telas como o navegador as gravaria.
 *
 * O lado do polo A na etapa 3 alterna por par, como o sorteio faria, e o botao
 * exibido sai dele pela regra da secao 23 (esquerda: 3 - botao). Tempos de 14 s
 * por tela: cerca de 16 min no total, dentro da faixa de V1, sem pressa (V2).
 */
function telasDoCaso(inicio: Date): TelaGravada[] {
  type Grupos = Record<string, Record<string, number>>;
  const ordem = (grupo: Record<string, number>) =>
    Object.keys(grupo).sort((a, b) => grupo[a]! - grupo[b]!);
  const disc = (etapa: number, grupos: Grupos) =>
    Object.entries(grupos).map(([n, g]) => ({ etapa, tela: `G${dois(Number(n))}`, ordem_final: ordem(g) }));

  const brutas = [
    ...disc(1, caso.respostas.natural),
    ...disc(2, caso.respostas.adaptado),
    ...(["EI", "NS", "TF"] as const).flatMap((eixo) =>
      caso.respostas.jung[eixo].map((poloA, i) => {
        const lado = i % 2 === 0 ? ("esquerda" as const) : ("direita" as const);
        return {
          etapa: 3,
          tela: `${eixo}${dois(i + 1)}`,
          lado_polo_a: lado,
          resposta_exibida: lado === "esquerda" ? 3 - poloA : poloA,
          resposta_polo_a: poloA,
        };
      }),
    ),
    ...Object.entries(caso.respostas.valores as Grupos).map(([n, g]) => ({
      etapa: 4,
      tela: `V${dois(Number(n))}`,
      ordem_final: ordem(g),
    })),
  ];

  return brutas.map((tela, i) => ({
    ...tela,
    moveu_item: true,
    entrou_em: new Date(inicio.getTime() + i * SEGUNDOS_POR_TELA * 1000),
    saiu_em: new Date(inicio.getTime() + (i + 1) * SEGUNDOS_POR_TELA * 1000 - 500),
  }));
}

/** As 69 telas do caso e o resultado do motor, com a guarda de sanidade. */
function concluirCaso() {
  const concluidoEm = new Date();
  const inicio = new Date(concluidoEm.getTime() - 69 * SEGUNDOS_POR_TELA * 1000 - 60_000);
  const telas = telasDoCaso(inicio);
  const resultado = calcularResultado(respostasDasTelas(telas), telas);

  // Guarda de sanidade: se o motor ou o caso mudarem e discordarem, o seed
  // para aqui em vez de gravar uma demonstracao que o relatorio-modelo nao descreve.
  if (resultado.disc.natural.perfil !== caso.esperado.natural.perfil) {
    throw new Error(
      `caso-demonstracao: o motor deu ${resultado.disc.natural.perfil}, o caso espera ${caso.esperado.natural.perfil}`,
    );
  }
  return { concluidoEm, inicio, telas, resultado };
}

type Caso = ReturnType<typeof concluirCaso>;

/** As colunas de um mapa MC-INV 2.2 do seed, pendente. */
function mapa(id: string, donoId: string, avaliado: Avaliado, token: string, codigo: string, desde: Date) {
  return {
    id,
    token,
    codigo,
    facilitador_id: donoId,
    avaliado_nome: avaliado.nome,
    avaliado_email: avaliado.email,
    tipo_relatorio: TIPO,
    situacao: "pendente" as "pendente" | "concluido",
    creditos_usados: CUSTO,
    expira_em: new Date(desde.getTime() + 7 * 24 * 60 * 60 * 1000),
    versao_instrumento: VERSAO_INSTRUMENTO,
    modified_by: donoId,
  };
}

/** O que muda num mapa concluido: situacao, consentimento e datas. */
function fechado({ inicio, concluidoEm }: Caso) {
  return {
    situacao: "concluido" as const,
    semente_ordem: randomInt(1, 2 ** 31 - 1),
    consentimento_em: inicio,
    iniciado_em: inicio,
    concluido_em: concluidoEm,
    created_at: inicio,
  };
}

/** As 69 telas e o resultado do motor de um mapa concluido. */
async function gravarTelasEResultado(tx: Tx, id: string, { telas, resultado }: Caso): Promise<void> {
  await tx.insert(assessmentsTelas).values(
    telas.map((t) => ({
      assessment_id: id,
      etapa: t.etapa,
      tela: t.tela,
      ordem_final: t.ordem_final ? [...t.ordem_final] : null,
      lado_polo_a: "lado_polo_a" in t ? (t.lado_polo_a as "esquerda" | "direita") : null,
      resposta_exibida: t.resposta_exibida ?? null,
      resposta_polo_a: t.resposta_polo_a ?? null,
      moveu_item: t.moveu_item,
      entrou_em: t.entrou_em as Date,
      saiu_em: t.saiu_em as Date,
      versao_instrumento: VERSAO_INSTRUMENTO,
      modified_by: RESPONDENTE,
    })),
  );

  const { natural, adaptado } = resultado.disc;
  await tx.insert(assessmentsResultados).values({
    assessment_id: id,
    versao_instrumento: VERSAO_INSTRUMENTO,
    versao_motor: resultado.versao_motor,
    resultado,
    nat_d: natural.escore.D,
    nat_i: natural.escore.I,
    nat_s: natural.escore.S,
    nat_c: natural.escore.C,
    ada_d: adaptado.escore.D,
    ada_i: adaptado.escore.I,
    ada_s: adaptado.escore.S,
    ada_c: adaptado.escore.C,
    perfil_natural: natural.perfil,
    perfil_adaptado: adaptado.perfil,
    tipo_jung: resultado.jung.tipo,
    confiabilidade: resultado.validade.confiabilidade,
    modified_by: RESPONDENTE,
  });
}

/** O dono travado ate o COMMIT, ou nulo sem dono ou sem saldo para `n` mapas. */
async function travarDono(tx: Tx, donoId: string, n: number) {
  const [dono] = await tx
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.id, donoId), eq(usuarios.is_deleted, false)))
    .limit(1)
    .for("update");
  return dono && dono.creditos >= n * CUSTO ? dono : null;
}

/** Extrato e saldo dos mapas ja gravados (o extrato tem FK para o mapa). */
async function debitar(
  tx: Tx,
  dono: { id: string; creditos: number },
  mapas: { id: string; nome: string }[],
): Promise<number> {
  await tx.insert(creditosTransacoes).values(
    mapas.map(({ id, nome }) => ({
      usuario_id: dono.id,
      tipo: "uso" as const,
      quantidade: -CUSTO,
      descricao: `Mapa ${TIPO} · ${nome}`,
      assessment_id: id,
      modified_by: dono.id,
    })),
  );
  const saldo = dono.creditos - mapas.length * CUSTO;
  await tx
    .update(usuarios)
    .set({ creditos: saldo, updated_at: new Date(), modified_by: dono.id })
    .where(eq(usuarios.id, dono.id));
  return saldo;
}

async function jaSemeado(db: NodePgDatabase, ids: string[]): Promise<boolean> {
  const [linha] = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(inArray(assessments.id, ids))
    .limit(1);
  return linha !== undefined;
}

export async function semearMapasMc(db: NodePgDatabase, donoId: string): Promise<void> {
  if (await jaSemeado(db, [ID_CONCLUIDO, ID_PENDENTE])) {
    console.log("  mapas MC-INV 2.2: ja semeados");
    return;
  }

  const feito = concluirCaso();
  const { codigosDoLote } = await import("../codigo-do-mapa");
  const nome = caso.avaliado.nome;
  const tokens = { concluido: novoToken(), pendente: novoToken() };

  const semeado = await db.transaction(async (tx) => {
    const dono = await travarDono(tx, donoId, 2);
    if (!dono) return null;

    const [codigoConcluido, codigoPendente] = await codigosDoLote(
      tx,
      [nome, PENDENTE.nome],
      feito.concluidoEm,
    );
    await tx.insert(assessments).values([
      {
        ...mapa(ID_CONCLUIDO, donoId, caso.avaliado, tokens.concluido, codigoConcluido!, feito.concluidoEm),
        ...fechado(feito),
      },
      mapa(ID_PENDENTE, donoId, PENDENTE, tokens.pendente, codigoPendente!, feito.concluidoEm),
    ]);
    await gravarTelasEResultado(tx, ID_CONCLUIDO, feito);
    const saldo = await debitar(tx, dono, [
      { id: ID_CONCLUIDO, nome },
      { id: ID_PENDENTE, nome: PENDENTE.nome },
    ]);
    return { saldo, codigoConcluido, codigoPendente };
  });

  if (!semeado) {
    console.log(`  mapas MC-INV 2.2: nao semeados (sem dono ou sem saldo para ${2 * CUSTO} creditos)`);
    return;
  }

  console.log(`  mapas MC-INV 2.2: 2 (${nome}, ${PENDENTE.nome}), saldo do dono agora ${semeado.saldo}`);
  console.log(
    `    /relatorio/${tokens.concluido}  (${semeado.codigoConcluido}, concluido, perfil ${feito.resultado.disc.natural.perfil}, confiabilidade ${feito.resultado.validade.confiabilidade}, sem narrativa)`,
  );
  console.log(`    /avaliacao/${tokens.pendente}  (${semeado.codigoPendente}, pendente)`);
}

/**
 * O mapa concluido da Beatriz e o territorio "Empresa Mista" dela: esse mapa e
 * o legado concluido `legadoId` (Eduardo Salles). Fora de `semearMapasMc`
 * porque depende dos usuarios e mapas de `seed.ts`, e o teste de
 * `perfil-do-mapa` chama aquele com um dono proprio.
 */
export async function semearTerritorioMisto(
  db: NodePgDatabase,
  donoId: string,
  legadoId: string,
): Promise<void> {
  if (await jaSemeado(db, [ID_DA_BEATRIZ])) {
    console.log("  territorio misto: ja semeado");
    return;
  }

  const feito = concluirCaso();
  const { codigosDoLote } = await import("../codigo-do-mapa");
  const token = novoToken();

  const semeado = await db.transaction(async (tx) => {
    const dono = await travarDono(tx, donoId, 1);
    if (!dono) return null;

    const [codigo] = await codigosDoLote(tx, [DA_BEATRIZ.nome], feito.concluidoEm);
    await tx.insert(assessments).values({
      ...mapa(ID_DA_BEATRIZ, donoId, DA_BEATRIZ, token, codigo!, feito.concluidoEm),
      ...fechado(feito),
    });
    await gravarTelasEResultado(tx, ID_DA_BEATRIZ, feito);
    const saldo = await debitar(tx, dono, [{ id: ID_DA_BEATRIZ, nome: DA_BEATRIZ.nome }]);

    await tx.insert(territorios).values({
      id: ID_TERRITORIO_MISTO,
      facilitador_id: donoId,
      nome: "Empresa Mista",
      slug: "empresa-mista",
      descricao: "Demonstração: um inventário MC-INV 2.2 e um do questionário antigo.",
      modified_by: donoId,
    });
    await tx.insert(territoriosAssessments).values(
      [ID_DA_BEATRIZ, legadoId].map((assessment_id) => ({
        territorio_id: ID_TERRITORIO_MISTO,
        assessment_id,
        facilitador_id: donoId,
        modified_by: donoId,
      })),
    );
    return { saldo, codigo };
  });

  if (!semeado) {
    console.log(`  territorio misto: nao semeado (sem dona ou sem saldo para ${CUSTO} creditos)`);
    return;
  }
  console.log(`  territorio misto: "Empresa Mista" (${DA_BEATRIZ.nome} + legado), saldo da dona agora ${semeado.saldo}`);
  console.log(`    /relatorio/${token}  (${semeado.codigo}, concluido)`);
}
