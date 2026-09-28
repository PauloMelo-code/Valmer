import { notFound } from 'next/navigation'

import { ROTULO_SITUACAO } from '@/data/facilitadores'
import { detalhe } from '@/lib/actions/territorios'
import { inventariosDisponiveis } from '@/lib/actions/territorios-vinculos'
import { listar as listarGrupos } from '@/lib/actions/turmas'
import { assessmentsVisiveis } from '@/lib/painel'
import { initials } from '@/lib/text'
import { DnaDetalhe, type LinhaDoTerritorio } from './DnaDetalhe'

/**
 * Um território aberto pelo endereço dele, vindo do banco.
 *
 * Server Component: as leituras já vêm com o recorte por dono no WHERE, e o
 * `notFound()` trata o território de outro parceiro exatamente como o que não
 * existe. Esconder a diferença é o ponto: um 403 confirmaria que aquele nome de
 * empresa é de alguém — e o endereço sai do nome, então é adivinhável.
 *
 * Não há mais `generateStaticParams`: os territórios são linhas do banco, de
 * cada parceiro, e pré-renderizar uma página por empresa serviria a mesma HTML
 * para quem não é o dono.
 *
 * As datas são formatadas aqui, e não no cliente: o servidor roda em UTC e o
 * navegador no fuso de quem abre a tela, então formatar dos dois lados faria a
 * mesma linha aparecer com horas diferentes antes e depois da hidratação.
 */
const DATA_HORA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

const DATA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

/** O dia em `aaaa-mm-dd`, no MESMO fuso da data exibida — ver a lista. */
const DIA_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

export default async function TerritorioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const dados = await detalhe(slug)
  if (!dados) notFound()

  const { territorio, medias, escala, foraDaMedia, respondentes } = dados

  const [disponiveis, mapasVisiveis, grupos] = await Promise.all([
    inventariosDisponiveis(territorio.id),
    assessmentsVisiveis(),
    listarGrupos(),
  ])

  /**
   * Os inventários vinculados que AINDA não foram respondidos.
   *
   * Vem por subtração: `inventariosDisponiveis` é a lista dos mapas do dono que
   * NÃO estão no território, então quem é do dono e não está nela está dentro.
   * O que sobra depois de tirar os respondentes é o pendente — e ele precisa
   * aparecer com nome, ou um vínculo feito por engano numa pessoa que ainda não
   * respondeu não teria linha nenhuma para ser desfeito.
   *
   * O filtro por `facilitadorId` é o que mantém isso correto para o admin, que
   * vê os mapas de todos os parceiros: sem ele, mapa de outro dono entraria na
   * conta como se estivesse vinculado.
   */
  const foraDoTerritorio = new Set(disponiveis.map((mapa) => mapa.id))
  const naMedia = new Set(respondentes.map((pessoa) => pessoa.assessment_id))
  const pendentes = mapasVisiveis.filter(
    (mapa) =>
      mapa.facilitadorId === territorio.facilitador_id &&
      !foraDoTerritorio.has(mapa.id) &&
      !naMedia.has(mapa.id),
  )

  const linhas: LinhaDoTerritorio[] = [
    ...respondentes.map((pessoa) => ({
      assessmentId: pessoa.assessment_id,
      nome: pessoa.nome,
      email: pessoa.email,
      iniciais: pessoa.iniciais,
      perfil: pessoa.perfil,
      versao: pessoa.versao,
      percentuais: { D: pessoa.d, I: pessoa.i, S: pessoa.s, C: pessoa.c },
      respondidoEm: pessoa.respondido_em ? DATA_HORA_BR.format(pessoa.respondido_em) : null,
      dia: pessoa.respondido_em ? DIA_ISO.format(pessoa.respondido_em) : null,
      situacao: ROTULO_SITUACAO.concluido,
    })),
    ...pendentes.map((mapa) => ({
      assessmentId: mapa.id,
      nome: mapa.avaliadoNome,
      email: mapa.avaliadoEmail,
      iniciais: initials(mapa.avaliadoNome),
      perfil: null,
      versao: null,
      percentuais: null,
      respondidoEm: null,
      dia: null,
      situacao: ROTULO_SITUACAO[mapa.situacao],
    })),
  ]

  const subtitulo =
    `${linhas.length} inventário(s) · ${respondentes.length} respondido(s) · ` +
    `criado em ${DATA_BR.format(territorio.created_at)}`

  return (
    <DnaDetalhe
      territorioId={territorio.id}
      nome={territorio.nome}
      descricao={territorio.descricao}
      subtitulo={subtitulo}
      medias={medias}
      escala={escala}
      foraDaMedia={foraDaMedia}
      linhas={linhas}
      disponiveis={disponiveis.map((mapa) => ({
        id: mapa.id,
        nome: mapa.avaliado_nome,
        email: mapa.avaliado_email,
        situacao: ROTULO_SITUACAO[mapa.situacao],
      }))}
      // Só os grupos do dono do território: `vincularGrupo` recusa grupo de
      // outro parceiro, e oferecer ao admin uma lista que a action vai recusar
      // é colocar a recusa depois do clique em vez de antes dele.
      grupos={grupos
        .filter((grupo) => grupo.facilitador_id === territorio.facilitador_id)
        .map((grupo) => ({ id: grupo.id, nome: grupo.nome, total: grupo.total }))}
    />
  )
}
