/**
 * Regua oficial de 6 zonas — blueprint secao 11, ADR-0007 D4.
 *
 * Uma regua so em todo o relatorio, inclusive no Mapa de Intensidade: o
 * prompt de redesign e o PDF v3 ainda falam em 5 faixas (Discreto ...
 * Dominante), e isso foi superado pela v2.2. Centrada em 50 porque os quatro
 * fatores somam 200.
 *
 * A conta da zona (`zona(score)`) e do motor, nao daqui: este arquivo so da o
 * nome, a faixa e o texto de cada uma. `minimo` e o limiar inclusivo que o
 * motor usa; os escores tem uma casa decimal, por isso `maximo` termina em ,9.
 */
export const CODIGOS_ZONA = ['EA', 'MA', 'A', 'B', 'MB', 'EB'] as const
export type CodigoZona = (typeof CODIGOS_ZONA)[number]

export type Zona = {
  codigo: CodigoZona
  nome: string
  minimo: number
  maximo: number
  /** Como a faixa e escrita na fonte. */
  faixa: string
  comoAparece: string
  /**
   * EA e EB sao excesso, nao conquista: o relatorio mostra com aviso visual
   * distinto (cinza, borda pontilhada ou icone), nunca como celebracao.
   */
  atencao: boolean
}

export const ZONAS: Record<CodigoZona, Zona> = {
  EA: {
    codigo: 'EA', nome: 'Extremo alto', minimo: 88, maximo: 100, faixa: '88–100', atencao: true,
    comoAparece: 'Comportamento aparece de forma quase involuntária, inclusive quando não é o mais adequado. Zona de atenção.',
  },
  MA: {
    codigo: 'MA', nome: 'Muito alto', minimo: 70, maximo: 87.9, faixa: '70–87,9', atencao: false,
    comoAparece: 'Alta influência no comportamento. Facilmente reconhecível por quem convive.',
  },
  A: {
    codigo: 'A', nome: 'Alto', minimo: 51, maximo: 69.9, faixa: '51–69,9', atencao: false,
    comoAparece: 'Fator predominante. Aparece com regularidade e ajuda a definir o perfil.',
  },
  B: {
    codigo: 'B', nome: 'Baixo', minimo: 33, maximo: 50.9, faixa: '33–50,9', atencao: false,
    comoAparece: 'Presente em situações específicas. Acionado por contexto, não por padrão.',
  },
  MB: {
    codigo: 'MB', nome: 'Muito baixo', minimo: 16, maximo: 32.9, faixa: '16–32,9', atencao: false,
    comoAparece: 'Raramente visível. O comportamento oposto tende a aparecer no lugar.',
  },
  EB: {
    codigo: 'EB', nome: 'Extremo baixo', minimo: 0, maximo: 15.9, faixa: '0–15,9', atencao: true,
    comoAparece: 'Fator suprimido. O comportamento oposto aflora com força. Zona de atenção.',
  },
}

/** Marcacoes da escala 0-100 nos graficos de barra (secao 11): os limites das zonas. */
export const MARCAS_DA_REGUA = [0, 16, 33, 51, 70, 88, 100] as const
