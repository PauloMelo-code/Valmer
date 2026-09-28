'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardFooter } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { importarClientesPelaTela } from '@/lib/actions/importar-clientes'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

/**
 * Painel de importação da carteira — o que o botão Importar abre.
 *
 * Mora fora de `ListaClientes.tsx` por tamanho: a lista já tem cadastro,
 * edição, detalhe, filtro e exclusão, e com este painel dentro passava das 500
 * linhas do padrão do repositório.
 *
 * Quem grava é `actions/importar-clientes.ts`, que entra pelo MESMO `criar` do
 * formulário de cadastro — com sessão, permissão, dono e duplicidade de e-mail
 * conferidos lá. Esta tela é só a conveniência.
 */
export function PainelImportarClientes({ fechar }: { fechar: () => void }) {
  const { toast } = useToast()
  const [csv, setCsv] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [importando, importar] = useTransition()

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setAviso(null)

    importar(async () => {
      const resposta = await importarClientesPelaTela(csv)

      // Recusa do arquivo inteiro (cabeçalho ilegível, lista vazia, lista longa
      // demais): nada foi gravado, e o painel fica aberto com o texto em mãos.
      if (!resposta.ok) {
        setAviso(resposta.erro)
        return
      }

      // Importação parcial é o combinado: o que passou já está no banco, e o
      // aviso nomeia as linhas que ficaram de fora — é isso que dá para
      // corrigir. Fechar aqui apagaria justamente essa lista.
      if (resposta.recusas.length > 0) {
        const total = resposta.gravados + resposta.recusas.length
        setAviso(
          `${resposta.gravados} de ${total} linhas foram gravadas. Recusadas: ${resposta.recusas.join(' · ')}`,
        )
        toast(`${resposta.gravados} de ${total} linhas foram gravadas.`, 'aviso')
        return
      }

      fechar()
      toast(
        resposta.gravados === 1
          ? '1 cliente importado.'
          : `${resposta.gravados} clientes importados.`,
      )
    })
  }

  return (
    <Card padding="none">
      <form onSubmit={enviar}>
        <div className={styles.corpo}>
          <div className={ui.cardTitle}>Importar clientes</div>

          {/* O arquivo é lido NO NAVEGADOR e vai como texto: a action recebe a
              mesma string que o campo de colar produz, então existe um caminho
              de gravação só, e não dois. */}
          <Field label="Arquivo CSV">
            {(id) => (
              <Input
                id={id}
                type="file"
                accept=".csv,text/csv,text/plain"
                disabled={importando}
                onChange={async (evento) => {
                  const arquivo = evento.target.files?.[0]
                  if (!arquivo) return
                  setAviso(null)
                  setCsv(await arquivo.text())
                }}
              />
            )}
          </Field>

          <Field label="Ou cole a lista">
            {(id) => (
              <Textarea
                id={id}
                rows={8}
                value={csv}
                placeholder={'Nome;E-mail;Celular\nAna Souza;ana@empresa.com;11999990000'}
                onChange={(evento) => setCsv(evento.target.value)}
              />
            )}
          </Field>

          <p className={ui.note}>
            A primeira linha é o cabeçalho, com as colunas <strong>Nome</strong> e{' '}
            <strong>E-mail</strong> (Celular é opcional) — o mesmo formato que o botão Exportar
            gera, então o arquivo baixado daqui volta sem ajuste. Cada linha é conferida como se
            fosse digitada no formulário: o que não passar é recusado com o número dela.
          </p>

          {/* Região viva permanente, como no formulário de cadastro: o resultado
              chega depois do clique, longe de onde se olha, e criado junto com o
              texto o leitor de tela não o anuncia. */}
          <div role="status" aria-live="polite">
            {aviso ? (
              <div className={`${ui.callout} ${ui.calloutWarning}`}>
                <span className={ui.calloutIcon}>
                  <Icon name="alert" />
                </span>
                <span>{aviso}</span>
              </div>
            ) : null}
          </div>
        </div>

        <CardFooter>
          <Button onClick={fechar} disabled={importando}>
            Fechar
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Icon name="upload" />}
            disabled={importando || csv.trim() === ''}
          >
            {importando ? 'Importando…' : 'Importar clientes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
