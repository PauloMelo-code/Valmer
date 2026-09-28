# Contratos entregues pela Onda 1 (28/09/2026)

Gerado a partir do relatorio de cada frente. E o que a Onda 2 pode usar; confira no codigo antes de depender.

## Motor de cálculo MC-INV 2.2: porte fiel de motor_referencia.py para TypeScript

### Contrato

Importe tudo de '@/lib/motor' (src/lib/motor/index.ts). É função pura: não importa banco, Next nem rede. Depende só de '@/data/inventario-mc'.

FLUXO DA ROTA DE FINALIZAR:
  const respostas = respostasDasTelas(telas)
  const resultado = calcularResultado(respostas, telas)   // lança RespostaInvalida → responder 422 com err.message
Conferir as 69 telas (TOTAL_TELAS) antes, para devolver 409 com a lista das faltantes. O motor recusa o que faltar, mas com uma mensagem por vez.

TIPO DE ENTRADA — TelaGravada (mapeie as colunas Drizzle para estes nomes):
  { etapa: number /*1 nat,2 ada,3 jung,4 valores*/; tela: string /*'G07'|'EI04'|'V03'*/; ordem_final?: readonly string[]|null /*etapas 1,2,4; 1º = mais combina*/; resposta_exibida?: number|null /*etapa 3, botão 0..3 da esquerda p/ direita*/; resposta_polo_a?: number|null /*etapa 3, 3=muito A..0=muito B; obrigatório para calcular*/; moveu_item: boolean; entrou_em: Date|string; saiu_em: Date|string }
A conversão ao polo A é de quem grava: lado 'esquerda' → 3 - botão, 'direita' → botão (blueprint seção 23).

SAÍDA — ResultadoMotor (JSON da seção 7; gravar como está):
  { versao_instrumento: 'MC-INV 2.2', versao_motor: '2.2.0',
    disc: { natural: DiscCondicao, adaptado: DiscCondicao, indices: { variacao: Record<Fator,number>, indice_adaptacao: number, classe: 'baixa'|'moderada'|'alta'|'muito alta'|'extremamente alta', polarizados: Fator[], amplitude_natural: number }, lideranca: { executivo, metodico, motivador, sistematico } },
    jung: { percentuais: {E,I,N,S,T,F}, tipo: string /*'ENT'*/, hierarquia: [dominante, auxiliar, terciaria, inferior] },
    valores: { escore: Record<Valor,number>, nivel: Record<Valor,'Significativo'|'Circunstancial'|'Indiferente'>, ranking: Valor[] },
    validade: { alertas: {codigo:'V1'..'V6', peso:'alto'|'medio'|'baixo'|'informativo'}[], confiabilidade: 'alta'|'media'|'baixa', tempo_total_s: number /*inteiro*/ } }
  DiscCondicao = { escore: Record<Fator,number>, zona: Record<Fator,'EA'|'MA'|'A'|'B'|'MB'|'EB'>, competencias: Record<Competencia,number> /*16 chaves*/, perfil: string /*'DI'|'D'|'EQUILIBRADO'*/ }

FUNÇÕES AVULSAS:
  r1(x: number): number
  pontuarDisc(respostas: RespostasGrupos, grupos = GRUPOS_DISC): { bruto, escore, competencias, primeiros }
  zona(escore: number): Zona; ZONAS (limite, codigo, nome — nomes 'Extremo alto'...)
  perfil(escore, primeiros): { sigla, ordem: Fator[] }; PERFIL_EQUILIBRADO
  indices(nat, ada): Indices
  lideranca(natEscore): Lideranca
  pontuarJung(resp: Record<'EI'|'NS'|'TF', number[]>): PontuacaoJung
  pontuarValores(respostas: RespostasGrupos, grupos = GRUPOS_VALORES): { bruto, escore, nivel, ranking }
  validade(telas: TelaGravada[]): Validade; confiabilidade(alertas): Confiabilidade
  VERSAO_MOTOR = '2.2.0'; class RespostaInvalida extends Error
  RespostasGrupos = Record<number, Record<string, number>>  // { [grupo]: { [idItem]: posição } }

Mapeamento para as colunas do blueprint (Result): nat_d = r.disc.natural.escore.D; zonas_nat = r.disc.natural.zona; perfil_natural = r.disc.natural.perfil; variacoes = r.disc.indices.variacao; func_dominante = r.jung.hierarquia[0]; val_principios = r.valores.escore.PRI; ranking_valores = r.valores.ranking; alertas = r.validade.alertas.

Quando o Python mudar: rode python scripts/motor/gerar-fixtures-paridade.py e depois tests/motor-paridade.test.mts.

### Decisoes tomadas

- Onde quem chama passa os grupos, o motor usa grupos.length em vez da constante G_DISC=16/G_VAL=10 do Python. Com o inventário real o resultado é idêntico; os parâmetros grupos têm default GRUPOS_DISC e GRUPOS_VALORES.
- Um grupo com item a mais (id que não é dele) é recusado. O Python ignora a chave extra; recusar não muda nenhum caso válido nem a paridade.
- Validação da regra 'nenhum ou só baixo/informativo = alta; um médio = média; qualquer alto ou dois médios = baixa'. Hoje só V1 é médio, então 'dois médios' não acontece, mas a regra está implementada.
- V5 conta o botão exibido (resposta_exibida), não o polo. Quem clica sempre na mesma ponta não está escolhendo nada, e o lado sorteado espalharia isso entre os dois polos. V6 = botões 0 ou 3 (as opções 'Muito').
- V2 e V3 usam percentual sobre as telas recebidas: V2 sobre as telas das etapas 1 e 2, V3 sobre as das etapas 1, 2 e 4, sem Jung. Lista vazia não gera V2/V3, mas gera V1 (tempo 0).
- Nomes de campo da tela em snake_case, como no contrato da seção 7 e no schema do blueprint (ordem_final, resposta_exibida, resposta_polo_a, moveu_item, entrou_em, saiu_em). entrou_em e saiu_em aceitam Date ou string ISO; carimbo inválido lança RangeError.
- calcularResultado tira 'bruto' de valores, como o contrato da seção 7 e o gabarito 'completos'. Não expõe primeiros/ordem do perfil (disponíveis via pontuarDisc/perfil).
- Comentários sem acento, no tom de src/data/inventario-mc.ts. Os textos de hierarquia de Jung ('Intuição Introvertida') mantêm acento porque vão para o relatório.

### Nao feito

- Parte do T8: palavras DISC iguais à lista oficial e ao banco, nenhuma retirada ou ambígua, e o limite de 1 palavra em comum com os grupos do CIS — A tarefa definiu o T8 como 64 palavras únicas, cada competência em 4 grupos, 54 de Jung únicas sem repetir o DISC e 60 de valor únicas. Checar o resto exigiria redigitar no TS o banco de adjetivos e CIS_GRUPOS, e a referência Python já roda esses testes antes de gerar o inventario.json.
- T2 com a mesma sequência aleatória do Python (semente 7) — O random do Python não é reproduzível em JS. Usei um sorteador com semente fixa (mulberry32) para 2.000 ordenações: a propriedade testada (soma 200 ±0,2) é a mesma e o teste é repetível.
- Rota de finalizar, gravação em results e textos dos alertas para o facilitador — Ficam fora desta frente (banco e rotas são de outras frentes). O motor devolve só {codigo, peso}.

### Pendente Valmer

- Confirmar como descontar a pausa em V1: hoje o trecho acima de 10 min sai inteiro do tempo, seja entre telas, seja dentro de uma tela, e o de 10 min ou menos conta inteiro. A seção 6 só diz 'descontadas pausas acima de 10 min'.
- Confirmar que V5 ('o mesmo botão de posição') conta o botão clicado na tela, e não o polo da resposta.

## BANCO DAS 69 TELAS (schema, migration, gravacao por tela, consentimento)

### Contrato

SCHEMA (import de '@/lib/db/schema'):
- assessments ganhou: versao_instrumento (text NOT NULL DEFAULT 'LEGADO'), codigo (text|null, unico parcial, CHECK de formato), semente_ordem (integer|null), consentimento_em (Date|null), iniciado_em (Date|null). A criacao continua nascendo LEGADO. Para nascer MC-INV 2.2, a onda da criacao grava versao_instrumento: VERSAO_INSTRUMENTO e codigo: await gerarCodigo(tx, nome, new Date()) na propria insercao, e tenta de novo se vier erro 23505 em uq_assessments_codigo.
- assessmentsTelas (tabela assessments_telas). Tipos AssessmentTela e NovaAssessmentTela. Colunas: assessment_id, etapa (1..4), tela ('G07' | 'NS04' | 'V03'), ordem_final (string[] | null, 1o = mais), lado_polo_a ('esquerda' | 'direita' | null), resposta_exibida (0..3 | null), resposta_polo_a (0..3 | null, 3 = muito A), moveu_item, entrou_em, saiu_em, versao_instrumento, mais auditoria. Leitura das linhas vivas: WHERE assessment_id = ? AND is_deleted = false.
- assessmentsResultados (tabela assessments_resultados). Tipos AssessmentResultado e NovoAssessmentResultado. Colunas NOT NULL: assessment_id, versao_instrumento (tem que ser igual a do mapa por causa da FK composta), versao_motor, resultado (jsonb com o contrato da secao 7), nat_d, nat_i, nat_s, nat_c, ada_d, ada_i, ada_s, ada_c (0..100, cada condicao somando 200 +-0,2; o banco recusa o que fugir disso), perfil_natural e perfil_adaptado ('DI' | 'D' | 'EQUILIBRADO'), tipo_jung (regex [EI][NS][TF]), confiabilidade ('alta' | 'media' | 'baixa'). Nulaveis: narrativa jsonb e narrativa_gerando_em (arrendamento). Um resultado vivo por mapa (uq_assessments_resultados_assessment WHERE is_deleted=false). Um upsert precisa de onConflictDoUpdate({ target: assessmentsResultados.assessment_id, targetWhere: sql`is_deleted = false`, ... }); recalcular e soft delete da linha antiga mais uma nova.

VALIDADOR ('@/lib/validators/inventario-mc'):
- telaSchema (zod). Entrada TelaEnviada = { etapa: 1|2|4, tela, ordem_final: string[], moveu_item, entrou_em: ISO, saiu_em: ISO } ou { etapa: 3, tela, lado_polo_a, resposta_exibida: 0..3, moveu_item, entrou_em, saiu_em }. Saida TelaValidada, com os carimbos ja em Date.
- TELAS_POR_ETAPA = {1:16, 2:16, 3:27, 4:10}, com o tipo Etapa = 1|2|3|4.
- paraPoloA(lado, botao): number. Esquerda vira 3 - botao; direita fica o botao.

APLICACAO ('@/lib/inventario/aplicacao'). Nenhuma funcao tem 'use server'; a action ou rota da proxima onda embrulha:
- registrarConsentimento(token: string): Promise<{ ok: true; consentimentoEm: Date } | RecusaInventario>. Idempotente.
- salvarTela(token: string, payload: unknown): Promise<{ ok: true } | RecusaInventario>. Lanca ZodError com payload adulterado. Reenvio da mesma tela sobrescreve.
- estadoDaAplicacao(token: string): Promise<EstadoAplicacao | RecusaInventario>. EstadoAplicacao = { ok: true, consentiu: boolean, semente: number, feitas: Record<Etapa, string[]>, etapaAtual: Etapa | null }. etapaAtual null quer dizer que as 69 telas estao salvas e falta finalizar.
- RecusaInventario = { ok: false, erro: FalhaInventario }. FalhaInventario = 'invalido' | 'legado' | 'concluido' | 'expirado' | 'sem_consentimento' | 'etapa_travada' | 'fora_de_ordem'.
- RESPONDENTE (sentinela uuid zero para modified_by).
- A finalizacao da proxima onda deve seguir o mesmo padrao: db.transaction, travar o mapa com FOR UPDATE, conferir que existem 16/16/27/10 linhas vivas, montar as posicoes a partir de ordem_final (indice + 1) e resposta_polo_a, rodar o motor, inserir em assessmentsResultados e marcar situacao 'concluido' e concluido_em. O inicio do tempo total (V1) esta em assessments.iniciado_em; os tempos por tela estao em entrou_em e saiu_em; V3 le moveu_item; V5 le resposta_exibida.

CODIGO ('@/lib/inventario/codigo'): iniciais(nome), codigoBase(nome, quando), proximoCodigo(base, ocupados) e gerarCodigo(executor: Pick<typeof db, 'select'>, nome, quando): Promise<string>.

MIGRATION: src/lib/db/migrations/0019_inventario_mc_telas_e_resultados.sql, ja aplicada no banco local. Foi editada a mao para criar uq_assessments_id_versao antes das FKs compostas. Quem gerar a 0020 deve conferir de novo essa ordem se mexer nessas FKs.

### Decisoes tomadas

- FK COMPOSTA (assessment_id, versao_instrumento) -> assessments(id, versao_instrumento) nas duas tabelas novas, no lugar da FK simples. Com ela o banco garante a regra da secao 8 ('iniciada numa versao, termina na mesma'): tela com versao diferente da do mapa e recusada, e a versao do mapa nao muda depois da primeira tela (ON UPDATE NO ACTION). O custo e o indice uq_assessments_id_versao
- O unico de assessments_telas e parcial em is_deleted=false, como a tarefa pede. Por isso nao ha ressurreicao de linha soft-deletada: uma tela anulada nao conflita, a nova entra viva e a anulada fica de historico. O ON CONFLICT usa targetWhere is_deleted=false
- assessments_resultados tem um unico parcial por is_deleted=false, e nao um unico cheio: 'um resultado VIVO por mapa'. Recalcular com motor novo e soft delete do antigo mais uma linha nova, entao o resultado entregue continua auditavel
- Codigo: XX sao as iniciais do avaliado (primeiro e ultimo nome, sem acento; nome de uma palavra usa as duas primeiras letras; sem letras vira XX), lidas do exemplo 'VA' do blueprint. Na colisao entra o sufixo -N, e o CHECK aceita esse sufixo opcional. O indice unico do codigo ignora is_deleted de proposito: um codigo ja impresso nao e reaproveitado
- Regras de ordem: salvar a etapa N (N>1) exige a etapa N-1 completa, senao 'fora_de_ordem'. A etapa 1 recusa com 'etapa_travada' quando existe qualquer tela da etapa 2. As etapas 2 e 3 continuam corrigiveis depois (a secao 3 so trava a etapa 1)
- Ordem das recusas: invalido, legado, concluido, expirado; depois sem_consentimento; depois etapa_travada e fora_de_ordem. Concluido vem antes de expirado, como em avaliacao.ts
- A semente e sorteada em estadoDaAplicacao, que e o primeiro acesso, ou em registrarConsentimento, o que vier primeiro. Uma vez gravada nao muda mais. O valor sai de crypto.randomInt(1, 2^31-1)
- O consentimento vai para a trilha de auditoria (prova juridica) uma unica vez, sem o nome da pessoa
- Os carimbos entrou_em e saiu_em aceitam ISO com offset; o tempo de cada tela e a diferenca entre saida e entrada da mesma pessoa
- As notas do DISC ficam em double precision, que equivale ao Float do blueprint. Evitei numeric porque o drizzle o devolve como string
- RESPONDENTE foi repetido em lib/inventario/aplicacao.ts, com comentario: actions/avaliacao.ts e 'use server' e nao consegue exportar a constante

### Nao feito

- Finalizacao e calculo (conferir as 69 telas, rodar o motor, gravar em assessments_resultados) — A tarefa manda deixar para a proxima onda.
- Server Action ou rota HTTP expondo as tres funcoes ao navegador — Esta fora dos meus arquivos. lib/inventario ficou sem 'use server' de proposito, para poder exportar tipos e constantes; quem expoe e a camada de cima.
- A criacao de mapa gravar versao_instrumento 'MC-INV 2.2' e usar gerarCodigo — Pela ADR-0007 D3 isso so muda numa onda posterior; nesta onda nenhum comportamento existente muda. O gerador ficou pronto e testado, mas ninguem o chama ainda.
- Indices nas colunas de filtro de assessments_resultados (perfil_natural, nat_*, confiabilidade) — Ainda nao existe consulta que os use, e as telas do portal chegam pelo assessment do dono. Criar quando a consulta do portal existir.
- CHECK de lista fechada em assessments.versao_instrumento — Cada versao nova do instrumento viraria uma migration. A trava que importa, a versao nao mudar no meio da aplicacao, ja esta garantida pela FK composta.

### Pendente Valmer

- Confirmar a leitura do XX do codigo MC-AAAA-MMDD-XX como iniciais do avaliado (primeiro e ultimo nome) e a regra de colisao com sufixo -2, -3...
- T5 (ja pendente): texto do consentimento LGPD, que registrarConsentimento grava sem conhecer

## Ativos do molde visual das 42 paginas (MC 3.1)

### Contrato

CSS: importe uma vez o arquivo perfila/src/components/relatorio-mc/relatorio-mc.css no componente raiz do relatório novo (import './relatorio-mc.css'; o Next 16 aceita CSS global em qualquer componente do app) e envolva as páginas em <div className="mc31">. Cada página é <section className="page" id="pNN">, com as classes do molde (.hd, .tab, .body, .kick, h1 / h1.big, .gline, .sub, .zw, .spacer, .card, .soft, .g2, .g3, .g4, .row, .col, .note, .dark, .box-warn, .box-risk, .tag, .pill, .kv, .num, .lab, .xs, .sm, .mut, table.t, ul.l, .ft .pn). As fontes são declaradas com os apelidos do molde: font-family 'OS' (Open Sans 400-800), 'AR' (Archivo 600-900), 'CZ' (Cinzel 600-800), 'GA' (EB Garamond 400-600) e 'MS' (Montserrat, sem uso). Os estilos inline copiados das páginas funcionam sem mudança. A impressão usa a página nomeada mc31 (A4, margem 0) e não interfere no @page do relatório antigo. Fontes e imagens são servidas do public: /relatorio-mc/fontes/<familia>-<peso>.woff2 e /relatorio-mc/imagens/{capa.png, marston.jpg, brasao-impacto-academy.png}.

Ajuste: import { ajustarPaginas } from '@/components/relatorio-mc/ajuste-de-pagina', com assinatura export async function ajustarPaginas(raiz: HTMLElement): Promise<void>. Chame-a num useEffect de um componente 'use client' passando o elemento .mc31, e de novo se o conteúdo mudar; ela pode rodar várias vezes. Ela espera fontes e imagens, reduz os h1 que estouram (sem <br>, até 14px) e amplia cada .zw entre 1 e 1,3 (nunca reduz). No fim grava data-zoom em cada .zw e data-ajuste="pronto" na raiz. O gerador de PDF deve esperar com page.waitForSelector('.mc31[data-ajuste="pronto"]') antes de page.pdf, porque a Promise não atravessa o processo.

Páginas: contexto/extraido/mc-3.1-paginas/pagNN.html (NN de 01 a 42) contém a seção #pNN já sem base64, com linhas curtas. Converta página por página. O contrato de dados de cada elemento (seletor, tipo FIXO/DERIVADO/TABELA/IA, campo de ResultadoMotor em perfila/src/lib/motor/resultado.ts ou chave de esquemaNarrativaMC em perfila/src/lib/relatorio-mc/narrativa-esquema.ts) está em contexto/extraido/mc-3.1-mapa-de-dados.md. Lá estão também as funções derivadas necessárias (rotuloZona, classeVariacao, nivelCompetencia, escalaX, nomeFator/nomeValor), a geometria de cada SVG, as 13 tabelas estáticas a criar (proposta: src/data/relatorio-mc-textos.ts, com status molde, blueprint ou PENDENTE), os conflitos C01..C41 e as recomendações R1..R5. As que afetam outras frentes são R1 (IA devolve parágrafos separados por \n\n), R3 (falta disc.natural.ordem no resultado, C37) e C07 (as chaves de quatro_cruzamentos só servem para perfil DI). Para regenerar tudo a partir de um molde novo, rode PYTHONUTF8=1 python contexto/extraido/mc-3.1-paginas/extrair.py.

### Decisoes tomadas

- Criei o teste perfila/tests/relatorio-mc-ativos.test.mts, que não estava na lista de arquivos da frente. O npm test só roda tests/*.test.mts, então não havia outro jeito de a frente ter o próprio teste. É arquivo novo, com nome exclusivo, e não toca em arquivo de ninguém.
- Instalei o pacote Python brotli com pip --user, porque o fontTools precisa dele para ler woff2. Serviu só para descobrir o nome das famílias; o extrair.py não depende dele.
- Deixei o extrair.py dentro de contexto/extraido/mc-3.1-paginas/, pasta que é da frente, para regenerar tudo se o Valmer mandar uma versão nova do molde.
- Mantive fiel ao molde que o zoom do .zw nunca desce de 1: o bloco só amplia. Texto de IA maior que o espaço fica cortado por overflow:hidden. Está registrado no C39 e na R2 do mapa de dados.
- Escrevi o mapa de dados sem acento na prosa, como o ADR-0007, e mantive os textos citados do molde como estão.

### Nao feito

- Teste automatizado do ajuste-de-pagina.ts dentro do npm test — O ajuste precisa de layout real (Chrome). Ele foi conferido uma vez com puppeteer no scratchpad (zoom e h1 idênticos ao molde). Pôr puppeteer no npm test deixaria a suíte lenta sem pegar nada que os testes estáticos não peguem.
- Nomear os apelidos de fonte (OS, AR...) com prefixo próprio — Os estilos inline das 42 páginas e os <text> dos SVG usam font-family:AR e font-family="OS". Renomear exigiria reescrever as páginas, e os nomes curtos não colidem com nada no app.
- Resolver o conteúdo que falta (textos PENDENTES) e os conflitos C05, C07, C26 e C37 — São decisões do Valmer ou de outras frentes (IA, motor/banco). Ficaram registrados no mapa de dados com proposta.
- Rodar o npm test completo do repositório — Outros quatro agentes estão mexendo nos testes ao mesmo tempo e boa parte da suíte depende do banco. Rodei só o meu arquivo de teste e o typecheck do projeto.

### Pendente Valmer

- C06: textos de arquétipo para perfil puro (1 fator >= 51) e EQUILIBRADO; a seção 10 do blueprint só cobre os 12 pares.
- C15: textos dos 4 cartões de relacionamento da página 14 por fator mais alto, e a regra de posição dos marcadores do espectro. No molde as posições foram postas à mão.
- C16: listas de tensão da página 15 para S e C (o molde só tem D e I).
- C17: gatilhos da página 16 para as 6 combinações que faltam, e a tabela de alinhamento fator x valor.
- C18: 'Aplicação no trabalho' das páginas 18-20 para os polos I, S e F.
- C20: textos da função inferior da página 22 para Intuição, Pensamento e Sentimento (o molde só tem Sensação).
- C23: textos por valor da página 25 para TEO, EST, SOC e PRI.
- C26: definições dos 4 estilos de liderança da v2.2 (executivo, metódico, motivador, sistemático) para a página 29.
- C27: aprovar o rascunho que substitui o texto da página 30, que ainda descreve competência como 'fator + ajuste'.
- C29 / T4: nomes e descrições de Constância, Cooperação, Análise e Investigação.
- C31: variantes das notas das páginas 36/37 e dos atritos das páginas 39/40 para avaliados que não têm D como fator mais alto.
- C32 / D5: como a página 41 recebe a mensagem_final e as 5 leituras, já que o molde tem 4 parágrafos fixos.
- C33: se os canais da página 42 passam a ser do facilitador.
- C38: o molde diz 'ponderada' na página 37 e 'demorada' na página 40 para a decisão de S e de C; qual vale.
- C10: faixas qualitativas da amplitude natural.
- C36 / T3: rótulo dos fatores ('DOMINANTE' ou 'Dominância') no relatório inteiro.
- C22 / T2: nome exibido do valor PRI no lugar de 'REGULATÓRIO' (D8 hoje: 'Princípios').

## Conteúdo fixo do relatório MC 3.1 em dados tipados (src/data/relatorio-mc/**)

### Contrato

Base: src/data/relatorio-mc/*.ts (import '@/data/relatorio-mc/<arquivo>'). Tudo puro, sem banco nem IA. Tipos Fator/Valor/EixoJung/Competencia vêm de '@/data/inventario-mc'.

status.ts: type Status = 'transcrito' | 'rascunho' | 'a confirmar'.

cores.ts: PALETA {azulPetroleo, marfimQuente, douradoSobrio, douradoTexto, brancoCartao, textoCorpo, textoSecundario}; CORES_FATOR: Record<Fator, {principal, fundoSuave, texto}>.

marcacoes.ts: type CodigoMarcacao = 'fato-do-modelo' | 'derivado-do-escore' | 'a-confirmar' | 'aplicacao-pratica'; MARCACOES: Record<CodigoMarcacao, {codigo, nome, selo, cor, texto, textoIndice|null}>; TITULO_MARCACOES_INDICE.

zonas.ts: CODIGOS_ZONA ['EA','MA','A','B','MB','EB']; type CodigoZona; ZONAS: Record<CodigoZona, {codigo, nome, minimo, maximo, faixa, comoAparece, atencao}>; MARCAS_DA_REGUA [0,16,33,51,70,88,100]. A zona de um escore é calculada pelo motor.

descritores.ts: DESCRITORES[zona][fator] (4 adjetivos); descritoresDe(fator, zona) => {adjetivos, atencao}; AVISO_ZONA_DE_ATENCAO.

arquetipos.ts: SIGLAS_COMPOSTAS (12), SIGLAS_PURAS, EQUILIBRADO='EQUILIBRADO', type SiglaPerfil; ARQUETIPOS: Record<SiglaPerfil, {sigla, nome, descricao, pontoDeAtencao, status}>; ROTULO_PONTO_DE_ATENCAO. A sigla do motor (ex.: 'DI') indexa direto.

fatores.ts: NOME_EXIBIDO_FATOR_D; FATORES_RELATORIO: Record<Fator, FichaFator> (nome, rotulo 'DOMINANTE', nomeTabela, tresPalavras, descricao, oQueMede, perguntaCentral, emocaoMarston, motivador, forcas[5], medos[4], motiva[3], pagina05{foco, caracteristica, formaDeAgir, perguntaCentral}, pagina{numero 9-12, ordem, comoLida, palavraChave, comunicacao, decisao, contribuicao, adjetivosQuandoAlto, adjetivosQuandoBaixo}); adjetivosDaCondicao(fator, escore): string; LIMIAR_ADJETIVOS_ALTO=51; NOTA_EMOCAO_ASSOCIADA{titulo, texto}; ROTULOS_PAGINA_FATOR.

jung.ts: type PoloJung, FuncaoJung; POLOS_JUNG: Record<PoloJung, {polo, eixo, nome, resumo, definicao, caracteristicas[4]}>; EIXOS_RELATORIO: Record<EixoJung, {numero, nome, oQueMede, pagina, tituloPagina17, textoPagina17, sobretitulo, titulo, subtitulo}>; ROTULOS_PAGINA_EIXO; POSICOES_HIERARQUIA[4]; PAGINA_21 (usar comoAOrdemEDeterminadaV22; grauDeCerteza(nomeDaDominante)); MANIFESTACAO_INFERIOR: Record<FuncaoJung, {texto, status}>; PAGINA_22 (oQueAtiva(dominanteDePercepcao: boolean), sinais[3], cuidado).

spranger.ts: NOME_EXIBIDO_PRI; VALORES_RELATORIO: Record<Valor, {valor, nome, tema|null, descricao, descricaoPagina24, subtituloPagina25, oQueRepresenta, risco, redigidos}>; FAIXAS_VALOR [{codigo 'significativo'|'circunstancial'|'indiferente', nome, minimo, maximo, textoPagina23, textoPagina24}]; PAGINA_24; PAGINA_25.

competencias.ts: COMPETENCIAS: Record<Competencia, {competencia, fator, nome, descricao, status}>; ORDEM_COMPETENCIAS (16); COMPETENCIAS_RADAR (12); NIVEIS_COMPETENCIA; nivelDaCompetencia(escore) => 'potencializar'|'consolidar'|'desenvolver'; ROTULOS_COMPETENCIAS.

tensoes-gatilhos.ts: TENSOES: Record<Fator, {itens[6], comoAparece, risco, redigidos}>; GATILHOS: Record<Fator, {nome, oQueSignifica, comoAparece, quandoFalta, redigidos}>; PAGINA_15 (ligadosAoFator(rotulo), notaSegundoFator, recomendacao...); PAGINA_16 (derivaDoFator('principal'|'complementar', rotulo, escoreFormatado)).

espectro.ts: PARES_ESPECTRO [{esquerda, direita, fator, ladoDoFatorAlto}] (7); posicaoNoEspectro(par, escoreNatural: Record<Fator, number>) => {posicao 0-100, predominante 'esquerda'|'direita'|'neutro'}; STATUS_REGRA_ESPECTRO; PAGINA_14.

comunicacao-lideranca.ts: COMUNICACAO_POR_PERFIL, LIDERANCA_POR_PERFIL (Record<Fator, ...>); PAGINAS_COMUNICACAO_LIDERANCA {36,37,39,40: {sobretitulo, titulo, subtitulo, fatores}}; ROTULOS_COMUNICACAO_LIDERANCA.

leituras.ts: LEITURAS: Record<Fator, {titulo, autor, motivo}[5]> (vai para a chave leituras_recomendadas da IA e para a página 41, pela D5).

textos-fixos.ts: cabecalho(nomeAvaliado), RODAPE, ETAPAS[5] {numero, nome, descricao, selo, primeira, ultima}, INDICE (3..42), PAGINA_02/03/04/05/17/23/30/35/38/41/42 (página 30: usar comoFoiConstruidoV22), PAGINAS_TEXTO_FIXO.

niveis.ts: TOTAL_PAGINAS=42; CODIGOS_NIVEL; NIVEIS: Record<'S1'..'S4', {codigo, nome, conteudo, ultimaPagina}>; paginasDoNivel(nivel): number[].

### Decisoes tomadas

- Linhas 'No natural' e 'No adaptado' (páginas 09-12): o molde não traz uma lista por condição, e sim uma lista para o fator alto e outra para o fator baixo. Nas 8 linhas do exemplo, a escolha segue o escore da condição, com corte em 51. Isso virou adjetivosQuandoAlto/adjetivosQuandoBaixo mais adjetivosDaCondicao(); a regra é inferida do molde e está comentada como a confirmar.
- Espectro (página 14): o molde não segue uma regra única. Nos pares de C a posição é o próprio escore (24/22/26); nos de D a posição foi suavizada (20/16/72 para D=89); e o par 'critério lógico' coincide com 100 menos o %T de Jung. Proposta determinística: posição = escore natural do fator de origem, medido a partir do polo do fator alto; em exatamente 50 fica neutro. Reproduz o C do molde e o lado em negrito dos 7 pares. Marcada 'a confirmar' (STATUS_REGRA_ESPECTRO).
- Página 30, 'Como este mapa foi construído': o texto do molde descreve a regra da v2.1 (competência = fator + ajuste) e fica falso na v2.2. Guardei o texto do molde (comoFoiConstruidoMolde) e escrevi comoFoiConstruidoV22 como rascunho. A página deve usar o V22.
- Página 21, 'Como a ordem é determinada': o molde diz 'maior escore dentro do seu par', mas a v2.2 decide pela clareza do eixo. Mesma solução: guardei o texto do molde e o comoAOrdemEDeterminadaV22 em rascunho.
- Faixas de valor: o molde escreve '31 a 65' e '1 a 30', o que deixaria 65,5 sem faixa. Os números seguem a v2.2 (>= 66, 31 a 65,9, <= 30,9), com a divergência comentada.
- O nome do PRI só aparece por meio de NOME_EXIBIDO_PRI; a palavra 'REGULATÓRIO' da página 24 do molde não foi usada em lugar nenhum. O nome do fator D só aparece por meio de NOME_EXIBIDO_FATOR_D (D8).
- O rótulo impresso dos fatores (DOMINANTE, INFLUENTE, ESTÁVEL, CONFORME) é um campo separado do nome (Dominância...), porque o molde usa os dois.
- 'Decisão' de S e C: a página 37 diz 'ponderada' e as páginas 11, 12 e 40 dizem 'demorada'. Cada tabela guarda a palavra da sua página.
- Tensões do I: o 'Como aparece' do molde só existe para o I como segundo fator. Separei em notaSegundoFator (transcrito) e comoAparece do I (redigido, terminando com a frase do molde 'O sinal aqui é o afastamento, não o confronto.').
- Gatilhos: a frase que depende da posição ('Deriva do seu fator mais alto... / segundo fator...') virou o template PAGINA_16.derivaDoFator. O oQueSignifica de cada fator é o complemento do gatilho principal.
- Livros da seção 19: autores transcritos como na fonte (são referência bibliográfica, não texto sobre pessoas), incluindo o 'autentica' sem acento que a fonte traz.
- Nomes originais dos perfis puros: O Desbravador (D), O Mobilizador (I), O Pilar (S), O Criterioso (C) e O Versátil (EQUILIBRADO). Evitei os nomes usados por concorrentes (Executor, Comunicador, Planejador, Analista).

### Nao feito

- Pares do espectro para I e S — A página 14 do molde só traz 7 pares, todos originados em D ou C. Transcrevi esses 7 e não criei pares novos.
- Quadros 'Onde você acerta e onde escorrega' (pág. 36) e 'Onde está o seu maior ganho' (pág. 37) — Comparam os perfis com o do avaliado. São derivados do escore, não texto fixo, e ficam para quem montar a página.
- Regulações 01-03 da página 22 e o bloco 'Aplicação no trabalho' das páginas 09-12 e 18-20 — São específicos do avaliado (IA ou derivados do escore). Só transcrevi os rótulos e os textos que valem para qualquer pessoa.
- Canais oficiais da página 42 (WhatsApp e perfis de Instagram) — São dados do facilitador (seção 17: 'Dados personalizáveis por facilitador') e incluem nomes de pessoas reais além do Valmer. Ficou só o rótulo tituloCanais.
- Nomes das funções com gênero ('Intuição Extrovertida') e a função zona(score) — São contas do motor (frente do porte de motor_referencia.py); não dupliquei aqui.
- Créditos por nível em niveis.ts — O preço é regra comercial do repositório (src/data/planos.ts), fora do recorte da D9.

### Pendente Valmer

- Aprovar os textos em rascunho: os 5 arquétipos (D, I, S, C, EQUILIBRADO), as descrições das 4 competências novas, as tensões de S e C, os gatilhos de S e C, o oQueSignifica do gatilho do I, o comoAparece e o risco das tensões do I, os cartões da página 25 de TEO, EST, SOC e PRI, a manifestação da função inferior para N, T e F, e as versões V22 dos textos das páginas 21 e 30.
- Confirmar a regra de posição do espectro (página 14) e dizer se quer pares também para I e S.
- Confirmar o limiar de 51 para escolher os adjetivos 'No natural' e 'No adaptado'.
- Dizer se o 'Atrito previsível' das páginas 39-40 (escrito para um líder DI) serve para leitores de outros perfis.
- Continuam as pendências T2 (nome do PRI) e T3 (nome do fator D): cada uma se resolve trocando uma linha, em spranger.ts e fatores.ts.

## Textos das telas do inventário MC-INV 2.2 (aberturas, botões de Jung, mensagens, consentimento LGPD/T5, compromisso de atenção, definições do "?"/T1)

### Contrato

Arquivo c:/Users/Paulo/Desktop/Valmer/Valmer/perfila/src/data/inventario-mc-textos.ts (import '@/data/inventario-mc-textos'):
- type NumeroEtapa = 1|2|3|4
- type Etapa = { numero: NumeroEtapa; titulo: string; abertura: string; telas: number; comoResponder: string }
- const ETAPAS: Record<NumeroEtapa, Etapa>. abertura = texto da tela de abertura; telas = 16/16/27/10, lidos do inventário.
- function rotulosJung(esquerda: string, direita: string): [string,string,string,string]. Recebe as palavras já no lado sorteado e devolve [Muito esq, Mais esq, Mais dir, Muito dir]. Índice do botão 0..3 = resposta_exibida; converter para o polo A continua sendo tarefa do backend.
- const TEXTOS_TELA = { avancar, avancarBloqueado, desfazer, definicao, salvando, salvo, erroAoSalvar } (strings)
- function textoProgresso(etapa: NumeroEtapa, tela: number): string. tela começa em 1, ex.: 'Etapa 2 de 4 · tela 5 de 16'.
- const ETAPA_TRAVADA = { titulo, texto, voltar }
- function textoRetomada(etapa: NumeroEtapa, tela: number): { titulo, texto, botao }
- function textoFimDeEtapa(etapa: 1|2|3): { titulo, texto, botao }
- const CONCLUSAO = { titulo, texto }
- type SecaoTermo = { titulo: string; texto: string }
- const CONSENTIMENTO: { titulo: string; secoes: SecaoTermo[]; aceite: string; recusa: string }. É exibido antes da primeira tela; ao aceitar, grava-se consentimento_em.
- const COMPROMISSO_ATENCAO = { titulo, itens: string[], aceite }
- const STATUS_CONSENTIMENTO = 'rascunho — aprovacao juridica'; const PRAZO_GUARDA_DADOS: string

Arquivo c:/Users/Paulo/Desktop/Valmer/Valmer/perfila/src/data/inventario-mc-definicoes.ts (import '@/data/inventario-mc-definicoes'):
- const DEFINICOES: Readonly<Record<string,string>>. 178 entradas; a chave é o texto exato do item no inventario-mc.json (ItemDisc.texto, ParJung.poloA/poloB, ItemValor.texto).
- function definicaoDe(texto: string): string | undefined. Passar o texto CRU do JSON, nunca a forma exibida 'Ousado(a)'.
- const STATUS_DEFINICOES = 'rascunho — aprovacao do Valmer'

Teste: c:/Users/Paulo/Desktop/Valmer/Valmer/perfila/tests/inventario-mc-textos.test.mts (sem banco).

### Decisoes tomadas

- Aberturas: versão 'Toque primeiro...' do blueprint §15, e não a versão para arrastar da §4 do AGENTE.
- Botões de Jung com a palavra em minúscula depois de Muito/Mais ('Muito pé no chão'). Os rótulos seguem a ordem visual esquerda→direita: a conversão para o polo A continua sendo do backend.
- Prazo de guarda isolado na constante PRAZO_GUARDA_DADOS = 'cinco anos depois da conclusão do questionário'. É proposta, não decisão, e trocar vira edição de uma linha.
- O consentimento declara que o nome e os resultados vão para um serviço de IA contratado, porque o prompt do blueprint (linhas 1331/2025) envia avaliado.nome. Dizer 'sem seu nome' seria falso.
- Revogação e demais pedidos dirigidos ao 'analista que enviou o convite', porque não existe canal de DPO definido.
- Um único mapa DEFINICOES para as três etapas. O teste garante que os 178 textos são distintos entre si, e por isso uma chave não colide com outra.
- Definições de adjetivo começam com 'Que...' (e 'Quem...' em Cabeça/Coração). As de valor dizem o que é dar importância àquilo. Os pares de Jung foram escritos para que nenhum lado soe melhor.

### Nao feito

- Forma neutra de gênero 'Ousado(a)' nos rótulos e chaves — É regra de exibição da tela. As chaves das definições precisam ser o texto exato do JSON ('Ousado'). A tela aplica o '(a)' ao exibir e consulta definicaoDe com o texto cru. rotulosJung também recebe a palavra crua.
- Política de privacidade / termos de uso completos e identificação do DPO/controlador — Fora da frente. O consentimento não cita empresa nem encarregado porque isso depende de decisão jurídica.
- Rodar a suíte inteira (npm test) — As outras suítes batem no banco e outros agentes mexem no repositório ao mesmo tempo. Rodei só o meu arquivo de teste, mais o tsc.

### Pendente Valmer

- T1: revisar e aprovar as 178 definições em src/data/inventario-mc-definicoes.ts. Olhar com atenção os pares de Jung mais sensíveis (Solitário, Impulsivo, Crítico, Impessoal, Sentimental) e o trio Tranquilo/Sereno/Calmo, que precisam ficar distintos.
- T5 (jurídico): aprovar CONSENTIMENTO e COMPROMISSO_ATENCAO. Decidir o prazo real de guarda (PRAZO_GUARDA_DADOS), o canal de exercício de direitos/DPO e se o texto deve nomear o controlador (Impacto Academy) e o fornecedor de IA.
- Confirmar que o envio do nome do avaliado à IA deve continuar. Se sair do prompt, a seção 'Quem vê' do consentimento precisa mudar.

## Ajustes do lead depois da Onda 1

- `disc.natural.ordem` e `disc.adaptado.ordem` (Fator[] do mais alto ao mais baixo, com o desempate do motor) ENTRARAM no ResultadoMotor (C37). Paridade estendida.
- `quatro_cruzamentos` agora tem chaves por POSICAO: alto1_baixo1, alto1_baixo2, alto2_baixo1, alto2_baixo2, relativas a `disc.natural.ordem` (C07).
- `PARAGRAFOS` e `paragrafos(texto, n)` em src/lib/relatorio-mc/narrativa-esquema.ts dizem quantos blocos cada chave de texto corrido traz (R1).
- Caso de demonstracao: perfila/tests/fixtures/caso-demonstracao.json (69 respostas + resultado esperado do motor Python; natural DI, adaptado CS, ENT, POL/ECO).
