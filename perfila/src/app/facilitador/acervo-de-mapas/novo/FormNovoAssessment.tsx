'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { criarPelaTela } from '@/lib/actions/assessments'
import { getTipoRelatorio, tiposRelatorio, type CodigoRelatorio } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Formulário do novo assessment.
 *
 * O saldo chega por prop, lido do banco pela página: é ele que decide quais
 * níveis de relatório cabem. Buscar aqui exigiria uma rota de API para uma
 * informação que a tela já tem antes de renderizar.
 *
 * O saldo mostrado é do momento em que a tela abriu, e serve para orientar a
 * escolha — quem cobra o crédito de fato é a action, que relê o saldo com a
 * linha travada dentro da mesma transação que grava o assessment. Por isso o
 * botão continua podendo ser recusado com o saldo aparentemente suficiente: o
 * crédito pode ter sido gasto em outra aba enquanto esta tela estava aberta.
 */
export function FormNovoAssessment({ creditos }: { creditos: number }) {
  const { toast } = useToast()
  const router = useRouter()
  const [codigo, setCodigo] = useState<CodigoRelatorio>('S1')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()
  const tituloTipos = useId()

  const escolhido = getTipoRelatorio(codigo)
  const saldoDepois = creditos - escolhido.creditos
  const semSaldo = saldoDepois < 0

  function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    iniciarEnvio(async () => {
      const resposta = await criarPelaTela({
        avaliado_nome: nome,
        avaliado_email: email,
        tipo_relatorio: codigo,
      })

      // A recusa vem como objeto justamente para poder ser mostrada aqui, com
      // o formulário preenchido do lado. Antes esta tela navegava e avisava
      // "Assessment criado" sem ter criado nada.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      // Sem `router.refresh()` aqui: chamado antes do `push` ele atualizava a
      // rota que está saindo, e a navegação seguinte servia o layout do cache
      // mesmo assim — a lista dizia 11 créditos e o chip da barra lateral,
      // 12. Quem invalida agora é o `revalidatePath` da própria action, que
      // derruba o layout e tudo abaixo dele antes desta navegação acontecer.
      router.push('/facilitador/acervo-de-mapas')
      toast(`Mapa comportamental criado para ${nome.trim()}. O link está na lista.`)
    })
  }

  return (
    <Card padding="none" className={styles.form}>
      <form onSubmit={criar}>
        <div className={styles.corpo}>
          <div className={styles.dupla}>
            <Field label="Nome do avaliado">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="E-mail do avaliado">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <div>
            <div className={ui.cardTitle} id={tituloTipos}>
              Tipo de relatório
            </div>
            <p className={ui.note} style={{ marginBottom: 'var(--space-12)' }}>
              Quanto mais completo o relatório, mais créditos ele consome.
            </p>

            {/* O título só existia como texto: quem navega por teclado caía nos
                rádios sem ouvir de que escolha eles são. O grupo empresta o nome
                do título que já está na tela. */}
            <div className={styles.tipos} role="radiogroup" aria-labelledby={tituloTipos}>
              {tiposRelatorio.map((tipo) => {
                const cabeNoSaldo = tipo.creditos <= creditos
                return (
                  <label
                    key={tipo.codigo}
                    className={[styles.tipo, cabeNoSaldo ? null : styles.indisponivel]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <input
                      className={styles.radio}
                      type="radio"
                      name="tipo"
                      value={tipo.codigo}
                      checked={codigo === tipo.codigo}
                      disabled={!cabeNoSaldo || enviando}
                      onChange={() => setCodigo(tipo.codigo)}
                    />
                    <span className={styles.tipoTopo}>
                      <span className={styles.tipoCodigo}>{tipo.codigo}</span>
                      <span className={ui.cardSub}>
                        {tipo.creditos} {tipo.creditos === 1 ? 'crédito' : 'créditos'}
                      </span>
                    </span>
                    <span className={styles.tipoNome}>{tipo.nome}</span>
                    <span className={styles.tipoConteudo}>{tipo.conteudo}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className={styles.resumo}>
            <span>
              Saldo atual: <strong>{creditos}</strong> · este mapa consome{' '}
              <strong>{escolhido.creditos}</strong>
            </span>
            <span>
              Fica com{' '}
              <span
                className={[styles.resumoValor, semSaldo ? styles.negativo : null]
                  .filter(Boolean)
                  .join(' ')}
              >
                {saldoDepois}
              </span>
            </span>
          </div>

          {/* Região viva permanente: o aviso aparece ao trocar de nível, longe do
              foco, e criado junto com o texto o leitor de tela não o anuncia.
              Mesmo padrão de components/respondente/RankList.tsx. Vazia, esta div
              não ocupa espaço nem desenha nada. A recusa do servidor entra aqui
              pelo mesmo motivo: chega depois do clique, longe de onde se olha. */}
          <div role="status" aria-live="polite">
            {semSaldo ? (
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span className={ui.calloutIcon}>
                  <Icon name="alert" />
                </span>
                <span>
                  Seu saldo não cobre este relatório. Compre créditos ou escolha um nível menor.
                </span>
              </div>
            ) : null}
            {erro ? (
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span className={ui.calloutIcon}>
                  <Icon name="alert" />
                </span>
                <span>{erro}</span>
              </div>
            ) : null}
          </div>
        </div>

        <CardFooter>
          <Button href="/facilitador/acervo-de-mapas" variant="ghost">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Icon name="link" />}
            disabled={semSaldo || enviando}
          >
            {enviando ? 'Criando…' : 'Criar link do avaliado'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
