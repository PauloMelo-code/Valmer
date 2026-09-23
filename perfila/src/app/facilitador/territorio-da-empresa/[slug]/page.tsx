import { notFound } from 'next/navigation'
import { dnas, getDna } from '@/data/dna'
import { DnaDetalhe } from './DnaDetalhe'

/** Cada DNA cadastrado vira uma página pré-renderizada. */
export function generateStaticParams() {
  return dnas.map((dna) => ({ slug: dna.slug }))
}

export default async function DnaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dna = getDna(slug)

  if (!dna) notFound()

  return <DnaDetalhe dna={dna} />
}
