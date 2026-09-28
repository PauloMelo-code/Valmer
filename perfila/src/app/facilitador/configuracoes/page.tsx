'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
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
 * Onde as preferências ficam: no NAVEGADOR de quem marcou.
 *
 * Não há coluna para isto em `schema/usuarios.ts`, e criar migration não cabe
 * aqui. Guardar no navegador é o que se pode cumprir hoje sem mentir: o toggle
 * sobrevive ao F5 e à volta na semana seguinte, no mesmo computador. Muda de
 * máquina ou limpa o navegador, e volta ao padrão — a tela diz isso, em vez de
 * deixar a pessoa supor que a plataforma sabe da escolha dela.
 *
 * Quando existir coluna, este `localStorage` sai e a tela passa a ler do banco;
 * o formato aqui é o mesmo que uma coluna jsonb guardaria.
 */
const CHAVE = 'perfila:preferencias-de-notificacao'

/**
 * O que veio do navegador, peneirado contra `notificacoes`.
 *
 * `localStorage` é entrada de fora: outra versão da tela pode ter gravado outro
 * formato, e a pessoa pode editar o valor à mão. Só booleano de id conhecido
 * entra; o resto cai no padrão, e nunca `undefined` chega ao Toggle.
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

  // Lido depois da montagem, e não no `useState`: `localStorage` não existe no
  // servidor, e ler lá faria o HTML nascer com um valor e a hidratação trocar
  // por outro.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE)
      if (guardado) setCanais(mesclar(JSON.parse(guardado)))
    } catch {
      // Navegação privada, armazenamento cheio ou JSON estragado: a tela abre
      // no padrão. Preferência de notificação não derruba a página.
    }
  }, [])

  /** Grava e devolve se gravou: quem chama só avisa o que realmente aconteceu. */
  function guardar(novo: EstadoCanais): boolean {
    setCanais(novo)
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(novo))
      return true
    } catch {
      return false
    }
  }

  function alternar(id: string, canal: 'email' | 'whatsapp') {
    const novo = { ...canais, [id]: { ...canais[id]!, [canal]: !canais[id]![canal] } }
    if (!guardar(novo)) {
      toast('Não foi possível guardar a preferência neste navegador', 'aviso')
    }
  }

  function restaurarPadrao() {
    // Agora restaura E grava. Antes mexia só no estado da tela, e o aviso dizia
    // isso — a frase era honesta, o botão é que não fazia nada.
    if (guardar(ESTADO_INICIAL)) {
      toast('Padrão restaurado e guardado neste navegador.')
      return
    }
    toast('Padrão restaurado nesta tela; este navegador não deixou guardar', 'aviso')
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Preferências de notificação e comunicação."
      />

      <div className={styles.coluna}>
        {/* As DUAS colunas da tabela abaixo dependem de canal que não existe. O
            aviso do WhatsApp já estava aqui; o de e-mail faltava, e sem ele a
            coluna de e-mail parecia a que funciona — era a única das duas sem
            ressalva na tela. Nenhum e-mail sai do sistema hoje. */}
        <div className={`${ui.callout} ${ui.calloutWarning}`}>
          <span className={ui.calloutIcon}>
            <Icon name="alert" />
          </span>
          <span className={styles.avisoTexto}>
            Nenhum dos dois canais está ativo. O e-mail depende do provedor de envio, ainda não
            contratado, e o WhatsApp de uma integração. Enquanto isso, os convites e os links são
            copiados das telas de mapas e enviados por fora. As escolhas abaixo já ficam
            guardadas, mas <b>neste navegador</b>: em outro computador elas voltam ao padrão.
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
