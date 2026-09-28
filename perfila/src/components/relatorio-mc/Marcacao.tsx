/**
 * As quatro marcacoes metodologicas (`span.tag` do molde), com o icone e a
 * cor de `MARCACOES`. Existem para o leitor saber se o bloco e teoria,
 * resultado dele, hipotese ou orientacao; por isso o selo e sempre o mesmo
 * texto, e nunca redigido por pagina.
 */
import type { ReactNode } from 'react'
import { MARCACOES, type CodigoMarcacao } from '@/data/relatorio-mc/marcacoes'

// Paths copiados do molde. Fato do modelo e aplicacao pratica usam o mesmo
// livro aberto, em cores diferentes, como la.
const LIVRO = 'M3 4.5C3 3.7 3.7 3 4.5 3H10v17H4.5A1.5 1.5 0 0 1 3 18.5z M21 4.5C21 3.7 20.3 3 19.5 3H14v17h5.5a1.5 1.5 0 0 0 1.5-1.5z'

function icone(tipo: CodigoMarcacao, cor: string): ReactNode {
  switch (tipo) {
    case 'derivado-do-escore':
      return <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke={cor} strokeWidth="2.4" strokeLinecap="round" />
    case 'a-confirmar':
      return (
        <>
          <path d="M4 5h16v11H9l-5 4z" fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.5.2-.6.5-.6 1" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" />
        </>
      )
    default:
      return <path d={LIVRO} fill="none" stroke={cor} strokeWidth="2" />
  }
}

export function Marcacao({ tipo }: { tipo: CodigoMarcacao }) {
  const { cor, selo } = MARCACOES[tipo]
  return (
    <span className="tag" style={{ borderColor: cor }}>
      <svg className="ic" width="10" height="10" viewBox="0 0 24 24" aria-hidden>
        {icone(tipo, cor)}
      </svg>
      <span>{selo}</span>
    </span>
  )
}

/** A linha de marcacoes do pe da pagina: uma ou duas lado a lado, como no molde. */
export function Marcacoes({ tipos }: { tipos: readonly CodigoMarcacao[] }) {
  return (
    <div style={{ display: 'flex', gap: '2mm' }}>
      {tipos.map((t) => (
        <Marcacao key={t} tipo={t} />
      ))}
    </div>
  )
}
