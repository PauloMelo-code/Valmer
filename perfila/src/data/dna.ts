/**
 * Fatores DISC — as quatro dimensões do inventário comportamental.
 *
 * Este arquivo era o protótipo do Território da Empresa: quatro empresas fixas,
 * os respondentes delas e a média `{ D: 52, I: 57, S: 47, C: 45 }` escrita à
 * mão — que soma 201 e não descrevia nenhum dos respondentes listados ao lado.
 * As três telas do território leem o banco desde então (`lib/territorios.ts`
 * tira a média dos contadores dos mapas vinculados), e o protótipo saiu daqui
 * para não haver duas respostas para "qual é a média desta empresa".
 *
 * O que ficou é o vocabulário: o tipo `FatorDisc`, usado por meio sistema, e os
 * rótulos dos quatro cartões de média. Nenhum dos dois é dado de ninguém.
 */

export type FatorDisc = 'D' | 'I' | 'S' | 'C'

export const FATORES_DISC: { fator: FatorDisc; nome: string }[] = [
  { fator: 'D', nome: 'Dominância média' },
  { fator: 'I', nome: 'Influência média' },
  { fator: 'S', nome: 'Estabilidade média' },
  { fator: 'C', nome: 'Conformidade média' },
]
