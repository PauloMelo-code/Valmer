'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { Pill } from '@/components/ui/Pill'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/** Uma aula pronta para desenhar: já sem chave de objeto, já com URL assinada. */
export type AulaNaTela = {
  id: string
  curso: string
  modulo: string
  titulo: string
  /** `mm:ss` lido do próprio arquivo, ou nulo quando o navegador não soube dizer. */
  duracao: string | null
  /** URL assinada, ou nulo quando não há vídeo para tocar agora. */
  video: string | null
  /**
   * Por que não há vídeo — e é por isso que existe, em vez de só `video: null`.
   *
   * `pendente` é a aula que o admin criou e ainda não gravou. `indisponivel` é
   * gravação que EXISTE e o armazenamento não entregou agora. Dizer "pendente"
   * nos dois casos fazia o parceiro achar que a Impacto Academy não publicou o
   * curso, quando o que houve foi o MinIO não responder.
   */
  estado: 'no-ar' | 'pendente' | 'indisponivel'
}

/**
 * O player e a lista de aulas.
 *
 * Cliente só por causa da seleção: qual aula está tocando é estado de tela, não
 * dado de banco. Tudo que ele desenha veio pronto do Server Component ao lado.
 *
 * AULA PENDENTE NÃO SOME. Ela aparece na lista, selecionável, e o player diz
 * que a gravação ainda não subiu. Escondê-la faria o parceiro não saber que a
 * aula existe — e o programa que o admin publicou deixaria de bater com o que
 * ele vê.
 *
 * A LISTA É AGRUPADA POR MÓDULO, e essa é a palavra do pedido: "espelho
 * conforme o admin colocou módulos". Uma lista corrida numerada de 1 a N
 * apagaria justamente a estrutura que o admin montou do outro lado — o parceiro
 * veria vinte aulas soltas onde existem quatro módulos de cinco.
 */
export function Trilha({ aulas }: { aulas: AulaNaTela[] }) {
  const [selecionada, setSelecionada] = useState(0)
  const atual = aulas[selecionada] ?? aulas[0]!
  const disponiveis = aulas.filter((aula) => aula.estado === 'no-ar').length

  // O índice DENTRO do array plano é o que a seleção usa, então ele viaja junto
  // com a aula: numerar de novo dentro do grupo e usar esse número para
  // selecionar tocaria a aula errada a partir do segundo módulo.
  const grupos: { titulo: string; aulas: { aula: AulaNaTela; indice: number }[] }[] = []
  aulas.forEach((aula, indice) => {
    const titulo = `${aula.curso} · ${aula.modulo}`
    const ultimo = grupos.at(-1)
    if (ultimo?.titulo === titulo) ultimo.aulas.push({ aula, indice })
    else grupos.push({ titulo, aulas: [{ aula, indice }] })
  })

  return (
    <AutoGrid min={320} alignStart>
      <Card padding="none" clip>
        <div className={styles.player}>
          {atual.video ? (
            // A URL assinada aceita requisição por faixa, então arrastar a barra
            // funciona mesmo com o bucket privado. `key` força o <video> a
            // recarregar quando a aula muda: sem ele o React reaproveita o
            // elemento e o player continua tocando a aula anterior.
            <video key={atual.id} className={styles.video} src={atual.video} controls playsInline />
          ) : (
            <div className={styles.pendente}>
              <Icon name={atual.estado === 'indisponivel' ? 'alert' : 'play'} size={32} />
              <span>
                {atual.estado === 'indisponivel'
                  ? 'A gravação existe, mas não carregou agora. Recarregue a página em instantes.'
                  : 'Gravação ainda não publicada.'}
              </span>
            </div>
          )}
        </div>
        <div className={styles.aulaInfo}>
          <div className={ui.eyebrow}>
            {atual.curso} · {atual.modulo}
          </div>
          <div className={styles.aulaTitulo}>{atual.titulo}</div>
        </div>
      </Card>

      <Card padding="none" className={styles.lista}>
        <div className={styles.listaCabecalho}>
          <span>Conteúdo</span>
          {/* O número é o que existe de verdade. O "1 de 7 concluídos" da tela
              antiga era constante de build — o mesmo para todo parceiro, para
              sempre —, e progresso por pessoa é outra entrega. */}
          <span className={styles.listaProgresso}>
            {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'} · {disponiveis} no ar
          </span>
        </div>
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <div className={styles.grupoCabecalho}>{grupo.titulo}</div>
            {grupo.aulas.map(({ aula, indice }, dentroDoModulo) => (
              <button
                key={aula.id}
                type="button"
                className={styles.aula}
                aria-current={indice === selecionada}
                onClick={() => setSelecionada(indice)}
              >
                <span
                  className={[styles.marcador, indice === selecionada ? styles.marcadorAtual : null]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {dentroDoModulo + 1}
                </span>
                <span className={styles.aulaNome}>{aula.titulo}</span>
                {aula.estado === 'indisponivel' ? (
                  <Pill tone="warning" size="sm">
                    Indisponível
                  </Pill>
                ) : aula.estado === 'pendente' ? (
                  <Pill tone="neutral" size="sm">
                    Pendente
                  </Pill>
                ) : aula.duracao ? (
                  <span className={styles.listaProgresso}>{aula.duracao}</span>
                ) : null}
                <span className={styles.chevron}>
                  <Icon name="chevR" />
                </span>
              </button>
            ))}
          </div>
        ))}
      </Card>
    </AutoGrid>
  )
}
