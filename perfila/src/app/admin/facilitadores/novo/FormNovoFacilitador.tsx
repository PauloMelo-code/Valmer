'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { criarPelaTela } from '@/lib/actions/facilitadores'
import { moeda } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/** Um pacote vendável, como `precos_pacotes` o entrega. */
export type PacoteOfertado = { nome: string; creditos: number; preco: number }

/**
 * Formulário de cadastro do parceiro.
 *
 * Cliente porque tem estado; a LISTA de pacotes chega pronta do servidor, e não
 * mais de `data/planos.ts`. A action confere o pacote contra `precos_pacotes`
 * dentro da mesma transação que credita, então uma lista fixa aqui ofereceria
 * pacote que o servidor recusa e esconderia o que o admin acabou de criar.
 *
 * Não há campo de senha: o parceiro recebe por e-mail um link para definir a
 * própria. Ver o comentário `ponytail:` em `lib/actions/facilitadores.ts`.
 */
export function FormNovoFacilitador({ pacotes }: { pacotes: PacoteOfertado[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [pacote, setPacote] = useState(pacotes[0]!.nome)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()
  const tituloPacotes = useId()

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    iniciarEnvio(async () => {
      const resposta = await criarPelaTela({ nome, email, empresa, pacote })

      // A recusa — e-mail já cadastrado — volta como objeto para
      // ser mostrada aqui, com o formulário preenchido do lado.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      router.push('/admin/facilitadores')
      // Cadastro e e-mail são passos separados: o parceiro já existe mesmo se o
      // SMTP falhar, então a falha vira aviso (que fica na tela), não erro.
      if (resposta.acesso.ok) {
        toast(`${resposta.nome} cadastrado com ${resposta.creditos} créditos. Acesso enviado por e-mail.`)
      } else {
        toast(
          `Parceiro criado, mas o e-mail não saiu: ${resposta.acesso.erro}. Use Reenviar acesso.`,
          'aviso',
        )
      }
    })
  }

  return (
    <>
      <BackLink href="/admin/facilitadores">Voltar para facilitadores</BackLink>

      <PageHeader
        title="Novo facilitador"
        subtitle="A conta é criada já com o pacote de créditos contratado. O parceiro recebe por e-mail um link para definir a própria senha."
      />

      <Card padding="none" className={styles.form}>
        <form onSubmit={salvar}>
          <div className={styles.corpo}>
            <div className={styles.dupla}>
              <Field label="Nome do responsável">
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
              <Field label="E-mail de acesso">
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

            <Field label="Empresa ou consultoria">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Razão social ou nome do negócio"
                  value={empresa}
                  onChange={(evento) => setEmpresa(evento.target.value)}
                  required
                />
              )}
            </Field>

            <div>
              <div className={ui.cardTitle} id={tituloPacotes}>
                Pacote inicial
              </div>
              <p className={ui.note} style={{ marginBottom: 'var(--space-12)' }}>
                Os créditos entram no saldo assim que a conta é ativada.
              </p>
              <div className={styles.pacotes} role="radiogroup" aria-labelledby={tituloPacotes}>
                {pacotes.map((item) => (
                  <label className={styles.pacote} key={item.nome}>
                    <input
                      className={styles.radio}
                      type="radio"
                      name="pacote"
                      value={item.nome}
                      checked={pacote === item.nome}
                      disabled={enviando}
                      onChange={() => setPacote(item.nome)}
                    />
                    <span className={styles.pacoteNome}>{item.nome}</span>
                    <span className={styles.pacoteCreditos}>{item.creditos}</span>
                    <span className={styles.pacotePreco}>{moeda(item.preco)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Região viva permanente: a recusa chega depois do clique, longe
                de onde se olha, e criada junto com o texto o leitor de tela não
                a anuncia. Mesmo padrão de FormNovoAssessment. */}
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
            <Button href="/admin/facilitadores" variant="ghost">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" icon={<Icon name="check" />} disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar e liberar acesso'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}
