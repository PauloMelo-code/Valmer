'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { AutoGrid } from '@/components/ui/Layout'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Select } from '@/components/ui/Select'
import { FilterBar, Table, TableFooter, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import {
  desvincularInventarioPelaTela,
  vincularGrupoPelaTela,
} from '@/lib/actions/territorios-vinculos'
import { FATORES_DISC, type FatorDisc } from '@/data/dna'
import ui from '@/styles/common.module.css'
import { EscolherInventario, type OpcaoInventario } from './EscolherInventario'
import styles from './page.module.css'

/** Classe de cor por fator, tanto no cartão quanto no chip da tabela. */
const CLASSE_FATOR: Record<FatorDisc, string> = {
  D: styles.fatorD!,
  I: styles.fatorI!,
  S: styles.fatorS!,
  C: styles.fatorC!,
}

const CLASSE_CHIP: Record<FatorDisc, string> = {
  D: styles.chipD!,
  I: styles.chipI!,
  S: styles.chipS!,
  C: styles.chipC!,
}

/**
 * Uma linha do território: o inventário vinculado, respondido ou não.
 *
 * Quem não respondeu aparece na MESMA tabela, com o lugar dos números vazio.
 * Duas tabelas separadas esconderiam o pendente numa aba que ninguém abre, e é
 * justamente ele que explica por que a média tem menos gente do que a empresa.
 */
export type LinhaDoTerritorio = {
  assessmentId: string
  nome: string
  email: string
  iniciais: string
  /** Nulo enquanto não respondeu: aí não há perfil nem percentual. */
  perfil: string | null
  percentuais: Record<FatorDisc, number> | null
  respondidoEm: string | null
  /** `aaaa-mm-dd` da resposta, no fuso de São Paulo — o que o filtro compara. */
  dia: string | null
  /** Rótulo da situação, para quem ainda não respondeu. */
  situacao: string
}

export type OpcaoGrupo = {
  id: string
  nome: string
  total: number
}

/**
 * O território aberto: a média do grupo, quem está dentro e como mexer nisso.
 *
 * Tudo aqui vem do banco — a média sai dos contadores dos mapas vinculados,
 * pela mesma conta que a lista de mapas e o relatório usam. Esta tela mostrava
 * `data/dna.ts`: quatro respondentes fixos e a média `{D:52,I:57,S:47,C:45}`,
 * escrita à mão, que soma 201 e não descrevia nenhum deles.
 *
 * Cada vínculo grava sozinho, na hora, e depois pede `router.refresh()`: o
 * `paraTela` das actions invalida a rota da LISTA, e sem o refresh a média e a
 * tabela desta tela continuariam mostrando o estado de antes do clique.
 */
export function DnaDetalhe({
  territorioId,
  nome,
  descricao,
  subtitulo,
  medias,
  linhas,
  disponiveis,
  grupos,
}: {
  territorioId: string
  nome: string
  descricao: string | null
  subtitulo: string
  medias: Record<FatorDisc, number>
  linhas: LinhaDoTerritorio[]
  disponiveis: OpcaoInventario[]
  grupos: OpcaoGrupo[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [escolhendo, setEscolhendo] = useState(false)
  const [grupo, setGrupo] = useState('')
  const [gravando, iniciarGravacao] = useTransition()

  const respondentes = linhas.filter((linha) => linha.percentuais !== null)
  const pendentes = linhas.length - respondentes.length

  function limpar() {
    setBusca('')
    setDe('')
    setAte('')
  }

  /**
   * Filtro no cliente: as linhas já vieram do servidor com o recorte por dono.
   *
   * O intervalo de datas é o da RESPOSTA, então quem ainda não respondeu sai da
   * tabela quando há data no filtro — e é o correto: não existe resposta dele
   * para cair dentro ou fora do intervalo. Sem filtro de data ele continua ali.
   */
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return linhas.filter((linha) => {
      if (
        termo !== '' &&
        !linha.nome.toLowerCase().includes(termo) &&
        !linha.email.toLowerCase().includes(termo)
      ) {
        return false
      }
      if (de !== '' && (linha.dia === null || linha.dia < de)) return false
      if (ate !== '' && (linha.dia === null || linha.dia > ate)) return false
      return true
    })
  }, [linhas, busca, de, ate])

  const filtrando = busca.trim() !== '' || de !== '' || ate !== ''

  /**
   * Rótulos do Select de grupos, garantidamente únicos.
   *
   * O `Select` do projeto trabalha com texto, e é por ele que a escolha volta —
   * então dois grupos de mesmo nome (e nada impede) trariam sempre os mapas do
   * primeiro. O total de mapas no rótulo já separa a maioria dos casos e ainda
   * é a informação que decide qual grupo adicionar; o número no fim só aparece
   * quando o rótulo repetiria mesmo assim.
   */
  const opcoesGrupo = useMemo(() => {
    const usados = new Set<string>()

    return grupos.map((item, indice) => {
      const base = `${item.nome} (${item.total} mapa(s))`
      const rotulo = usados.has(base) ? `${base} · ${indice + 1}` : base
      usados.add(rotulo)
      return { id: item.id, nome: item.nome, rotulo }
    })
  }, [grupos])

  function desvincular(linha: LinhaDoTerritorio) {
    // A pergunta diz o que NÃO acontece, porque é o medo de quem clica: sai do
    // território e continua no acervo, com relatório e devolutiva intactos.
    if (
      !window.confirm(
        `Tirar ${linha.nome} do território "${nome}"?\n\n` +
          'O inventário continua no acervo, com relatório e devolutiva. Só sai da média deste território.',
      )
    ) {
      return
    }

    iniciarGravacao(async () => {
      const resposta = await desvincularInventarioPelaTela(territorioId, linha.assessmentId)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      router.refresh()
      toast(`${linha.nome} saiu do território.`)
    })
  }

  function adicionarGrupo() {
    const escolhido = opcoesGrupo.find((item) => item.rotulo === grupo)
    if (!escolhido) {
      toast('Escolha um grupo de mapeamento.', 'aviso')
      return
    }

    iniciarGravacao(async () => {
      const resposta = await vincularGrupoPelaTela(territorioId, escolhido.id)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      router.refresh()
      // Zero é resultado normal, e não falha: quem adiciona o grupo depois de
      // ter posto as pessoas na mão já tem todas dentro. Dizer "0 adicionados"
      // é mais honesto que um "pronto" que não mudou nada.
      toast(
        resposta.dado.vinculados === 0
          ? `Todos os inventários de "${escolhido.nome}" já estavam neste território.`
          : `${resposta.dado.vinculados} inventário(s) de "${escolhido.nome}" entraram no território.`,
      )
    })
  }

  return (
    <>
      <BackLink href="/facilitador/territorio-da-empresa">
        Voltar para Território da Empresa
      </BackLink>

      <PageHeader
        title={nome}
        subtitle={subtitulo}
        actions={
          <>
            {/* Relatório coletivo e PDF do território não existem: o gerador de
                `lib/relatorio` escreve sobre UMA pessoa, e não há página de
                impressão do grupo. O aviso fica até existirem. */}
            <Button
              icon={<Icon name="file" />}
              onClick={() => toast('Relatório do território ainda não disponível', 'aviso')}
            >
              Visualizar relatório
            </Button>
            <Button
              variant="primary"
              icon={<Icon name="download" />}
              onClick={() => toast('Download do PDF ainda não disponível', 'aviso')}
            >
              Baixar PDF
            </Button>
          </>
        }
      />

      {descricao ? <p className={ui.prose}>{descricao}</p> : null}

      {/* Médias do grupo em cada fator comportamental */}
      <AutoGrid min={200} gap={12}>
        {FATORES_DISC.map(({ fator, nome: rotulo }) => (
          <Card key={fator} padding="sm" className={styles.fator}>
            <span className={`${styles.fatorLetra} ${CLASSE_FATOR[fator]}`}>{fator}</span>
            <div>
              <div className={styles.fatorNome}>{rotulo}</div>
              {/* Sem respondente, a média é zero por falta de gente — e "0"
                  na tela seria lido como medida do grupo. O travessão diz a
                  verdade: ainda não há o que medir. */}
              <div className={ui.metricSm}>
                {respondentes.length === 0 ? '—' : medias[fator]}
              </div>
            </div>
          </Card>
        ))}
      </AutoGrid>

      {respondentes.length === 0 ? (
        <div className={`${ui.callout} ${ui.calloutInfo}`}>
          <span className={ui.calloutIcon}>
            <Icon name="info" />
          </span>
          <span>
            {linhas.length === 0
              ? 'Nenhum inventário vinculado ainda. Adicione inventários ou traga um grupo de mapeamento inteiro para o território calcular a média.'
              : 'Nenhum dos inventários vinculados foi respondido ainda. A média aparece com a primeira resposta.'}
          </span>
        </div>
      ) : null}

      <Card padding="none">
        <CardHeader
          title="Inventários do território"
          actions={
            <>
              {grupos.length > 0 ? (
                <>
                  <Select
                    label="Grupo de mapeamento"
                    size="sm"
                    options={['Escolha um grupo', ...opcoesGrupo.map((item) => item.rotulo)]}
                    value={grupo === '' ? 'Escolha um grupo' : grupo}
                    onChange={(valor) => setGrupo(valor === 'Escolha um grupo' ? '' : valor)}
                  />
                  <Button
                    size="sm"
                    icon={<Icon name="users" />}
                    onClick={adicionarGrupo}
                    disabled={gravando || grupo === ''}
                  >
                    Adicionar grupo
                  </Button>
                </>
              ) : null}
              <IconButton
                icon="refresh"
                label="Atualizar"
                variant="outline"
                disabled={gravando}
                onClick={() => router.refresh()}
              />
              <Button
                size="sm"
                icon={<Icon name={escolhendo ? 'fechar' : 'plus'} />}
                onClick={() => setEscolhendo((aberto) => !aberto)}
              >
                {escolhendo ? 'Fechar' : 'Adicionar inventário'}
              </Button>
            </>
          }
        />

        {escolhendo ? (
          <EscolherInventario territorioId={territorioId} disponiveis={disponiveis} />
        ) : null}

        <FilterBar>
          <Field label="Nome" className={tableStyles.filterGrow}>
            {(id) => (
              <Input
                id={id}
                placeholder="Buscar respondente"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            )}
          </Field>
          {/* Campo nativo de data: calendário, teclado numérico no celular e o
              formato do idioma de quem abre, devolvendo `aaaa-mm-dd` — que é o
              que o filtro compara com o dia da resposta. */}
          <Field label="Data inicial" className={tableStyles.filterDate}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(evento) => setDe(evento.target.value)}
              />
            )}
          </Field>
          <Field label="Data final" className={tableStyles.filterDate}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(evento) => setAte(evento.target.value)}
              />
            )}
          </Field>
          <Button variant="dark" size="lg" onClick={limpar} disabled={!filtrando}>
            Limpar
          </Button>
        </FilterBar>

        {filtradas.length > 0 ? (
          <div className={styles.rolagem}>
            <Table>
              <thead>
                <tr>
                  <Th>Respondente</Th>
                  <Th>Perfil</Th>
                  <Th>D · I · S · C</Th>
                  <Th>Respondido em</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {filtradas.map((pessoa) => (
                  <Tr key={pessoa.assessmentId}>
                    <Td dense>
                      <div className={ui.pessoa}>
                        <Avatar>{pessoa.iniciais}</Avatar>
                        <div>
                          <div className={ui.pessoaNome}>{pessoa.nome}</div>
                          <div className={ui.pessoaEmail}>{pessoa.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td dense rotulo="Perfil">
                      {pessoa.perfil ? (
                        <Pill tone="strong">{pessoa.perfil}</Pill>
                      ) : (
                        <Pill>{pessoa.situacao}</Pill>
                      )}
                    </Td>
                    <Td dense rotulo="D · I · S · C">
                      {pessoa.percentuais ? (
                        <div className={styles.chips}>
                          <span className={`${styles.chip} ${CLASSE_CHIP.D}`} title="Dominância">
                            {pessoa.percentuais.D}
                          </span>
                          <span className={`${styles.chip} ${CLASSE_CHIP.I}`} title="Influência">
                            {pessoa.percentuais.I}
                          </span>
                          <span className={`${styles.chip} ${CLASSE_CHIP.S}`} title="Estabilidade">
                            {pessoa.percentuais.S}
                          </span>
                          <span className={`${styles.chip} ${CLASSE_CHIP.C}`} title="Conformidade">
                            {pessoa.percentuais.C}
                          </span>
                        </div>
                      ) : (
                        <span className={tableStyles.secondary}>
                          Fora da média até responder
                        </span>
                      )}
                    </Td>
                    <Td dense muted rotulo="Respondido em">
                      {pessoa.respondidoEm ?? '—'}
                    </Td>
                    <Td dense align="right">
                      <IconButton
                        icon="ban"
                        label={`Tirar ${pessoa.nome} do território`}
                        tone="danger"
                        disabled={gravando}
                        onClick={() => desvincular(pessoa)}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : linhas.length === 0 ? (
          <EmptyState>
            Nenhum inventário vinculado. Use “Adicionar inventário” ou traga um grupo de mapeamento
            inteiro.
          </EmptyState>
        ) : (
          <EmptyState>
            <p>
              Nenhum inventário corresponde ao filtro.{' '}
              {linhas.length === 1
                ? 'O único deste território continua aqui.'
                : `Os ${linhas.length} deste território continuam aqui.`}
            </p>
            <Button variant="secondary" onClick={limpar}>
              Limpar filtros
            </Button>
          </EmptyState>
        )}

        <TableFooter>
          {filtradas.length === linhas.length
            ? `${linhas.length} inventário(s) · ${respondentes.length} na média · ${pendentes} aguardando resposta`
            : `${filtradas.length} de ${linhas.length} inventário(s)`}
        </TableFooter>
      </Card>
    </>
  )
}
