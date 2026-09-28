'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { criarPelaTela } from '@/lib/actions/territorios'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Cadastro do território, gravando no banco.
 *
 * O formulário tem os dois campos que a tabela tem: nome e descrição. O
 * endereço (slug) sai do nome no servidor — pedir ao parceiro um
 * "identificador da URL" é pedir que ele resolva um problema nosso.
 *
 * Vincular grupo e inventário NÃO estão aqui, e a razão é dura: o vínculo
 * aponta para um território, e antes do Salvar não existe território para
 * apontar. Guardar as escolhas em memória e aplicá-las depois do Salvar daria
 * um caminho em que o território é criado e os vínculos falham — o parceiro
 * veria "criado" com a lista vazia e sem saber o que não entrou. Então o Salvar
 * leva direto ao território, onde vincular, desvincular e remover são o
 * conteúdo da tela e cada clique grava sozinho.
 */
export default function NovoTerritorioPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, iniciarGravacao] = useTransition()

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    iniciarGravacao(async () => {
      const resposta = await criarPelaTela({ nome, descricao })

      // A recusa vem como objeto justamente para ser mostrada aqui, com o
      // formulário preenchido do lado. Esta tela avisava que não gravava;
      // agora grava, e o aviso segue o resultado de verdade.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      // Vai para o território recém-criado, e não para a lista: o passo
      // seguinte é vincular os inventários, e é lá que isso acontece.
      router.push(`/facilitador/territorio-da-empresa/${resposta.dado.slug}`)
      toast(`Território "${resposta.dado.nome}" criado. Agora vincule os inventários.`)
    })
  }

  return (
    <>
      <BackLink href="/facilitador/territorio-da-empresa">
        Voltar para Território da Empresa
      </BackLink>

      <PageHeader
        title="Novo território"
        subtitle="Dê um nome à empresa. Os grupos de mapeamento e os inventários são vinculados em seguida."
      />

      <AutoGrid min={300} alignStart>
        <div className={styles.coluna}>
          <Card padding="lg" className={styles.formulario}>
            <form onSubmit={salvar} className={styles.formulario}>
              <Field label="Nome">
                {(id) => (
                  <Input
                    id={id}
                    placeholder="Nome da empresa"
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    required
                    minLength={3}
                    maxLength={160}
                  />
                )}
              </Field>
              <Field label="Descrição">
                {(id) => (
                  <Textarea
                    id={id}
                    rows={3}
                    placeholder="Digite aqui…"
                    value={descricao}
                    onChange={(evento) => setDescricao(evento.target.value)}
                    maxLength={1000}
                  />
                )}
              </Field>

              {/* Região viva permanente: a recusa chega depois do clique, longe
                  de onde se olha, e criada junto com o texto nenhum leitor de
                  tela a anunciaria. Mesmo padrão do formulário de novo grupo. */}
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

              <div className={styles.acoes}>
                <Button href="/facilitador/territorio-da-empresa" variant="ghost">
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={gravando}>
                  {gravando ? 'Salvando…' : 'Salvar território'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <Card>
          <div className={styles.explicacaoTitulo}>O que é um Território da Empresa?</div>
          <p className={ui.prose}>
            O Território da Empresa consolida os perfis DISC de uma equipe e mostra o comportamento
            predominante dela. Depois de salvar, a tela do território abre com o botão de adicionar
            inventário e o de trazer um grupo de mapeamento inteiro de uma vez.
          </p>
        </Card>
      </AutoGrid>
    </>
  )
}
