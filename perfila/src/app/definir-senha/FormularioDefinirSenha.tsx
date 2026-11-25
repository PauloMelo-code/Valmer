'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { definirSenhaPeloLink } from '@/lib/actions/definir-senha'
import ui from '@/styles/common.module.css'
import styles from '../page.module.css'

/** Aviso de erro/sucesso no mesmo molde do login. */
function Aviso({ texto, tom }: { texto: string; tom: 'warning' | 'success' }) {
  return (
    <div className={`${ui.callout} ${tom === 'warning' ? ui.calloutWarning : ''}`}>
      <span className={ui.calloutIcon}>
        <Icon name={tom === 'warning' ? 'alert' : 'check'} />
      </span>
      <span>{texto}</span>
    </div>
  )
}

export function FormularioDefinirSenha({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setEnviando(true)
    setErro(null)

    try {
      const resposta = await definirSenhaPeloLink(
        token,
        String(dados.get('senha')),
        String(dados.get('confirmacao')),
      )
      if (resposta.ok) setPronto(true)
      else
        setErro(
          resposta.linkInvalido
            ? `${resposta.erro} Peça um novo envio ao administrador.`
            : resposta.erro,
        )
    } catch {
      setErro('Não foi possível salvar agora. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (pronto) {
    return (
      <div className={styles.campos}>
        <Aviso tom="success" texto="Senha definida. Agora você já pode entrar." />
        <Button href="/" variant="primary" size="lg" block>
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <form className={styles.campos} onSubmit={salvar}>
      <Field label="Nova senha">
        {(id) => (
          <Input
            id={id}
            name="senha"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 10 caracteres"
            minLength={10}
            required
          />
        )}
      </Field>
      <Field label="Confirmar a senha">
        {(id) => (
          <Input id={id} name="confirmacao" type="password" autoComplete="new-password" minLength={10} required />
        )}
      </Field>

      <div role="status" aria-live="polite">
        {erro ? <Aviso tom="warning" texto={erro} /> : null}
      </div>

      <Button type="submit" variant="primary" size="lg" block disabled={enviando}>
        {enviando ? 'Salvando…' : 'Definir senha'}
      </Button>
    </form>
  )
}
