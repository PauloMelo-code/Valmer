import type { NextConfig } from 'next'

/**
 * `/avaliacao/<token>` e `/relatorio/<token>` sao publicas por natureza: o token
 * na URL e a unica credencial. Isso as torna documentos com PII (nome e e-mail
 * do avaliado, contato do facilitador) numa URL que circula por e-mail, chat e
 * planilha compartilhada.
 *
 * `noindex` tira o documento dos buscadores: sem ele, um link colado num quadro
 * publico entra em indice e passa a ser achavel SEM o token, que e o mesmo que
 * nao ter token nenhum. `no-referrer` impede o caminho inverso — o token vazar
 * no cabecalho Referer para qualquer destino externo que a pagina venha a ter.
 * Hoje ela nao tem nenhum; a regra existe para o dia em que tiver.
 *
 * Cabecalho e nao `robots.txt` de proposito: `Disallow` pede para nao BUSCAR, e
 * o Google ainda indexa a URL nua que descobriu por outro caminho. `noindex`
 * proibe indexar, que e o que se quer aqui.
 */
const SEM_INDICE_SEM_REFERER = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    /**
     * O corpo de uma Server Action vem limitado a 1 MB por padrão, e a foto de
     * perfil aceita até 2 MB (ver `TAMANHO_MAXIMO_IMAGEM` em `lib/storage.ts`).
     * Sem esta folga, um arquivo entre 1 e 2 MB era barrado pelo Next ANTES de
     * chegar à validação — e o que aparecia na tela era um erro genérico, em
     * vez de "arquivo maior que 2 MB", que é a frase que diz o que fazer.
     *
     * O teto de verdade continua sendo o do servidor, em `lib/storage.ts`:
     * este número é só a porta larga o bastante para a recusa ser NOSSA.
     */
    serverActions: { bodySizeLimit: '3mb' },
  },

  /**
   * As treze rotas do portal foram renomeadas em 23/09/2026 (ver `lib/routes.ts`).
   * Link de rota antiga ja saiu daqui: esta em e-mail enviado, em conversa de
   * WhatsApp e no favorito do navegador do parceiro. Sem estas linhas, cada um
   * deles vira 404 — e o cliente conclui que o portal quebrou, nao que o nome
   * mudou.
   *
   * `statusCode: 301` e nao `permanent: true`: o atalho do Next emite 308, e o
   * pedido era 301. Para o GET de um link clicado os dois fazem a mesma coisa;
   * o 301 e o que o navegador e o buscador ja tem em cache ha vinte anos.
   *
   * `/:path*` casa zero ou mais segmentos, entao uma linha cobre a rota nua e
   * as filhas: `/facilitador/campanhas` e `/facilitador/campanhas/nova` caem
   * na mesma regra.
   */
  async redirects() {
    const renomeadas: [string, string][] = [
      ['assessments', 'acervo-de-mapas'],
      ['envio-rapido', 'envio-expresso'],
      ['campanhas', 'grupos-de-mapeamento'],
      ['dna', 'territorio-da-empresa'],
      ['arquitetura', 'perfil-ideal-por-cargo'],
      ['devolutiva', 'sessao-de-leitura'],
      ['beneficios', 'niveis-de-credenciamento'],
      ['creditos', 'creditos-de-mapeamento'],
      ['degustacao', 'experimente-gratis'],
      ['clientes', 'meus-clientes'],
      ['cursos', 'certificacoes'],
      ['mentores', 'guias-de-expedicao'],
      ['ead', 'biblioteca-gravada'],
    ]

    return renomeadas.map(([antiga, nova]) => ({
      source: `/facilitador/${antiga}/:path*`,
      destination: `/facilitador/${nova}/:path*`,
      statusCode: 301 as const,
    }))
  },

  async headers() {
    return [
      { source: '/avaliacao/:path*', headers: SEM_INDICE_SEM_REFERER },
      { source: '/relatorio/:path*', headers: SEM_INDICE_SEM_REFERER },
    ]
  },
}

export default nextConfig
