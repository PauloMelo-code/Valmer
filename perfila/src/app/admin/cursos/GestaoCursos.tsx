'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Row, Stack } from '@/components/ui/Layout'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { alternarPublicacaoPelaTela, criarPelaTela } from '@/lib/actions/cursos'
import type { CursoComPrograma } from '@/lib/ead'
import type { Curso } from '@/lib/db/schema'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'
import { Programa } from './Programa'

const DATA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

/**
 * Criação e publicação dos cursos.
 *
 * A lista chega pronta do servidor e as actions invalidam `/admin/cursos`, então
 * esta tela não guarda cópia dos cursos: depois de gravar, quem redesenha é o
 * Next com a leitura nova. Estado aqui é só o do formulário.
 *
 * O `updated_at` de cada linha viaja com o botão de publicar porque a action
 * compara os dois: se outra aba mexeu no curso, a gravação é recusada em vez de
 * passar por cima.
 */
export function GestaoCursos({ cursos }: { cursos: CursoComPrograma[] }) {
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, iniciarGravacao] = useTransition()

  function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    iniciarGravacao(async () => {
      const resposta = await criarPelaTela({ titulo, descricao, conteudo })

      // A recusa volta como objeto justamente para ser mostrada aqui, com o
      // formulário preenchido do lado. Limpar antes de saber que gravou
      // apagaria o texto do curso na cara de quem escreveu.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      setTitulo('')
      setDescricao('')
      setConteudo('')
      toast(`Curso "${titulo.trim()}" criado como rascunho.`)
    })
  }

  function alternar(curso: Curso) {
    setErro(null)

    iniciarGravacao(async () => {
      const resposta = await alternarPublicacaoPelaTela(
        curso.id,
        !curso.publicado,
        curso.updated_at,
      )

      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      toast(curso.publicado ? 'Curso tirado do ar.' : 'Curso publicado.')
    })
  }

  return (
    <Stack gap={16}>
      <Card padding="none">
        <CardHeader title="Novo curso" />
        <form onSubmit={criar}>
          <div className={styles.corpo}>
            <Field label="Título">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Ex.: Decifre e Influencie Pessoas"
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Descrição">
              {(id) => (
                <Textarea
                  id={id}
                  rows={2}
                  placeholder="Uma frase sobre o que o aluno leva do curso."
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  required
                />
              )}
            </Field>

            {/* A EMENTA, e não o programa. Módulo e aula deixaram de ser texto
                corrido e viraram tabela (`db/schema/ead.ts`): eles se cadastram
                no bloco "Programa" de cada curso, logo abaixo. O que fica aqui
                é a prosa que descreve o curso — o endereço da aula não mora
                mais num textarea que ninguém consegue ordenar nem espelhar. */}
            <Field label="Ementa">
              {(id) => (
                <Textarea
                  id={id}
                  rows={6}
                  placeholder="O que o curso cobre, para quem é e o que o aluno leva."
                  value={conteudo}
                  onChange={(evento) => setConteudo(evento.target.value)}
                  required
                />
              )}
            </Field>

            {/* Região viva permanente: a recusa chega depois do clique, longe de
                onde se olha, e criada junto com o texto o leitor de tela não a
                anuncia. Mesmo padrão de assessments/novo/FormNovoAssessment. */}
            <div role="status" aria-live="polite">
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
            <Button type="submit" variant="primary" icon={<Icon name="plus" />} disabled={gravando}>
              {gravando ? 'Salvando…' : 'Criar curso'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {cursos.length === 0 ? (
        <Card padding="none">
          <EmptyState>
            Nenhum curso criado ainda. O primeiro que você salvar aparece aqui como rascunho.
          </EmptyState>
        </Card>
      ) : (
        cursos.map((curso) => (
          <Card key={curso.id}>
            <Stack gap={10}>
              <Row gap={12} align="baseline" justify="space-between" wrap>
                <div>
                  <div className={ui.cardTitle}>{curso.titulo}</div>
                  <div className={ui.cardSub}>{curso.descricao}</div>
                </div>
                <Pill tone={curso.publicado ? 'success' : 'neutral'} dot>
                  {curso.publicado ? 'No ar' : 'Rascunho'}
                </Pill>
              </Row>

              {/* <details> nativo: o conteúdo é longo e quase sempre a lista é
                  consultada para conferir o que está no ar, não para reler o
                  curso inteiro. */}
              <details>
                <summary className={ui.note}>Ver ementa</summary>
                <p className={ui.prose} style={{ whiteSpace: 'pre-wrap' }}>
                  {curso.conteudo}
                </p>
              </details>

              {/* O programa de verdade: é isto que /facilitador/biblioteca-gravada espelha. */}
              <Programa curso={curso} />

              <Row gap={12} justify="space-between" wrap>
                <span className={ui.note}>
                  {curso.publicado_em
                    ? `No ar desde ${DATA_BR.format(curso.publicado_em)}`
                    : `Criado em ${DATA_BR.format(curso.created_at)}`}
                </span>
                <Button
                  variant={curso.publicado ? 'secondary' : 'primary'}
                  icon={<Icon name={curso.publicado ? 'ban' : 'check'} />}
                  disabled={gravando}
                  onClick={() => alternar(curso)}
                >
                  {curso.publicado ? 'Tirar do ar' : 'Publicar'}
                </Button>
              </Row>
            </Stack>
          </Card>
        ))
      )}
    </Stack>
  )
}
