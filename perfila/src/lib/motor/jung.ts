/**
 * Tipos psicologicos (secao 5.7). A entrada de cada eixo sao as 9 respostas JA
 * convertidas ao polo A (3 = muito A ... 0 = muito B): a tela grava o botao
 * exibido e o lado sorteado, e a conversao acontece antes de chegar aqui.
 *
 *   %A = soma / 27 * 100      %B = 100 - %A      polo = A se %A > 50
 *
 * 27 e impar, entao %A nunca e 50 exato e o tipo nunca empata.
 */
import { EIXOS_JUNG, POLOS, type EixoJung } from '@/data/inventario-mc'
import { r1 } from './arredondamento'
import { RespostaInvalida } from './ordenacao'

export type RespostasJung = Record<EixoJung, readonly number[]>

export type PoloJung = 'E' | 'I' | 'N' | 'S' | 'T' | 'F'

export type PontuacaoJung = {
  percentuais: Record<PoloJung, number>
  /** Ex.: "ENT". */
  tipo: string
  /** Dominante, auxiliar, terciaria, inferior. Vai ao relatorio como A CONFIRMAR NA DEVOLUTIVA. */
  hierarquia: [string, string, string, string]
}

const NOME: Record<string, string> = { N: 'Intuição', S: 'Sensação', T: 'Pensamento', F: 'Sentimento' }
const OPOSTA: Record<string, string> = { N: 'S', S: 'N', T: 'F', F: 'T' }

/** Intuicao e Sensacao sao femininas; Pensamento e Sentimento, masculinos. */
function funcao(f: string, atitude: string): string {
  const genero = f === 'N' || f === 'S' ? 'a' : 'o'
  return `${NOME[f]} ${atitude === 'E' ? 'Extrovertid' : 'Introvertid'}${genero}`
}

export function pontuarJung(resp: RespostasJung): PontuacaoJung {
  const pct = {} as Record<PoloJung, number>
  for (const eixo of EIXOS_JUNG) {
    // Array.from troca buraco por undefined: `every` e `reduce` pulam buraco, e
    // um par que nao foi gravado passaria como se nao existisse.
    const v = Array.isArray(resp[eixo]) ? Array.from(resp[eixo]) : null
    if (!v || v.length !== 9 || !v.every((x) => Number.isInteger(x) && x >= 0 && x <= 3)) {
      throw new RespostaInvalida(`eixo ${eixo} precisa de 9 respostas de 0 a 3: ${JSON.stringify(resp[eixo])}`)
    }
    const [a, b] = POLOS[eixo] as [PoloJung, PoloJung]
    const pa = r1((v.reduce((s, x) => s + x, 0) / 27) * 100)
    pct[a] = pa
    pct[b] = r1(100 - pa)
  }
  const tipo = (pct.E > 50 ? 'E' : 'I') + (pct.N > 50 ? 'N' : 'S') + (pct.T > 50 ? 'T' : 'F')
  // Nao se comparam escores de eixos diferentes: compara-se a distancia do meio.
  const clarezaP = Math.abs(pct.N - 50)
  const clarezaJ = Math.abs(pct.T - 50)
  const atitude = tipo[0]
  const outra = atitude === 'E' ? 'I' : 'E'
  const dom = clarezaP >= clarezaJ ? tipo[1] : tipo[2] // empate -> percepcao
  const aux = dom === tipo[1] ? tipo[2] : tipo[1]
  return {
    percentuais: pct,
    tipo,
    hierarquia: [
      funcao(dom, atitude),
      funcao(aux, outra),
      funcao(OPOSTA[aux], atitude),
      funcao(OPOSTA[dom], outra),
    ],
  }
}
