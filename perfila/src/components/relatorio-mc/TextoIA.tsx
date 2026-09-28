/**
 * Um bloco de texto escrito pela IA, ou o aviso honesto de que ele ainda nao
 * existe.
 *
 * Mesma regra de `components/relatorio/TextoPendente.tsx`: sem narrativa, a
 * pagina NAO preenche o buraco com texto "generico do perfil" nem com o do
 * exemplo. Todo texto plausivel ali descreve outra pessoa. O calculo e as
 * tabelas continuam no lugar; so o que e da IA sai marcado como pendente.
 *
 * `texto`:
 *   - string com conteudo: o texto;
 *   - `null`/`undefined`: narrativa ainda nao gerada -> aviso de pendente;
 *   - `''`: a narrativa existe e nao trouxe este bloco -> nada (R1).
 */
import type { CSSProperties } from 'react'

const PENDENTE: CSSProperties = {
  color: '#5B6573',
  fontStyle: 'italic',
  border: '.6pt dashed #C39A42',
  borderRadius: '1mm',
  padding: '1mm 2mm',
}

export function TextoIA({
  texto,
  como: Tag = 'p',
  className,
  style,
  rotulo,
}: {
  texto: string | null | undefined
  como?: 'p' | 'div' | 'span' | 'li'
  className?: string
  style?: CSSProperties
  /** Abertura em negrito do molde ("O que significa."). Fica tambem no pendente, para a estrutura da pagina nao mudar. */
  rotulo?: string
}) {
  if (texto === '') return null
  const abertura = rotulo ? <b>{rotulo} </b> : null
  if (texto == null) {
    return (
      <Tag className={className} style={{ ...style, ...PENDENTE }} data-ia="pendente">
        {abertura}
        Pendente: este texto ainda não foi gerado para este relatório.
      </Tag>
    )
  }
  return (
    <Tag className={className} style={style}>
      {abertura}
      {texto}
    </Tag>
  )
}
