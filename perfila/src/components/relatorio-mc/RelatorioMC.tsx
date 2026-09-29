'use client'

/**
 * Raiz do relatorio MC 3.1: carrega o CSS do molde, abre o `div.mc31` e roda o
 * ajuste de pagina depois que o conteudo existe.
 *
 * E client so por causa do efeito: as paginas chegam como `children` e
 * continuam sendo renderizadas no servidor. O `data-ajuste="pronto"` que o
 * gerador de PDF espera e gravado pelo proprio `ajustarPaginas` ao terminar.
 */
import './relatorio-mc.css'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ajustarPaginas, escalaDaTela } from './ajuste-de-pagina'

export function RelatorioMC({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null)

  // A escala do celular entra antes da primeira pintura, e nao depois das
  // fontes e imagens: esperar por elas mostrava a A4 cortada e depois pulava.
  // Acompanha o giro da tela sem medir de novo: ela e `transform`, que nao
  // mexe no layout de dentro da folha. O ajuste abaixo mede sem ela.
  useLayoutEffect(() => {
    const el = raiz.current
    if (!el) return
    const escalar = () =>
      el.style.setProperty('--escala-tela', String(escalaDaTela(document.documentElement.clientWidth)))
    escalar()
    window.addEventListener('resize', escalar)
    return () => window.removeEventListener('resize', escalar)
  }, [])

  // Roda de novo quando as paginas mudam: o ajuste desfaz o anterior antes de
  // medir, entao repetir e seguro (StrictMode ja monta duas vezes).
  useEffect(() => {
    if (raiz.current) void ajustarPaginas(raiz.current)
  }, [children])

  return (
    <div className="mc31" ref={raiz}>
      {children}
    </div>
  )
}
