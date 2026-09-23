'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { AutoGrid } from '@/components/ui/Layout'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { criarPelaTela } from '@/lib/actions/assessments'
import { salvarConfigDegustacaoPelaTela } from '@/lib/actions/perfil'
import { moeda, type CodigoRelatorio } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

type Nivel = {
  codigo: CodigoRelatorio
  nome: string
  revendaMin: number
  revendaMax: number
}

/** Rótulo do nível no select. É também de onde o código é lido de volta. */
function rotulo(nivel: Nivel): string {
  return `${nivel.codigo} · ${nivel.nome}`
}

/**
 * Configuração e envio da degustação.
 *
 * O ENVIO NÃO CRIA ASSESSMENT NENHUM AQUI: chama `assessments.criarPelaTela`
 * com `degustacao: true`, que é a mesma porta da tela de novo mapa e do envio
 * em lote. É lá que mora a regra — token, validade de 7 dias, débito de 1
 * amostra com a linha do dono travada, `creditos_usados = 0` e trilha de
 * auditoria, tudo numa transação só. Repetir esse fluxo aqui seria a segunda
 * versão da regra de cobrança, e a errada seria a que ninguém olha.
 *
 * O saldo mostrado é o do momento em que a tela abriu, e serve para orientar:
 * quem debita de verdade é a action, que relê o saldo com a linha travada. Por
 * isso o envio ainda pode ser recusado com o saldo aparentemente suficiente —
 * a amostra pode ter sido gasta em outra aba.
 */
export function FormDegustacao({
  saldo,
  concedidas,
  utilizadas,
  relatorio,
  niveis,
}: {
  saldo: number
  concedidas: number
  utilizadas: number
  relatorio: CodigoRelatorio
  niveis: Nivel[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [codigo, setCodigo] = useState<CodigoRelatorio>(relatorio)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciarSalvar] = useTransition()
  const [enviando, iniciarEnvio] = useTransition()

  // O nível salvo pode ter sido descontinuado pelo admin depois de escolhido:
  // cair no primeiro da lista mantém a tela utilizável em vez de mostrar um
  // campo vazio que não abre.
  //
  // `escolhido` é a ÚNICA fonte do nível daqui para baixo — Salvar e Enviar
  // mandam `escolhido.codigo`, nunca o `codigo` do estado. Com os dois em uso,
  // um nível descontinuado fazia a tela exibir o substituto e gravar o antigo:
  // o cartão dizia S1 e o mapa nascia S3.
  const escolhido = niveis.find((nivel) => nivel.codigo === codigo) ?? niveis[0]
  const semSaldo = saldo < 1

  function salvar() {
    if (!escolhido) return
    setErro(null)
    iniciarSalvar(async () => {
      const resposta = await salvarConfigDegustacaoPelaTela({ tipo_relatorio: escolhido.codigo })
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }
      toast(`Teste grátis configurado: você oferece o ${escolhido.codigo}.`)
    })
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!escolhido) return
    setErro(null)

    iniciarEnvio(async () => {
      const resposta = await criarPelaTela({
        avaliado_nome: nome,
        avaliado_email: email,
        tipo_relatorio: escolhido.codigo,
        degustacao: true,
      })

      // A recusa vem como objeto para poder ser mostrada aqui, com o
      // formulário preenchido do lado — inclusive a de saldo, que é a que o
      // parceiro mais vê. O `refresh` traz o saldo de verdade do banco: se a
      // recusa foi por falta de amostra, o número na tela estava velho.
      if (!resposta.ok) {
        setErro(resposta.erro)
        router.refresh()
        return
      }

      const avaliado = nome.trim()
      setNome('')
      setEmail('')
      router.refresh()
      toast(`Teste grátis criado para ${avaliado}. O link está no Acervo de Mapas.`)
    })
  }

  return (
    <AutoGrid min={260} alignStart>
      <Card>
        <div className={styles.rotulo}>Saldo de testes grátis</div>
        <div className={`${ui.metricLg} ${styles.valor}`}>{saldo}</div>
        <div className={ui.note}>
          {concedidas} concedidas · {utilizadas} utilizadas
        </div>
      </Card>

      <Card padding="lg" className={styles.config}>
        <div className={ui.cardTitle}>Configuração do teste grátis</div>
        <div className={styles.campos}>
          <Field label="Relatório oferecido">
            {(id) => (
              <Select
                id={id}
                options={niveis.map(rotulo)}
                value={escolhido ? rotulo(escolhido) : ''}
                onChange={(valor) => setCodigo(valor.split(' · ')[0] as CodigoRelatorio)}
                label="Relatório oferecido"
              />
            )}
          </Field>
          {/* Deixou de ser campo digitável: o preço é da PLATAFORMA e quem o
              edita é o admin em /admin/precos (rbac `precos:*`). O input daqui
              nunca teve para onde gravar — mostrar a faixa vigente do banco é a
              mesma informação, e verdadeira. */}
          <Field label="Preço sugerido do relatório completo">
            {(id) => (
              <div id={id} className={styles.preco}>
                {escolhido ? `${moeda(escolhido.revendaMin)} a ${moeda(escolhido.revendaMax)}` : '—'}
              </div>
            )}
          </Field>
        </div>
        <Button
          variant="primary"
          className={styles.salvar}
          onClick={salvar}
          disabled={salvando || !escolhido}
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </Card>

      <Card padding="lg">
        <form onSubmit={enviar} className={styles.config}>
          <div>
            <div className={ui.cardTitle}>Enviar teste grátis</div>
            {/* "Enviar" com um campo de e-mail obrigatório ao lado se lê como
                "a plataforma manda o convite". Ela não manda: não há provedor
                de e-mail. O que o botão faz é criar o link — e a frase precisa
                dizer isso antes do clique, não depois. */}
            <p className={ui.note}>
              Cria o link do avaliado com o {escolhido?.codigo ?? '—'}. Consome 1 teste grátis e
              nenhum crédito. O e-mail fica registrado no mapa, mas a plataforma não envia nada:
              copie o link no Acervo de Mapas e mande por fora.
            </p>
          </div>

          <div className={styles.campos}>
            <Field label="Nome do avaliado">
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
            <Field label="E-mail do avaliado">
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

          {/* Região viva permanente: o aviso e a recusa chegam depois do clique,
              longe de onde se olha, e criados junto com o texto o leitor de tela
              não os anuncia. Mesmo padrão de
              acervo-de-mapas/novo/FormNovoAssessment.tsx. */}
          <div role="status" aria-live="polite">
            {semSaldo ? (
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span className={ui.calloutIcon}>
                  <Icon name="alert" />
                </span>
                <span>
                  Sem testes grátis disponíveis: restam {saldo} de {concedidas}. Peça mais testes
                  grátis ao administrador, ou envie este mapa pelo Acervo de Mapas, com crédito.
                </span>
              </div>
            ) : null}
            {erro ? (
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span className={ui.calloutIcon}>
                  <Icon name="alert" />
                </span>
                <span>{erro}</span>
              </div>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="primary"
            icon={<Icon name="link" />}
            className={styles.salvar}
            disabled={semSaldo || enviando}
          >
            {enviando ? 'Enviando…' : 'Enviar teste grátis'}
          </Button>
        </form>
      </Card>
    </AutoGrid>
  )
}
