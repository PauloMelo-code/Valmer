# Mapa de dados do molde MC 3.1 (42 paginas)

Contrato da onda que converte o molde em componentes. Para cada pagina diz o que
e **FIXO** (igual para todo avaliado), o que e **DERIVADO** do escore (numero,
barra, lista que muda com o perfil), o que e **IA** e de onde cada dado sai.
Vale o ADR-0007 (D1..D11); nada aqui reabre decisao. Onde o molde e a v2.2 nao
batem, a linha diz e o conflito esta numerado na secao 5.

Arquivos: pagina `NN` = `contexto/extraido/mc-3.1-paginas/pagNN.html` (secao
`#pNN` do molde, sem base64). CSS = `perfila/src/components/relatorio-mc/relatorio-mc.css`.
Os valores de exemplo sao os da pessoa do relatorio de referencia (que fica
fora do git por ser dado pessoal), do instrumento antigo; nenhum deles e reproduzivel pelo motor novo.

## 1. Convencoes

| Sigla | Origem |
|---|---|
| `R.` | `ResultadoMotor` (`perfila/src/lib/motor/resultado.ts`), secao 7 do AGENTE. Ex.: `R.disc.natural.escore.D`, `R.disc.natural.zona.D`, `R.disc.natural.competencias.ousadia`, `R.disc.natural.perfil`, `R.disc.indices.{variacao,indice_adaptacao,classe,polarizados,amplitude_natural}`, `R.disc.lideranca.{executivo,metodico,motivador,sistematico}`, `R.jung.{percentuais,tipo,hierarquia}`, `R.valores.{escore,nivel,ranking}` |
| `IA.` | chave de `esquemaNarrativaMC` (`perfila/src/lib/relatorio-mc/narrativa-esquema.ts`), secao 18 do blueprint |
| `CAD.` | cadastro: `assessments` (nome do avaliado, codigo, data de emissao) e facilitador (nome, canais) |
| `TAB:nome` | tabela estatica a criar em codigo (proposta: `src/data/relatorio-mc-textos.ts`). Status: *molde* (texto copiado do molde), *bp§N* (blueprint secao N) ou **PENDENTE** (texto nao existe) |
| `ORD` | ordem natural dos fatores do mais alto ao mais baixo. **Nao esta no contrato** (ver C37) |

Seletores sao relativos a `#pNN`; `.zw` e o bloco `div.body>div.zw`. Nenhum
elemento dinamico do molde tem id ou `data-*` proprio: o seletor abaixo e o
endereco. Numero de pagina (`.ft .pn`) e o rodape `MC 3.1 · REL 1.0` sao FIXOS
em todas.

**Funcoes derivadas que a onda precisa** (nenhuma e IA, todas saem de `R.`):
- `rotuloZona(z)`: EA Extremo alto, MA Muito alto, A Alto, B Baixo, MB Muito baixo, EB Extremo baixo (`ZONAS` em `lib/motor/disc.ts`). Substitui *Discreto/Moderado/Presente/Marcante/Dominante* do molde em todo lugar (D4).
- `classeVariacao(v)`: sobre `|v|`, <=10 baixa, <=20 moderada, <=25 alta, <=35 muito alta, >35 extremamente alta (mesma regra do indice, AGENTE 5.5). O motor so classifica o indice; por fator e conta da pagina.
- `nivelCompetencia(x)`: >70 Potencializar, 40 a 70 Consolidar, <40 Desenvolver (bp§14).
- `escalaX(v) = x0 + largura * v / 100` em cada SVG (coordenadas na pagina).
- `nomeFator(f)` e `nomeValor(v)` numa constante unica (D8): hoje o molde usa DOMINANTE/INFLUENTE/ESTAVEL/CONFORME como rotulo e REGULATORIO para PRI. Ver C22 e C36.
- Numero exibido: inteiro quando `x % 1 === 0`, senao uma casa com virgula (`62,5`). Ver C03.

## 2. Comum a todas as paginas (02 a 41)

| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Nome no cabecalho ("Mapa Comportamental · VALMER ALBUQUERQUE") | `.hd>div:first-child` | DERIVADO | `CAD.` nome do avaliado em maiusculas |
| Etapa no cabecalho ("02 · INTERPRETAR") e cor do quadradinho | `.hd .st`, `.hd .st i` | FIXO | por pagina (01-05 Compreender, 06-25 Interpretar, 26-28 Integrar, 29-40 Aplicar, 41 Continuar) |
| Aba lateral | `.tab` (cor inline) | FIXO | por etapa |
| Kicker, h1, `.gline`, `.sub` | `.body>.kick`, `.body>h1`, `.body>.sub` | FIXO | salvo onde a pagina diz o contrario |
| Marcacoes metodologicas (FATO DO MODELO, DERIVADO DO SEU ESCORE, A CONFIRMAR NA DEVOLUTIVA, APLICACAO PRATICA) | `span.tag` (icone `svg.ic` inline) | FIXO | por pagina, como no molde |
| Texturas do adaptado | `<pattern id="u2D">` (p06), `u3..u6` (p09-12), `u7X`/`u8X` (p27), `u9X` (p29) | FIXO | ids globais do documento: se dois relatorios forem montados na mesma pagina, gerar com `useId()` |

A pagina 01 e a 42 nao tem `.hd`, `.body` nem `.ft`: sao absolutas sobre imagem/gradiente.

## 3. Pagina por pagina

### 01 · Capa (`#p01`, fundo `capa.png`, ja traz "MAPA COMPORTAMENTAL")
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Rotulos NOME DO AVALIADO / INSTRUTOR / DATA DE EMISSAO | `#p01>div:nth-child(2|4|6)>div:nth-child(1)` | FIXO | |
| Nome do avaliado ("VALMER ALBUQUERQUE") | `#p01>div:nth-child(2)>div:nth-child(2)` | DERIVADO | `CAD.` nome, maiusculas. `white-space:nowrap` em 66mm: nome longo estoura (C40) |
| Nome do instrutor | `#p01>div:nth-child(4)>div:nth-child(2)` | DERIVADO | `CAD.` nome do facilitador |
| Data ("SETEMBRO DE 2026") | `#p01>div:nth-child(6)>div:nth-child(2)` | DERIVADO | `CAD.` data de emissao, mes e ano por extenso em maiusculas (`lib/data-extenso.ts`) |
| Codigo MC-AAAA-MMDD-XX | nao existe no molde | — | bp§17 pede na capa (C34) |

### 02 · Indice
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Etapas e titulos de pagina, links `href="#pNN"` | `.zw>.row>.col>div>a` | FIXO / DERIVADO | lista fixa, **recortada pelo nivel** S1..S4 (D9: S1 01-16, S2 01-28, S3 01-36, S4 01-42). Etapa sem pagina some |
| Cartao Identificacao: Avaliado | `.zw .card.xs>.kv:nth-of-type(1)>span:last-child` | DERIVADO | `CAD.` nome |
| Instrumento ("MC 3.0 · MC-2026-0823-VA") | `.kv:nth-of-type(2)>span:last-child` | DERIVADO | `R.versao_instrumento` ("MC-INV 2.2") + `CAD.` codigo (C34) |
| Emissao ("Setembro de 2026") | `.kv:nth-of-type(3)>span:last-child` | DERIVADO | `CAD.` data |
| Relatorio ("MC 3.1 · REL 1.0"), cartao das tres marcacoes | `.kv:nth-of-type(4)`, `.zw>.card` | FIXO | |

### 03 · Sobre o seu Mapa · 04 · Metodologia DISC · 05 · Teoria DISC
Tudo FIXO (texto do molde; 04 com `marston.jpg`; 05 com os quatro cartoes D/I/S/C
e as perguntas O QUE?/QUEM?/COMO?/POR QUE?, bp§07). Nenhum dado do avaliado
(bp§17 fala em "texto fixo com nome do avaliado" na 03, mas o molde nao tem nome ali).

### 06 · Mapa de Intensidade Comportamental (D4: layout do redesign, regua de 6 zonas)
O molde traz um SVG por condicao (`viewBox 0 0 1720 648`): trilho `x=360 w=1130`
(11,3 por ponto), barra solida no natural e `fill=url(#u2X)` no adaptado,
circulo com o escore em `x=escalaX(v)`, selo de classificacao em `x=1520 w=200`,
ticks 0/25/50/75/100 e coluna "LINHA DE PREDOMINANCIA" em 50 (x=925). A proxima
onda redesenha pelo prompt de redesign (dois cartoes, barras horizontais, badge,
classificacao, painel escuro) com as trocas de C01/C02.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Titulos "Perfil natural"/"Perfil adaptado" e subtitulos | `.zw>div:nth-child(1|2)>div`, `>.sm.mut` | FIXO | |
| 4 barras natural (ordem fixa D, I, S, C): comprimento, numero, classificacao | 1o `svg` | DERIVADO | `R.disc.natural.escore.X`, `rotuloZona(R.disc.natural.zona.X)` |
| 4 barras adaptado, hachuradas | 2o `svg` | DERIVADO | `R.disc.adaptado.escore.X`, `rotuloZona(R.disc.adaptado.zona.X)` |
| Legenda/regua | ticks do SVG | FIXO | 0, 16, 33, 51, 70, 88, 100 (bp§11) no lugar de 0/25/50/75/100 (C01) |
| Painel: Natural "Dominante + Influente" | `.zw>.dark>div:nth-child(1)>div:nth-child(3)` | DERIVADO | `R.disc.natural.perfil` -> nomes dos fatores; "EQUILIBRADO" tem texto proprio (C08) |
| Painel: Adaptado "Conforme + Estavel" | `.dark>div:nth-child(3)>div:nth-child(3)` | DERIVADO | `R.disc.adaptado.perfil` |
| Painel: Leitura rapida | `.dark>div:nth-child(5)>.sm` | sem fonte | texto pessoal sem chave de IA (C05) |

### 07 · A sua combinacao natural (+ arquetipo, D5)
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Subtitulo "DOMINANTE em 89 e INFLUENTE em 69. Dois fatores acima de 50..." | `.body>.sub` | DERIVADO | molde de frase com os dois primeiros de `R.disc.natural.perfil` e seus escores; variantes para perfil puro e EQUILIBRADO (C08) |
| Titulo "Decide e traz gente junto" | `.zw>.row>.col:nth-of-type(1)>h2` | DERIVADO | proposta: nome do arquetipo, `TAB:arquetipos` (bp§10, 12 pares) buscado por `R.disc.natural.perfil` |
| 4 paragrafos "O que significa / Como aparece no cotidiano / Impacto que produz / Como aplicar no trabalho" | `.col:nth-of-type(1)>p.sm:nth-of-type(1..4)` (rotulo em `>b`) | IA | `IA.sintese_combinacao_natural` (300-400 palavras), em 4 paragrafos separados por `\n\n` (recomendacao R1) |
| Cartao "Os dois fatores": numero e barra `width:NN%` de cada | `.col:nth-of-type(2) .card>div:nth-child(2|3)` (`span.num`, `div[style*=width]`) | DERIVADO | dois primeiros fatores de `R.disc.natural.perfil`, `R.disc.natural.escore` |
| Arquetipo (nome, descricao, "Ponto de atencao") | nao existe no molde | TABELA | `TAB:arquetipos` *bp§10*; proposta: dentro do mesmo cartao, abaixo das barras. Perfil puro e EQUILIBRADO: **PENDENTE** (C06) |
| 4 cartoes de cruzamento: pilulas "DOMINANTE alto"/"ESTAVEL baixo" | `.zw>.g2>.card:nth-of-type(1..4)>div>span.pill` | DERIVADO | 2 mais altos x 2 mais baixos de `ORD` (C07, C37) |
| Texto de cada cruzamento | `.g2>.card:nth-of-type(N)>.xs` | IA | `IA.quatro_cruzamentos.alto_X_baixo_Y` (C07) |

### 08 · O custo da adaptacao
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Indice ("42") e frase "Adaptacao alta. Media das diferencas..." | `.zw>.g3>.card:nth-of-type(1)>.num`, `>.xs` | DERIVADO | `R.disc.indices.indice_adaptacao`; frase = `"Adaptacao " + R.disc.indices.classe` + definicao fixa (C09) |
| Amplitude ("65") e frase "Contorno muito nitido..." | `.g3>.card:nth-of-type(2)>.num`, `>.xs` | DERIVADO | `R.disc.indices.amplitude_natural`; frase sem regra na v2.2 (C10) |
| Polarizados ("2") e "ESTAVEL e CONFORME atravessam..." | `.g3>.card:nth-of-type(3)>.num`, `>.xs` | DERIVADO | `R.disc.indices.polarizados.length` e nomes; zero polarizados pede frase propria |
| "O que a polarizacao significa", 1o paragrafo | `.row>.col:nth-of-type(1)>h2`, `p.sm:nth-of-type(1)` | FIXO | trocar "entre 32 e 69" (C11) |
| 2o paragrafo ("No seu mapa isso acontece em dois fatores...") | `p.sm:nth-of-type(2)` | IA | `IA.custo_adaptacao_narrativa` (R1) |
| Caixa "Atencao · onde isso aparece na pratica" | `.col:nth-of-type(2)>.box-warn` | FIXO condicional | so quando `polarizados.length > 0` ou classe >= alta |
| Tabela: Natural, Adaptado, Variacao (sinal com U+2212), Classificacao | `.zw>table.t>tr:nth-child(2..5)>td` | DERIVADO | `R.disc.natural.escore`, `R.disc.adaptado.escore`, `R.disc.indices.variacao`, `classeVariacao()` |
| Nota das faixas de variacao | `.zw>.xs.mut` | FIXO | reescrever com decimais (C09) |
| Nota "O que reduz o custo" e cartao "Por que esta pagina aparece tao cedo" | `.zw>.note`, `.zw>.card.sm` | IA | sao pessoais: cobrir com `IA.custo_adaptacao_narrativa` (R1) ou retirar. Cita "pagina 33": some no S1/S2 (C35) |

### 09 · 10 · 11 · 12 · Fatores D, I, S, C (mesma estrutura, um fator por pagina)
SVG `viewBox 0 0 1720 330`: trilho `x=250 w=1360` (13,6 por ponto), natural solido
`y=14`, adaptado `url(#u3..u6)` tracejado `y=104`, numero ao lado da barra; legenda
de 5 segmentos iguais (`rect w=268`) e rotulos 0 a 20 ... 81 a 100 (C01).
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| h1 com o nome do fator e cor | `.body>h1>span` | FIXO por fator | `nomeFator(f)` (C36) |
| Subtitulo ("Como voce lida com adversidades e desafios.") | `.body>.sub` | FIXO por fator | *molde* (D, I, S, C todos presentes) |
| Barras natural e adaptado + legenda | `.zw>.card>svg` | DERIVADO | `R.disc.natural.escore.f`, `R.disc.adaptado.escore.f`; legenda com 6 zonas de largura proporcional (16/17/18/19/18/12) e EA/EB com borda pontilhada (bp§09) |
| NATURAL "89 Dominante" / ADAPTADO "40 Moderado" | `.zw>.g3>.soft:nth-of-type(1|2)>div>span.num`, `>span` | DERIVADO | escore + `rotuloZona()` |
| VARIACAO "−49 desce no adaptado" | `.g3>.card>div>span.num`, `>span` | DERIVADO | `R.disc.indices.variacao.f`; "sobe"/"desce"/"se mantem" pelo sinal |
| Dois paragrafos de leitura | `.row>.col:nth-of-type(1)>p.sm:nth-of-type(1|2)` | IA | `IA.fator_d/i/s/c_narrativa` (200 palavras, R1) |
| "No natural" / "No adaptado" (lista de adjetivos) | `.col:nth-of-type(1)>.g2>.soft:nth-of-type(1|2)>.xs` | TABELA | `TAB:descritores[f][zona]` *bp§09*, 4 adjetivos pela zona natural e pela adaptada (C12) |
| Cartao Palavra-chave, Emocao, Motivador, Comunicacao, Decisao, Contribuicao | `.col:nth-of-type(2)>.card>.kv:nth-of-type(1..6)>span:last-child` | FIXO por fator | *molde* (4 fatores presentes; Emocao e Motivador batem com bp§07) |
| "Aplicacao no trabalho" | `.col:nth-of-type(2)>.soft>.xs` | IA | pessoal sem chave: 3o paragrafo de `IA.fator_X_narrativa` (R1, C13) |
| Nota "Como ler a linha Emocao associada" | `.zw>.note.xs` | FIXO | so na pagina 09 |

### 13 · Forcas de maior impacto
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| 6 cartoes: rotulo "DOMINANTE 89", titulo, texto | `.zw>.g3>.card:nth-of-type(1..6)>span.lab`, `>h2`, `>.sm` | IA | `IA.seis_forcas[i].fator`, `.nome`, `.descricao` (o rotulo vem pronto da IA, em maiusculas) |
| Nota "Como usar esta pagina" | `.zw>.note` | FIXO | |

### 14 · Relacionamento, decisao e espectro
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| 4 cartoes: Como voce se aproxima / O que sustenta / O que desgasta / Sob pressao | `.zw>.g4>.card:nth-of-type(1..4)>.xs` | TABELA | bp§17 diz "tabela por perfil", que nao existe: `TAB:relacionamento[fator mais alto]` **PENDENTE** (C15) |
| 7 pares do espectro, lado esquerdo/direito, pilula do fator de origem | `.zw>.card>div:nth-child(2..8)>div:nth-child(1|3)`, `>div:nth-child(4)>span.pill` | FIXO | *molde* (pares e fator de origem) |
| Polo em negrito e marcador `left:calc(NN% - 2.2mm)`, cor do fator | `div:nth-child(N)>div:nth-child(2)>div:last-child` | DERIVADO | sem regra: as posicoes do molde (20, 16, 42, 24, 72, 22, 26) foram postas a mao (C15) |
| Nota "O que o adaptado muda aqui" | `.zw>.note` | sem fonte | pessoal, sem chave (C15) |

### 15 · Pontos de tensao e inseguranca
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Dois blocos: "Ligados ao fator X", escore, "Fator mais alto"/"Segundo fator" | `.zw>.g2:nth-of-type(1)>.soft:nth-of-type(1|2)>div>h2`, `>span.num`, `>span.lab` | DERIVADO | 1o e 2o de `ORD`, `R.disc.natural.escore` |
| Lista de 6 tensoes | `.soft:nth-of-type(N)>ul.l>li` | TABELA | `TAB:tensoes[f]`: *molde* para D e I; S e C **PENDENTE** (bp§08 "Medos" tem 4 itens) (C16) |
| "Como aparece." | `.soft:nth-of-type(N)>.xs` | TABELA | por fator e posicao (1o/2o) **PENDENTE** para S, C e para 2o lugar de D |
| Caixa "Risco · impacto possivel" | `.zw>.g2:nth-of-type(2)>.box-risk>.sm` | TABELA | escrita para D alto: `TAB:tensoes[f].risco` **PENDENTE** para I, S, C |
| "Recomendacao · pratica" | `.g2:nth-of-type(2)>.soft>.sm` | FIXO | |

### 16 · Gatilhos comportamentais de mobilizacao
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Gatilho principal: titulo ("Desafio e poder") | `.zw>.g2>.soft:nth-of-type(1)>h2` | TABELA | motivador do 1o de `ORD` (bp§07: D Desafio e poder, I Reconhecimento social, S Seguranca, C Informacao e alto padrao) |
| "O que significa" (cita "DOMINANTE em 89 pontos") | `.soft:nth-of-type(1)>p.sm:nth-of-type(1)` | DERIVADO | frase-molde com fator e escore + `TAB:gatilhos[f]` |
| "Como aparece" / "O que acontece quando falta" | `p.sm:nth-of-type(2|3)` | TABELA | `TAB:gatilhos[f][principal|complementar]`: *molde* so D-principal e I-complementar; 6 variantes **PENDENTE** (C17) |
| Gatilho complementar (mesma estrutura) | `.g2>.soft:nth-of-type(2)` | TABELA | 2o de `ORD` |
| "O cruzamento com os seus valores" (valor mais alto, escore, "confirma e reforca") | `.zw>.card>div:nth-child(1)>p.sm:nth-of-type(1|2)` | DERIVADO | `R.valores.ranking[0]`, `R.valores.escore`; regra de alinhamento fator x valor **PENDENTE** (C17) |
| Mostradores "FATOR DOMINANTE 89" / "VALOR POLITICO 82" | `.zw>.card>div:nth-child(2)>div:nth-child(1|2)>.xs`, `>.num` | DERIVADO | 1o de `ORD` e `R.valores.ranking[0]` |

### 17 · Tipos psicologicos
Tudo FIXO (texto e os tres eixos com pilulas).

### 18 · 19 · 20 · Eixos E/I, N/S, T/F (mesma estrutura)
SVG `viewBox 0 0 1720 120`: polo A de `x=0` a `17,2*pctA`, polo B no resto,
linha tracejada em 50 (x=860); texto "EXTROVERSAO 71" a esquerda e "29 INTROVERSAO" a direita. Cores fixas por eixo.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| "POLO PREDOMINANTE · X" / "POLO COMPLEMENTAR · Y" | `.zw>.card>div>span`, `>span.mut` | DERIVADO | polo com `R.jung.percentuais > 50` (27 e impar, nunca empata) |
| Barra e numeros | `.zw>.card>svg` | DERIVADO | `R.jung.percentuais.{E,I|N,S|T,F}`; o polo A fica sempre a esquerda |
| Dois cartoes de polo: rotulo "Seu polo predominante · 71", nome, definicao, 4 itens | `.zw>.g2:nth-of-type(2)>.soft:nth-of-type(1|2)` | FIXO por polo, ordem DERIVADA | texto *molde* (6 polos presentes); o predominante vai primeiro; numero do rotulo = percentual |
| "Como aparece em voce" | `.g2:nth-of-type(3)>.card>.sm` | IA | `IA.jung_e_i_narrativa` / `jung_n_s_narrativa` / `jung_t_f_narrativa` |
| "Aplicacao no trabalho" | `.g2:nth-of-type(3)>.soft>.sm` | TABELA | por polo predominante: *molde* para E, N, T; I, S, F **PENDENTE** (C18) |

### 21 · A sua hierarquia funcional
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Subtitulo "Tipo Intuicao Extrovertida. ..." | `.body>.sub` | DERIVADO | `R.jung.hierarquia[0]` (ex. T6: "Pensamento Extrovertido") + frase fixa (C19) |
| 4 linhas: posicao, rotulo (Dominante/Auxiliar/Terciaria/Inferior), funcao, definicao | `.zw>.row>.card.col>div:nth-child(1..4)` (`span.lab`, `span` colorido, `.xs`) | DERIVADO | nome = `R.jung.hierarquia[i]` com atitude (C19); cor por funcao (N `#76549A` no molde); definicao FIXA por posicao |
| Barra `width:NN%` e numero | `div:nth-child(i)>div:nth-child(3)>div`, `>.num:last-child` | DERIVADO | percentual da letra da funcao (Intuicao -> `percentuais.N`, Sensacao -> `S`, Pensamento -> `T`, Sentimento -> `F`) |
| "Como a ordem e determinada" | `.row>.col>.card:nth-of-type(1)>.xs` | FIXO | **reescrever**: descreve a regra antiga (C19) |
| "Uma regra de leitura" (cita "Sensacao 36 e Sentimento 42") | `.col>.card:nth-of-type(2)>.xs` | DERIVADO | frase-molde com terciaria e inferior |
| Nota | `.zw>.note` | IA | `IA.hierarquia_funcional_narrativa` |
| "Grau de certeza desta leitura" | `.zw>.card.xs` | DERIVADO | frase fixa com `R.jung.hierarquia[0]` |

### 22 · O lado que aparece sob pressao
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Subtitulo "Funcao inferior: Sensacao, 36 pontos." e selo "Sensacao · 36" | `.body>.sub`, `.row>.col:nth-of-type(2)>.soft>div:last-child` | DERIVADO | `R.jung.hierarquia[3]` e percentual da letra |
| "Onde ela mora" / "Como aparece em voce" | `.col:nth-of-type(1)>p.sm:nth-of-type(1|3)` | TABELA | `TAB:funcaoInferior[N|S|T|F]`: *molde* so Sensacao **PENDENTE** as outras 3 (C20) |
| "O que a ativa" | `p.sm:nth-of-type(2)` | FIXO | |
| "Por que a adaptacao atual custa tanto" | `.col:nth-of-type(1)>.soft` | sem fonte | condicional sem regra na v2.2 (C20); retirar ate haver regra |
| "Tres sinais de que ela assumiu" (3 itens) | `.col:nth-of-type(2)>.box-risk>ul.l>li` | IA | `IA.funcao_inferior_sinais[0..2]` |
| Regulacao 01..03 | `.zw>.g3>.card:nth-of-type(1..3)>.xs` | TABELA | `TAB:funcaoInferior[x].regulacao`: *molde* so Sensacao **PENDENTE** |
| "Um cuidado necessario" | `.zw>.box-warn.xs` | FIXO | |

### 23 · Teoria de valores
FIXO, menos as faixas: `.zw>.g3>div>.lab` "66 a 100 / 31 a 65 / 1 a 30" vira
"66 a 100 / 31 a 65,9 / 0 a 30,9" (C21).

### 24 · Os seus seis valores
SVG `viewBox 0 0 1700 750`: 6 linhas na ordem de `R.valores.ranking`, trilho
`x=560 w=990` (9,9 por ponto), cor fixa por valor e tom pelo nivel, tracejadas
em 30 (x=857) e 65 (x=1203,5), numero em `x=1700` alinhado a direita.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Cartao com as seis definicoes | `.zw>.card.sm` | FIXO | trocar REGULATORIO por `nomeValor('PRI')` (C22) |
| Barras: nome, nivel, escore, comprimento, tom | `.zw>.card>svg` | DERIVADO | `R.valores.ranking`, `R.valores.escore`, `R.valores.nivel`; tracejadas nos limites 31 e 66 (C21) |
| Tres cartoes Significativo / Circunstancial / Indiferente com a lista | `.zw>.g3>.card:nth-of-type(1..3)>.sm>b` | DERIVADO | valores agrupados por `R.valores.nivel`; grupo vazio pede frase ("nenhum valor nesta faixa") |
| Frase de cada faixa | `.g3>.card>.xs.mut` | FIXO | |

### 25 · Os seus dois valores predominantes
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Dois cartoes: nome, subtitulo ("INFLUENCIA E DIRECAO"), escore | `.zw>.g2>.soft:nth-of-type(1|2)` (nome e `.xs` no 1o div, `.num`) | DERIVADO | `R.valores.ranking[0|1]`, `R.valores.escore`; subtitulo `TAB:valores[v]` *molde* POL e ECO, **PENDENTE** 4 (C23) |
| "O que representa" / "Onde aparece hoje" / "Risco" | `.soft:nth-of-type(N)>p.sm:nth-of-type(1..3)` | TABELA | `TAB:valores[v]`: *molde* POL e ECO, **PENDENTE** TEO, EST, SOC, PRI |
| "Como estes dois conversam" (2 paragrafos) | `.zw>.row>.col:nth-of-type(1)>p.sm` | IA | `IA.dois_valores_narrativa` (R1) |
| "O que move voce agora" | `.row>.col.card>.sm` | IA | parte de `IA.dois_valores_narrativa` (R1) ou retirar |
| Nota "Valores nao sao rotulos permanentes" | `.zw>.note.xs` | FIXO | |

### 26 · Leitura integrada das tres camadas
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Linha Comportamento: pilulas "DOMINANTE 89" "INFLUENTE 69" e frase | `.zw>table.t>tr:nth-child(2)>td:nth-child(2)` (`span.pill`, `.xs`) | DERIVADO | `R.disc.natural.perfil` + escores; frase = descricao do arquetipo (`TAB:arquetipos`) |
| Linha Processamento: 3 pilulas e frase | `tr:nth-child(3)>td:nth-child(2)` | DERIVADO | tres polos de `R.jung.tipo` com percentual; frase = juncao de `TAB:polos[p].curta` (**PENDENTE**: frase curta por polo) |
| Linha Valores: 2 pilulas e frase | `tr:nth-child(4)>td:nth-child(2)` | DERIVADO | `R.valores.ranking[0|1]` + escore; frase `TAB:valores[v].curta` **PENDENTE** |
| Coluna "Pergunta que responde" | `td.xs.mut` | FIXO | |
| Sintese integrada | `.zw>.soft>p` | IA | `IA.leitura_integrada` (1o paragrafo, R1) |
| Confirmam / Complementam / Geram tensao | `.zw>.g3>.soft:nth-of-type(1..3)>.xs` | IA | paragrafos 2 a 4 de `IA.leitura_integrada` (R1, C24) |
| "Contexto de melhor funcionamento" | `.zw>.card.sm` | IA | proposta: reusar `IA.resumo_perfil_8_blocos.ambiente_melhor_performance` |

### 27 · Painel consolidado
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Natural / Adaptado: sigla ("DOMINANTE + INFLUENTE") | `.zw>.g2>.card:nth-of-type(1|2)>div>span.xs` | DERIVADO | `R.disc.{natural,adaptado}.perfil` |
| Barras verticais (base y=450, 100 em y=60, 3,9 por ponto; faixa 32-69 sombreada; numero, fator, zona) | `.g2>.card:nth-of-type(1|2)>svg` | DERIVADO | escores e `rotuloZona()` (C01); faixa de flexibilidade 32 < x < 70 |
| Processamento: 3 polos predominantes e percentuais | `.zw>.g3>.card:nth-of-type(1)>div>span.num` | DERIVADO | `R.jung.percentuais` dos polos de `R.jung.tipo` |
| "Complementares: Introversao 29 · ..." | `.g3>.card:nth-of-type(1)>.xs.mut` | DERIVADO | polos opostos |
| "Tipo ... Dominante ..., auxiliar ..., terciaria ..., inferior ..." | `.g3>.card:nth-of-type(1)>.xs:last-child` | DERIVADO | `R.jung.hierarquia` |
| Valores: 6 nomes e escores | `.g3>.card:nth-of-type(2)` | DERIVADO | `R.valores.ranking`, `R.valores.escore`, `nomeValor()` |
| Estilo de lideranca (molde: Direcao 89, Influencia 69, Suporte 30, Criterio 24) | `.g3>.card:nth-of-type(3)` | DERIVADO | **D6**: `R.disc.lideranca` em percentual, ordem decrescente, nomes Executivo/Metodico/Motivador/Sistematico (C25) |
| Indice, amplitude, polarizados | `.zw>.g4>.card:nth-of-type(1..3)>.num`, `>.xs` | DERIVADO | como na pagina 08 (C09, C10) |
| Deslocamento por fator "DOMINANTE −49" | `.g4>.card:nth-of-type(4)>.xs>b` | DERIVADO | `R.disc.indices.variacao` |
| "Detalhes nas paginas 31 e 32." | `.g4>.card:nth-of-type(4)>.xs.mut` | FIXO | referencia errada: o detalhe esta na 08 (C25) |

### 28 · Resumo do Perfil Comportamental
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Subtitulo | `.body>.sub` | FIXO | |
| 8 cartoes, na ordem | `.zw>.g2>.card:nth-of-type(1..7)>.sm`, `.g2>.soft>.sm` | IA | `IA.resumo_perfil_8_blocos.{essencia, contribuicao_maior_valor, ambiente_melhor_performance, estilo_comunicacao, motivadores, riscos_excesso, prioridades_desenvolvimento, direcao_recomendada}` (o 8o e o `.soft`) |

### 29 · O seu estilo de lideranca (D6)
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Subtitulo | `.body>.sub` | FIXO | |
| 4 cartoes, ordenados por percentual decrescente: rotulo de posicao, numero, nome | `.zw>.g4>.soft:nth-of-type(1..4)` (`span.lab`, `span.num`, `h3`) | DERIVADO | rotulos Predominante/Secundario/De apoio/Residual fixos por posicao; numero `R.disc.lideranca.x` com "%"; nome Executivo/Metodico/Motivador/Sistematico |
| Definicao de cada estilo | `.soft:nth-of-type(N)>.xs:nth-of-type(1)` | TABELA | `TAB:estilosLideranca[x]` **PENDENTE**: os do molde descrevem fator, nao estilo (C26) |
| Linha "Em 89: ..." | `.soft:nth-of-type(N)>.xs:last-child` | sem fonte | retirar ou `TAB` por estilo e faixa **PENDENTE** (C26) |
| "Sintese do seu estilo" (2 paragrafos) | `.zw>.row>.col>p.sm` | sem fonte | pessoal, sem chave de IA (C26) |
| "Atencao · o que o ambiente pede hoje" | `.row>.col>.box-warn` | sem fonte | pede lideranca sobre o adaptado, fora do contrato (C26) |
| Barras do perfil natural "base do estilo" (base y=510, 4,5 por ponto) | `.row>.card>svg` | DERIVADO | `R.disc.natural.escore`, `rotuloZona()` |

### 30 · Mapa de Competencias (fundamentacao)
FIXO, com uma troca obrigatoria: `.zw>.row>.col:nth-of-type(2)>.card>.sm`
("Cada competencia deriva do escore do fator... com um ajuste proprio") descreve
o calculo antigo (C27). Os tres niveis (`.zw>.g3`) batem com bp§14.

### 31 · Mapa de Competencias, resultado (radar de 12, D7)
Radar `viewBox 0 0 1400 1000`: centro (700,500), 100 = raio 340 (3,4 por ponto),
12 eixos a 30 graus a partir do topo em sentido horario; natural poligono solido
`#17324D`, adaptado tracejado `#9A711E`; rotulo "nat · ada" em cada eixo.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Legenda natural/adaptado e cores de fator | `.zw>div:first-child` | FIXO | |
| 12 eixos: nome e "93 · 44" | `text` do `svg[viewBox="0 0 1400 1000"]` | DERIVADO | ousadia, comando, objetividade, persuasao, extroversao, entusiasmo, empatia, paciencia, cooperacao, organizacao, analise, investigacao (D7); `R.disc.{natural,adaptado}.competencias` (C28) |
| Poligonos e marcadores | `polygon`, `circle`, `rect` do mesmo `svg` | DERIVADO | mesmas competencias |
| Potencializar / Consolidar / Desenvolver: ate 3 nomes com escore | `.zw>.g3>.card:nth-of-type(1..3)>.xs>b` | DERIVADO | `nivelCompetencia()` sobre o natural das 12; decrescente nos dois primeiros, crescente no terceiro |
| Frase depois de cada lista | `.g3>.card>.xs` (texto apos o `b`) | sem fonte | pessoal (C28): fixar uma frase por nivel |

### 32 · Competencias em detalhe (16 barras, D7)
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| 4 cartoes por fator ("Fator DOMINANTE") | `.zw>.g2>.card:nth-of-type(1..4)>span.lab` | FIXO | `nomeFator()` |
| Em cada: nome, "93 · 44", descricao, barra natural (faixa de cima, `width`) e adaptada (faixa de baixo, hachura por `repeating-linear-gradient`) | `.card>div:nth-of-type(1..4)` | DERIVADO | ordem `COMPETENCIAS_POR_FATOR` (`src/data/inventario-mc.ts`); `R.disc.{natural,adaptado}.competencias` |
| Descricao de cada competencia | `.card>div>div.xs.mut` | TABELA | `TAB:competencias`: *molde* para 12; Constancia, Cooperacao, Analise, Investigacao **PENDENTE** (T4, C29) |
| Nota "Uma leitura util desta pagina" | `.zw>.note.xs` | sem fonte | pessoal (C29) |

### 33 · 34 · Pontos a desenvolver (+ PDI na 34, D5)
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| 3 cartoes na 33, 3 na 34: numero, titulo, Como aparece, Impacto possivel, Pratica recomendada | `.zw>.card:nth-of-type(1..3)` (`span.num`, `h2`, `.g3>div:nth-child(1..3)>.xs`) | IA | `IA.seis_pontos_desenvolver[0..2]` na 33 e `[3..5]` na 34: `num`, `titulo`, `como_aparece`, `impacto_possivel`, `pratica_recomendada` |
| Subtitulo da 34 "Pontos 04 a 06." | `#p34 .body>.sub` | FIXO | |
| "Por onde comecar" | `#p34 .zw>.g2>.card:nth-of-type(1)` | FIXO | coerente com a regra "ponto 1 = alavanca" do prompt |
| "Como acompanhar" | `#p34 .zw>.g2>.card:nth-of-type(2)` | IA | **D5**: vira o PDI, `IA.pdi.prioridade_principal`, `acoes_semanais[0..2]`, `desafio_30_dias`, `como_medir` (C30) |

### 35 · Como se comunicar com cada perfil
Tudo FIXO.

### 36 · 37 · Comunicar com D e I / com S e C
Dois cartoes por pagina (`.zw>div:nth-child(1)>div:nth-child(1|2)`): Foco,
Comunicacao, Decisao, Pergunta central, Como conduzir, Abertura ideal, Aplicacao
pratica, Evite, Feedback, Como confirmar. Tudo FIXO por fator.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| "Onde voce acerta e onde escorrega" (36) / "Onde esta o seu maior ganho" (37) | `.zw>div:nth-child(2)` (titulo e `.sm`) | DERIVADO | proximidade dos dois fatores da pagina em `ORD`: ambos no topo, ambos embaixo, misto. *molde* tem so "36 = topo" e "37 = base"; variante mista e as invertidas **PENDENTE** (C31) |

### 38 · Como liderar cada perfil
Tudo FIXO.

### 39 · 40 · Liderando D e I / S e C
Cartoes por fator (Foco, Comunicacao, Decisao, Pergunta, Como liderar, Aplicacao
pratica, Evite e desenvolva): FIXO por fator.
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| "O atrito previsivel", um texto por fator liderado | `.zw>div:nth-child(2)>div:nth-child(2) .xs` (um por fator, na ordem da pagina) | TABELA | depende do fator mais alto do avaliado x fator liderado: 16 combinacoes, *molde* tem 4 (escritas para lider D) **PENDENTE** (C31) |

### 41 · O desenvolvimento continua (+ leituras, D5)
| Elemento | Seletor | Tipo | Fonte |
|---|---|---|---|
| Kicker, h1 | `.body>.kick`, `.body>h1` | FIXO | |
| Quatro paragrafos (`p` com `b`) | `.zw>p:nth-of-type(1..4)` | FIXO no molde | bp§17/§23 pedem `IA.mensagem_final` como unico texto alem do titulo (C32) |
| Mensagem final | proposta: no lugar dos paragrafos 2 a 4 | IA | `IA.mensagem_final` (100-130 palavras) |
| 5 leituras: titulo, autor, por que para voce | nao existe no molde | IA | **D5**: `IA.leituras_recomendadas[0..4]`, lista acima do `.dark` |
| Painel final | `.zw>.dark` | FIXO | |

### 42 · Impacto Academy
Tudo FIXO no molde (`brasao-impacto-academy.png`, Quem somos, Missao, Visao,
Proximo passo). **Canais oficiais** (WhatsApp "(44) 99159-5998" e quatro perfis
de Instagram) sao do Valmer: bp§17 diz "dados personalizaveis por facilitador" e
nao ha campo para isso (C33).

## 4. Tabelas estaticas que a onda precisa (`TAB:`)

| Tabela | Chave | Pagina | Status |
|---|---|---|---|
| `arquetipos` | par de fatores (12) | 07, 26 | bp§10 completo; perfil puro e EQUILIBRADO **PENDENTE** |
| `descritores` | fator x zona (4 x 6) | 09-12 | bp§09 completo |
| `fatores` | fator: subtitulo, 6 linhas do `.kv`, motivador | 09-12, 16 | molde completo |
| `relacionamento` | fator mais alto | 14 | **PENDENTE** |
| `espectro` | 7 pares com fator de origem | 14 | molde; regra de posicao **PENDENTE** |
| `tensoes` | fator: 6 itens, como aparece, risco | 15 | molde D e I; S e C **PENDENTE** |
| `gatilhos` | fator x (principal, complementar) | 16 | molde 2 de 8 |
| `polos` | 6 polos: definicao, 4 itens, aplicacao, frase curta | 18-20, 26 | molde definicao e itens; aplicacao so E N T; frase curta **PENDENTE** |
| `funcaoInferior` | N S T F | 22 | molde so Sensacao |
| `valores` | 6: nome exibido, subtitulo, representa, aparece, risco, frase curta | 24-26 | molde POL e ECO |
| `estilosLideranca` | 4 estilos | 29 | **PENDENTE** |
| `competencias` | 16: nome, descricao | 31-32 | molde 12; 4 novas **PENDENTE** (T4) |
| `atrito` | fator do avaliado x fator liderado | 39-40 | molde 4 de 16 |

## 5. Conflitos entre o molde e a v2.2

| # | Onde | Conflito | Encaminhamento |
|---|---|---|---|
| C01 | 06, 09-12, 27, 29 | Regua de 5 faixas (Discreto 0-20 ... Dominante 81-100) e ticks 0/25/50/75/100 (redesign: 0/20/.../100) | D4: 6 zonas, ticks 0/16/33/51/70/88/100, rotulos de `rotuloZona()`. Some a ambiguidade "Dominante" (faixa) x DOMINANTE (fator) |
| C02 | 06 | "LINHA DE PREDOMINANCIA" em 50 | Predominante e >= 51 (AGENTE 5.4, motor): linha em 51 |
| C03 | todas com numero | Molde so tem inteiros; v2.2 tem uma casa (62,5) | Mostrar decimal com virgula; conferir largura dos circulos r=31 da 06 e dos `.num` de 17mm da 07 |
| C04 | 06 | O redesign fala em "pagina 07" (numeracao do PDF v3); no molde de 42 e a 06. O SVG do molde ainda e o anterior ao redesign | Seguir o redesign (layout) com C01/C02 |
| C05 | 06 | "Leitura rapida" e pessoal e nao tem chave de IA | Frase-molde derivada dos fatores que sobem e descem (substantivo fixo por fator) ou nova chave: decidir com a frente da IA |
| C06 | 07 | Arquetipo (D5) nao tem lugar no molde; bp§10 nao tem texto para perfil puro nem EQUILIBRADO | Cartao na coluna direita; textos **PENDENTE Valmer** |
| C07 | 07 | `quatro_cruzamentos` tem chaves fixas `alto_d_baixo_s`, `alto_d_baixo_c`, `alto_i_baixo_s`, `alto_i_baixo_c` (o exemplo do relatorio de referencia, perfil DI), tambem em `narrativa-esquema.ts` | Para outro perfil os pares mudam: a frente da IA precisa de chaves por posicao (`alto1_baixo1` ...) ou de rotulos no objeto |
| C08 | 06, 07 | Textos supoem perfil duplo ("Dois fatores acima de 50") | Variantes: duplo, puro, EQUILIBRADO; limiar 51 |
| C09 | 08, 27 | Molde: indice 42 = "Adaptacao alta"; v2.2: 42 > 35 = extremamente alta. Nota das faixas em inteiros (ate 10; 11 a 20; ...) | Frase pela `classe` do motor; nota: "ate 10 · ate 20 · ate 25 · ate 35 · acima de 35" |
| C10 | 08, 27 | Frase qualitativa da amplitude ("contorno muito nitido") sem faixas na v2.2 | So o numero e a definicao ate o Valmer dar faixas |
| C11 | 08 | "A faixa entre 32 e 69 e a zona de flexibilidade" | Polarizado e <= 32 e >= 70: "acima de 32 e abaixo de 70" |
| C12 | 09-12 | Molde lista 7-8 adjetivos livres; bp§09 da 4 por fator e zona e pede marca visual em EA/EB | `TAB:descritores` |
| C13 | 09-12 | "Aplicacao no trabalho" e pessoal, sem chave | 3o paragrafo de `fator_X_narrativa` (R1) |
| C14 | 13 | nenhum | `seis_forcas[].fator` ja vem no formato do rotulo |
| C15 | 14 | Cartoes, nota e posicoes do espectro sem fonte na v2.2 | **PENDENTE Valmer**: textos por fator mais alto; proposta de posicao: escore do fator de origem (polo alto a esquerda) |
| C16 | 15 | Listas de tensao so para D e I | **PENDENTE Valmer** (bp§08 "Medos" como base) |
| C17 | 16 | Textos so para D principal e I complementar; "confirma e reforca" pede tabela fator x valor que nao existe | **PENDENTE Valmer** |
| C18 | 18-20 | "Aplicacao no trabalho" so para E, N, T | **PENDENTE Valmer** para I, S, F |
| C19 | 21 | Molde: dominante = maior escore do par, funcoes sem atitude. v2.2: dominante = eixo mais claro (`|%-50|`, empate percepcao), cada funcao com atitude ("Pensamento Extrovertido") | Nomes de `R.jung.hierarquia`; reescrever o cartao "Como a ordem e determinada" pela bp§12 |
| C20 | 22 | Textos escritos para Sensacao inferior; "Por que a adaptacao atual custa tanto" sem regra | `TAB:funcaoInferior`, 3 **PENDENTE**; retirar o bloco condicional |
| C21 | 23, 24 | Faixas "66 a 100 / 31 a 65 / 1 a 30" e tracejadas em 30 e 65 | v2.2: >= 66, 31 a 65,9, <= 30,9 (0 existe); tracejadas em 31 e 66 |
| C22 | 24, 27 | "REGULATORIO" | D8: "Principios" via `nomeValor('PRI')` |
| C23 | 25 | Textos por valor so para POL e ECO | **PENDENTE Valmer** |
| C24 | 26 | Quatro blocos de texto para uma chave (`leitura_integrada`) | R1 |
| C25 | 27 | Lideranca pelos escores dos fatores; "Detalhes nas paginas 31 e 32" aponta errado | D6; trocar por "pagina 08" |
| C26 | 29 | D6 troca fator por estilo: definicoes, linhas "Em 89", sintese e alerta do adaptado nao tem fonte | Definicoes **PENDENTE Valmer**; retirar sintese e alerta ou pedir chave nova |
| C27 | 30 | Texto diz que competencia = fator + ajuste e que as 4 de um fator andam juntas | Falso na v2.2 (4 adjetivos cada). Rascunho: "Cada competencia e medida por quatro das 64 palavras do inventario, nas duas condicoes. Por isso duas competencias do mesmo fator podem se mover de forma diferente entre o natural e o adaptado." **rascunho, aprovacao do Valmer** |
| C28 | 31 | Radar do molde tem Persistencia, Planejamento, Prudencia | D7: Cooperacao, Analise, Investigacao entram; sem Assertividade, Sociabilidade, Constancia, Detalhismo |
| C29 | 32 | Nomes antigos em S e C, sem descricao para os novos | D7 + T4 **PENDENTE Valmer** |
| C30 | 34 | PDI (6 campos) no lugar de um cartao de meia largura | Cartao de largura inteira; conferir o encaixe (ver R2) |
| C31 | 36, 37, 39, 40 | Notas e atritos escritos para um avaliado D alto | Variantes por `ORD` **PENDENTE Valmer** |
| C32 | 41 | Molde tem 4 paragrafos fixos; bp pede `mensagem_final` como unico texto; D5 poe as leituras aqui | Mensagem + leituras + `.dark`; **PENDENTE Valmer** (D5) |
| C33 | 42 | Canais do Valmer fixos; bp: personalizaveis por facilitador | Campo de canais no facilitador (frente do banco) ou manter fixo |
| C34 | 01, 02 | Sem codigo na capa; indice diz "MC 3.0" | Codigo do assessment; `R.versao_instrumento` |
| C35 | 02, 08, 21, 32 | Indice e referencias cruzadas ("pagina 33", "pagina 22") apontam para paginas que o nivel S1/S2 corta (D9) | Indice filtrado; referencia a pagina fora do nivel sai do texto |
| C36 | todas | Rotulo do fator no molde e o adjetivo (DOMINANTE); D8 fixa o substantivo "Dominancia" (T3) | Constante com as duas formas: `{sigla, nome, rotulo}` |
| C37 | 07, 15, 16, 36-40 | Precisam da ordem completa dos fatores; o contrato so tem `perfil` (2 letras) e o desempate por "mais vezes em 1o" nao e recuperavel | Guardar `disc.natural.ordem` no resultado (frente do motor/banco) |
| C38 | 37, 40 | Molde diz "Emocional e ponderada" (37) e "Emocional e demorada" (40) para S; idem C | Inconsistencia do proprio molde: **Valmer escolhe** |
| C39 | todas | `.zw` so amplia (zoom 1 a 1,3), nunca reduz: texto de IA maior que o espaco some por `overflow:hidden` | R2 |
| C40 | 01 | Nome em `nowrap` com 66mm | Reduzir a fonte do nome como o `h1` (ou quebrar em duas linhas) |
| C41 | — | bp§10 fala "acima de 50" para o arquetipo; motor usa >= 51 | Vale o motor (R3 do AGENTE) |

## 6. Recomendacoes para a proxima onda

- **R1 · Paragrafos da IA.** Onde o molde tem varios blocos para uma chave (07, 08, 09-12, 25, 26), a frente da IA pede os paragrafos separados por `\n\n`, na ordem dos blocos. Nao muda chave nem esquema (D10); o componente faz `split('\n\n')`. Sobrou paragrafo: vai para o ultimo bloco; faltou: o bloco some.
- **R2 · Encaixe.** `ajustarPaginas` so amplia. Testar cada pagina com a IA no teto de palavras e marcar como erro quando `.zw` tiver `data-zoom="1.000"` e `scrollHeight > clientHeight`.
- **R3 · Dados que faltam no contrato.** `disc.natural.ordem` (C37), lideranca do adaptado se o alerta da 29 ficar (C26), canais do facilitador (C33).
- **R4 · Ids de `<pattern>`.** Gerar com `useId()`: `u2D`, `u3`... sao globais do documento.
- **R5 · Confiabilidade.** `R.validade` nao tem pagina no molde; AGENTE secao 6 diz que ela aparece para o facilitador. Nao entra no PDF.

## 7. Ativos desta onda (para quem vai usar)

- Fontes em `perfila/public/relatorio-mc/fontes/` (subconjunto Latin-1 completo, ~230 glifos): OS = Open Sans 400/600/700/800, AR = Archivo 600/700/800/900, CZ = Cinzel 600/700/800, GA = EB Garamond 400/500/600, MS = Montserrat 500/600/700/800 (embutida, nenhum estilo usa). Caractere fora do Latin-1 cai na fonte reserva.
- Imagens em `perfila/public/relatorio-mc/imagens/`: `capa.png` (1054x1492, fundo da 01 com o titulo), `marston.jpg` (retrato, 04), `brasao-impacto-academy.png` (135x165, 42).
- CSS escopado em `.mc31`, `@page mc31`; os estilos inline das paginas continuam usando `font-family:AR` etc.
- `ajustarPaginas(raiz)` em `perfila/src/components/relatorio-mc/ajuste-de-pagina.ts`.
- Conferido: as 42 paginas extraidas, com o CSS escopado e o `globals.css` do app, renderizam igual ao molde (Chrome/puppeteer, diferenca maxima de 76 pixels de antialias numa pagina A4) e o zoom de cada `.zw` sai identico.
- Gerar de novo: `PYTHONUTF8=1 python contexto/extraido/mc-3.1-paginas/extrair.py` (so biblioteca padrao; os nomes das familias foram lidos uma vez com `fonttools` + `brotli`).
