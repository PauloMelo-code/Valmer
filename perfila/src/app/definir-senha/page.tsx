import { MarcaImpacto, NOME_MARCA } from '@/components/layout/MarcaImpacto'
import { Button } from '@/components/ui/Button'
import ui from '@/styles/common.module.css'
import styles from '../page.module.css'
import { FormularioDefinirSenha } from './FormularioDefinirSenha'

/**
 * Página pública de primeiro acesso (e de nova senha).
 *
 * O Better Auth redireciona o link do e-mail para cá com `?token=` quando o
 * token vale, ou `?error=INVALID_TOKEN` quando expirou ou não existe. O token é
 * a credencial: nada aqui exige sessão (o proxy só cobre /admin e /facilitador).
 * Mesmo molde visual do login, sem o painel decorativo.
 */
export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams
  const valido = Boolean(token) && !error

  return (
    <div className={styles.pagina} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className={styles.coluna}>
        <div className={styles.marca} style={{ display: 'flex' }}>
          <span className={styles.marcaIcone}>
            <MarcaImpacto size={22} cor="var(--color-marca-sobre-escuro)" />
          </span>
          <span className={styles.marcaTexto}>
            <span className={styles.marcaNome}>{NOME_MARCA}</span>
            <span className={styles.marcaLinha}>Análise de perfil comportamental</span>
          </span>
        </div>

        <div className={styles.miolo}>
          <div className={styles.titulo}>
            <p className={styles.saudacao}>Primeiro acesso</p>
            <h1 className={styles.h1}>Defina a sua senha</h1>
            <p className={styles.subtitulo}>
              Escolha uma senha com pelo menos 10 caracteres. Só você vai conhecê-la.
            </p>
          </div>

          {valido ? (
            <FormularioDefinirSenha token={token!} />
          ) : (
            <div className={styles.campos}>
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span>Este link expirou ou não é válido. Peça um novo envio ao administrador.</span>
              </div>
              <Button href="/" variant="secondary" size="lg" block>
                Ir para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
