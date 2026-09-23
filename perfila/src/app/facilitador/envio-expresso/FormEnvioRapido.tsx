'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { AutoGrid } from '@/components/ui/Layout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { criarLotePelaTela } from '@/lib/actions/envio-lote'
import { opcoes } from '@/data/opcoes'
import type { CodigoRelatorio } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

const ABAS = ['Envio de passaporte', 'Histórico'] as const

export type TurmaDestino = {
  id: string
  /** Nome com o nível junto, desempatado quando dois nomes se repetem. */
  rotulo: string
  nome: string
  tipo: CodigoRelatorio
  /** Créditos que UM passaporte desta turma consome. */
  custo: number
}

type Destinatario = { avaliado_nome: string; avaliado_email: string }

/**
 * O formulário do envio expresso.
 *
 * A lista de destinatários vive no cliente até o clique em "Enviar": é assim
 * que o lote inteiro chega à action de uma vez, e é isso que permite o
 * tudo-ou-nada. Gravar um por um enquanto a pessoa digita entregaria meia
 * turma quando o saldo acabasse no meio — o pior resultado possível aqui,
 * porque o parceiro não saberia quem recebeu (ver `actions/envio-lote.ts`).
 *
 * O saldo e o custo mostrados são os do momento em que a tela abriu, e servem
 * para orientar. Quem cobra é a action, que relê o saldo com a linha do dono
 * travada dentro da mesma transação que grava os mapas — por isso o envio
 * ainda pode ser recusado com a conta aparentemente fechando: o crédito pode
 * ter sido gasto em outra aba.
 */
export function FormEnvioRapido({
  turmas,
  saldo,
}: {
  turmas: TurmaDestino[]
  saldo: number
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<(typeof ABAS)[number]>('Envio de passaporte')
  const [turma, setTurma] = useState<TurmaDestino | null>(turmas[0] ?? null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [lista, setLista] = useState<Destinatario[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()

  const custoTotal = (turma?.custo ?? 0) * lista.length
  const cabeNoSaldo = custoTotal <= saldo

  function adicionar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    const limpo = { avaliado_nome: nome.trim(), avaliado_email: email.trim().toLowerCase() }

    // O e-mail repetido é recusado aqui E na action. Aqui porque o lote é
    // montado às cegas e a pessoa merece descobrir na hora de digitar; lá
    // porque a tela é conveniência e o POST direto passa por cima dela.
    if (lista.some((item) => item.avaliado_email === limpo.avaliado_email)) {
      setErro(`${limpo.avaliado_email} já está na lista deste envio.`)
      return
    }

    setLista((atual) => [...atual, limpo])
    setNome('')
    setEmail('')
  }

  function remover(indice: number) {
    setLista((atual) => atual.filter((_, posicao) => posicao !== indice))
  }

  function enviar() {
    setErro(null)

    iniciarEnvio(async () => {
      const resposta = await criarLotePelaTela({
        turma_id: turma?.id,
        destinatarios: lista,
      })

      // A recusa vem como objeto justamente para ser mostrada aqui, com a
      // lista preenchida do lado: saldo insuficiente e e-mail repetido são
      // coisas que a pessoa corrige e tenta de novo, e perder os
      // destinatários digitados no caminho seria o segundo prejuízo.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      const { criados, creditos, turma: nomeDaTurma } = resposta.dado
      setLista([])
      // Vai para a turma porque o produto deste envio são os LINKS: é lá que
      // eles estão, um por avaliado, prontos para copiar.
      router.push(`/facilitador/grupos-de-mapeamento/${turma!.id}`)
      // "Gerado", não "enviado": os créditos saíram e os links existem, mas
      // quem entrega é a pessoa — não há provedor de e-mail contratado.
      toast(
        `${criados} passaporte(s) gerado(s) no grupo "${nomeDaTurma}" · ${creditos} crédito(s). Copie os links abaixo e envie por fora.`,
      )
    })
  }

  return (
    <>
      <PageHeader
        title="Envio Expresso"
        subtitle="Envie passaportes para um grupo de mapeamento existente ou crie um novo em segundos."
      />

      <AutoGrid min={300} alignStart>
        <Card padding="none" className={styles.cardBusca}>
          <div className={styles.busca}>
            <span className={styles.buscaLabel}>Grupo de mapeamento</span>
            <div className={styles.buscaLinha}>
              <div className={styles.buscaCampo}>
                {turmas.length > 0 ? (
                  <Select
                    label="Grupo de mapeamento que vai receber os passaportes"
                    options={turmas.map((item) => item.rotulo)}
                    value={turma?.rotulo ?? ''}
                    onChange={(rotulo) =>
                      setTurma(turmas.find((item) => item.rotulo === rotulo) ?? null)
                    }
                  />
                ) : (
                  <span className={ui.note}>
                    Você ainda não tem grupos de mapeamento. Crie um para poder enviar
                    passaportes.
                  </span>
                )}
              </div>
              <Button
                href="/facilitador/grupos-de-mapeamento/nova"
                icon={<Icon name="plus" />}
                className={styles.buscaBotao}
              >
                Novo grupo
              </Button>
            </div>
          </div>

          <div className={styles.corpo}>
            <div className={styles.abas} role="tablist">
              {ABAS.map((aba) => (
                <button
                  key={aba}
                  type="button"
                  role="tab"
                  aria-selected={aba === abaAtiva}
                  className={[styles.aba, aba === abaAtiva ? styles.abaAtiva : null]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setAbaAtiva(aba)}
                >
                  {aba}
                </button>
              ))}
            </div>

            <div className={`${ui.callout} ${ui.calloutInfo}`}>
              <span className={ui.calloutIcon}>
                <Icon name="info" />
              </span>
              <span>
                Importe um arquivo <b>.csv</b> ou <b>.xlsx</b> com as colunas <b>email</b> e{' '}
                <b>nome</b>, ou adicione destinatários um a um abaixo.
              </span>
            </div>

            {/* Formulário próprio: o Enter dentro dos campos adiciona à lista,
                que é a ação daqui. Enviar o lote é o botão do rodapé, fora
                deste form, para que uma tecla distraída não gaste crédito. */}
            <form onSubmit={adicionar}>
              <div className={styles.campos}>
                <Field label="E-mail">
                  {(id) => (
                    <Input
                      id={id}
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                    />
                  )}
                </Field>
                <Field label="Nome">
                  {(id) => (
                    <Input
                      id={id}
                      placeholder="Nome completo"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      required
                    />
                  )}
                </Field>
                <Field label="Idioma">
                  {(id) => <Select id={id} options={opcoes.idioma} label="Idioma" />}
                </Field>
              </div>

              <div className={styles.acoes}>
                <Button type="submit" variant="primary" icon={<Icon name="plus" />}>
                  Adicionar
                </Button>
                <Button
                  icon={<Icon name="upload" />}
                  onClick={() => toast('Importação de planilha ainda não disponível', 'aviso')}
                >
                  Importar planilha
                </Button>
              </div>
            </form>

            {lista.length === 0 ? (
              <EmptyState variant="dashed">Nenhum destinatário adicionado ainda.</EmptyState>
            ) : (
              <ul className={styles.destinatarios}>
                {lista.map((destinatario, indice) => (
                  <li key={destinatario.avaliado_email} className={styles.destinatario}>
                    <span>
                      <span className={styles.destinatarioNome}>{destinatario.avaliado_nome}</span>
                      <span className={ui.note}> · {destinatario.avaliado_email}</span>
                    </span>
                    <IconButton
                      icon="trash"
                      tone="danger"
                      label={`Tirar ${destinatario.avaliado_email} da lista`}
                      onClick={() => remover(indice)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Região viva permanente: a recusa chega depois do clique, longe
                de onde se olha, e criada junto com o texto o leitor de tela não
                a anuncia. Mesmo padrão do formulário de novo mapa. */}
            <div role="status" aria-live="polite">
              {erro ? (
                <div className={`${ui.callout} ${ui.calloutWarning}`}>
                  <span className={ui.calloutIcon}>
                    <Icon name="alert" />
                  </span>
                  <span>{erro}</span>
                </div>
              ) : null}
              {lista.length > 0 && !cabeNoSaldo ? (
                <div className={`${ui.callout} ${ui.calloutWarning}`}>
                  <span className={ui.calloutIcon}>
                    <Icon name="alert" />
                  </span>
                  <span>
                    Faltam {custoTotal - saldo} crédito(s) para este lote. Ou todos os passaportes
                    saem, ou nenhum sai — tire destinatários da lista ou compre créditos.
                  </span>
                </div>
              ) : null}
            </div>

            <div className={styles.acoes}>
              {/* Envelope não: este botão gasta crédito e CRIA os links, não
                  manda e-mail nenhum. O ícone é a primeira promessa que a tela
                  faz, e era a única que continuava dizendo "vai por e-mail"
                  depois de o texto e o toast já terem sido corrigidos. */}
              <Button
                variant="primary"
                icon={<Icon name="link" />}
                onClick={enviar}
                disabled={lista.length === 0 || !turma || !cabeNoSaldo || enviando}
              >
                {enviando
                  ? 'Gerando…'
                  : `Gerar ${lista.length} passaporte(s) · ${custoTotal} crédito(s)`}
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.ajuda}>
          <div className={ui.cardTitle}>Como funciona</div>
          <ol className={styles.passos}>
            <li>Escolha ou crie o grupo que receberá os passaportes.</li>
            <li>Adicione destinatários manualmente ou por planilha.</li>
            <li>
              O nível do grupo define o relatório e o preço: cada passaporte
              {turma ? ` deste grupo consome ${turma.custo} crédito(s).` : ' consome créditos.'}
            </li>
            <li>O lote é tudo-ou-nada: se o saldo não cobrir todos, nenhum é gerado.</li>
            {/* O nome da tela promete envio desde o protótipo, mas quem
                entrega o link ainda é a pessoa: não há provedor de e-mail
                contratado. Dizer isso aqui evita que alguém feche a tela
                achando que os passaportes já saíram. */}
            <li>
              A plataforma ainda não envia e-mail: os links ficam no grupo, prontos para copiar e
              enviar por fora.
            </li>
          </ol>
          <div className={styles.saldo}>
            <span className={styles.saldoLabel}>Saldo disponível</span>
            <span className={styles.saldoValor}>{saldo} créditos</span>
          </div>
          <div className={styles.saldo}>
            <span className={styles.saldoLabel}>Este lote consome</span>
            <span className={styles.saldoValor}>{custoTotal} créditos</span>
          </div>
        </Card>
      </AutoGrid>
    </>
  )
}
