/**
 * Banco de leituras por fator — blueprint secao 19, transcrito.
 *
 * Cinco livros por fator. E referencia para a IA escolher e adaptar o motivo
 * ao perfil composto do avaliado (chave `leituras_recomendadas`); a IA pode
 * sugerir fora da lista. A secao 19 fala em "Pg 36", mas as leituras entram
 * na pagina 41, junto da mensagem final (ADR-0007, D5).
 *
 * Autor e titulo vao como a secao escreve, inclusive "Patterson et al." e o
 * titulo em ingles de Crucial Conversations.
 */
import type { Fator } from '../inventario-mc'

export type Leitura = { titulo: string; autor: string; motivo: string }

export const LEITURAS: Record<Fator, readonly Leitura[]> = {
  D: [
    { titulo: 'Pense e Enriqueça', autor: 'Napoleon Hill', motivo: 'Combustível para canalizar a ambição de forma estruturada. Trabalha a persistência que o D tende a negligenciar — energia sem sistema não sustenta resultado no longo prazo.' },
    { titulo: 'As 21 Irrefutáveis Leis da Liderança', autor: 'John C. Maxwell', motivo: 'Transforma o impulso de liderança natural em método. Ensina que liderar não é só dominar — é desenvolver. O D aprende que autoridade que dura é construída, não imposta.' },
    { titulo: 'Crucial Conversations', autor: 'Patterson et al.', motivo: 'Antídoto para a comunicação agressiva — como ter conversas difíceis sem atropelar as pessoas. O D aprende que velocidade e clareza não precisam custar o relacionamento.' },
    { titulo: 'Inteligência Emocional', autor: 'Daniel Goleman', motivo: 'Abre os olhos para a dimensão emocional que é o maior ponto cego do D. Mostra que o mais eficaz não é o mais intenso — é o que sabe quando e como usar a intensidade.' },
    { titulo: 'O Poder do Hábito', autor: 'Charles Duhigg', motivo: 'Cria sistemas que sustentam resultado no longo prazo. O D tem energia mas pode ser inconsistente quando o desafio passa. Hábitos transformam intensidade em constância.' },
  ],
  I: [
    { titulo: 'Como Fazer Amigos e Influenciar Pessoas', autor: 'Dale Carnegie', motivo: 'Valida e estrutura o que o I já faz intuitivamente, adicionando profundidade consciente. O I aprende que influência intencional multiplica o que até então era instintivo.' },
    { titulo: 'Essencialismo', autor: 'Greg McKeown', motivo: 'O I começa muitos projetos e termina poucos. Ensina a arte do menos e melhor — que a força do sim depende da clareza do não. Transformador para quem dispersa energia com facilidade.' },
    { titulo: 'A Arte de Fazer Acontecer (GTD)', autor: 'David Allen', motivo: 'Sistema de organização perfeito para quem tem muitas ideias e pouca estrutura. O I aprende a converter entusiasmo em entrega — sem sacrificar a criatividade que é o seu ativo maior.' },
    { titulo: 'Presença', autor: 'Amy Cuddy', motivo: 'Usa a presença natural do I com mais consciência e propósito. Mostra como alinhar o que sente por dentro com o que projeta por fora — presença autentica vs performance social.' },
    { titulo: 'A Coragem de Ser Imperfeito', autor: 'Brené Brown', motivo: 'O I precisa aprender que vulnerabilidade não destrói relacionamentos — os fortalece. Leitura essencial para quem constrói imagem mas tem medo de ser visto de perto.' },
  ],
  S: [
    { titulo: 'A Coragem de Ser Imperfeito', autor: 'Brené Brown', motivo: 'Ensina que expressar sentimentos não destrói relacionamentos — os fortalece. Transformador para o S que guarda tudo e acumula ressentimentos que nunca foram ditos.' },
    { titulo: 'Limites', autor: 'Cloud e Townsend', motivo: 'O livro mais direto para o problema central do S: aprender a dizer não sem culpa. Mostra que limites não destroem relacionamentos — os protegem.' },
    { titulo: 'Comunicação Não-Violenta', autor: 'Marshall Rosenberg', motivo: 'O S precisa expressar o que sente sem medo de conflito. CNV é o método ideal — comunicação direta que não agride e não evita o que precisa ser dito.' },
    { titulo: 'Os 7 Hábitos das Pessoas Altamente Eficazes', autor: 'Stephen Covey', motivo: 'Ajuda a desenvolver os hábitos de iniciativa e liderança pessoal que o S tende a negligenciar. Mostra que ser reativo não é uma virtude — é um custo.' },
    { titulo: 'Quem Mexeu no Meu Queijo?', autor: 'Spencer Johnson', motivo: 'Para o S que resiste à mudança. Leitura acessível e poderosa sobre adaptabilidade — que a segurança não está em manter o que era, mas em encontrar o próximo passo com rapidez.' },
  ],
  C: [
    { titulo: 'Rápido e Devagar', autor: 'Daniel Kahneman', motivo: 'Valida o jeito de pensar do C mas revela quando a análise excessiva vira armadilha decisória. O C aprende a identificar quando seu Sistema 2 está bloqueando em vez de protegendo.' },
    { titulo: 'A Arte de Fazer Acontecer (GTD)', autor: 'David Allen', motivo: 'O C planeja muito e às vezes não executa. GTD transforma análise em ação — um sistema que captura a complexidade sem travar na perfeição do plano.' },
    { titulo: 'Mindset — A Nova Psicologia do Sucesso', autor: 'Carol Dweck', motivo: 'Transforma a relação do C com o fracasso — antídoto para o perfeccionismo paralisante. Mostra que errar faz parte de crescer, não é evidência de incapacidade.' },
    { titulo: 'Inteligência Emocional', autor: 'Daniel Goleman', motivo: 'O C subestima a dimensão emocional. Mostra que IE é tão importante quanto o QI para resultado real — e que precisão técnica sem conexão humana tem alcance limitado.' },
    { titulo: 'Comunicação Não-Violenta', autor: 'Marshall Rosenberg', motivo: 'O C formal aprende a se conectar de forma mais humana sem perder a precisão. CNV mostra que clareza e empatia não são opostos — são complementares.' },
  ],
}
