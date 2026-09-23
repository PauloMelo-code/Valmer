'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { resolveBreadcrumb, type NavGroup } from '@/lib/routes'
import { BotaoSair } from './BotaoSair'
import { BuscaTopbar } from './BuscaTopbar'
import { MarcaImpacto, NOME_MARCA } from './MarcaImpacto'
import styles from './Topbar.module.css'

export type UsuarioTopbar = {
  nome: string
  iniciais: string
  /** Linha secundária: papel, plano, saldo. */
  resumo: string
  /**
   * URL assinada da foto de perfil, quando existe. Vem pronta do layout, que é
   * Server Component e já conferiu a sessão — a barra superior não fala com o
   * armazenamento.
   */
  foto?: string | null
}

type TopbarProps = {
  grupos: NavGroup[]
  base: string
  /** Primeiro nível do breadcrumb: o ambiente. */
  raiz: string
  usuario: UsuarioTopbar
  buscaPlaceholder: string
  /**
   * Tela de perfil deste ambiente, para onde o menu do nome leva.
   *
   * Opcional porque só o portal do facilitador tem uma: no admin o menu continua
   * sendo o bloco de identificação que sempre foi, sem destino inventado.
   */
  perfilHref?: string
}

/**
 * Topbar
 * ------
 * Barra fixa com o caminho da tela atual, busca e o menu do usuário.
 * O breadcrumb é derivado da URL — nenhuma página declara o próprio
 * título.
 */
export function Topbar({
  grupos,
  base,
  raiz,
  usuario,
  buscaPlaceholder,
  perfilHref,
}: TopbarProps) {
  const pathname = usePathname()
  const { title, sub } = resolveBreadcrumb(pathname, grupos, base)

  return (
    <header className={styles.topbar}>
      {/* A MARCA SÓ APARECE NO TELEFONE, e é a única vez que ela aparece aqui.
          Ela mora na barra lateral, que some abaixo de 720px — e some com ela o
          escudo e o nome, deixando o produto inteiro sem assinatura no aparelho
          em que o cliente vai abrir. Só o símbolo, sem o nome escrito: em 390px
          a barra divide o espaço com o nome da tela, a busca e o avatar, e a
          palavra não caberia sem espremer as três. */}
      <Link href={base} className={styles.marcaTelefone} aria-label={NOME_MARCA}>
        <MarcaImpacto size={22} />
      </Link>

      <nav className={styles.breadcrumb} aria-label="Trilha de navegação">
        {/* Raiz e a barra que a segue andam juntas: no telefone as duas somem
            de uma vez, e uma barra solta antes do nome da tela seria lixo. */}
        <span className={styles.raiz}>
          {raiz}
          <span className={styles.separator} aria-hidden>
            /
          </span>
        </span>
        <span className={styles.current}>{title}</span>
        {sub ? (
          <>
            <span className={styles.separator} aria-hidden>
              /
            </span>
            <span className={`${styles.current} ${styles.currentTruncate}`}>{sub}</span>
          </>
        ) : null}
      </nav>

      <div className={styles.spacer} />

      <BuscaTopbar placeholder={buscaPlaceholder} />

      <div className={styles.user}>
        {/* O menu do nome não abria nada: era um botão que não fazia o que
            prometia. Agora ele é o caminho para o perfil, que é o que a
            chevron sempre sugeriu. */}
        {perfilHref ? (
          <Link href={perfilHref} className={styles.userButton}>
            {conteudoDoUsuario(usuario)}
          </Link>
        ) : (
          <span className={styles.userButton}>{conteudoDoUsuario(usuario)}</span>
        )}
        <BotaoSair />
      </div>
    </header>
  )
}

function conteudoDoUsuario(usuario: UsuarioTopbar) {
  return (
    <>
      <Avatar size="md" tone="ink" src={usuario.foto}>
        {usuario.iniciais}
      </Avatar>
      <span className={styles.userText}>
        <span className={styles.userName}>{usuario.nome}</span>
        <span className={styles.userMeta}>{usuario.resumo}</span>
      </span>
      <span className={styles.chevron}>
        <Icon name="chevD" size={16} />
      </span>
    </>
  )
}
