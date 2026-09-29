'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Pill } from '@/components/ui/Pill'
import { RowActions, Table, Td, Th, Tr, tableStyles } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { gerarPelaTela } from '@/lib/actions/relatorio'
import { gerarRelatorioMCPelaTela } from '@/lib/actions/relatorio-mc'
import { copiarTexto } from '@/lib/copiar'
import type { AssessmentDoPortal } from '@/lib/painel'
import { ROTULO_SITUACAO, type Assessment, type SituacaoAssessment } from '@/data/facilitadores'
import styles from './TabelaAssessments.module.css'

/**
 * O que a tabela le. `versao` e `perfil` vem de `lib/painel.ts`; sao opcionais
 * porque as listas que embrulham esta tabela tipam os itens como `Assessment`
 * e so repassam o objeto — os campos chegam aqui do mesmo jeito. Sem `versao`,
 * o mapa e tratado como LEGADO, que e o que ele era antes da versao existir.
 */
type ItemDaTabela = Assessment & Partial<Pick<AssessmentDoPortal, 'versao' | 'perfil' | 'gerandoTexto'>>

/** De quanto em quanto tempo a lista se atualiza enquanto algum texto esta sendo escrito. */
const ATUALIZAR_A_CADA_MS = 15_000

function eLegado(assessment: ItemDaTabela): boolean {
  return (assessment.versao ?? 'LEGADO') === 'LEGADO'
}

/** Secao 6 do AGENTE: o facilitador ve "Confiabilidade da aplicacao: alta, media ou baixa". */
const ROTULO_CONFIABILIDADE = { alta: 'alta', media: 'média', baixa: 'baixa' } as const

const TOM: Record<SituacaoAssessment, 'success' | 'warning' | 'neutral'> = {
  concluido: 'success',
  em_andamento: 'warning',
  pendente: 'neutral',
  expirado: 'neutral',
}

/**
 * Gera o texto do relatorio deste mapa.
 *
 * A chamada a IA leva minutos, entao o botao mostra que esta trabalhando e se
 * TRAVA: dois cliques seriam duas geracoes, e cada uma custa uma chamada paga.
 * A trava e do navegador; quem garante a regra do lado de la e a action, que
 * confere sessao e dono antes de gastar a chave.
 *
 * Depois do sucesso a lista e recarregada, e a linha passa a mostrar ver e
 * baixar — os dois botoes que ja funcionavam. O botao so volta se der errado.
 * Nos dois casos a lista e relida do banco: se a resposta se perdeu no caminho
 * com o texto ainda sendo escrito, a linha mostra "escrevendo" (`gerandoTexto`)
 * em vez de oferecer um segundo clique.
 *
 * Cada inventario tem o seu gerador: o legado escreve o texto do relatorio
 * antigo, o MC-INV 2.2 escreve a narrativa das 42 paginas (ADR-0007, D3). As
 * duas actions devolvem o mesmo `{ ok, erro }`, entao o botao e um so.
 */
function BotaoGerarRelatorio({ assessment }: { assessment: ItemDaTabela }) {
  const { toast } = useToast()
  const router = useRouter()
  const [gerando, setGerando] = useState(false)

  async function gerar() {
    if (gerando) return
    setGerando(true)
    toast(`Gerando o relatório de ${assessment.avaliadoNome}. Isso leva alguns minutos.`)

    try {
      const resposta = eLegado(assessment)
        ? await gerarPelaTela(assessment.token)
        : await gerarRelatorioMCPelaTela(assessment.token)

      if (resposta.ok) {
        // Sem `setGerando(false)`: a linha troca de botões com o refresh, e
        // soltar antes faria o de gerar piscar de volta nesse meio tempo.
        toast(`Relatório de ${assessment.avaliadoNome} pronto.`)
        router.refresh()
        return
      }
      // Recusa de regra chega com a mensagem que a pessoa resolve sozinha:
      // falta de chave, mapa de outro parceiro, mapa não respondido.
      toast(resposta.erro, 'aviso')
    } catch {
      // Falha de verdade chega como digest opaco em produção, então a tela
      // diz o que dá para dizer: não gerou, e nada foi cobrado duas vezes.
      toast('Não foi possível gerar o relatório agora. Tente de novo.', 'aviso')
    }
    setGerando(false)
    router.refresh()
  }

  return (
    <IconButton
      icon={gerando ? 'refresh' : 'zap'}
      label={
        gerando
          ? `Gerando relatório de ${assessment.avaliadoNome}`
          : `Gerar relatório de ${assessment.avaliadoNome}`
      }
      onClick={gerar}
      disabled={gerando}
      aria-busy={gerando}
    />
  )
}

/**
 * Lista de assessments, compartilhada pelos dois ambientes.
 * O admin vê de quem é cada avaliação; o facilitador vê só as suas,
 * então a coluna some.
 */
export function TabelaAssessments({
  itens,
  mostrarFacilitador = false,
  empresas = {},
}: {
  itens: ItemDaTabela[]
  mostrarFacilitador?: boolean
  /**
   * Nome de exibição por id de facilitador. Vem pronto de quem renderiza:
   * buscar aqui dentro renderia uma consulta por linha da tabela.
   */
  empresas?: Record<string, string>
}) {
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Enquanto algum texto está sendo escrito, a lista se relê sozinha: a linha
   * vira "ver e PDF" quando o texto fica pronto, ou devolve o botão de gerar
   * se a geração falhar — sem ninguém precisar recarregar a página.
   */
  const algumGerando = itens.some(
    (item) => item.situacao === 'concluido' && !item.temNarrativa && item.gerandoTexto,
  )
  useEffect(() => {
    if (!algumGerando) return
    const relogio = setInterval(() => router.refresh(), ATUALIZAR_A_CADA_MS)
    return () => clearInterval(relogio)
  }, [algumGerando, router])

  /**
   * Copia o link do avaliado para a área de transferência.
   *
   * URL absoluta: o facilitador cola isto num e-mail ou num WhatsApp, e
   * "/avaliacao/abc" fora do navegador não leva a lugar nenhum. A origem vem
   * de `window` no momento do clique, e não de uma variável de ambiente, para
   * o link sair com o domínio pelo qual a pessoa entrou.
   */
  async function copiarLink(assessment: ItemDaTabela) {
    const url = `${window.location.origin}/avaliacao/${assessment.token}`

    // Contexto inseguro, permissão negada e o aviso de "não deu, copie à
    // mão" são resolvidos em `lib/copiar.ts`. O mesmo defeito estava também
    // no botão da página do relatório, então o conserto mora num lugar só.
    // Aqui sobra dizer "copiado" quando copiou de verdade: anunciar sucesso
    // com a área de transferência intacta faz o facilitador colar o link
    // antigo no e-mail do cliente dele.
    if (await copiarTexto(url)) toast(`Link de ${assessment.avaliadoNome} copiado`)
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Avaliado</Th>
          {mostrarFacilitador ? <Th>Facilitador</Th> : null}
          <Th>Relatório</Th>
          <Th>Situação</Th>
          <Th>Prazo do link</Th>
          <Th align="right">Ações</Th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {itens.map((assessment) => (
          <Tr key={assessment.id}>
            <Td>
              <div className={tableStyles.primary}>{assessment.avaliadoNome}</div>
              <div className={tableStyles.secondary}>{assessment.avaliadoEmail}</div>
            </Td>

            {mostrarFacilitador ? (
              <Td muted rotulo="Facilitador">{empresas[assessment.facilitadorId] ?? '—'}</Td>
            ) : null}

            <Td rotulo="Relatório">
              <span className={styles.tipo}>{assessment.tipoRelatorio}</span>
              <div className={tableStyles.secondary}>
                {assessment.creditosUsados}{' '}
                {assessment.creditosUsados === 1 ? 'crédito' : 'créditos'}
              </div>
            </Td>

            <Td rotulo="Situação">
              <Pill tone={TOM[assessment.situacao]} dot>
                {ROTULO_SITUACAO[assessment.situacao]}
              </Pill>
              {/* O perfil vem de `lib/perfil-do-mapa.ts`, a mesma leitura do
                  CSV e do território: contadores no legado, resultado do
                  motor no MC-INV 2.2. É sempre o DISC natural. */}
              {assessment.perfil ? (
                <div className={tableStyles.secondary}>Perfil {assessment.perfil.sigla}</div>
              ) : null}
              {assessment.perfil?.confiabilidade ? (
                <div className={tableStyles.secondary}>
                  Confiabilidade da aplicação:{' '}
                  {ROTULO_CONFIABILIDADE[assessment.perfil.confiabilidade]}
                </div>
              ) : null}
              {assessment.situacao === 'concluido' && !assessment.temNarrativa && assessment.gerandoTexto ? (
                <div className={tableStyles.secondary} role="status">
                  Texto do relatório sendo escrito…
                </div>
              ) : null}
            </Td>

            <Td muted rotulo="Prazo do link">
              {assessment.situacao === 'concluido'
                ? `Respondido em ${assessment.concluidoEm}`
                : `Expira em ${assessment.expiraEm}`}
            </Td>

            <Td align="right">
              <RowActions>
                {/* Mapa concluído SEM narrativa não oferece ver nem baixar: o
                    documento sairia com as seções escritas em branco. Primeiro
                    gera, depois entrega. Com o texto sendo escrito, nem gerar:
                    o botão só volta se a geração falhar. */}
                {assessment.situacao === 'concluido' && !assessment.temNarrativa ? (
                  assessment.gerandoTexto ? (
                    <IconButton
                      icon="refresh"
                      label={`Escrevendo o texto do relatório de ${assessment.avaliadoNome}`}
                      disabled
                      aria-busy
                    />
                  ) : (
                    <BotaoGerarRelatorio assessment={assessment} />
                  )
                ) : assessment.situacao === 'concluido' ? (
                  <>
                    {/* Aba nova nos dois: quem está numa lista filtrada não
                        quer perder o filtro para conferir um relatório, e
                        depois de imprimir a aba fecha e a lista continua
                        onde estava. */}
                    <IconButton
                      icon="eye"
                      label={`Ver relatório de ${assessment.avaliadoNome}`}
                      href={`/relatorio/${assessment.token}`}
                      target="_blank"
                    />
                    {/* `imprimir=1` faz a própria página do relatório abrir a
                        caixa de impressão ao terminar de carregar, e é dela
                        que sai o PDF. Não há PDF de servidor nesta rota, por
                        isso o rótulo fala em imprimir: prometer "baixar"
                        fazia o clique parecer quebrado, porque o que abre é o
                        diálogo do navegador. O `@media print` da tela é o
                        mesmo que o Puppeteer do CLI renderiza — um caminho
                        só, e o arquivo sai igual ao que a pessoa reviu. */}
                    <IconButton
                      icon="printer"
                      label={`Imprimir ou salvar em PDF o relatório de ${assessment.avaliadoNome}`}
                      href={`/relatorio/${assessment.token}?imprimir=1`}
                      target="_blank"
                    />
                  </>
                ) : (
                  <>
                    <IconButton
                      icon="link"
                      label={`Copiar link de ${assessment.avaliadoNome}`}
                      onClick={() => copiarLink(assessment)}
                    />
                    {/* Não existe provedor de e-mail no projeto, então o aviso
                        aponta para a ação ao lado, que funciona de verdade:
                        copiar o link e mandar por onde já se manda hoje. */}
                    <IconButton
                      icon="mail"
                      label={`Reenviar convite para ${assessment.avaliadoNome}`}
                      onClick={() =>
                        toast(
                          'Copie o link ao lado e envie por fora: o envio automático depende do provedor de e-mail, ainda não contratado.',
                          'aviso',
                        )
                      }
                    />
                  </>
                )}
              </RowActions>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
