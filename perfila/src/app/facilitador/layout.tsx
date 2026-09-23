import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { initials } from '@/lib/text'
import { exigirSessaoNaTela } from '@/lib/auth/tela'
import { BASE_FACILITADOR, NAV_FACILITADOR } from '@/lib/routes'
import { urlAssinadaOuNula } from '@/lib/storage'

export const metadata: Metadata = {
  title: 'Impacto Academy · Portal do Facilitador',
}

/**
 * Ambiente do facilitador: quem compra créditos e avalia pessoas.
 *
 * A validação de verdade da sessão é aqui, e não no middleware: lá só se
 * confere que o cookie existe, porque o Edge Runtime não alcança o banco.
 * Sem esta checagem, um cookie inventado à mão abriria o portal inteiro.
 */
export default async function FacilitadorLayout({ children }: { children: React.ReactNode }) {
  const { sessao, conta } = await exigirSessaoNaTela(BASE_FACILITADOR)

  // O admin tem painel próprio; deixá-lo aqui mostraria "0 créditos" e uma
  // lista vazia, porque assessment nenhum pertence a ele.
  if (sessao.papel === 'admin') redirect('/admin')

  // O banco guarda a CHAVE do objeto; a URL assinada nasce aqui, depois da
  // checagem de sessão acima, e expira em minutos. Ver `lib/storage.ts`.
  const foto = await urlAssinadaOuNula(conta.imagem)

  return (
    <AppShell
      grupos={NAV_FACILITADOR}
      base={BASE_FACILITADOR}
      subtitulo="Portal do Facilitador"
      raiz="Facilitador"
      buscaPlaceholder="Buscar avaliado, grupo…"
      perfilHref="/facilitador/perfil"
      usuario={{
        nome: sessao.nome.split(' ').slice(0, 2).join(' '),
        iniciais: initials(sessao.nome),
        resumo: `${conta.empresa ?? 'Sem empresa'} · ${conta.creditos} créditos`,
        foto,
      }}
    >
      {children}
    </AppShell>
  )
}
