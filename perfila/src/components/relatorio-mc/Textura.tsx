/**
 * Hachura do perfil adaptado (blueprint secao 02: natural solido, adaptado
 * com a MESMA cor em diagonal, para sobreviver a impressao em preto e branco).
 *
 * O molde usa ids fixos (`u2D`, `u3`...). Com dois relatorios na mesma pagina
 * — o modelo do admin ao lado de um real, ou duas paginas iguais — o segundo
 * `<pattern>` com o mesmo id seria ignorado e as barras pegariam a cor do
 * primeiro. Por isso os ids vem de `useId()` (R4).
 *
 * Uso (componente sincrono; hook nao roda em componente `async`):
 *   const tx = useTexturas()
 *   <svg><DefsTexturas ids={tx} /><rect fill={`url(#${tx.D})`} ... /></svg>
 */
import { useId } from 'react'
import { FATORES, type Fator } from '@/data/inventario-mc'
import { CORES_FATOR } from '@/data/relatorio-mc/cores'

export type IdsTextura = Record<Fator, string>

export function useTexturas(): IdsTextura {
  // O id do React traz delimitadores («r1») que nao sao seguros dentro de url(#...).
  const base = `tx${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return { D: `${base}D`, I: `${base}I`, S: `${base}S`, C: `${base}C` }
}

/**
 * `fundo="branco"`: a do Mapa de Intensidade (pagina 06, trama 15/6 sobre branco).
 * `fundo="suave"`: a das demais (09-12, 27, 29: trama 14/5 sobre o fundo suave do fator).
 */
export function DefsTexturas({ ids, fundo = 'suave' }: { ids: IdsTextura; fundo?: 'suave' | 'branco' }) {
  const [lado, faixa] = fundo === 'branco' ? [15, 6] : [14, 5]
  return (
    <defs>
      {FATORES.map((f) => (
        <pattern key={f} id={ids[f]} patternUnits="userSpaceOnUse" width={lado} height={lado} patternTransform="rotate(45)">
          <rect width={lado} height={lado} fill={fundo === 'branco' ? '#FFFFFF' : CORES_FATOR[f].fundoSuave} />
          <rect x="0" y="0" width={faixa} height={lado} fill={CORES_FATOR[f].principal} />
        </pattern>
      ))}
    </defs>
  )
}
