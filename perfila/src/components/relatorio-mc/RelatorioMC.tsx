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
import { ajustarPaginas, escalaDaTela } from './ajuste-de-pagina'

export function RelatorioMC({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null)

  // Roda de novo quando as paginas mudam: o ajuste desfaz o anterior antes de
  // medir, entao repetir e seguro (StrictMode ja monta duas vezes).
  //
  // A escala do celular entra DEPOIS do ajuste, que mede em tamanho real, e
  // acompanha o giro da tela sem medir de novo: o zoom de cada bloco e
  // proporcional e continua valendo em qualquer escala.
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    let montado = true
    const escalar = () =>
      el.style.setProperty('--escala-tela', String(escalaDaTela(document.documentElement.clientWidth)))
    void ajustarPaginas(el).then(() => {
      if (!montado) return
      escalar()
      window.addEventListener('resize', escalar)
    })
    return () => {
      montado = false
      window.removeEventListener('resize', escalar)
    }
  }, [children])

  return (
    <div className="mc31" ref={raiz}>
      {children}
    </div>
  )
}
