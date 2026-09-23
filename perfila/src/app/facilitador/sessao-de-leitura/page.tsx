import { listar as listarMapas } from '@/lib/actions/assessments'
import { listar } from '@/lib/actions/devolutivas'
import { ListaDevolutivas, type ItemDevolutiva, type MapaConcluido } from './ListaDevolutivas'

/**
 * Sessões de leitura do parceiro, agora vindas do banco.
 *
 * Server Component: as consultas acontecem aqui, cada uma com sessão e recorte
 * do dono dentro da própria action, e a interatividade (abrir, finalizar) fica
 * no componente cliente ao lado. Mesmo desenho da lista de grupos de mapeamento.
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

/** hh:mm:ss. Vazio enquanto ninguém parou o relógio, que é o normal da pausada. */
function formatarDuracao(segundos: number | null): string {
  if (segundos === null) return ''
  const partes = [Math.floor(segundos / 3600), Math.floor(segundos / 60) % 60, segundos % 60]
  return partes.map((parte) => String(parte).padStart(2, '0')).join(':')
}

export default async function DevolutivaPage() {
  // Os mapas são lidos junto porque a tela precisa deles de qualquer jeito: é
  // deles que sai o seletor de abertura. O e-mail e o nível do relatório saem
  // daí também — `devolutivas.listar` devolve só o nome do avaliado, e uma
  // terceira consulta para buscar o que já está em memória não se paga.
  const [devolutivas, mapas] = await Promise.all([listar(), listarMapas()])
  const porMapa = new Map(mapas.map((mapa) => [mapa.id, mapa]))

  const itens: ItemDevolutiva[] = devolutivas.map((devolutiva) => {
    const mapa = porMapa.get(devolutiva.assessment_id)
    return {
      id: devolutiva.id,
      nome: devolutiva.avaliado_nome,
      // O mapa pode ter sido excluído (lógico) depois da sessão aberta: a lista
      // de mapas não traz os excluídos e a devolutiva continua viva.
      email: mapa?.avaliado_email ?? '—',
      tipo: mapa?.tipo_relatorio ?? null,
      // Não há coluna de situação: `finalizada_em` preenchida é o estado, e o
      // rótulo vem derivado do SQL da action.
      finalizada: devolutiva.situacao === 'Finalizada',
      tempo: formatarDuracao(devolutiva.duracao_segundos),
      criadaEm: DATA_HORA_BR.format(devolutiva.created_at),
      abertaEm: devolutiva.created_at.getTime(),
      atualizadaEm: devolutiva.updated_at,
    }
  })

  // Uma devolutiva por mapa: o mapa que já tem sessão sai do seletor. Não é
  // garantia — o banco não impede a segunda linha —, é a tela não oferecer o
  // duplicado óbvio. Quem recusa de verdade é a action, que confere o dono.
  const jaTemSessao = new Set(devolutivas.map((devolutiva) => devolutiva.assessment_id))
  const concluidos: MapaConcluido[] = mapas
    .filter((mapa) => mapa.situacao === 'concluido' && !jaTemSessao.has(mapa.id))
    .map((mapa) => ({
      id: mapa.id,
      // A data entra no rótulo para desempatar: o Select devolve o TEXTO
      // escolhido, e o mesmo avaliado pode ter dois mapas do mesmo nível.
      rotulo: `${mapa.avaliado_nome} · ${mapa.tipo_relatorio} · ${DATA_HORA_BR.format(
        mapa.concluido_em ?? mapa.created_at,
      )}`,
    }))

  return <ListaDevolutivas itens={itens} concluidos={concluidos} />
}
