/**
 * A moldura comum das paginas 02 a 41 do molde: cabecalho com o nome e a
 * etapa, aba lateral na cor da etapa, kicker, titulo, linha dourada,
 * subtitulo opcional e o bloco `.zw`, que e o que `ajustarPaginas` amplia.
 * Rodape com a versao do relatorio e o numero.
 *
 * O conteudo proprio da pagina vai em `children`, dentro do `.zw` (flex em
 * coluna; use `<div className="spacer" />` para empurrar as marcacoes ao pe).
 * As paginas 01 e 42 nao tem moldura no molde e montam a propria `section`.
 */
import type { ReactNode } from 'react'
import { etapaDaPagina, type DadosRelatorioMC } from '@/lib/relatorio-mc/dados'

/** `p07`: id da section, alvo dos links do indice (`href="#p07"`). */
export const idPagina = (numero: number) => `p${String(numero).padStart(2, '0')}`

export function Pagina({
  dados,
  numero,
  kicker,
  titulo,
  grande = false,
  subtitulo,
  children,
}: {
  dados: DadosRelatorioMC
  numero: number
  kicker: ReactNode
  titulo: ReactNode
  /** `h1.big`, das paginas de abertura de assunto (04, 05, 17, 23, 35, 38, 41). */
  grande?: boolean
  subtitulo?: ReactNode
  children?: ReactNode
}) {
  const etapa = etapaDaPagina(numero)
  return (
    <section className="page" id={idPagina(numero)}>
      <div className="hd">
        <div>{dados.identificacao.cabecalho}</div>
        <div className="st">
          <i style={{ background: etapa.cor }} />
          {etapa.selo}
        </div>
      </div>
      {etapa.abaTopo ? <div className="tab" style={{ background: etapa.cor, top: etapa.abaTopo }} /> : null}
      <div className="body">
        <div className="kick">
          <i style={{ background: etapa.cor }} />
          {kicker}
        </div>
        <h1 className={grande ? 'big' : undefined}>{titulo}</h1>
        <div className="gline" />
        {subtitulo != null ? <div className="sub">{subtitulo}</div> : null}
        <div className="zw">{children}</div>
      </div>
      <div className="ft">
        <div>{dados.identificacao.relatorio}</div>
        <div className="gl" />
        <div className="pn">{String(numero).padStart(2, '0')}</div>
      </div>
    </section>
  )
}
