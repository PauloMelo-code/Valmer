'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { definicaoDe } from '@/data/inventario-mc-definicoes'
import { ETAPAS, TEXTOS_TELA, rotulosJung } from '@/data/inventario-mc-textos'
import type { TelaDePar } from '@/lib/inventario/roteiro'
import styles from './InventarioMC.module.css'

/**
 * Um par de Jung (etapa 3), como o `renderPar` do prototipo: quatro botoes
 * da esquerda para a direita, e o toque avanca sozinho 180 ms depois — o
 * bastante para ver a marcacao. O lado de cada palavra vem do roteiro; o
 * servidor refaz a mesma conta e nao le o lado que o navegador diria.
 */
export function TelaPar({
  par,
  salva,
  podeVoltar,
  onVoltar,
  onResponder,
}: {
  par: TelaDePar
  /** Botao ja gravado (0..3), para o "Voltar". */
  salva: number | undefined
  podeVoltar: boolean
  onVoltar: () => void
  onResponder: (botao: number) => void
}) {
  const [marcado, setMarcado] = useState<number | undefined>(salva)
  const [aberta, setAberta] = useState<'esq' | 'dir' | null>(null)
  const avanco = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (avanco.current) clearTimeout(avanco.current)
  }, [])

  const esquerda = par.poloAEsquerda ? par.poloA : par.poloB
  const direita = par.poloAEsquerda ? par.poloB : par.poloA
  const rotulos = rotulosJung(esquerda, direita)

  function responder(botao: number) {
    if (avanco.current) return // segundo toque durante a animacao
    setMarcado(botao)
    avanco.current = setTimeout(() => onResponder(botao), 180)
  }

  const palavra = (texto: string, lado: 'esq' | 'dir') => (
    <span className={[styles.palavra, lado === 'dir' ? styles.palavraDireita : null].filter(Boolean).join(' ')}>
      {lado === 'dir' ? ajuda(texto, lado) : null}
      {texto}
      {lado === 'esq' ? ajuda(texto, lado) : null}
    </span>
  )

  const ajuda = (texto: string, lado: 'esq' | 'dir') =>
    definicaoDe(texto) ? (
      <button
        type="button"
        className={`${styles.ajuda} ${styles.ajudaPequena}`}
        aria-expanded={aberta === lado}
        aria-controls={`def-${par.id}`}
        aria-label={`${TEXTOS_TELA.definicao}: ${texto}`}
        onClick={() => setAberta(aberta === lado ? null : lado)}
      >
        ?
      </button>
    ) : null

  return (
    <Card padding="lg">
      <div className={styles.pilha}>
        <h1 id="mc-pergunta" tabIndex={-1} className={styles.pergunta}>Para qual lado você pende?</h1>
        <div className={styles.par}>
          {palavra(esquerda, 'esq')}
          <span className={styles.ou}>ou</span>
          {palavra(direita, 'dir')}
        </div>
        {aberta ? (
          <p id={`def-${par.id}`} className={styles.definicao}>
            <b>{aberta === 'esq' ? esquerda : direita}:</b> {definicaoDe(aberta === 'esq' ? esquerda : direita)}
          </p>
        ) : null}

        <div className={styles.opcoes} role="group" aria-label={`${esquerda} ou ${direita}`}>
          {rotulos.map((rotulo, botao) => (
            <button
              key={rotulo}
              type="button"
              className={styles.opcao}
              aria-pressed={marcado === botao}
              onClick={() => responder(botao)}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <p className={styles.miudo}>{ETAPAS[3].comoResponder}</p>
      </div>

      <div className={styles.navegacao}>
        <Button variant="ghost" icon={<Icon name="chevL" size={16} />} disabled={!podeVoltar} onClick={onVoltar}>
          Voltar
        </Button>
      </div>
    </Card>
  )
}
