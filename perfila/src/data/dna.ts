/** Território da Empresa — perfil coletivo de uma empresa. */

import { initials } from '@/lib/text'

export type Dna = {
  slug: string
  name: string
  /** Quantidade de inventários respondidos (null = ainda sem registro). */
  inventarios: number | null
  by: string
  date: string
}

export const dnas: Dna[] = [
  {
    slug: 'deputado-afonso',
    name: 'Deputado Afonso',
    inventarios: 69,
    date: '08/12/2025 19:08',
    by: 'Valmer Albuquerque dos Santos',
  },
  {
    slug: 'dm-distribuidora',
    name: 'DM Distribuidora de Produtos e Acessórios Ltda',
    inventarios: 8,
    date: '30/10/2024 13:50',
    by: 'Valmer Albuquerque dos Santos',
  },
  {
    slug: 'klir-imoveis',
    name: 'Klir Imóveis',
    inventarios: 27,
    date: '30/06/2024 12:46',
    by: 'Valmer Albuquerque dos Santos',
  },
  {
    slug: 'dna-mania-acessorios',
    name: 'DNA Mania Acessórios',
    inventarios: null,
    date: '15/01/2022 14:57',
    by: 'Valmer Albuquerque dos Santos',
  },
]

export function getDna(slug: string): Dna | undefined {
  return dnas.find((dna) => dna.slug === slug)
}

/** Fatores DISC: as quatro dimensões do inventário comportamental. */
export type FatorDisc = 'D' | 'I' | 'S' | 'C'

export const FATORES_DISC: { fator: FatorDisc; nome: string }[] = [
  { fator: 'D', nome: 'Dominância média' },
  { fator: 'I', nome: 'Influência média' },
  { fator: 'S', nome: 'Estabilidade média' },
  { fator: 'C', nome: 'Conformidade média' },
]

/** Médias do DNA aberto (Deputado Afonso). */
export const mediasDisc: Record<FatorDisc, number> = { D: 52, I: 57, S: 47, C: 45 }

export type Respondente = {
  name: string
  email: string
  /** Perfil resultante — as duas letras predominantes. */
  perfil: string
  d: number
  i: number
  s: number
  c: number
  date: string
  iniciais: string
}

const respondentesBase: Omit<Respondente, 'iniciais'>[] = [
  {
    name: 'Bruno Carvalho',
    email: 'bruno.carvalho@example.com',
    perfil: 'ID',
    d: 52,
    i: 74,
    s: 41,
    c: 33,
    date: '02/12/2025 12:59',
  },
  {
    name: 'Eduardo Salles',
    email: 'eduardo.salles@example.com',
    perfil: 'CS',
    d: 33,
    i: 49,
    s: 57,
    c: 61,
    date: '01/12/2025 11:33',
  },
  {
    name: 'Fabiana Rezende',
    email: 'fabiana.rezende@example.com',
    perfil: 'DI',
    d: 65,
    i: 53,
    s: 39,
    c: 43,
    date: '03/12/2025 13:25',
  },
  {
    name: 'Camila Ferraz',
    email: 'camila.ferraz@example.com',
    perfil: 'DI',
    d: 58,
    i: 51,
    s: 49,
    c: 42,
    date: '01/12/2025 15:49',
  },
]

export const respondentes: Respondente[] = respondentesBase.map((pessoa) => ({
  ...pessoa,
  iniciais: initials(pessoa.name),
}))
