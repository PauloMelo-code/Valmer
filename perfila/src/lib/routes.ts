/**
 * Mapa de rotas e navegação
 * -------------------------
 * A plataforma tem três ambientes com navegação própria:
 *
 * - `/admin`             → Valmer, dono da plataforma
 * - `/facilitador`       → facilitador ou empresa que compra créditos
 * - `/avaliacao/<token>` → quem responde, sem login e sem menu
 *
 * Os dois primeiros compartilham a mesma moldura; muda só o conjunto
 * de itens. Por isso tudo aqui recebe os grupos como parâmetro, em
 * vez de assumir um ambiente.
 */

import type { IconName } from '@/components/ui/Icon'
import { dnas } from '@/data/dna'

export type NavItem = {
  href: string
  /**
   * Rótulo na sidebar — também usado no breadcrumb.
   *
   * Rótulo E rota são vocabulário da Impacto, e mudaram juntos em 23/09/2026,
   * a pedido do Valmer: o portal não podia continuar repetindo o vocabulário
   * da plataforma de referência nem na barra nem na URL. `/assessments`
   * virou `/acervo-de-mapas`, `/campanhas` virou `/grupos-de-mapeamento`, e
   * assim por diante — a lista completa, com o 301 de cada rota antiga, está
   * em `next.config.ts`.
   *
   * O que NÃO mudou: nome de tabela, de coluna, de chave de permissão
   * (`turmas:criar`) e de arquivo de migration. Aquilo é identificador, não
   * é lido por ninguém de fora, e renomear teria custado uma migration por
   * enfeite. Ao renomear outro item, mude `label` e `href` juntos e
   * acrescente o redirect.
   */
  label: string
  icon: IconName
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const BASE_FACILITADOR = '/facilitador'
export const BASE_ADMIN = '/admin'

export const NAV_FACILITADOR: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { href: '/facilitador', label: 'Painel de Comando', icon: 'dash' },
      { href: '/facilitador/acervo-de-mapas', label: 'Acervo de Mapas', icon: 'file' },
      { href: '/facilitador/envio-expresso', label: 'Envio Expresso', icon: 'zap' },
      { href: '/facilitador/grupos-de-mapeamento', label: 'Grupos de Mapeamento', icon: 'bag' },
      { href: '/facilitador/territorio-da-empresa', label: 'Território da Empresa', icon: 'dna' },
      { href: '/facilitador/perfil-ideal-por-cargo', label: 'Perfil Ideal por Cargo', icon: 'layers' },
      { href: '/facilitador/sessao-de-leitura', label: 'Sessão de Leitura', icon: 'chat' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { href: '/facilitador/niveis-de-credenciamento', label: 'Níveis de Credenciamento', icon: 'star' },
      { href: '/facilitador/creditos-de-mapeamento', label: 'Créditos de Mapeamento', icon: 'card' },
      { href: '/facilitador/experimente-gratis', label: 'Experimente Grátis', icon: 'gift' },
      { href: '/facilitador/meus-clientes', label: 'Meus Clientes', icon: 'users' },
    ],
  },
  {
    label: 'Academia Impacto',
    items: [
      { href: '/facilitador/certificacoes', label: 'Certificações', icon: 'book' },
      { href: '/facilitador/guias-de-expedicao', label: 'Guias de Expedição', icon: 'award' },
      { href: '/facilitador/biblioteca-gravada', label: 'Biblioteca Gravada', icon: 'play' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/facilitador/integracoes', label: 'Integrações', icon: 'code' },
      { href: '/facilitador/configuracoes', label: 'Configurações', icon: 'sliders' },
      { href: '/facilitador/suporte', label: 'Suporte', icon: 'headset' },
    ],
  },
]

export const NAV_ADMIN: NavGroup[] = [
  {
    label: 'Plataforma',
    items: [
      { href: '/admin', label: 'Visão geral', icon: 'dash' },
      { href: '/admin/facilitadores', label: 'Facilitadores', icon: 'users' },
      { href: '/admin/assessments', label: 'Mapas Comportamentais', icon: 'file' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { href: '/admin/creditos', label: 'Créditos e pacotes', icon: 'card' },
      { href: '/admin/precos', label: 'Preços', icon: 'dollar' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { href: '/admin/questoes', label: 'Banco de questões', icon: 'book' },
      { href: '/admin/cursos', label: 'Cursos', icon: 'play' },
    ],
  },
]

/**
 * Rótulo curto de cada atalho da barra inferior do telefone.
 *
 * Isto NÃO é uma segunda lista de navegação: `navRapida` pesca os itens nos
 * grupos acima pelo href, então rota, ícone e existência continuam saindo de
 * um lugar só — uma tela nova entra no menu sem ninguém lembrar de dois
 * arquivos. O que mora aqui é só o rótulo.
 *
 * Ele precisa ser curto porque os cinco slots da barra dividem 390px em 78px
 * cada: "Mapas Comportamentais" não cabe, e cinco rótulos cortados não dizem
 * nada. "Parceiros" no lugar de "Facilitadores" pelo mesmo motivo.
 *
 * Estes rótulos curtos são ENCURTAMENTOS do nome novo, e não sobras do nome
 * velho: "Mapas" é Acervo de Mapas e "Créditos" é Créditos de Mapeamento.
 * "Turmas" virou "Grupos" porque ali sim era o termo antigo.
 */
const ATALHOS_CURTOS: Record<string, string> = {
  '/facilitador': 'Início',
  '/facilitador/acervo-de-mapas': 'Mapas',
  '/facilitador/grupos-de-mapeamento': 'Grupos',
  '/facilitador/creditos-de-mapeamento': 'Créditos',
  '/admin': 'Início',
  '/admin/facilitadores': 'Parceiros',
  '/admin/assessments': 'Mapas',
  '/admin/precos': 'Preços',
}

/** Os quatro destinos da barra inferior, na ordem em que os grupos os trazem. */
export function navRapida(grupos: NavGroup[]): NavItem[] {
  return grupos
    .flatMap((grupo) => grupo.items)
    .flatMap((item) => {
      const curto = ATALHOS_CURTOS[item.href]
      return curto ? [{ ...item, label: curto }] : []
    })
}

/**
 * Um item segue ativo nas telas filhas. A raiz do ambiente é a
 * exceção: só fica ativa nela mesma, senão ficaria acesa em tudo.
 */
export function isNavItemActive(href: string, pathname: string, base: string): boolean {
  if (href === base) return pathname === base
  return pathname === href || pathname.startsWith(`${href}/`)
}

export type Breadcrumb = {
  /** Segundo nível: a seção. */
  title: string
  /** Terceiro nível: a tela dentro da seção (opcional). */
  sub?: string
}

/** Sub-rótulos fixos das telas de detalhe e criação. */
const STATIC_SUBS: Record<string, string> = {
  '/facilitador/acervo-de-mapas/novo': 'Novo mapa',
  '/facilitador/grupos-de-mapeamento/nova': 'Novo grupo',
  '/facilitador/territorio-da-empresa/novo': 'Novo território',
  '/facilitador/biblioteca-gravada': 'Treinamentos',
  '/admin/facilitadores/novo': 'Novo facilitador',
}

/**
 * Telas que existem sem item de menu.
 *
 * Sem esta consulta, `resolveBreadcrumb` cai no primeiro item do menu e a
 * trilha do perfil dizia "Parceiro / Visão Geral" — o caminho errado, que é
 * pior que caminho nenhum.
 */
const TITULOS_FORA_DO_MENU: Record<string, string> = {
  '/facilitador/perfil': 'Perfil',
  '/admin/perfil': 'Perfil',
}

export function resolveBreadcrumb(
  pathname: string,
  grupos: NavGroup[],
  base: string,
): Breadcrumb {
  const foraDoMenu = TITULOS_FORA_DO_MENU[pathname]
  if (foraDoMenu) return { title: foraDoMenu }

  const itens = grupos.flatMap((grupo) => grupo.items)
  const secao = itens.find((item) => isNavItemActive(item.href, pathname, base))
  const title = secao?.label ?? itens[0]?.label ?? ''

  const staticSub = STATIC_SUBS[pathname]
  if (staticSub) return { title, sub: staticSub }

  // Território da Empresa aberto: o terceiro nível é o nome da empresa.
  const prefixoDna = `${BASE_FACILITADOR}/territorio-da-empresa/`
  if (pathname.startsWith(prefixoDna)) {
    const dna = dnas.find((item) => item.slug === pathname.slice(prefixoDna.length))
    if (dna) return { title, sub: dna.name }
  }

  return { title }
}
