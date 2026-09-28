/**
 * Mapas MC-INV 2.2 de homologacao: um concluido e um pendente.
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
 *
 * Os dois custam credito como qualquer mapa: saldo, extrato e mapa na mesma
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
  usuarios,
} from "./schema";
import caso from "../../../tests/fixtures/caso-demonstracao.json";
import { VERSAO_INSTRUMENTO } from "../../data/inventario-mc";
import { getTipoRelatorio } from "../../data/planos";
import { novoToken } from "../assessment-link";
import { calcularResultado, respostasDasTelas, type TelaGravada } from "../motor";

/** Sentinela do respondente (ver `seed.ts` e `lib/inventario/aplicacao.ts`). */
const RESPONDENTE = "00000000-0000-0000-0000-000000000000";

const ID_CONCLUIDO = "6f2c8a03-4e5b-4d71-9a86-0b3c5d7e9f59";
const ID_PENDENTE = "7a3d9b14-5f6c-4e82-8b97-1c4d6e8f0a6a";
const TIPO = "S4" as const;

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

export async function semearMapasMc(db: NodePgDatabase, donoId: string): Promise<void> {
  const [ja] = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(inArray(assessments.id, [ID_CONCLUIDO, ID_PENDENTE]))
    .limit(1);
  if (ja) {
    console.log("  mapas MC-INV 2.2: ja semeados");
    return;
  }

  const custo = getTipoRelatorio(TIPO).creditos;
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

  const { codigosDoLote } = await import("../codigo-do-mapa");
  const nome = caso.avaliado.nome;
  const tokens = { concluido: novoToken(), pendente: novoToken() };

  const semeado = await db.transaction(async (tx) => {
    const [dono] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, donoId), eq(usuarios.is_deleted, false)))
      .limit(1)
      .for("update");
    if (!dono) return "sem dono" as const;
    if (dono.creditos < 2 * custo) return "sem saldo" as const;

    const [codigoConcluido, codigoPendente] = await codigosDoLote(tx, [nome, nome], concluidoEm);
    const comum = {
      facilitador_id: donoId,
      avaliado_nome: nome,
      avaliado_email: caso.avaliado.email,
      tipo_relatorio: TIPO,
      creditos_usados: custo,
      expira_em: new Date(concluidoEm.getTime() + 7 * 24 * 60 * 60 * 1000),
      versao_instrumento: VERSAO_INSTRUMENTO,
      modified_by: donoId,
    };

    await tx.insert(assessments).values([
      {
        ...comum,
        id: ID_CONCLUIDO,
        token: tokens.concluido,
        codigo: codigoConcluido!,
        situacao: "concluido" as const,
        semente_ordem: randomInt(1, 2 ** 31 - 1),
        consentimento_em: inicio,
        iniciado_em: inicio,
        concluido_em: concluidoEm,
        created_at: inicio,
      },
      { ...comum, id: ID_PENDENTE, token: tokens.pendente, codigo: codigoPendente!, situacao: "pendente" as const },
    ]);

    await tx.insert(assessmentsTelas).values(
      telas.map((t) => ({
        assessment_id: ID_CONCLUIDO,
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
      assessment_id: ID_CONCLUIDO,
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

    await tx.insert(creditosTransacoes).values(
      [ID_CONCLUIDO, ID_PENDENTE].map((id) => ({
        usuario_id: donoId,
        tipo: "uso" as const,
        quantidade: -custo,
        descricao: `Mapa ${TIPO} · ${nome}`,
        assessment_id: id,
        modified_by: donoId,
      })),
    );
    await tx
      .update(usuarios)
      .set({ creditos: dono.creditos - 2 * custo, updated_at: new Date(), modified_by: donoId })
      .where(eq(usuarios.id, donoId));

    return { saldo: dono.creditos - 2 * custo, codigoConcluido, codigoPendente };
  });

  if (semeado === "sem dono" || semeado === "sem saldo") {
    console.log(`  mapas MC-INV 2.2: nao semeados (${semeado} para ${2 * custo} creditos)`);
    return;
  }

  console.log(`  mapas MC-INV 2.2: 2 (${nome}), saldo do dono agora ${semeado.saldo}`);
  console.log(
    `    /relatorio/${tokens.concluido}  (${semeado.codigoConcluido}, concluido, perfil ${resultado.disc.natural.perfil}, confiabilidade ${resultado.validade.confiabilidade}, sem narrativa)`,
  );
  console.log(`    /avaliacao/${tokens.pendente}  (${semeado.codigoPendente}, pendente)`);
}
