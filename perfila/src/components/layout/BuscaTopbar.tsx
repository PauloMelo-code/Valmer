'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { buscar, type ResultadoBusca } from '@/lib/actions/busca'
import styles from './BuscaTopbar.module.css'

/** Espera entre a última tecla e a consulta. */
const ESPERA_MS = 250

/** O mesmo mínimo da action, para a tela não pedir o que ela recusaria. */
const MINIMO = 2

const ROTULO_GRUPO = {
  avaliado: 'Avaliados',
  turma: 'Grupos de Mapeamento',
} as const

/**
 * BuscaTopbar
 * -----------
 * A busca da barra superior. Consulta o servidor, que aplica o recorte por
 * dono: esta tela nunca recebe o que não é de quem está logado.
 *
 * A consulta espera a digitação parar. Sem isso seria uma ida ao banco por
 * tecla — e a resposta de "Mar" podia chegar depois da de "Maria" e sobrescrevê-la
 * na tela. O contador de pedidos descarta a resposta atrasada.
 */
export function BuscaTopbar({ placeholder }: { placeholder: string }) {
  const [termo, setTermo] = useState('')
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)
  const [aberto, setAberto] = useState(false)
  const pedido = useRef(0)
  const caixa = useRef<HTMLDivElement>(null)

  const texto = termo.trim()

  useEffect(() => {
    if (texto.length < MINIMO) {
      setResultado(null)
      return
    }

    const meu = pedido.current + 1
    pedido.current = meu

    const timer = setTimeout(async () => {
      try {
        const resposta = await buscar(texto)
        if (meu !== pedido.current) return
        setResultado(resposta)
        setAberto(true)
      } catch {
        // Sessão vencida no meio da digitação é o caso comum aqui. Continuar
        // mostrando o resultado anterior seria mentir sobre o que existe.
        if (meu === pedido.current) setResultado(null)
      }
    }, ESPERA_MS)

    return () => clearTimeout(timer)
  }, [texto])

  // Clique fora fecha. Sem isto o painel ficava por cima da tela depois de a
  // pessoa desistir da busca e ir clicar em outra coisa.
  useEffect(() => {
    if (!aberto) return

    function aoClicar(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false)
    }

    document.addEventListener('mousedown', aoClicar)
    return () => document.removeEventListener('mousedown', aoClicar)
  }, [aberto])

  const grupos = (['avaliado', 'turma'] as const)
    .map((tipo) => ({ tipo, itens: resultado?.itens.filter((item) => item.tipo === tipo) ?? [] }))
    .filter((grupo) => grupo.itens.length > 0)

  const vazio = resultado !== null && resultado.itens.length === 0

  return (
    <div className={styles.caixa} ref={caixa}>
      {/* `label` e não `div`: no telefone o campo encolhe até o ícone, e é o
          toque no ícone que precisa dar foco ao input — o label faz isso sem
          um onClick e sem uma ref. */}
      <label className={styles.campo}>
        <Icon name="search" size={16} />
        <input
          type="search"
          className={styles.input}
          placeholder={placeholder}
          aria-label={placeholder}
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          onFocus={() => setAberto(true)}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') setAberto(false)
          }}
        />
      </label>

      {aberto && resultado ? (
        <div className={styles.painel}>
          {grupos.map((grupo) => (
            <div key={grupo.tipo}>
              <div className={styles.grupo}>{ROTULO_GRUPO[grupo.tipo]}</div>
              {grupo.itens.map((item) =>
                item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={styles.item}
                    onClick={() => setAberto(false)}
                  >
                    <span className={styles.titulo}>{item.titulo}</span>
                    <span className={styles.detalhe}>{item.detalhe}</span>
                  </Link>
                ) : (
                  // Turma encontrada pelo admin: existe, é dele de direito, e
                  // não há tela de turmas na administração. Mostrar sem link é
                  // mais honesto do que esconder ou levar a uma tela errada.
                  <div key={item.id} className={`${styles.item} ${styles.semLink}`}>
                    <span className={styles.titulo}>{item.titulo}</span>
                    <span className={styles.detalhe}>{item.detalhe} · sem tela própria aqui</span>
                  </div>
                ),
              )}
            </div>
          ))}

          {vazio ? <div className={styles.aviso}>Nada encontrado para “{texto}”.</div> : null}

          {/* Truncar em silêncio faz a pessoa concluir que o registro não
              existe. O aviso diz que a lista foi cortada e o que fazer. */}
          {resultado.truncado ? (
            <div className={styles.aviso}>
              Há mais resultados do que cabem aqui. Refine a busca.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
