'use client'

/**
 * A tela final do inventario MC-INV 2.2: o relatorio sai daqui.
 *
 * Antes a pessoa terminava num "Pronto" sem mais nada, e o relatorio so
 * chegava pelas maos de quem enviou o convite. Pedido do Valmer (reuniao de
 * 28/09/2026): a pessoa abre e salva o proprio relatorio no fim. O texto da IA
 * leva um tempo depois do fecho, entao a tela avisa que esta preparando e
 * pergunta ao servidor, de tempos em tempos, se ja ficou pronto. O mesmo link
 * reaberto depois cai aqui (page.tsx), com o relatorio pronto para abrir.
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { CONCLUSAO } from '@/data/inventario-mc-textos'
import { relatorioPronto } from '@/lib/actions/inventario-mc'
import styles from './InventarioMC.module.css'

/** De quanto em quanto tempo a tela pergunta se o relatorio ficou pronto. */
const CONFERIR_A_CADA_MS = 5_000
/** Depois disto sem ficar pronto, a tela diz que pode fechar e voltar pelo link. */
const DEMORA_MS = 3 * 60_000

export function Conclusao({ token }: { token: string }) {
  const [pronto, setPronto] = useState(false)
  const [demorou, setDemorou] = useState(false)

  useEffect(() => {
    if (pronto) return
    let vivo = true
    const inicio = Date.now()
    const conferir = async () => {
      // Rede que caiu num intervalo nao e erro para a pessoa: a proxima volta tenta de novo.
      const ok = await relatorioPronto(token).catch(() => false)
      if (!vivo) return
      if (ok) setPronto(true)
      else if (Date.now() - inicio > DEMORA_MS) setDemorou(true)
    }
    void conferir()
    const relogio = setInterval(conferir, CONFERIR_A_CADA_MS)
    return () => {
      vivo = false
      clearInterval(relogio)
    }
  }, [pronto, token])

  return (
    <>
      <span className={styles.selo}>
        <Icon name="check" size={26} strokeWidth={2.2} />
      </span>
      <p className={styles.texto}>{CONCLUSAO.texto}</p>
      {pronto ? (
        <>
          <p className={styles.texto} role="status">
            {CONCLUSAO.pronto}
          </p>
          <Button variant="primary" size="lg" block href={`/relatorio/${token}`}>
            {CONCLUSAO.abrir}
          </Button>
          <Button variant="secondary" size="lg" block href={`/relatorio/${token}?imprimir=1`}>
            {CONCLUSAO.salvar}
          </Button>
        </>
      ) : (
        <>
          {demorou ? null : <div className={styles.preparando} aria-hidden="true" />}
          <p className={styles.texto} role="status">
            {demorou ? CONCLUSAO.demorando : CONCLUSAO.preparando}
          </p>
        </>
      )}
      <p className={styles.texto}>{CONCLUSAO.devolutiva}</p>
    </>
  )
}
