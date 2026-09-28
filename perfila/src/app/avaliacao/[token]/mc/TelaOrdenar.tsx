'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { GRUPOS_DISC, GRUPOS_VALORES } from '@/data/inventario-mc'
import { definicaoDe } from '@/data/inventario-mc-definicoes'
import { TEXTOS_TELA } from '@/data/inventario-mc-textos'
import { comGenero } from '@/lib/inventario/roteiro'
import styles from './InventarioMC.module.css'

/** id do item -> texto cru do inventario (a chave das definicoes). */
const TEXTO = new Map<string, string>(
  [...GRUPOS_DISC, ...GRUPOS_VALORES].flatMap((g) => g.itens.map((i) => [i.id, i.texto] as const)),
)

/** A pergunta de cada etapa, como no prototipo do Valmer. */
const PERGUNTA = {
  1: 'Qual combina mais com você?',
  2: 'Como a sua rotina pede que você seja?',
  4: 'O que mais importa para você?',
} as const

/**
 * Ordenar tocando, exatamente como o prototipo (`renderRank`): o toque da a
 * proxima posicao; com n-1 tocadas a ultima entra sozinha; tocar numa ja
 * escolhida desfaz dali em diante. Os itens sao botoes, entao Tab + Enter
 * ordena sem mouse.
 */
export function TelaOrdenar({
  etapa,
  inicial,
  salva,
  podeVoltar,
  onVoltar,
  onAvancar,
}: {
  etapa: 1 | 2 | 4
  /** Ids na ordem exibida de inicio (roteiro da semente). */
  inicial: readonly string[]
  /** Ordem ja gravada desta tela, para o "Voltar" mostrar o que foi dado. */
  salva: readonly string[] | undefined
  podeVoltar: boolean
  onVoltar: () => void
  onAvancar: (ordem: string[]) => void
}) {
  const [ordem, setOrdem] = useState<string[]>(() => (salva ? [...salva] : []))
  const [aberta, setAberta] = useState<string | null>(null)
  const n = inicial.length
  const completa = ordem.length === n

  function tocar(id: string) {
    const k = ordem.indexOf(id)
    if (k >= 0) {
      setOrdem(ordem.slice(0, k))
      return
    }
    const nova = [...ordem, id]
    if (nova.length === n - 1) nova.push(inicial.find((x) => !nova.includes(x))!)
    setOrdem(nova)
  }

  const dica = completa
    ? `Ordem completa. ${TEXTOS_TELA.desfazer}`
    : ordem.length === 0
      ? etapa === 4
        ? 'Toque primeiro no que mais importa.'
        : 'Toque primeiro na palavra que mais combina.'
      : `Agora a ${ordem.length + 1}ª opção.`

  return (
    <Card padding="lg">
      <div className={styles.pilha}>
        <h1 id="mc-pergunta" tabIndex={-1} className={styles.pergunta}>{PERGUNTA[etapa]}</h1>
        <p className={styles.dica} aria-live="polite">
          {dica}
        </p>

        <ul className={styles.itens}>
          {inicial.map((id) => {
            const texto = TEXTO.get(id)!
            const exibido = etapa === 4 ? texto : comGenero(texto)
            const k = ordem.indexOf(id)
            const definicao = definicaoDe(texto)
            return (
              <li key={id}>
                <div className={styles.linha}>
                  <button
                    type="button"
                    className={styles.item}
                    aria-pressed={k >= 0}
                    aria-label={k >= 0 ? `${exibido}, posição ${k + 1}` : exibido}
                    onClick={() => tocar(id)}
                  >
                    <span className={styles.num} aria-hidden>
                      {k >= 0 ? k + 1 : ''}
                    </span>
                    {exibido}
                  </button>
                  {definicao ? (
                    <button
                      type="button"
                      className={styles.ajuda}
                      aria-expanded={aberta === id}
                      aria-controls={`def-${id}`}
                      aria-label={`${TEXTOS_TELA.definicao}: ${exibido}`}
                      onClick={() => setAberta(aberta === id ? null : id)}
                    >
                      ?
                    </button>
                  ) : null}
                </div>
                {definicao && aberta === id ? (
                  <p id={`def-${id}`} className={styles.definicao}>
                    {definicao}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>

        <Button variant="ghost" size="sm" className={styles.limpar} onClick={() => setOrdem([])} disabled={ordem.length === 0}>
          Limpar e reordenar
        </Button>
      </div>

      <div className={styles.navegacao}>
        <Button variant="ghost" icon={<Icon name="chevL" size={16} />} disabled={!podeVoltar} onClick={onVoltar}>
          Voltar
        </Button>
        <Button
          variant="primary"
          iconRight={<Icon name="chevR" size={16} />}
          disabled={!completa}
          title={completa ? undefined : TEXTOS_TELA.avancarBloqueado}
          onClick={() => onAvancar(ordem)}
        >
          {TEXTOS_TELA.avancar}
        </Button>
      </div>
    </Card>
  )
}
