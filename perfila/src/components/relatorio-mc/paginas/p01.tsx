/**
 * Pagina 01 · Capa. Sem moldura: blocos absolutos sobre `capa.jpg`, que ja
 * traz o titulo. Nome, instrutor e data sao do cadastro; o codigo do mapa
 * (C34) nao existe no molde e entra numa linha abaixo, no mesmo estilo dos
 * rotulos, para a capa identificar o documento sem competir com o nome.
 */
import type { CSSProperties } from 'react'
import { idPagina } from '../Pagina'
import type { PropsPagina } from './registro'

const ROTULO: CSSProperties = { fontFamily: 'AR', fontWeight: 600, fontSize: '6.6pt', letterSpacing: '.34em', color: '#D6A650' }
const SEPARADOR: CSSProperties = { position: 'absolute', top: '265.3mm', height: '13.4mm', width: '.35mm', background: '#B98C3E' }

/**
 * C40: a coluna tem 66mm e o molde usa `nowrap` a 11,2pt, onde cabem uns 22
 * caracteres em caixa alta. A pagina nao mede texto (e renderizada no
 * servidor), entao reduz a fonte na proporcao do comprimento ate 8pt e, dali
 * em diante, deixa quebrar em duas linhas em vez de cortar o nome.
 */
function estiloDoValor(texto: string): CSSProperties {
  const cabe = 22
  const tamanho = texto.length <= cabe ? 11.2 : Math.max(8, (11.2 * cabe) / texto.length)
  const quebra = (11.2 * cabe) / texto.length < 8
  return {
    fontFamily: 'AR', fontWeight: 600, fontSize: `${tamanho.toFixed(1)}pt`, letterSpacing: '.01em', color: '#F4F4F2',
    marginTop: '2.6mm', whiteSpace: quebra ? 'normal' : 'nowrap', lineHeight: quebra ? 1.15 : undefined,
  }
}

function Campo({ centro, rotulo, valor }: { centro: string; rotulo: string; valor: string }) {
  return (
    <div style={{ position: 'absolute', top: '265.2mm', left: centro, width: '66mm', marginLeft: '-33mm', textAlign: 'center' }}>
      <div style={ROTULO}>{rotulo}</div>
      <div style={estiloDoValor(valor)}>{valor}</div>
    </div>
  )
}

export default function Pagina01({ dados }: PropsPagina) {
  const { nomeMaiusculo, instrutorMaiusculo, emissaoMaiuscula, codigo } = dados.identificacao
  return (
    <section className="page" id={idPagina(1)} style={{ padding: 0, background: '#121820' }}>
      <img src="/relatorio-mc/imagens/capa.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '210mm', height: '297mm', display: 'block' }} />
      <Campo centro="40.8mm" rotulo="NOME DO AVALIADO" valor={nomeMaiusculo} />
      <div style={{ ...SEPARADOR, left: '74.7mm' }} />
      <Campo centro="108.0mm" rotulo="INSTRUTOR" valor={instrutorMaiusculo} />
      <div style={{ ...SEPARADOR, left: '141.9mm' }} />
      <Campo centro="173.2mm" rotulo="DATA DE EMISSÃO" valor={emissaoMaiuscula} />
      {codigo ? (
        <div style={{ ...ROTULO, position: 'absolute', top: '285.5mm', left: 0, right: 0, textAlign: 'center', letterSpacing: '.24em' }}>
          CÓDIGO <span style={{ color: '#F4F4F2' }}>{codigo}</span>
        </div>
      ) : null}
    </section>
  )
}
