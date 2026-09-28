/**
 * O relatorio MC 3.1 inteiro: as paginas do nivel, em ordem, dentro da raiz.
 *
 * Componente de servidor (sem 'use client'): as paginas sao renderizadas no
 * servidor e so a raiz `RelatorioMC` vai ao navegador, para o ajuste de
 * pagina. A rota publica e o modelo do admin usam este mesmo componente —
 * o que o Valmer confere no modelo e o que o avaliado recebe.
 */
import type { DadosRelatorioMC } from '@/lib/relatorio-mc/dados'
import { PAGINAS } from './paginas/registro'
import { RelatorioMC } from './RelatorioMC'

export function DocumentoMC({ dados }: { dados: DadosRelatorioMC }) {
  return (
    <RelatorioMC>
      {PAGINAS.filter((p) => dados.nivel.inclui[p.numero]).map(({ numero, Componente }) => (
        <Componente key={numero} dados={dados} />
      ))}
    </RelatorioMC>
  )
}
