/**
 * Motor de calculo do MC-INV 2.2: porte fiel de
 * `contexto/referencias/mc-inv-2.2/motor_referencia.py` (ADR-0007 D2).
 *
 * Funcao pura: nada aqui le banco, rede ou Next. A mesma resposta da o mesmo
 * resultado ate a primeira casa, e `tests/motor-paridade.test.mts` confere isso
 * contra 1.430 casos gerados da referencia Python.
 */
export { r1 } from './arredondamento'
export { RespostaInvalida, type RespostasGrupos } from './ordenacao'
export { pontuarDisc, zona, ZONAS, type PontuacaoDisc, type Zona } from './disc'
export { perfil, PERFIL_EQUILIBRADO, type Perfil } from './perfil'
export { indices, type Indices, type ClasseAdaptacao } from './indices'
export { lideranca, type Lideranca } from './lideranca'
export { pontuarJung, type PontuacaoJung, type RespostasJung, type PoloJung } from './jung'
export { pontuarValores, type PontuacaoValores, type NivelValor } from './valores'
export {
  validade,
  confiabilidade,
  type TelaGravada,
  type Validade,
  type Alerta,
  type CodigoAlerta,
  type PesoAlerta,
  type Confiabilidade,
} from './validade'
export {
  calcularResultado,
  respostasDasTelas,
  VERSAO_MOTOR,
  type RespostasInventario,
  type ResultadoMotor,
  type DiscCondicao,
} from './resultado'
