/**
 * Pagina 08 · O custo da adaptacao. Indices do motor, tabela fator a fator e
 * os 3 blocos de `custo_adaptacao_narrativa` (R1): o 2o paragrafo da
 * polarizacao, a nota "O que reduz o custo" e o cartao "Por que esta pagina
 * aparece tao cedo", que no molde eram texto pessoal do Valmer.
 *
 * Divergencias do molde, pela v2.2: frase do indice pela classe do motor
 * (C09); amplitude so com a definicao, sem juizo, ate haver faixas (C10); zona
 * de flexibilidade "acima de 32 e abaixo de 70", que e a regra do motor (C11);
 * nota das faixas de variacao em limites, porque o escore tem decimal (C09).
 */
import { FATORES } from '@/data/inventario-mc'
import { frasePolarizados } from '@/data/relatorio-mc/variantes/p08-14'
import { Pagina } from '../Pagina'
import { Marcacao } from '../Marcacao'
import { TextoIA } from '../TextoIA'
import type { PropsPagina } from './registro'

const maiuscula = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1)
const TOPO = { borderTop: '1.2mm solid #17324D' }
const NUM = { fontSize: '28pt', color: '#17324D', lineHeight: 1 }
// A caixa de alerta so faz sentido quando existe custo a apontar.
const CLASSES_COM_CUSTO = new Set(['alta', 'muito alta', 'extremamente alta'])

export default function Pagina08({ dados }: PropsPagina) {
  const { indices, fatores } = dados
  const ia = dados.ia.custoAdaptacao
  const alerta = indices.polarizados.length > 0 || CLASSES_COM_CUSTO.has(indices.classe)

  return (
    <Pagina
      dados={dados}
      numero={8}
      kicker="A conta do modo atual"
      titulo="O custo da adaptação"
      subtitulo="A distância entre o seu perfil natural e o adaptado, medida fator a fator. Esta é a leitura que organiza tudo o que vem depois."
    >
      <div className="g3" style={{ marginBottom: '4mm' }}>
        <div className="card" style={TOPO}>
          <span className="lab">Índice de adaptação</span>
          <div className="num" style={NUM}>{indices.adaptacao.texto}</div>
          <div className="xs" style={{ marginTop: '1.4mm' }}>
            Adaptação {indices.classe}. Média das diferenças absolutas entre natural e adaptado nos quatro fatores.
          </div>
        </div>
        <div className="card" style={TOPO}>
          <span className="lab">Amplitude do perfil natural</span>
          <div className="num" style={NUM}>{indices.amplitude.texto}</div>
          <div className="xs" style={{ marginTop: '1.4mm' }}>Diferença entre o maior e o menor escore.</div>
        </div>
        <div className="card" style={TOPO}>
          <span className="lab">Fatores polarizados</span>
          <div className="num" style={NUM}>{indices.polarizados.length}</div>
          <div className="xs" style={{ marginTop: '1.4mm' }}>{frasePolarizados(indices.polarizados.length, indices.polarizadosTexto)}</div>
        </div>
      </div>

      {/* Coluna do texto mais larga que a do alerta: o 2o paragrafo e da IA e varia de tamanho (C39). */}
      <div className="row" style={{ gap: '5mm', marginBottom: '3.4mm' }}>
        <div className="col" style={{ flex: 1.35 }}>
          <h2>O que a polarização significa</h2>
          <p className="sm">
            A faixa acima de 32 e abaixo de 70 é a zona de flexibilidade. Variação dentro dela é o ajuste normal que qualquer pessoa faz ao
            mudar de contexto. Quando um fator sai de um extremo e chega ao outro, atravessando a faixa inteira, isso é polarização.
          </p>
          {/* A 1a frase e do metodo (fixa); o resto do paragrafo, no molde, era o mapa do Valmer. */}
          <p className="sm">
            Polarização costuma indicar alto gasto de energia, porque a pessoa opera longe do seu ponto natural por período prolongado.{' '}
            <TextoIA texto={ia[0]} como="span" />
          </p>
        </div>
        {alerta ? (
          <div className="col">
            <div className="box-warn">
              <div className="bt" style={{ color: '#9A6200' }}>
                <svg className="ic" width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#9A6200" strokeWidth="2.4" />
                  <path d="M12 7v6.5M12 16.6v.4" stroke="#9A6200" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                {/* O molde abre com "Atenção ·"; aqui a coluna e mais estreita (C39) e o icone ja faz esse papel. */}
                <span style={{ color: '#171A1F' }}>Onde isso aparece na prática</span>
              </div>
              <div className="sm">
                Cansaço que não corresponde ao volume de trabalho. Irritação com processos que antes não incomodavam. E a sensação de estar
                sendo eficiente sem estar sendo você.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <table className="t" style={{ marginBottom: '1.4mm' }}>
        <tbody>
          <tr><th>Fator</th><th>Natural</th><th>Adaptado</th><th>Variação</th><th>Classificação</th></tr>
          {FATORES.map((f) => {
            const x = fatores[f]
            return (
              <tr key={f}>
                <td>
                  <span style={{ display: 'inline-block', width: '2.4mm', height: '2.4mm', background: x.cor.principal, marginRight: '1.6mm', verticalAlign: 'middle' }} />
                  <b>{x.rotulo}</b>
                </td>
                <td className="num">{x.natural.escore.texto}</td>
                <td className="num">{x.adaptado.escore.texto}</td>
                <td className="num" style={{ color: x.cor.texto }}>{x.variacao.texto}</td>
                <td>{maiuscula(x.classeVariacao)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="xs mut" style={{ marginBottom: '3.4mm' }}>
        Faixas de classificação da variação: até 10, baixa · até 20, moderada · até 25, alta · até 35, muito alta · acima de 35, extremamente alta.
      </div>
      <TextoIA texto={ia[1]} como="div" className="note" style={{ borderLeftColor: '#267057', marginBottom: '3mm' }} rotulo="O que reduz o custo." />
      <TextoIA texto={ia[2]} como="div" className="card sm" rotulo="Por que esta página aparece tão cedo no relatório." />
      <div className="spacer" />
      <div>
        <Marcacao tipo="derivado-do-escore" />
      </div>
    </Pagina>
  )
}
