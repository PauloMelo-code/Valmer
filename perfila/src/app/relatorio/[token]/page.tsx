import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { CapaResumo } from '@/components/relatorio/CapaResumo'
import { DocumentoMC } from '@/components/relatorio-mc/DocumentoMC'
import { VERSAO_INSTRUMENTO } from '@/data/inventario-mc'
import type { CodigoRelatorio } from '@/data/planos'
import { db } from '@/lib/db'
import { assessments, assessmentsResultados, usuarios } from '@/lib/db/schema'
import type { ResultadoMotor } from '@/lib/motor'
import { montarDadosRelatorio } from '@/lib/relatorio-mc/dados'
import { esquemaNarrativaMC } from '@/lib/relatorio-mc/narrativa-esquema'
import { MarcaImpacto, NOME_MARCA } from '@/components/layout/MarcaImpacto'
import { Lideranca } from '@/components/relatorio/Lideranca'
import { Motivadores } from '@/components/relatorio/Motivadores'
import { PlanoFecho } from '@/components/relatorio/PlanoFecho'
import { QuemVoceE } from '@/components/relatorio/QuemVoceE'
import { narrativaParaExibir } from '@/data/narrativa-exemplo'
import { getPerfilEstatico } from '@/data/perfis'
import { carregarRelatorio } from '@/lib/actions/relatorio'
import { resultadoDeContadores } from '@/lib/disc'
import { secoesDoNivel, type DadosRelatorio } from '@/lib/relatorio/tipos'
import { AcoesRelatorio } from './AcoesRelatorio'
import styles from './page.module.css'

const DATA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

/**
 * O relatório assina como Impacto Academy, e desde 10/09/2026 o produto
 * inteiro também: a regra de dois nomes foi revogada. O que este arquivo
 * ainda tem de particular é ser o único artefato que sai da plataforma e
 * chega ao cliente final do facilitador, e é a empresa que responde por
 * ele — por isso a `description` abaixo é própria.
 *
 * A `description` é declarada AQUI de propósito. Não existe
 * `app/relatorio/layout.tsx`, então esta página pendura direto no layout
 * raiz e herdaria dele a descrição institucional do produto.
 *
 * Não há `viewport` próprio. Ele existia para corrigir a cor de tema do
 * navegador enquanto a paleta da Impacto valia só dentro do relatório;
 * agora que ela está em `:root`, o layout raiz já manda a Areia oficial.
 */
export const metadata: Metadata = {
  title: 'Impacto Academy · Relatório de perfil comportamental',
  description:
    'Relatório de perfil comportamental gerado pela Impacto Academy a partir de inventário de quatro fatores.',
}

export default async function RelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  // `?imprimir=1` vem do botao de baixar da lista de mapas. Ele nao muda o
  // documento, so pede que a pagina abra a impressao ao terminar de carregar.
  searchParams: Promise<{ imprimir?: string }>
}) {
  const { token } = await params
  const { imprimir } = await searchParams

  // O corte de versao (ADR-0007 D3) e aqui e so aqui: mapa MC-INV 2.2 abre o
  // relatorio novo; qualquer outro segue exatamente o caminho de antes.
  const mapaMC = await carregarMapaMC(token)
  if (mapaMC) return <RelatorioMCPagina mapa={mapaMC} imprimir={imprimir === '1'} />

  const relatorio = await carregarRelatorio(token)

  // Sem contadores não há resultado, e sem resultado não há relatório:
  // é preferível um 404 a um documento com números inventados.
  if (!relatorio) notFound()

  const resultado = resultadoDeContadores(relatorio.contadores)

  const dados: DadosRelatorio = {
    avaliado: relatorio.avaliado,
    facilitador: relatorio.facilitador,
    emitidoEm: DATA_BR.format(relatorio.emitidoEm),
    tipoRelatorio: relatorio.tipoRelatorio,
    resultado,
    // Sem narrativa gravada o documento NÃO empresta a de outra pessoa: em
    // produção ele sai com as seções escritas marcadas como pendentes, e com
    // tudo que é calculado no lugar. Fora de produção o exemplo entra, para o
    // layout continuar sendo desenvolvido sem chamada paga.
    narrativa: narrativaParaExibir(relatorio.narrativa),
  }

  const perfilPrimario = getPerfilEstatico(resultado.primario)
  const perfilSecundario = getPerfilEstatico(resultado.secundario)

  // O nível contratado decide o que entra: S1 para de propósito antes
  // da liderança, e o plano de desenvolvimento só existe a partir do S3.
  const visiveis = new Set(secoesDoNivel(dados.tipoRelatorio).map((secao) => secao.id))

  // A marca da Impacto Academy vale no produto inteiro desde que a paleta
  // oficial subiu para `:root`, então não há mais tema escopado aqui.
  return (
    <div className={styles.pagina}>
      <div className={styles.acoes}>
        <span className={styles.acoesMarca}>
          <MarcaImpacto size={18} />
          {NOME_MARCA}
        </span>
        <div className={styles.acoesBotoes}>
          <AcoesRelatorio imprimir={imprimir === '1'} />
        </div>
      </div>

      <article className={styles.documento}>
        <CapaResumo
          dados={dados}
          perfilPrimario={perfilPrimario}
          perfilSecundario={perfilSecundario}
        />

        <QuemVoceE narrativa={dados.narrativa} perfil={perfilPrimario} />

        <Motivadores narrativa={dados.narrativa} perfil={perfilPrimario} />

        {/* As três seções de `Lideranca` entram em níveis diferentes, então
            o corte é feito lá dentro, por seção. Aqui só evitamos montar o
            componente quando nenhuma das três entra. */}
        {visiveis.has('encaixe') || visiveis.has('lideranca') ? (
          <Lideranca
            narrativa={dados.narrativa}
            perfil={perfilPrimario}
            avaliado={dados.avaliado}
            mostrarEncaixe={visiveis.has('encaixe')}
            mostrarLideranca={visiveis.has('lideranca')}
          />
        ) : null}

        <PlanoFecho dados={dados} perfil={perfilPrimario} mostrarPlano={visiveis.has('plano')} />
      </article>
    </div>
  )
}

// ------------------------------------------------------------ MC-INV 2.2

type MapaMC = {
  nome: string
  codigo: string | null
  emitidoEm: Date
  nivel: CodigoRelatorio
  facilitador: string
  /** Null enquanto o motor nao gravou o resultado. */
  resultado: ResultadoMotor | null
  narrativa: unknown
}

/** Null quando o token nao e de um mapa MC-INV 2.2 vivo: a rota segue para o legado. */
async function carregarMapaMC(token: string): Promise<MapaMC | null> {
  const [mapa] = await db
    .select({
      id: assessments.id,
      nome: assessments.avaliado_nome,
      codigo: assessments.codigo,
      situacao: assessments.situacao,
      nivel: assessments.tipo_relatorio,
      concluido_em: assessments.concluido_em,
      created_at: assessments.created_at,
      facilitador: usuarios.nome,
    })
    .from(assessments)
    .innerJoin(usuarios, eq(usuarios.id, assessments.facilitador_id))
    .where(
      and(
        eq(assessments.token, token),
        eq(assessments.is_deleted, false),
        eq(assessments.versao_instrumento, VERSAO_INSTRUMENTO),
      ),
    )
    .limit(1)
  if (!mapa) return null

  // Resultado so vale de mapa concluido: um resultado gravado de um mapa que
  // voltou a pendente nao e o documento de ninguem.
  const [linha] =
    mapa.situacao === 'concluido'
      ? await db
          .select({ resultado: assessmentsResultados.resultado, narrativa: assessmentsResultados.narrativa })
          .from(assessmentsResultados)
          .where(and(eq(assessmentsResultados.assessment_id, mapa.id), eq(assessmentsResultados.is_deleted, false)))
          .limit(1)
      : []

  return {
    nome: mapa.nome,
    codigo: mapa.codigo,
    emitidoEm: mapa.concluido_em ?? mapa.created_at,
    nivel: mapa.nivel,
    facilitador: mapa.facilitador,
    // O JSON e o que o motor devolveu e gravou (secao 7), sem transformacao.
    resultado: (linha?.resultado as ResultadoMotor | undefined) ?? null,
    narrativa: linha?.narrativa ?? null,
  }
}

function RelatorioMCPagina({ mapa, imprimir }: { mapa: MapaMC; imprimir: boolean }) {
  if (!mapa.resultado) {
    // Sem resultado nao ha numero nenhum a mostrar, e a tela diz so o que e
    // verdade: nao promete prazo nem aviso, porque nao existe envio automatico.
    return (
      <div className={styles.pagina}>
        <article className={styles.documento}>
          <h1>Relatório ainda indisponível</h1>
          <p>
            O resultado deste mapa ainda não foi calculado, por isso não há relatório para mostrar. Se você já concluiu o
            questionário, fale com quem enviou o convite.
          </p>
        </article>
      </div>
    )
  }

  // Narrativa fora do formato conta como ausente, como no legado: as paginas
  // mostram o texto da IA como pendente e o calculo continua no lugar.
  const narrativa = esquemaNarrativaMC.safeParse(mapa.narrativa)
  const dados = montarDadosRelatorio({
    assessment: { nome: mapa.nome, codigo: mapa.codigo, emitidoEm: mapa.emitidoEm },
    resultado: mapa.resultado,
    narrativa: narrativa.success ? narrativa.data : null,
    facilitador: { nome: mapa.facilitador },
    nivel: mapa.nivel,
  })

  return (
    <div className={styles.pagina}>
      <div className={styles.acoes}>
        <span className={styles.acoesMarca}>
          <MarcaImpacto size={18} />
          {NOME_MARCA}
        </span>
        <div className={styles.acoesBotoes}>
          <AcoesRelatorio imprimir={imprimir} />
        </div>
      </div>
      {/* Sem wrapper com overflow: o Chrome so imprime a parte visivel de uma
          caixa com rolagem, e o PDF sairia com uma folha. No telefone a A4 rola
          de lado com a propria pagina. */}
      <DocumentoMC dados={dados} />
    </div>
  )
}
