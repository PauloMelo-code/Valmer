import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DocumentoMC } from '@/components/relatorio-mc/DocumentoMC'
import { exigirSessaoNaTela } from '@/lib/auth/tela'
import { calcularResultado, type RespostasInventario } from '@/lib/motor'
import { montarDadosRelatorio } from '@/lib/relatorio-mc/dados'
import { esquemaNarrativaMC } from '@/lib/relatorio-mc/narrativa-esquema'
import { BASE_ADMIN } from '@/lib/routes'
import caso from '../../../../tests/fixtures/caso-demonstracao.json'
import narrativaExemplo from '../../../../tests/fixtures/narrativa-demonstracao.json'

export const metadata: Metadata = {
  title: 'Impacto Academy · Modelo do relatório MC 3.1',
}

/**
 * Vitrine do relatorio MC 3.1 com o caso de demonstracao (Adriana Prado,
 * ficticia): e o alvo da conferencia visual e o que o Valmer abre para aprovar.
 *
 * Os numeros saem do motor, rodando as 69 respostas do caso aqui mesmo — nao
 * de um JSON de resultado copiado —, entao o modelo mostra o que o motor
 * atual calcula. A narrativa e um exemplo escrito a mao, em rascunho, validado
 * pelo mesmo esquema que valida a da IA: se o esquema mudar, esta pagina quebra
 * no build em vez de mostrar um modelo que a IA ja nao produz.
 *
 * Nada aqui le o banco nem dado de pessoa real. A sessao e conferida de novo
 * na pagina, alem do layout, porque "so admin" nao pode depender de um arquivo
 * vizinho continuar existindo.
 */
export default async function RelatorioModeloPage() {
  const { sessao } = await exigirSessaoNaTela(`${BASE_ADMIN}/relatorio-modelo`)
  if (sessao.papel !== 'admin') redirect('/facilitador')

  // Sem telas gravadas a validade acusa tempo zero (V1); ela nao entra no
  // relatorio (R5), entao o modelo nao e afetado.
  const resultado = calcularResultado(caso.respostas as unknown as RespostasInventario, [])
  const dados = montarDadosRelatorio({
    assessment: { nome: caso.avaliado.nome, codigo: 'MC-2026-0928-AP', emitidoEm: new Date('2026-09-28T12:00:00-03:00') },
    resultado,
    narrativa: esquemaNarrativaMC.parse(narrativaExemplo),
    // O instrutor do modelo e quem esta vendo: o Valmer, quando ele abrir. Um
    // texto fixo aqui aparecia na capa como "NOME DO INSTRUTOR" e parecia
    // campo esquecido de preencher.
    facilitador: { nome: sessao.nome },
    nivel: 'S4',
  })

  return (
    <div>
      <p style={{ marginBottom: 16 }}>
        Modelo com dados fictícios: avaliada {caso.avaliado.nome}, nível S4. Os números vêm do motor; os textos de IA são
        um exemplo escrito à mão, em rascunho, e não saem da IA.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <DocumentoMC dados={dados} />
      </div>
    </div>
  )
}
