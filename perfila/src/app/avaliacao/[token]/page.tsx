import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { carregarAvaliacao } from '@/lib/actions/avaliacao'
import { estadoDaAplicacao } from '@/lib/inventario/aplicacao'
import ui from '@/styles/common.module.css'
import { Assessment } from './Assessment'
import { InventarioMC } from './mc/InventarioMC'

const DATA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

export default async function AvaliacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const avaliacao = await carregarAvaliacao(token)

  // Token desconhecido é 404: não confirmamos nem negamos a
  // existência de um convite para quem não tem o link.
  if (!avaliacao) notFound()

  if (avaliacao.estado === 'expirado') {
    return (
      <Card padding="lg">
        <div className={`${ui.callout} ${ui.calloutWarning}`}>
          <span className={ui.calloutIcon}>
            <Icon name="alert" />
          </span>
          <span>
            Este link expirou em {DATA_BR.format(avaliacao.expiraEm)}. Peça um novo convite a{' '}
            {avaliacao.facilitador} para responder o mapa comportamental.
          </span>
        </div>
      </Card>
    )
  }

  // Quem já respondeu e reabre o link não pode cair no questionário: responderia
  // as 28 questões de novo só para levar uma recusa no fim. No MC-INV 2.2 o link
  // volta à tela final, onde o relatório fica para abrir e baixar.
  if (avaliacao.estado === 'concluido' && avaliacao.versao !== 'LEGADO') {
    return <InventarioMC token={token} inicial={{ ok: false, erro: 'concluido' }} />
  }
  if (avaliacao.estado === 'concluido') {
    return (
      <Card padding="lg">
        <div className={`${ui.callout} ${ui.calloutInfo}`}>
          <span className={ui.calloutIcon}>
            <Icon name="check" />
          </span>
          <span>
            Você já respondeu este mapa comportamental, {avaliacao.nome.split(' ')[0]}. O relatório
            está com quem enviou o convite.
          </span>
        </div>
      </Card>
    )
  }

  // O corte entre os dois instrumentos (ADR-0007, D3), num lugar so. Um mapa
  // LEGADO recebe a recusa 'legado' e segue no fluxo de sempre; qualquer
  // outra resposta e do inventario novo, que sabe mostrar as proprias
  // recusas. Esta chamada sorteia a semente no primeiro acesso.
  const inventario = await estadoDaAplicacao(token)
  if (inventario.ok || inventario.erro !== 'legado') {
    return <InventarioMC token={token} inicial={inventario} />
  }

  return <Assessment token={token} nome={avaliacao.nome} respostasIniciais={avaliacao.respostas} />
}
