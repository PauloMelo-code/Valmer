'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { login } from '@/lib/actions/auth'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Formulário de entrada.
 *
 * O destino vem do servidor, e não daqui: é o papel do usuário que decide
 * entre /admin e /facilitador, e essa decisão não pode depender de nada que
 * o navegador possa alterar.
 */
export function FormularioLogin({ proximo }: { proximo?: string }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setEnviando(true)
    setErro(null)

    try {
      const resposta = await login(String(dados.get('email')), String(dados.get('senha')))

      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      // `proximo` só é honrado quando aponta para dentro da plataforma: um
      // valor como //site.com passaria por um teste ingênuo de "começa com /"
      // e mandaria a pessoa logada para fora.
      const interno = proximo && proximo.startsWith('/') && !proximo.startsWith('//')
      router.push(interno ? proximo : resposta.destino)
      router.refresh()
    } catch {
      setErro('Não foi possível entrar agora. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className={styles.campos} onSubmit={entrar}>
      <Field label="E-mail">
        {(id) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nome@empresa.com.br"
            required
          />
        )}
      </Field>
      <Field label="Senha">
        {(id) => (
          <Input
            id={id}
            name="senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        )}
      </Field>

      {/* Região viva permanente: criada junto com o texto, o leitor de tela
          não anuncia o erro de forma confiável. */}
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

      <Button type="submit" variant="primary" size="lg" block disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>

      {/* Não é um link, e isso é a informação: não há "esqueci minha senha"
          aberto ao público (qualquer um dispararia e-mail para qualquer
          endereço). Quem esquece a senha pede ao admin, que reenvia o link de
          acesso por e-mail em /admin/facilitadores. */}
      <p className={styles.esqueci}>
        Esqueceu a senha? Peça ao administrador da Impacto Academy para definir uma nova.
      </p>
    </form>
  )
}
