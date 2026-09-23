import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

/**
 * Tipografia da marca.
 *
 * O manual da Impacto Academy fixa duas famílias: Sentient nos títulos
 * e Nimbus Sans no texto corrido. Saíram Sora e Figtree, que eram
 * escolha nossa de quando não havia manual.
 *
 * Sentient é da Indian Type Foundry e a Fontshare distribui de graça,
 * então ela vem do nosso próprio servidor, em `styles/fonts/`, e não de
 * um CDN de terceiro: uma fonte pedida a outro domínio atrasa a
 * primeira pintura e vaza o IP de quem abre o relatório.
 *
 * Nimbus Sans (URW) não tem distribuição web livre. O próprio manual
 * autoriza Helvetica Neue ou Arial como substituta, então o corpo sai
 * pelo stack de `--font-body` em `styles/tokens.css`, sem webfont.
 * Quem tem a Nimbus instalada vê a Nimbus.
 */
const sentient = localFont({
  src: [
    { path: '../styles/fonts/Sentient-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../styles/fonts/Sentient-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../styles/fonts/Sentient-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sentient',
  display: 'swap',
  fallback: ['Iowan Old Style', 'Georgia', 'serif'],
})

export const metadata: Metadata = {
  title: 'Impacto Academy',
  description:
    'Plataforma de análise comportamental: grupos de mapeamento, território da empresa, sessões de leitura e clientes.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /*
   * SEM ISTO, `env(safe-area-inset-*)` VALE ZERO — e a barra inferior do
   * telefone nasce por baixo da faixa do gesto de voltar do iPhone.
   *
   * O navegador só entrega os valores da área segura quando a página pede a
   * tela inteira, e quem pede é `viewport-fit=cover`. Sem esta linha o Next
   * não emite o atributo, todo `env(...)` cai no valor padrão (zero) e o
   * tratamento de recorte do aparelho vira comentário: o CSS continua lá,
   * correto, sem nunca ser aplicado. Ver `--barra-inferior-espaco` em
   * `styles/tokens.css`.
   */
  viewportFit: 'cover',
  /* Areia, o mesmo `--color-bg`: a barra do navegador continua a
     página em vez de cortar. */
  themeColor: '#f5f2ec',
}

/**
 * O layout raiz só monta o documento. Cada área tem a sua própria
 * moldura, porque as duas personas do produto não compartilham
 * navegação:
 *
 * - `(portal)`      → o analista, com sidebar e barra superior
 * - `respondente/`  → quem responde o inventário, sem sidebar
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sentient.variable}>
      <body>{children}</body>
    </html>
  )
}
