'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { atualizarPelaTela, trocarSenhaPelaTela } from '@/lib/actions/perfil'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Os dois formulários do perfil: cadastro e senha.
 *
 * Separados de propósito. Salvar o telefone não deveria pedir a senha atual, e
 * trocar a senha não deveria regravar o cadastro — juntos, um erro de
 * validação em qualquer campo bloquearia as duas coisas.
 *
 * Quem decide o que pode mudar é a action, não esta tela: os campos que só o
 * admin altera nem chegam aqui como input. A tela é a conveniência; a regra
 * está no servidor, onde o POST direto também passa.
 */
export function FormPerfil({
  nome: nomeInicial,
  empresa: empresaInicial,
  telefone: telefoneInicial,
}: {
  nome: string
  empresa: string
  telefone: string
}) {
  const { toast } = useToast()

  const [nome, setNome] = useState(nomeInicial)
  const [empresa, setEmpresa] = useState(empresaInicial)
  const [telefone, setTelefone] = useState(telefoneInicial)
  const [erroCadastro, setErroCadastro] = useState<string | null>(null)
  const [salvando, salvar] = useTransition()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [trocando, trocar] = useTransition()

  function salvarCadastro(evento: React.FormEvent) {
    evento.preventDefault()
    setErroCadastro(null)

    salvar(async () => {
      const resposta = await atualizarPelaTela({ nome, empresa, telefone })
      if (!resposta.ok) {
        setErroCadastro(resposta.erro)
        return
      }
      toast('Cadastro atualizado.')
    })
  }

  function trocarSenha(evento: React.FormEvent) {
    evento.preventDefault()
    setErroSenha(null)

    // A conferência da nova senha é daqui: o servidor não tem como saber que
    // duas digitações deveriam ser iguais, e um erro de digitação que passa
    // deixa a pessoa com uma senha que ela não sabe qual é.
    if (senhaNova !== confirmacao) {
      setErroSenha('A confirmação não confere com a nova senha.')
      return
    }

    trocar(async () => {
      const resposta = await trocarSenhaPelaTela({
        senha_atual: senhaAtual,
        senha_nova: senhaNova,
      })

      if (!resposta.ok) {
        setErroSenha(resposta.erro)
        return
      }

      setSenhaAtual('')
      setSenhaNova('')
      setConfirmacao('')
      toast('Senha alterada. Use a nova no próximo acesso.')
    })
  }

  return (
    <>
      <Card padding="none">
        <form onSubmit={salvarCadastro}>
          <div className={styles.corpo}>
            <div className={ui.cardTitle}>Seus dados</div>

            <div className={styles.dupla}>
              <Field label="Nome">
                {(id) => (
                  <Input
                    id={id}
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Empresa ou consultoria">
                {(id) => (
                  <Input
                    id={id}
                    placeholder="Opcional"
                    value={empresa}
                    onChange={(evento) => setEmpresa(evento.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field label="Telefone">
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  placeholder="(11) 90000-0000"
                  value={telefone}
                  onChange={(evento) => setTelefone(evento.target.value)}
                />
              )}
            </Field>

            <p className={ui.note}>
              O telefone é o contato impresso no rodapé dos relatórios que você entrega.
            </p>

            <Aviso mensagem={erroCadastro} />
          </div>

          <CardFooter>
            <Button type="submit" variant="primary" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar dados'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card padding="none">
        <form onSubmit={trocarSenha}>
          <div className={styles.corpo}>
            <div className={ui.cardTitle}>Senha</div>
            <p className={ui.note}>
              A senha atual é obrigatória: sem ela, qualquer pessoa que encontrasse esta tela
              aberta trocaria a sua senha e ficaria com a conta.
            </p>

            <Field label="Senha atual">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(evento) => setSenhaAtual(evento.target.value)}
                  required
                />
              )}
            </Field>

            <div className={styles.dupla}>
              <Field label="Nova senha">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Pelo menos 10 caracteres"
                    value={senhaNova}
                    onChange={(evento) => setSenhaNova(evento.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Repita a nova senha">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(evento) => setConfirmacao(evento.target.value)}
                    required
                  />
                )}
              </Field>
            </div>

            <Aviso mensagem={erroSenha} />
          </div>

          <CardFooter>
            <Button type="submit" variant="primary" disabled={trocando}>
              {trocando ? 'Alterando…' : 'Alterar senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}

/**
 * Região viva permanente: a recusa do servidor chega depois do clique, longe
 * de onde se olha, e criada junto com o texto o leitor de tela não a anuncia.
 * Mesmo padrão de acervo-de-mapas/novo/FormNovoAssessment.tsx.
 *
 * Exportado porque `FotoPerfil.tsx`, na mesma tela, mostra a recusa do envio no
 * mesmo formato — duas cópias da mesma caixa é onde uma delas para de anunciar.
 */
export function Aviso({ mensagem }: { mensagem: string | null }) {
  return (
    <div role="status" aria-live="polite">
      {mensagem ? (
        <div className={`${ui.callout} ${ui.calloutWarning}`}>
          <span className={ui.calloutIcon}>
            <Icon name="alert" />
          </span>
          <span>{mensagem}</span>
        </div>
      ) : null}
    </div>
  )
}
