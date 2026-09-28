/**
 * Descritores de intensidade — blueprint secao 09.
 *
 * Quatro adjetivos por fator em cada zona. E o SISTEMA que preenche isto nas
 * paginas 09-12, nunca a IA: o escore entra na zona, a zona escolhe a linha.
 * Estes adjetivos sao do relatorio e nao se confundem com os 64 itens do
 * inventario (esses estao em `../inventario-mc`).
 */
import type { Fator } from '../inventario-mc'
import { ZONAS, type CodigoZona } from './zonas'

type Quatro = readonly [string, string, string, string]

export const DESCRITORES: Record<CodigoZona, Record<Fator, Quatro>> = {
  EA: {
    D: ['Arrogante', 'Opressor', 'Agressivo', 'Individualista'],
    I: ['Superficial', 'Impaciente', 'Inconveniente', 'Vaidoso'],
    S: ['Devagar', 'Indiferente', 'Passivo', 'Sarcástico'],
    C: ['Pessimista', 'Perfeccionista', 'Legalista', 'Resistente'],
  },
  MA: {
    D: ['Audacioso', 'Autoritário', 'Generalista', 'Enérgico'],
    I: ['Extrovertido', 'Idealista', 'Flexível', 'Inspirador'],
    S: ['Cooperativo', 'Metódico', 'Consistente', 'Cordial'],
    C: ['Meticuloso', 'Organizado', 'Cauteloso', 'Lógico'],
  },
  A: {
    D: ['Competitivo', 'Autoconfiante', 'Decidido', 'Independente'],
    I: ['Persuasivo', 'Entusiasmado', 'Otimista', 'Comunicativo'],
    S: ['Resolvido', 'Paciente', 'Calmo', 'Sensato'],
    C: ['Preciso', 'Detalhista', 'Autodisciplinado', 'Consciente'],
  },
  B: {
    D: ['Harmonioso', 'Agradável', 'Calmo', 'Avesso a risco'],
    I: ['Analítico', 'Reflexivo', 'Reservado', 'Consistente'],
    S: ['Versátil', 'Incansável', 'Intenso', 'Fazedor'],
    C: ['Flexível', 'Desinibido', 'Casual', 'Impulsivo'],
  },
  MB: {
    D: ['Modesto', 'Tímido', 'Hesitante', 'Baixa confiança'],
    I: ['Formal', 'Cauteloso', 'Sensível', 'Lógico'],
    S: ['Nervoso', 'Rápido', 'Impaciente', 'Tenso'],
    C: ['Teimoso', 'Informal', 'Aventureiro', 'Obstinado'],
  },
  EB: {
    D: ['Complacente', 'Acomodado', 'Submisso', 'Medroso'],
    I: ['Retraído', 'Introspectivo', 'Cético', 'Antissocial'],
    S: ['Agressivo', 'Impetuoso', 'Explosivo', 'Ríspido'],
    C: ['Hostil', 'Indisciplinado', 'Desorganizado', 'Desrespeitoso'],
  },
}

/** Os quatro adjetivos e se a pagina deve marcar a zona como de atencao (EA/EB). */
export function descritoresDe(fator: Fator, zona: CodigoZona): { adjetivos: Quatro; atencao: boolean } {
  return { adjetivos: DESCRITORES[zona][fator], atencao: ZONAS[zona].atencao }
}

/** Nota que acompanha a zona de atencao (secao 09). */
export const AVISO_ZONA_DE_ATENCAO =
  'Os adjetivos de EA e EB representam o excesso do fator. Na Zona EA, o comportamento aparece de forma compulsiva, mesmo quando não é o mais adequado. Na Zona EB, o fator está tão suprimido que o comportamento oposto aflora.'
