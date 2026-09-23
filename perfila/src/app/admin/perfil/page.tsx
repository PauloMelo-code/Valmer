import { PageHeader } from '@/components/ui/PageHeader'
import { exigirSessaoNaTela } from '@/lib/auth/tela'
import { BASE_ADMIN } from '@/lib/routes'
import { urlAssinadaOuNula } from '@/lib/storage'
import { initials } from '@/lib/text'
import { FormPerfil } from '../../facilitador/perfil/FormPerfil'
import { FotoPerfil } from '../../facilitador/perfil/FotoPerfil'
import styles from '../../facilitador/perfil/page.module.css'

/**
 * Perfil de quem administra a plataforma.
 *
 * Existe porque /facilitador/perfil é fechada para o admin — o layout do portal
 * do parceiro o manda para /admin —, e sem esta tela o dono da plataforma seria
 * a única pessoa sem como enviar a própria foto. Ela é a mesma foto que aparece
 * na vitrine de mentores: ver `/facilitador/guias-de-expedicao`.
 *
 * Reaproveita os componentes e o estilo da tela do parceiro, na pasta ao lado,
 * pelo mesmo motivo de `admin/facilitadores/[id]/FormFacilitador.tsx`: são o
 * mesmo formulário, sobre a mesma tabela e as mesmas três colunas. Uma segunda
 * cópia divergiria no primeiro ajuste.
 *
 * Não repete o card "Dados da conta" do parceiro: papel, créditos e situação
 * são o que a administração define, e mostrá-los ao próprio administrador seria
 * ler de volta o que ele mesmo decide.
 */
export default async function PerfilAdminPage() {
  const { sessao, conta } = await exigirSessaoNaTela(`${BASE_ADMIN}/perfil`)
  const foto = await urlAssinadaOuNula(conta.imagem)

  return (
    <>
      <PageHeader title="Perfil" subtitle="Seus dados e a foto que aparece na plataforma." />

      <div className={styles.coluna}>
        <FotoPerfil foto={foto} iniciais={initials(sessao.nome)} />

        <FormPerfil
          nome={sessao.nome}
          empresa={conta.empresa ?? ''}
          telefone={conta.telefone ?? ''}
        />
      </div>
    </>
  )
}
