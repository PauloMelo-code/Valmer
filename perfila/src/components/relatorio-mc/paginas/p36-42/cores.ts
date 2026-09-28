/**
 * Cor do fio entre as colunas da faixa Foco/Comunicacao/Decisao/Pergunta nas
 * paginas 36, 37, 39 e 40. E um tom intermediario entre o fundo suave e a cor
 * principal do fator que so existe ali no molde; por isso nao entrou em
 * `CORES_FATOR`.
 */
import type { Fator } from '@/data/inventario-mc'

export const DIVISOR_FATOR: Record<Fator, string> = { D: '#E4A3A3', I: '#E8C173', S: '#8DBEAA', C: '#93ABC3' }
