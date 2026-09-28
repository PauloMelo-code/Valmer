import { listar } from '@/lib/actions/territorios'
import { ListaTerritorios } from './ListaTerritorios'

/**
 * Territórios da Empresa do parceiro, vindos do banco.
 *
 * Server Component: a consulta acontece aqui, com sessão e escopo do dono no
 * WHERE, e a interatividade (filtros, formulário de edição, ações da linha)
 * fica no componente cliente ao lado. Mesmo desenho do Perfil Ideal por Cargo.
 *
 * Esta tela lia `data/dna.ts` — quatro empresas fixas, com as médias escritas à
 * mão. Ninguém cadastrava nada e nada do que aparecia era de quem estava logado.
 *
 * As datas são formatadas aqui, e não no cliente: o servidor roda em UTC e o
 * navegador no fuso de quem abre a tela, então formatar dos dois lados faria a
 * mesma linha aparecer com horas diferentes antes e depois da hidratação.
 */
const DATA_HORA_BR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * O dia da linha em `aaaa-mm-dd`, no MESMO fuso da data exibida.
 *
 * É o que o filtro de data compara com o `<input type="date">`. `en-CA` dá esse
 * formato pronto; `toISOString()` daria o dia em UTC, e um território criado às
 * 22h de São Paulo cairia no dia seguinte — sumindo de um filtro que termina no
 * dia em que a tela diz que ele foi criado.
 */
const DIA_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})

export default async function TerritorioDaEmpresaPage() {
  const territorios = await listar()

  const itens = territorios.map((territorio) => ({
    id: territorio.id,
    nome: territorio.nome,
    slug: territorio.slug,
    descricao: territorio.descricao,
    inventarios: territorio.inventarios,
    dono: territorio.criado_por,
    criadoEm: DATA_HORA_BR.format(territorio.created_at),
    dia: DIA_ISO.format(territorio.created_at),
    atualizadoEm: territorio.updated_at,
  }))

  return <ListaTerritorios itens={itens} />
}
