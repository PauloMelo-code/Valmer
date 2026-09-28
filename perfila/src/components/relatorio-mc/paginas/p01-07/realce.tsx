/**
 * Negrito e italico dentro de um texto fixo que mora em `data/relatorio-mc`
 * como string simples. O molde destaca palavras no meio do paragrafo
 * ("<b>William Moulton Marston</b>"); em vez de copiar o paragrafo para o
 * componente — e ter dois textos para manter —, a pagina diz quais trechos
 * destacar e o texto continua vindo da tabela.
 *
 * Cada trecho e marcado na primeira vez que aparece. Trecho que nao aparece
 * (a tabela mudou) e ignorado: o paragrafo continua inteiro, so sem o realce.
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react'

export type Realce = { trecho: string; como?: 'b' | 'i'; cor?: string }

export function realcar(texto: string, realces: readonly Realce[]): ReactNode {
  const achados = realces
    .map((r) => ({ ...r, em: texto.indexOf(r.trecho) }))
    .filter((r) => r.em >= 0)
    .sort((a, b) => a.em - b.em)
  const partes: ReactNode[] = []
  let cursor = 0
  for (const r of achados) {
    if (r.em < cursor) continue
    partes.push(texto.slice(cursor, r.em))
    const Tag = r.como ?? 'b'
    const estilo: CSSProperties | undefined = r.cor ? { color: r.cor } : undefined
    partes.push(<Tag style={estilo}>{r.trecho}</Tag>)
    cursor = r.em + r.trecho.length
  }
  partes.push(texto.slice(cursor))
  return partes.map((p, i) => <Fragment key={i}>{p}</Fragment>)
}
