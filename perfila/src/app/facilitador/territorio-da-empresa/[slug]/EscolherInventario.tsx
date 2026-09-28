'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Field, Input } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { vincularInventarioPelaTela } from '@/lib/actions/territorios-vinculos'
import ui from '@/styles/common.module.css'
import styles from './page.module.css'

export type OpcaoInventario = {
  id: string
  nome: string
  email: string
  situacao: string
}

/**
 * O painel de "Adicionar inventário": os mapas do dono que ainda NÃO estão no
 * território, com um clique por linha.
 *
 * Arquivo próprio porque `DnaDetalhe.tsx` passava de 500 linhas com ele dentro
 * (a regra de tamanho do CLAUDE.md), e porque o estado dele — a busca da lista
 * de disponíveis — não interessa a mais ninguém na tela.
 *
 * Cada clique grava sozinho e pede `router.refresh()`: o `paraTela` da action
 * invalida a rota da LISTA, então sem o refresh a média e a tabela desta tela
 * continuariam mostrando o estado de antes do clique.
 */
export function EscolherInventario({
  territorioId,
  disponiveis,
}: {
  territorioId: string
  disponiveis: OpcaoInventario[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [gravando, iniciarGravacao] = useTransition()

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (termo === '') return disponiveis
    return disponiveis.filter(
      (item) =>
        item.nome.toLowerCase().includes(termo) || item.email.toLowerCase().includes(termo),
    )
  }, [disponiveis, busca])

  function vincular(item: OpcaoInventario) {
    iniciarGravacao(async () => {
      const resposta = await vincularInventarioPelaTela(territorioId, item.id)
      if (!resposta.ok) {
        toast(resposta.erro, 'aviso')
        return
      }
      router.refresh()
      toast(`${item.nome} entrou no território.`)
    })
  }

  if (disponiveis.length === 0) {
    return (
      <div className={styles.escolha}>
        <p className={ui.prose}>
          Todos os seus inventários já estão neste território. Envie um novo mapa pelo Acervo de
          Mapas para ter o que adicionar aqui.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.escolha}>
      <Field label="Buscar inventário">
        {(id) => (
          <Input
            id={id}
            placeholder="Nome ou e-mail"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        )}
      </Field>

      {/* Quem ainda não respondeu também aparece: o parceiro monta o território
          junto com o envio, e esconder o pendente o obrigaria a voltar depois.
          Ele fica de fora da MÉDIA, e não da lista. */}
      <ul className={styles.escolhaLista}>
        {filtrados.slice(0, LIMITE).map((item) => (
          <li key={item.id} className={styles.escolhaLinha}>
            <div>
              <div className={ui.pessoaNome}>{item.nome}</div>
              <div className={ui.pessoaEmail}>
                {item.email} · {item.situacao}
              </div>
            </div>
            <IconButton
              icon="plus"
              label={`Adicionar ${item.nome}`}
              variant="outline"
              disabled={gravando}
              onClick={() => vincular(item)}
            />
          </li>
        ))}
      </ul>

      {filtrados.length === 0 ? (
        <p className={tableStyles.secondary}>Nenhum inventário disponível corresponde à busca.</p>
      ) : null}

      {filtrados.length > LIMITE ? (
        <p className={tableStyles.secondary}>
          Mostrando {LIMITE} de {filtrados.length}. Use a busca para achar o resto.
        </p>
      ) : null}
    </div>
  )
}

/**
 * ponytail: corta a lista em 50 linhas em vez de paginar.
 *
 * Quem tem mais mapas que isso acha o certo pela busca ao lado, e o contador
 * embaixo diz que existe mais — o que não pode acontecer é a lista parecer
 * completa. Se um dia precisar de paginação de verdade, ela entra aqui.
 */
const LIMITE = 50
