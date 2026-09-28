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
import { useEffect, useRef, type ReactNode } from 'react'
import { ajustarPaginas } from './ajuste-de-pagina'

export function RelatorioMC({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null)

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
