'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { BackLink, PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { ToggleVisual } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { criarPelaTela } from '@/lib/actions/turmas'
import { opcoes } from '@/data/opcoes'
import { tiposRelatorio } from '@/data/planos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Os quatro níveis do resto do sistema, e não mais "DISC" e "DISC + Tipos
 * Psicológicos + Valores": o tipo de relatório da turma é o mesmo S1..S4 que o
 * assessment cobra em crédito. Duas escalas para a mesma coisa seriam duas
 * respostas diferentes para "que relatório esta pessoa recebe".
 */
const TIPOS = tiposRelatorio.map((tipo) => ({
  codigo: tipo.codigo,
  rotulo: `${tipo.codigo} · ${tipo.nome}`,
}))

type Area = (typeof opcoes.area)[number]

export default function NovaCampanhaPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [area, setArea] = useState<Area>(opcoes.area[0])
  const [tipo, setTipo] = useState(TIPOS[0]!)
  const [permiteDownload, setPermiteDownload] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)

    // "Selecione" é o placeholder do campo, não uma área. Barrar aqui evita
    // mandar ao servidor um valor que o enum do banco não conhece só para
    // receber de volta a mensagem genérica de enum inválido.
    if (area === opcoes.area[0]) {
      setErro('Escolha a área de atuação do grupo.')
      return
    }

    iniciarEnvio(async () => {
      const resposta = await criarPelaTela({
        nome,
        // Os rótulos da tela são os valores do enum com a inicial maiúscula.
        area: area.toLowerCase(),
        tipo_relatorio: tipo.codigo,
        permite_download: permiteDownload,
      })

      // A recusa vem como objeto justamente para poder ser mostrada aqui, com
      // o formulário preenchido do lado. Antes esta tela navegava e avisava
      // que a turma não era salva — agora ela é, e o aviso segue o resultado.
      if (!resposta.ok) {
        setErro(resposta.erro)
        return
      }

      router.push('/facilitador/grupos-de-mapeamento')
      toast(`Grupo "${nome.trim()}" criado.`)
    })
  }

  return (
    <>
      <BackLink href="/facilitador/grupos-de-mapeamento">Voltar para grupos de mapeamento</BackLink>

      <PageHeader
        title="Criar grupo de mapeamento"
        subtitle="Um grupo de mapeamento reúne os passaportes enviados e define o tipo de relatório gerado."
      />

      <Card padding="none" className={styles.form}>
        <form onSubmit={salvar}>
          <div className={styles.corpo}>
            <Field label="Nome do grupo">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Ex.: Capacitação Liderança 2026"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  required
                />
              )}
            </Field>

            <div className={styles.dupla}>
              <Field label="Área de atuação">
                {(id) => (
                  <Select
                    id={id}
                    options={opcoes.area}
                    label="Área de atuação"
                    value={area}
                    onChange={(valor) => setArea(valor as Area)}
                  />
                )}
              </Field>
              <Field label="Tipo de relatório">
                {(id) => (
                  <Select
                    id={id}
                    options={TIPOS.map((item) => item.rotulo)}
                    label="Tipo de relatório"
                    value={tipo.rotulo}
                    onChange={(rotulo) =>
                      setTipo(TIPOS.find((item) => item.rotulo === rotulo) ?? TIPOS[0]!)
                    }
                  />
                )}
              </Field>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={permiteDownload}
              className={styles.opcao}
              onClick={() => setPermiteDownload((atual) => !atual)}
            >
              <span className={styles.opcaoTexto}>
                <span className={styles.opcaoTitulo}>Permitir download do relatório</span>
                <span className={styles.opcaoDesc}>
                  O respondente poderá baixar o PDF ao finalizar o questionário.
                </span>
              </span>
              <ToggleVisual checked={permiteDownload} />
            </button>

            {/* Região viva permanente: a recusa chega depois do clique, longe
                de onde se olha, e criada junto com o texto o leitor de tela
                não a anuncia. Mesmo padrão do formulário de novo mapa. */}
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
            <Button href="/facilitador/grupos-de-mapeamento" variant="ghost">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar grupo'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}
