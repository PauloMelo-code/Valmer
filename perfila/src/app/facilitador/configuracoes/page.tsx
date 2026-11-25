'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { obterPreferencias, salvarPreferencias } from '@/lib/actions/preferencias'
import { notificacoes } from '@/data/configuracoes'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/** Estado dos canais por notificação: { [id]: { email, whatsapp } }. */
type EstadoCanais = Record<string, { email: boolean; whatsapp: boolean }>

const ESTADO_INICIAL: EstadoCanais = Object.fromEntries(
  notificacoes.map((notificacao) => [
    notificacao.id,
    { email: notificacao.email, whatsapp: notificacao.whatsapp },
  ]),
)

/**
 * Onde as preferências ficam: no SERVIDOR (`usuarios.preferencias_notificacao`).
 * Antes ficavam no navegador, mas o servidor precisa lê-las para decidir se o
 * aviso por e-mail sai (`lib/email/avisos-do-mapa.ts`). Coluna nula = a pessoa
 * nunca salvou, e vale o padrão de `data/configuracoes.ts`.
 */

/**
 * O que veio do servidor, peneirado contra `notificacoes`: só booleano de id
 * conhecido entra; o resto cai no padrão, e nunca `undefined` chega ao Toggle.
 */
function mesclar(guardado: unknown): EstadoCanais {
  if (typeof guardado !== 'object' || guardado === null) return ESTADO_INICIAL

  const cru = guardado as Record<string, { email?: unknown; whatsapp?: unknown } | undefined>

  return Object.fromEntries(
    notificacoes.map((notificacao) => {
      const linha = cru[notificacao.id]
      return [
        notificacao.id,
        {
          email: typeof linha?.email === 'boolean' ? linha.email : notificacao.email,
          whatsapp: typeof linha?.whatsapp === 'boolean' ? linha.whatsapp : notificacao.whatsapp,
        },
      ]
    }),
  )
}

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [canais, setCanais] = useState<EstadoCanais>(ESTADO_INICIAL)

  useEffect(() => {
    obterPreferencias()
      .then((salvas) => setCanais(mesclar(salvas)))
      .catch(() => {
        // Sem leitura a tela abre no padrão; não derruba a página.
      })
  }, [])

  /** Grava no servidor; devolve se gravou, para o aviso dizer só o que aconteceu. */
  async function guardar(novo: EstadoCanais): Promise<boolean> {
    const anterior = canais
    setCanais(novo)
    try {
      const resposta = await salvarPreferencias(novo)
      if (resposta.ok) return true
    } catch {
      // cai no retorno abaixo
    }
    setCanais(anterior)
    return false
  }

  async function alternar(id: string, canal: 'email' | 'whatsapp') {
    const novo = { ...canais, [id]: { ...canais[id]!, [canal]: !canais[id]![canal] } }
    if (!(await guardar(novo))) toast('Não foi possível guardar a preferência. Tente de novo.', 'aviso')
  }

  async function restaurarPadrao() {
    if (await guardar(ESTADO_INICIAL)) toast('Padrão restaurado.')
    else toast('Não foi possível restaurar o padrão. Tente de novo.', 'aviso')
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Preferências de notificação e comunicação."
      />

      <div className={styles.coluna}>
        {/* O e-mail funciona (acesso, convite do mapa e avisos); o WhatsApp
            ainda não: depende de uma integração. */}
        <div className={`${ui.callout} ${ui.calloutWarning}`}>
          <span className={ui.calloutIcon}>
            <Icon name="alert" />
          </span>
          <span className={styles.avisoTexto}>
            O canal de WhatsApp ainda não está ativo: depende de uma integração. As escolhas de
            e-mail já valem e ficam guardadas na sua conta.
          </span>
          <Button
            variant="warning"
            size="sm"
            onClick={() => toast('Integração com WhatsApp ainda não disponível', 'aviso')}
          >
            Configurar
          </Button>
        </div>

        <Card padding="none">
          <CardHeader
            title="Notificações"
            actions={
              <IconButton
                icon="refresh"
                label="Restaurar padrão"
                variant="outline"
                onClick={restaurarPadrao}
              />
            }
          />

          <div className={styles.cabecalho}>
            <span>Notificação</span>
            <span className={styles.centro}>E-mail</span>
            <span className={styles.centro}>WhatsApp</span>
          </div>

          {notificacoes.map((notificacao) => (
            <div key={notificacao.id} className={styles.linha}>
              <div>
                <div className={styles.notificacaoTitulo}>{notificacao.title}</div>
                <div className={styles.notificacaoDesc}>{notificacao.desc}</div>
              </div>
              <div className={styles.centro}>
                <Toggle
                  checked={canais[notificacao.id]!.email}
                  onChange={() => alternar(notificacao.id, 'email')}
                  label={`${notificacao.title} por e-mail`}
                />
              </div>
              <div className={styles.centro}>
                <Toggle
                  checked={canais[notificacao.id]!.whatsapp}
                  onChange={() => alternar(notificacao.id, 'whatsapp')}
                  label={`${notificacao.title} por WhatsApp`}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card padding="none">
          <div className={styles.secaoTitulo}>Comunicações da Impacto Academy</div>
          {/* Esta caixa NÃO é preferência de tela: é um pedido à Impacto
              Academy, e não há para onde mandá-lo. Ficar guardada no navegador
              faria parecer registrado o que ninguém recebeu — pior que o
              aviso. Marcar continua sem efeito, e agora está escrito. */}
          <label className={styles.opcaoEmail}>
            <input type="checkbox" />
            Quero deixar de receber conteúdos e promoções no meu e-mail.
          </label>
          <div className={styles.opcaoEmail}>
            <span className={ui.note}>
              Esta opção ainda não é registrada: a lista de conteúdos é mantida fora da
              plataforma. Para sair dela, responda pedindo o descadastro em qualquer e-mail da
              Impacto Academy.
            </span>
          </div>
        </Card>
      </div>
    </>
  )
}
