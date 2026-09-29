'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Progress } from '@/components/ui/Progress'
import {
  COMPROMISSO_ATENCAO,
  CONCLUSAO,
  CONSENTIMENTO,
  ETAPAS,
  ETAPA_TRAVADA,
  TEXTOS_TELA,
  textoFimDeEtapa,
  textoProgresso,
  textoRetomada,
} from '@/data/inventario-mc-textos'
import { consentir, estado as lerEstado, finalizar, salvarTela } from '@/lib/actions/inventario-mc'
import type { EstadoAplicacao, FalhaInventario, RecusaInventario } from '@/lib/inventario/aplicacao'
import { montarRoteiro, type Roteiro } from '@/lib/inventario/roteiro'
import type { Etapa } from '@/lib/validators/inventario-mc'
import ui from '@/styles/common.module.css'
import { Conclusao } from './Conclusao'
import styles from './InventarioMC.module.css'
import { TelaOrdenar } from './TelaOrdenar'
import { TelaPar } from './TelaPar'

type Bloqueio = Exclude<FalhaInventario, 'sem_consentimento' | 'etapa_travada' | 'fora_de_ordem' | 'concluido'>

type Fase =
  | { tipo: 'consentimento' }
  | { tipo: 'naoAgora' }
  | { tipo: 'compromisso' }
  | { tipo: 'retomada'; etapa: Etapa; indice: number }
  | { tipo: 'abertura'; etapa: Etapa }
  | { tipo: 'tela'; etapa: Etapa; indice: number }
  | { tipo: 'fimEtapa'; etapa: 1 | 2 | 3 }
  | { tipo: 'finalizando' }
  | { tipo: 'conclusao' }
  | { tipo: 'travada' }
  | { tipo: 'bloqueado'; motivo: Bloqueio }

/** O que o cliente manda: so a escolha e os carimbos (o resto o servidor deriva). */
type Envio =
  | { etapa: 1 | 2 | 4; tela: string; ordem_final: string[]; entrou_em: string; saiu_em: string }
  | { etapa: 3; tela: string; resposta_exibida: number; entrou_em: string; saiu_em: string }

const BLOQUEIO: Record<Bloqueio, string> = {
  invalido: 'Este link não é mais válido. Peça um novo convite a quem o enviou.',
  legado: 'Este link não é mais válido. Peça um novo convite a quem o enviou.',
  expirado: 'Este link expirou. Peça um novo convite a quem o enviou.',
}

/**
 * Para onde vai uma recusa do servidor. "Concluido" nao bloqueia: e o link
 * reaberto depois, ou outra aba que fechou antes, e a pessoa cai na tela final,
 * onde o relatorio fica para abrir.
 */
function faseDaRecusa(erro: FalhaInventario): Fase {
  if (erro === 'concluido') return { tipo: 'conclusao' }
  const invalido = erro === 'sem_consentimento' || erro === 'etapa_travada' || erro === 'fora_de_ordem'
  return { tipo: 'bloqueado', motivo: invalido ? 'invalido' : erro }
}

const PENDENTE =
  'Algumas respostas ainda não foram salvas. Verifique a sua conexão e toque no botão de novo. Não feche esta página até conseguir.'
const REDE_ENVIO =
  'Não conseguimos confirmar o envio das suas respostas. Verifique a conexão e toque em Tentar de novo — se elas já tiverem sido enviadas, o link avisa.'
const SEM_FECHO =
  'Suas respostas estão salvas, mas não conseguimos fechar o questionário. Avise quem enviou o convite; não é preciso responder de novo.'

/** Onde a pessoa entra, a partir do que o servidor diz que ja esta salvo. */
function pontoDeEntrada(e: EstadoAplicacao, roteiro: Roteiro): Fase {
  if (!e.consentiu) return { tipo: 'consentimento' }
  if (e.etapaAtual === null) return { tipo: 'finalizando' }
  const algo = Object.values(e.feitas).some((l) => l.length > 0)
  if (!algo) return { tipo: 'abertura', etapa: 1 }
  const feitas = new Set(e.feitas[e.etapaAtual])
  const indice = Math.max(0, roteiro[e.etapaAtual].findIndex((t) => !feitas.has(t.tela)))
  return { tipo: 'retomada', etapa: e.etapaAtual, indice }
}

export function InventarioMC({ token, inicial }: { token: string; inicial: EstadoAplicacao | RecusaInventario }) {
  const semente = inicial.ok ? inicial.semente : 0
  const roteiro = useMemo(() => montarRoteiro(semente), [semente])
  const [fase, setFase] = useState<Fase>(() =>
    inicial.ok ? pontoDeEntrada(inicial, roteiro) : faseDaRecusa(inicial.erro),
  )
  const [respostas, setRespostas] = useState(inicial.ok ? inicial.respostas : {})
  const [falhou, setFalhou] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Fila de gravacoes, como em Assessment.tsx: a ordem de chegada e a dos
  // toques, e o fecho tem o que esperar antes de pedir a finalizacao.
  const fila = useRef<Promise<void>>(Promise.resolve())
  // O que a rede nao confirmou, por "<etapa>:<tela>". Reenviado no proximo
  // toque em Avancar (e o que o texto de erro manda fazer) e antes do fecho.
  const falhas = useRef(new Map<string, Envio>())
  const entrou = useRef(new Date())

  const chaveTela = fase.tipo === 'tela' ? `${fase.etapa}:${fase.indice}` : fase.tipo
  useEffect(() => {
    entrou.current = new Date()
    window.scrollTo(0, 0)
    document.getElementById('mc-pergunta')?.focus({ preventScroll: true })
  }, [chaveTela])

  // 69 telas salvas numa visita anterior, sem o fecho: fecha agora.
  const fecharNaEntrada = useRef(fase.tipo === 'finalizando')
  useEffect(() => {
    if (fecharNaEntrada.current) void fechar()
    // So na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function recarregar() {
    try {
      const e = await lerEstado(token)
      if (!e.ok) return setFase(faseDaRecusa(e.erro))
      setRespostas(e.respostas)
      setFase(pontoDeEntrada(e, roteiro))
    } catch {
      setAviso(PENDENTE)
    }
  }

  function tratarRecusa(erro: FalhaInventario) {
    if (erro === 'etapa_travada') setFase({ tipo: 'travada' })
    // O servidor discorda de onde a pessoa esta (outra aba, consentimento
    // perdido): a verdade e a dele.
    else if (erro === 'fora_de_ordem' || erro === 'sem_consentimento') void recarregar()
    else setFase(faseDaRecusa(erro))
  }

  function enviar(envio: Envio) {
    const chave = `${envio.etapa}:${envio.tela}`
    falhas.current.delete(chave)
    fila.current = fila.current.then(async () => {
      try {
        const r = await salvarTela(token, envio)
        if (!r.ok) tratarRecusa(r.erro)
      } catch {
        falhas.current.set(chave, envio)
      }
      setFalhou(falhas.current.size > 0)
    })
  }

  /** Reenvia o que falhou e espera a fila. Verdadeiro = tudo confirmado. */
  async function drenar(): Promise<boolean> {
    for (const envio of [...falhas.current.values()]) enviar(envio)
    await fila.current
    return falhas.current.size === 0
  }

  async function fechar() {
    setOcupado(true)
    setAviso(null)
    try {
      if (!(await drenar())) return setAviso(PENDENTE)
      const r = await finalizar(token)
      if (r.ok) return setFase({ tipo: 'conclusao' })
      if (r.erro === 'incompleto') return void (await recarregar())
      if (r.erro === 'resposta_invalida') return setAviso(SEM_FECHO)
      tratarRecusa(r.erro)
    } catch {
      setAviso(REDE_ENVIO)
    } finally {
      setOcupado(false)
    }
  }

  function responder(etapa: Etapa, indice: number, resposta: string[] | number) {
    const tela = roteiro[etapa][indice]!.tela
    const carimbos = { entrou_em: entrou.current.toISOString(), saiu_em: new Date().toISOString() }
    for (const envio of [...falhas.current.values()]) enviar(envio)
    enviar(
      etapa === 3
        ? { etapa, tela, resposta_exibida: resposta as number, ...carimbos }
        : { etapa, tela, ordem_final: resposta as string[], ...carimbos },
    )
    setRespostas((r) => ({ ...r, [`${etapa}:${tela}`]: resposta }))

    if (indice + 1 < roteiro[etapa].length) setFase({ tipo: 'tela', etapa, indice: indice + 1 })
    else if (etapa !== 4) setFase({ tipo: 'fimEtapa', etapa })
    else {
      setFase({ tipo: 'finalizando' })
      void fechar()
    }
  }

  async function proximaEtapa(etapa: 1 | 2 | 3) {
    setOcupado(true)
    setAviso(null)
    // A etapa seguinte so grava com esta completa no servidor: seguir com uma
    // tela pendente daria "fora de ordem" na primeira tela da proxima.
    const ok = await drenar()
    setOcupado(false)
    if (ok) setFase({ tipo: 'abertura', etapa: (etapa + 1) as Etapa })
    else setAviso(PENDENTE)
  }

  async function aceitar() {
    setOcupado(true)
    setAviso(null)
    try {
      const r = await consentir(token)
      if (r.ok) setFase({ tipo: 'compromisso' })
      else tratarRecusa(r.erro)
    } catch {
      setAviso('Não conseguimos registrar o seu aceite. Verifique a conexão e toque de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const avisoEl = (
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
  )

  /* ---------------- Telas ---------------- */
  if (fase.tipo === 'tela') {
    const { etapa, indice } = fase
    const total = roteiro[etapa].length
    const voltar = () => setFase({ tipo: 'tela', etapa, indice: indice - 1 })
    const exibida = roteiro[etapa][indice]!
    const salva = respostas[`${etapa}:${exibida.tela}`]
    return (
      <div>
        <div className={styles.progresso}>
          <div className={styles.progressoTopo}>
            <span className={styles.etapaNome}>{ETAPAS[etapa].titulo}</span>
            <span>{textoProgresso(etapa, indice + 1)}</span>
          </div>
          <Progress value={(indice / total) * 100} label={textoProgresso(etapa, indice + 1)} />
        </div>

        <div role="status" aria-live="polite">
          {falhou ? (
            <div className={`${ui.callout} ${ui.calloutWarning}`}>
              <span className={ui.calloutIcon}>
                <Icon name="alert" />
              </span>
              <span>{TEXTOS_TELA.erroAoSalvar}</span>
            </div>
          ) : null}
        </div>

        {etapa === 3 ? (
          <TelaPar
            key={exibida.tela}
            par={roteiro[3][indice]!}
            salva={typeof salva === 'number' ? salva : undefined}
            podeVoltar={indice > 0}
            onVoltar={voltar}
            onResponder={(botao) => responder(3, indice, botao)}
          />
        ) : (
          <TelaOrdenar
            key={`${etapa}:${exibida.tela}`}
            etapa={etapa}
            inicial={roteiro[etapa][indice]!.inicial}
            salva={Array.isArray(salva) ? salva : undefined}
            podeVoltar={indice > 0}
            onVoltar={voltar}
            onAvancar={(ordem) => responder(etapa, indice, ordem)}
          />
        )}
      </div>
    )
  }

  /* ---------------- Cartoes de passagem ---------------- */
  let titulo = ''
  let corpo: React.ReactNode = null
  let acao: React.ReactNode = null

  switch (fase.tipo) {
    case 'consentimento':
      titulo = CONSENTIMENTO.titulo
      corpo = CONSENTIMENTO.secoes.map((s) => (
        <section key={s.titulo} className={styles.secao}>
          <h2>{s.titulo}</h2>
          <p className={styles.texto}>{s.texto}</p>
        </section>
      ))
      acao = (
        <div className={styles.acoes}>
          <Button variant="primary" size="lg" block className={styles.botaoFrase} disabled={ocupado} onClick={aceitar}>
            {CONSENTIMENTO.aceite}
          </Button>
          <Button variant="ghost" block disabled={ocupado} onClick={() => setFase({ tipo: 'naoAgora' })}>
            {CONSENTIMENTO.recusa}
          </Button>
        </div>
      )
      break
    case 'naoAgora':
      titulo = 'Tudo bem'
      corpo = (
        <p className={styles.texto}>
          Nada foi registrado. Quando quiser responder, volte por este mesmo link.
        </p>
      )
      acao = (
        <Button variant="secondary" onClick={() => setFase({ tipo: 'consentimento' })}>
          Ler o termo de novo
        </Button>
      )
      break
    case 'compromisso':
      titulo = COMPROMISSO_ATENCAO.titulo
      corpo = (
        <ul className={styles.lista}>
          {COMPROMISSO_ATENCAO.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
      acao = (
        <Button variant="primary" size="lg" block onClick={() => setFase({ tipo: 'abertura', etapa: 1 })}>
          {COMPROMISSO_ATENCAO.aceite}
        </Button>
      )
      break
    case 'retomada': {
      const { etapa, indice } = fase
      const t = textoRetomada(etapa, indice + 1)
      titulo = t.titulo
      corpo = <p className={styles.texto}>{t.texto}</p>
      acao = (
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => setFase(indice === 0 ? { tipo: 'abertura', etapa } : { tipo: 'tela', etapa, indice })}
        >
          {t.botao}
        </Button>
      )
      break
    }
    case 'abertura': {
      const { etapa } = fase
      titulo = `Etapa ${etapa} de 4 · ${ETAPAS[etapa].titulo}`
      corpo = (
        <>
          <p className={styles.texto}>{ETAPAS[etapa].abertura}</p>
          {/* A trava da etapa 1 (secao 3) e anunciada antes, como no prototipo. */}
          {etapa === 2 ? <p className={styles.miudo}>A etapa anterior fica travada a partir daqui.</p> : null}
        </>
      )
      acao = (
        <Button variant="primary" size="lg" block onClick={() => setFase({ tipo: 'tela', etapa, indice: 0 })}>
          Começar
        </Button>
      )
      break
    }
    case 'fimEtapa': {
      const t = textoFimDeEtapa(fase.etapa)
      const etapa = fase.etapa
      titulo = t.titulo
      corpo = <p className={styles.texto}>{t.texto}</p>
      acao = (
        <Button variant="primary" size="lg" block disabled={ocupado} onClick={() => proximaEtapa(etapa)}>
          {t.botao}
        </Button>
      )
      break
    }
    case 'finalizando':
      titulo = ocupado || !aviso ? 'Enviando suas respostas…' : 'Falta enviar'
      corpo = <p className={styles.texto}>Só um instante. Não feche esta página.</p>
      acao = aviso ? (
        <Button variant="primary" size="lg" block disabled={ocupado} onClick={fechar} icon={<Icon name="refresh" size={16} />}>
          Tentar de novo
        </Button>
      ) : null
      break
    case 'conclusao':
      titulo = CONCLUSAO.titulo
      corpo = <Conclusao token={token} />
      break
    case 'travada':
      titulo = ETAPA_TRAVADA.titulo
      corpo = <p className={styles.texto}>{ETAPA_TRAVADA.texto}</p>
      acao = (
        <Button variant="primary" size="lg" block onClick={recarregar}>
          {ETAPA_TRAVADA.voltar}
        </Button>
      )
      break
    case 'bloqueado':
      titulo = 'Não é possível continuar'
      corpo = <p className={styles.texto}>{BLOQUEIO[fase.motivo]}</p>
      break
  }

  return (
    <Card padding="lg">
      <div className={styles.pilha}>
        <h1 id="mc-pergunta" tabIndex={-1} className={styles.titulo}>
          {titulo}
        </h1>
        {corpo}
        {avisoEl}
        {acao}
      </div>
    </Card>
  )
}
