/**
 * Narrativa de exemplo
 * --------------------
 * Escrita para o perfil do relatório de referência (predominância de
 * Influência com apoio de Dominância). Existe para que a página do
 * relatório renderize sem chave de API — desenvolver layout não
 * deveria custar uma chamada paga a cada recarga.
 *
 * NUNCA exporte este objeto direto para a página. Quem decide o que a página
 * mostra é `narrativaParaExibir`, no fim do arquivo: em produção ele nunca
 * chega a um avaliado. Em produção o texto vem de gerarNarrativa().
 */

import type { NarrativaRelatorio } from '@/lib/relatorio/tipos'

export const narrativaExemplo: NarrativaRelatorio = {
  resumoPerfil:
    'Adriana, existe em você uma combinação pouco comum. Você tem o calor de quem cria vínculo com quase qualquer pessoa e, junto disso, a impaciência de quem quer ver a conversa virar ação. Você entra nos ambientes com energia e conquista espaço rápido. Essa proximidade é o que você usa para mover ideias, projetos e pessoas. Sua força vem de fazer com que os outros queiram ir junto. Some a isso a coragem de decidir antes que a certeza chegue. Você costuma tirar o grupo da paralisia e dar o primeiro passo enquanto todo mundo ainda pesa os prós e os contras.',
  pontosFortes: [
    'Poder de mobilizar pessoas. Você contagia quem está por perto com uma ideia e transforma um assunto abstrato em algo que os outros sentem vontade de fazer acontecer. Isso é raro. A maioria consegue explicar, mas poucos conseguem entusiasmar.',
    'Coragem para começar. Você dá o primeiro passo com as garantias que já tem em mãos. Onde outros pedem mais uma análise, você testa, ajusta no caminho e aprende com o que o teste devolve.',
    'Presença em situações de tensão. Pense em negociações difíceis, apresentações importantes e conversas em que é preciso defender uma posição diante de gente experiente. Esses são justamente os momentos em que você fica mais lúcido.',
    'Leitura rápida de pessoas e construção de rede. Você percebe em poucos minutos quem está do seu lado, quem está resistindo e o que cada um precisa ouvir. Com o tempo, isso vira um patrimônio de relações, e boa parte das portas que se abrem para você vem daí.',
    'Recuperação rápida diante do não. Uma rejeição ou um obstáculo te derruba por pouco tempo. Você reorganiza o ânimo e volta. Para quem trabalha ao seu lado, essa capacidade de renovar o clima depois de um revés é um alívio concreto.',
  ],
  desafios: [
    'Impaciência com o que é lento e detalhado. A parte final dos projetos, com revisão, acabamento e documentação, raramente disputa sua atenção com a novidade que acabou de aparecer. Existe um risco real de você acumular coisas iniciadas com brilho e terminadas por outra pessoa, ou não terminadas.',
    'Ocupar mais espaço do que percebe. Você pensa falando, e isso é legítimo. Em reuniões, porém, você pode preencher o silêncio antes que os mais reservados formulem o que iam dizer. Muita gente vai concordar com você por conforto. Esse acordo dura até a hora de executar, e é só aí que você descobre.',
    'Decidir por leitura pessoal quando os números diziam outra coisa. Sua intuição sobre pessoas é boa o bastante para te dar confiança demais nela. O ponto de atenção é usá-la sozinha, sem o contraponto de um dado ou de alguém que enxergue o risco que você já descartou.',
    'Assumir mais frentes do que o dia comporta. Seu otimismo com prazos é sincero, e por isso mesmo perigoso. Você diz sim com verdade no momento em que diz. A conta chega semanas depois, em compromissos atrasados que arranham justamente a confiança que você constrói tão bem.',
  ],
  motivadores:
    'O que move você é ter impacto visível sobre pessoas. Ver alguém mudar de ideia, um time se animar, um cliente dizer sim. Reconhecimento importa, porque é assim que você mede que sua influência foi real. A liberdade é um combustível igualmente forte. Você rende quando lhe entregam o resultado esperado e o espaço para chegar lá do seu jeito, e murcha quando o caminho já vem fechado.',
  ambienteIdeal:
    'Você rende mais onde há movimento, contato humano frequente e metas claras que possam ser vistas avançando. Autonomia real conta muito. Você tira o seu melhor quando pode variar de assunto e tem permissão para experimentar. Rotinas longas e sem interlocução consomem sua energia mais rápido do que você imagina, ainda mais quando se repetem todo dia. O ponto de equilíbrio é ter por perto alguém organizado que cuide da continuidade enquanto você abre as frentes. Essa parceria faz suas ideias chegarem inteiras ao fim.',
  estiloComunicacao:
    'Você se comunica de forma expressiva, com histórias, exemplos e uma dose de franqueza que vai direto ao ponto quando o assunto pede. Prefere conversas vivas a documentos longos. Absorve muito mais quando alguém te diz o porquê e o impacto de algo do que quando recebe uma lista de instruções. Com você funciona bem o retorno dito de frente, desde que venha com respeito e reconheça o que já foi bem feito. A crítica seca você tende a descartar antes de considerar.',
  liderancaNatural:
    'Você lidera pelo entusiasmo e pela presença. As pessoas te seguem porque acreditam em você e gostam do clima que você cria. Isso constrói uma lealdade que nasce de vontade própria. Você é especialmente forte em momentos de virada, lançamento e recuperação de moral, quando o time precisa de alguém que devolva a sensação de que é possível. Seu ponto de crescimento como líder está no que vem depois. Acompanhar de perto e cobrar com método sustentam a entrega nas fases em que a novidade já passou e o trabalho continua.',
  planoDesenvolvimento: [
    'Nas próximas quatro semanas, escolha duas reuniões por semana para ser o último a dar opinião. Antes de apresentar sua leitura, faça três perguntas abertas e anote as respostas. O objetivo é descobrir o que as pessoas deixam de dizer quando você fala primeiro.',
    'Reserve trinta minutos toda sexta-feira para revisar tudo o que você prometeu na semana e marcar o que ficou inacabado. Estabeleça um teto de três frentes ativas ao mesmo tempo. Para abrir uma quarta, uma das três precisa ser concluída ou repassada formalmente a alguém.',
    'Antes de assumir qualquer novo compromisso relevante, dê a si mesmo 24 horas e converse com uma pessoa de perfil analítico do seu convívio, pedindo especificamente o que ela vê de risco. Faça disso um hábito fixo. Esse contrapeso transforma sua velocidade em vantagem duradoura.',
  ],
  fraseDoPerfil:
    'Você é alguém que acende a sala e, no mesmo gesto, aponta a direção. Sua força é fazer as pessoas quererem caminhar, e seu maior aprendizado é permanecer tempo suficiente para ver a caminhada terminar.',
}

/**
 * A narrativa que a PÁGINA deve mostrar quando não há nenhuma gravada.
 *
 * O exemplo acima foi escrito para OUTRA pessoa: ele começa chamando o leitor
 * de "Adriana" e descreve o perfil de "Adriana". Entregá-lo a um avaliado não é um
 * texto genérico, é o texto de terceiro com o nome de terceiro dentro, no único
 * documento que sai da plataforma e chega ao cliente final do parceiro.
 *
 * Por isso em produção esta função devolve `null`, e as seções escritas saem
 * marcadas como pendentes. O que é calculado (percentuais, perfil combinado) e
 * o que é tabela fixa por perfil continuam no documento: aquilo é verdade.
 *
 * Fora de produção o exemplo continua vivo, porque desenvolver layout não pode
 * custar uma chamada paga a cada recarga. `ambiente` é parâmetro, e não leitura
 * direta de `process.env` no corpo, para o teste conseguir provar o caso de
 * produção sem mexer em variável global.
 */
export function narrativaParaExibir(
  gravada: NarrativaRelatorio | null,
  ambiente: string | undefined = process.env.NODE_ENV,
): NarrativaRelatorio | null {
  if (gravada) return gravada
  return ambiente === 'production' ? null : narrativaExemplo
}
