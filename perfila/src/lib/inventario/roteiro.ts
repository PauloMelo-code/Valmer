/**
 * O roteiro de uma aplicacao do MC-INV 2.2: em que ordem as 69 telas
 * aparecem, em que ordem os itens de cada tela aparecem e de que lado fica o
 * polo A de cada par de Jung. Tudo sai da semente gravada no mapa.
 *
 * E a mecanica de `novo()` do prototipo do Valmer
 * (contexto/referencias/mc-inv-2.2/inventario-mc.html), chamada por chamada:
 * mesmo gerador (mulberry32), mesmo Fisher-Yates, mesma sequencia de sorteios.
 * Trocar a ordem de dois sorteios aqui muda o roteiro de todo mapa ja
 * iniciado — e o servidor passaria a julgar `moveu_item` e o lado do polo A
 * contra uma tela que a pessoa nunca viu.
 *
 * Funcao pura, sem banco nem Node: a MESMA roda no navegador (para desenhar a
 * tela) e no servidor (para nao confiar no que o navegador diz que desenhou).
 */
import {
  EIXOS_JUNG,
  GRUPOS_DISC,
  GRUPOS_VALORES,
  PARES_JUNG,
  telaDoGrupo,
  type EixoJung,
  type ParJung,
} from '@/data/inventario-mc'

/** Etapas 1, 2 e 4: a tela e os ids na ordem em que aparecem de inicio. */
export type TelaDeOrdenar = { tela: string; inicial: readonly string[] }

/** Etapa 3: o par, e se o polo A aparece a esquerda. */
export type TelaDePar = ParJung & { tela: string; poloAEsquerda: boolean }

export type Roteiro = {
  1: readonly TelaDeOrdenar[]
  2: readonly TelaDeOrdenar[]
  3: readonly TelaDePar[]
  4: readonly TelaDeOrdenar[]
}

/** mulberry32, identico ao `rng()` do prototipo. Devolve [0, 1). */
export function gerador(semente: number): () => number {
  let s = semente
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates de tras para frente, como o `shuffle()` do prototipo. */
export function embaralhar<T>(lista: readonly T[], sorteio: () => number): T[] {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function montarRoteiro(semente: number): Roteiro {
  const sorteio = gerador(semente)
  const ordenar = (prefixo: 'G' | 'V', g: { grupo: number; itens: readonly { id: string }[] }): TelaDeOrdenar => ({
    tela: telaDoGrupo(prefixo, g.grupo),
    inicial: embaralhar(
      g.itens.map((i) => i.id),
      sorteio,
    ),
  })

  // Etapa 1: grupos na ordem do inventario, palavras embaralhadas.
  const e1 = GRUPOS_DISC.map((g) => ordenar('G', g))
  // Etapa 2: embaralha os grupos PRIMEIRO e so depois as palavras de cada um
  // (no prototipo e `shuffle(...).map(...)`: o map so roda depois).
  const e2 = embaralhar(GRUPOS_DISC, sorteio).map((g) => ordenar('G', g))

  // Etapa 3: os 9 pares de cada eixo embaralhados (EI, NS, TF, nesta ordem),
  // depois 9 rodadas com os 3 eixos em ordem sorteada e o lado de cada par.
  const porEixo = Object.fromEntries(
    EIXOS_JUNG.map((eixo) => [
      eixo,
      embaralhar(
        PARES_JUNG.filter((p) => p.eixo === eixo),
        sorteio,
      ),
    ]),
  ) as Record<EixoJung, ParJung[]>
  const rodadas = porEixo.EI.length
  const e3: TelaDePar[] = []
  for (let k = 0; k < rodadas; k++) {
    for (const eixo of embaralhar(EIXOS_JUNG, sorteio)) {
      const par = porEixo[eixo][k]!
      e3.push({ ...par, tela: par.id, poloAEsquerda: sorteio() < 0.5 })
    }
  }

  // Etapa 4: grupos e palavras embaralhados, como a 2.
  const e4 = embaralhar(GRUPOS_VALORES, sorteio).map((g) => ordenar('V', g))

  return { 1: e1, 2: e2, 3: e3, 4: e4 }
}

/**
 * Uma tela do roteiro, ou nada se ela nao for desta etapa. O zod ja recusou
 * tela inexistente antes; isto so casa (etapa, tela) com o que foi exibido.
 */
export function telaDoRoteiro(roteiro: Roteiro, etapa: 3, tela: string): TelaDePar | undefined
export function telaDoRoteiro(roteiro: Roteiro, etapa: 1 | 2 | 4, tela: string): TelaDeOrdenar | undefined
export function telaDoRoteiro(roteiro: Roteiro, etapa: 1 | 2 | 3 | 4, tela: string) {
  return (roteiro[etapa] as readonly { tela: string }[]).find((t) => t.tela === tela)
}

/**
 * Regra de exibicao do prototipo (`gen`), ampliada: adjetivo terminado em
 * "o" ou "or" ganha "(a)" — "Ousado(a)", "Acolhedor(a)" (AGENTE 4.1, blueprint
 * 15.0). O `gen` do prototipo so via o "o" e deixava seis grupos no masculino
 * (Acolhedor, Observador, Desafiador, Conciliador, Inspirador, Motivador).
 * So nas etapas 1 e 2; palavra de valor ("Dinheiro") nao tem genero. A chave
 * das definicoes continua sendo o texto cru.
 */
export function comGenero(texto: string): string {
  return /o$|or$/.test(texto) ? `${texto}(a)` : texto
}
