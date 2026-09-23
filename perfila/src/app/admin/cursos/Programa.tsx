'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Field'
import { Row, Stack } from '@/components/ui/Layout'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import {
  criarAulaPelaTela,
  criarModuloPelaTela,
  excluirAulaPelaTela,
  excluirModuloPelaTela,
  moverAulaPelaTela,
  moverModuloPelaTela,
} from '@/lib/actions/ead'
import { assinarVideoPelaTela, confirmarVideoPelaTela } from '@/lib/actions/ead-video'
import type { CursoComPrograma, Direcao, ModuloComAulas } from '@/lib/ead'
import type { CursoAula } from '@/lib/db/schema'
import ui from '@/styles/common.module.css'
import { duracaoLegivel } from '@/lib/text'
import {
  renomearAulaPelaTela,
  renomearModuloPelaTela,
} from '@/lib/actions/ead-titulo'
import { TituloEditavel } from './TituloEditavel'
import styles from './page.module.css'

/**
 * O programa do curso: módulo, aula e o vídeo de cada aula.
 *
 * Substitui o textarea "Conteúdo" como lugar de escrever módulo. O textarea
 * continua existindo no formulário do curso, e continua sendo a EMENTA — o que
 * saiu dele foi a obrigação de digitar o programa como prosa, que era o motivo
 * de /facilitador/biblioteca-gravada não ter o que espelhar.
 *
 * A lista chega pronta do servidor e toda action invalida `/admin/cursos`, então
 * esta tela não guarda cópia: depois de gravar, quem redesenha é o Next com a
 * leitura nova. Estado aqui é só o dos formulários e o do envio em curso.
 *
 * O `updated_at` de cada linha viaja com os botões de mover e de enviar vídeo
 * porque a action compara os dois: se outra aba mexeu, a gravação é recusada em
 * vez de passar por cima.
 */
export function Programa({ curso }: { curso: CursoComPrograma }) {
  const { toast } = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [gravando, iniciar] = useTransition()
  /** Id da aula cujo vídeo está subindo. O envio não passa por `useTransition`. */
  const [enviando, setEnviando] = useState<string | null>(null)
  const [novoModulo, setNovoModulo] = useState('')

  function executar(operacao: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) {
    setErro(null)
    iniciar(async () => {
      const resposta = await operacao()
      if (!resposta.ok) {
        setErro(resposta.erro ?? 'Não foi possível gravar.')
        return
      }
      toast(sucesso)
    })
  }

  /**
   * Envia o vídeo direto para o bucket.
   *
   * Três passos, e o arquivo não passa pelo servidor em nenhum: o servidor
   * assina, o navegador faz o PUT, o servidor confirma que o objeto chegou e só
   * então grava a chave. Ver `lib/actions/ead-video.ts`.
   *
   * O `catch` NÃO É DECORATIVO. `fetch` só devolve `!ok` quando o servidor
   * respondeu: falha de rede, CORS recusado e envio abortado fazem a promessa
   * REJEITAR, e sem este bloco a rejeição subia como erro não tratado. Na tela
   * o efeito era o pior possível — o botão voltava ao normal, nenhuma mensagem
   * aparecia e o vídeo não estava lá. `lerDuracao` rejeita do mesmo jeito com
   * arquivo que o navegador não consegue abrir.
   *
   * ponytail: sem barra de progresso — `fetch` não reporta upload. Se aula
   * grande virar rotina, o caminho é trocar por XMLHttpRequest e ler
   * `upload.onprogress`.
   */
  async function enviarVideo(aula: CursoAula, arquivo: File) {
    setErro(null)
    setEnviando(aula.id)

    try {
      const assinatura = await assinarVideoPelaTela({
        aula_id: aula.id,
        tipo: arquivo.type,
        tamanho: arquivo.size,
      })

      if (!assinatura.ok) {
        setErro(assinatura.erro)
        return
      }

      const envio = await fetch(assinatura.url, {
        method: 'PUT',
        body: arquivo,
        headers: { 'Content-Type': arquivo.type },
      })

      if (!envio.ok) {
        setErro('O envio para o armazenamento falhou. Confira a conexão e tente de novo.')
        return
      }

      // A duração sai do próprio arquivo, lida pelo navegador. Quando ele não
      // sabe dizer, o campo vai ausente e a tela deixa de mostrar duração — em
      // vez de mostrar um "07:05" digitado à mão, que era o defeito antigo.
      const duracao = await lerDuracao(arquivo)

      // A confirmação vai por `executar` — ou seja, dentro da transição — porque
      // é ela que grava: sem transição, o `revalidatePath` da action volta com
      // a leitura nova e a lista continua desenhada com a antiga.
      executar(
        () =>
          confirmarVideoPelaTela(
            {
              aula_id: aula.id,
              chave: assinatura.chave,
              ...(duracao === null ? {} : { duracao_segundos: duracao }),
            },
            aula.updated_at,
          ),
        `Vídeo da aula "${aula.titulo}" no ar.`,
      )
    } catch (falha) {
      // A causa real vai para o console de quem estiver depurando; na tela fica
      // a frase que diz o que fazer agora. Mensagem de erro de rede crua não
      // ajuda quem só quer subir uma aula.
      console.error('Falha ao enviar o vídeo da aula', aula.id, falha)
      setErro(
        'O envio do vídeo não chegou ao armazenamento. Confira a conexão e tente de novo — nada foi gravado.',
      )
    } finally {
      setEnviando(null)
    }
  }

  const totalAulas = curso.modulos.reduce((soma, modulo) => soma + modulo.aulas.length, 0)

  return (
    <Stack gap={12}>
      <Row gap={8} justify="space-between" wrap>
        <span className={ui.note}>
          {curso.modulos.length === 0
            ? 'Sem módulos — o parceiro ainda não vê aula nenhuma deste curso.'
            : `${curso.modulos.length} módulo(s) · ${totalAulas} aula(s)`}
        </span>
      </Row>

      {curso.modulos.map((modulo, indice) => (
        <ModuloEditor
          key={modulo.id}
          modulo={modulo}
          numero={indice + 1}
          gravando={gravando}
          enviando={enviando}
          onMover={(direcao) =>
            executar(
              () => moverModuloPelaTela(modulo.id, direcao, modulo.updated_at),
              'Módulo movido.',
            )
          }
          onExcluir={() =>
            executar(() => excluirModuloPelaTela(modulo.id), 'Módulo excluído.')
          }
          onRenomear={(titulo) =>
            executar(
              () => renomearModuloPelaTela(modulo.id, { titulo }, modulo.updated_at),
              'Módulo renomeado.',
            )
          }
          onCriarAula={(titulo) =>
            executar(
              () => criarAulaPelaTela({ modulo_id: modulo.id, titulo }),
              'Aula criada. Envie o vídeo quando a gravação estiver pronta.',
            )
          }
          onMoverAula={(aula, direcao) =>
            executar(() => moverAulaPelaTela(aula.id, direcao, aula.updated_at), 'Aula movida.')
          }
          onExcluirAula={(aula) =>
            executar(() => excluirAulaPelaTela(aula.id), 'Aula excluída.')
          }
          onRenomearAula={(aula, titulo) =>
            executar(
              () => renomearAulaPelaTela(aula.id, { titulo }, aula.updated_at),
              'Aula renomeada.',
            )
          }
          onEnviarVideo={enviarVideo}
        />
      ))}

      <Row gap={8} wrap className={styles.linhaNovo}>
        <Input
          className={styles.campoLinha}
          placeholder="Título do novo módulo"
          value={novoModulo}
          aria-label={`Novo módulo em ${curso.titulo}`}
          onChange={(evento) => setNovoModulo(evento.target.value)}
        />
        <Button
          variant="primary"
          icon={<Icon name="plus" />}
          disabled={gravando || novoModulo.trim().length === 0}
          onClick={() =>
            executar(
              () => criarModuloPelaTela({ curso_id: curso.id, titulo: novoModulo }),
              `Módulo "${novoModulo.trim()}" criado.`,
            )
          }
        >
          Novo módulo
        </Button>
      </Row>

      {/* Região viva permanente: a recusa chega depois do clique, longe de onde
          se olha, e criada junto com o texto o leitor de tela não a anuncia. */}
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
    </Stack>
  )
}

function ModuloEditor({
  modulo,
  numero,
  gravando,
  enviando,
  onMover,
  onExcluir,
  onRenomear,
  onCriarAula,
  onMoverAula,
  onExcluirAula,
  onRenomearAula,
  onEnviarVideo,
}: {
  modulo: ModuloComAulas
  numero: number
  gravando: boolean
  enviando: string | null
  onMover: (direcao: Direcao) => void
  onExcluir: () => void
  onRenomear: (titulo: string) => void
  onCriarAula: (titulo: string) => void
  onMoverAula: (aula: CursoAula, direcao: Direcao) => void
  onExcluirAula: (aula: CursoAula) => void
  onRenomearAula: (aula: CursoAula, titulo: string) => void
  onEnviarVideo: (aula: CursoAula, arquivo: File) => void
}) {
  const [novaAula, setNovaAula] = useState('')

  return (
    <div className={styles.modulo}>
      <Row gap={8} justify="space-between" wrap>
        <TituloEditavel
          titulo={modulo.titulo}
          rotulo={`módulo ${modulo.titulo}`}
          prefixo={`Módulo ${String(numero).padStart(2, '0')} · `}
          className={ui.cardTitle}
          gravando={gravando}
          onGravar={onRenomear}
        />
        <Row gap={4}>
          <IconButton icon="chevU" label="Subir módulo" disabled={gravando} onClick={() => onMover('cima')} />
          <IconButton icon="chevD" label="Descer módulo" disabled={gravando} onClick={() => onMover('baixo')} />
          <IconButton icon="trash" label="Excluir módulo" tone="danger" disabled={gravando} onClick={onExcluir} />
        </Row>
      </Row>

      {modulo.aulas.map((aula, indice) => (
        <AulaEditor
          key={aula.id}
          aula={aula}
          numero={indice + 1}
          gravando={gravando}
          enviando={enviando === aula.id}
          onMover={(direcao) => onMoverAula(aula, direcao)}
          onExcluir={() => onExcluirAula(aula)}
          onRenomear={(titulo) => onRenomearAula(aula, titulo)}
          onEnviarVideo={(arquivo) => onEnviarVideo(aula, arquivo)}
        />
      ))}

      <Row gap={8} wrap className={styles.linhaNovo}>
        <Input
          className={styles.campoLinha}
          placeholder="Título da nova aula"
          value={novaAula}
          aria-label={`Nova aula em ${modulo.titulo}`}
          onChange={(evento) => setNovaAula(evento.target.value)}
        />
        <Button
          icon={<Icon name="plus" />}
          disabled={gravando || novaAula.trim().length === 0}
          onClick={() => {
            onCriarAula(novaAula)
            setNovaAula('')
          }}
        >
          Nova aula
        </Button>
      </Row>
    </div>
  )
}

function AulaEditor({
  aula,
  numero,
  gravando,
  enviando,
  onMover,
  onExcluir,
  onRenomear,
  onEnviarVideo,
}: {
  aula: CursoAula
  numero: number
  gravando: boolean
  enviando: boolean
  onMover: (direcao: Direcao) => void
  onExcluir: () => void
  onRenomear: (titulo: string) => void
  onEnviarVideo: (arquivo: File) => void
}) {
  const campo = useRef<HTMLInputElement>(null)

  return (
    <Row gap={8} className={styles.aula} justify="space-between" wrap>
      <Row gap={8}>
        <span className={styles.numero}>{numero}</span>
        {/* `enviando` no `gravando`: renomear move o `updated_at` da aula, e a
            confirmação do vídeo — que chega minutos depois — compara com o
            valor que tinha antes. Renomear no meio do envio faria o upload
            terminar e a gravação da chave ser recusada por trava otimista. */}
        <TituloEditavel
          titulo={aula.titulo}
          rotulo={`aula ${aula.titulo}`}
          className={styles.aulaTitulo}
          gravando={gravando || enviando}
          onGravar={onRenomear}
        />
        {aula.video_chave ? (
          <Pill tone="success" size="sm" dot>
            {duracaoLegivel(aula.duracao_segundos) ?? 'No ar'}
          </Pill>
        ) : (
          <Pill tone="neutral" size="sm">
            Sem vídeo
          </Pill>
        )}
      </Row>

      <Row gap={4} className={styles.aulaAcoes}>
        {/* O input de arquivo fica escondido atrás do botão do sistema: o
            controle nativo não aceita os estilos do projeto, e trocá-lo por um
            <label> estilizado perderia o foco de teclado. */}
        <input
          ref={campo}
          type="file"
          accept="video/mp4,video/webm"
          hidden
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0]
            // Limpa o valor para o mesmo arquivo poder ser reenviado depois de
            // um erro — sem isso o `change` não dispara na segunda escolha.
            evento.target.value = ''
            if (arquivo) onEnviarVideo(arquivo)
          }}
        />
        <Button
          size="sm"
          icon={<Icon name="upload" size={14} />}
          disabled={gravando || enviando}
          onClick={() => campo.current?.click()}
        >
          {enviando ? 'Enviando…' : aula.video_chave ? 'Trocar vídeo' : 'Enviar vídeo'}
        </Button>
        {/* `enviando` entra no disabled junto com `gravando`: o PUT do vídeo
            não passa por `useTransition`, então durante os minutos de um envio
            de 1 GB o `gravando` continua falso e estes botões seguiam clicáveis.
            Excluir a aula no meio do envio jogava fora o upload inteiro. */}
        <IconButton
          icon="chevU"
          label="Subir aula"
          disabled={gravando || enviando}
          onClick={() => onMover('cima')}
        />
        <IconButton
          icon="chevD"
          label="Descer aula"
          disabled={gravando || enviando}
          onClick={() => onMover('baixo')}
        />
        <IconButton
          icon="trash"
          label="Excluir aula"
          tone="danger"
          disabled={gravando || enviando}
          onClick={onExcluir}
        />
      </Row>
    </Row>
  )
}

/**
 * A duração real do arquivo, em segundos, lida pelo próprio navegador.
 *
 * Devolve `null` quando ele não sabe dizer — WebM sem índice devolve
 * `Infinity`, e alguns codecs simplesmente falham. Nulo vira "sem duração" na
 * tela, que é honesto; um número inventado não seria.
 */
function lerDuracao(arquivo: File): Promise<number | null> {
  return new Promise((resolver) => {
    const endereco = URL.createObjectURL(arquivo)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const terminar = (valor: number | null) => {
      URL.revokeObjectURL(endereco)
      resolver(valor)
    }

    video.onloadedmetadata = () => {
      const segundos = Math.round(video.duration)
      terminar(Number.isFinite(segundos) && segundos > 0 ? segundos : null)
    }
    video.onerror = () => terminar(null)
    video.src = endereco
  })
}
