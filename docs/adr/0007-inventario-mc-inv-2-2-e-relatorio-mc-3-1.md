# ADR-0007: Inventario MC-INV 2.2 e relatorio MC 3.1

- **Status**: Aceito (itens marcados PENDENTE aguardam o Valmer)
- **Data**: 2026-09-28
- **Decisores**: Valmer Albuquerque (metodo e conteudo), Paulo (repositorio)

## Contexto

Em 28/09/2026 o Valmer entregou o pacote que substitui o instrumento e o
relatorio. Esta tudo em `contexto/referencias/`:

| Arquivo | Papel |
|---|---|
| `mc-inv-2.2/motor_referencia.py` | **Fonte da verdade das contas** (regra R3). Onde qualquer documento divergir dele, vale ele. |
| `mc-inv-2.2/inventario.json` | Os itens em dados. Identico ao que o motor gera (conferido). |
| `mc-inv-2.2/AGENTE-INVENTARIO-MC.md` | Especificacao do instrumento: etapas, telas, formulas, validade, contrato de dados, testes de ouro. |
| `mc-inv-2.2/BLUEPRINT-MAPA-COMPORTAMENTAL-v2.2.html` | O produto inteiro: paginas, prompt da IA, pipeline. Texto em `contexto/extraido/`. |
| `mc-3.1/Mapa_Comportamental_MC_3_1_v3_editavel.html` | **O molde visual das 42 paginas**: 42 `<section class="page">`, CSS proprio, fontes embutidas. |
| `mc-3.1/Prompt_Redesign_Pagina_07_MC_3_1.md` | Especificacao do Mapa de Intensidade. |

**Os tres arquivos de `mc-3.1/` NAO estao no repositorio** (decisao de 28/09/2026).
O molde e o relatorio comportamental real do Valmer: perfil de pessoa identificada
e dado pessoal sensivel pela LGPD, a mesma categoria que o consentimento do
inventario promete proteger. Ficam so na maquina de quem desenvolve, junto com as
42 `pagNN.html` extraidas dele, e o `.gitignore` impede que voltem. As paginas ja
viraram componentes; o que o repositorio guarda do molde e o `mapa-de-dados`, sem
os numeros dele, e o `extrair.py`, que regenera as paginas a partir do arquivo local.

O instrumento antigo media um so perfil DISC com quatro contadores. O novo mede
quatro camadas em 69 telas: DISC natural (16 grupos), DISC adaptado (os mesmos
16), tipos de Jung (27 pares) e valores de Spranger (10 grupos).

## Decisoes

**D1 · Stack.** O blueprint descreve Prisma e Tailwind. O projeto e Drizzle e
CSS proprio, e continua assim (ADR-0001, CLAUDE.md). Implementam-se os
*contratos* do blueprint — formulas, JSON da IA, conteudo das paginas — e nao a
tecnologia que ele cita.

**D2 · Motor.** Porte fiel de `motor_referencia.py` para `perfila/src/lib/motor`,
funcao pura, sem banco. So vale se passar nos testes de ouro T1-T8 **e** nos
1.430 casos de paridade gerados da referencia por
`scripts/motor/gerar-fixtures-paridade.py`. Arredondamento: uma casa, meio para
longe do zero.

**D3 · Versionamento (secao 8 do AGENTE).** `assessments.versao_instrumento`.
Mapa novo nasce `MC-INV 2.2`. Mapa antigo continua `LEGADO`, termina no
inventario antigo e abre no relatorio antigo. Nada que ja existe quebra.

**D4 · Uma regua so: 6 zonas.** EA 88-100, MA 70-87,9, A 51-69,9, B 33-50,9,
MB 16-32,9, EB 0-15,9, em todo lugar, inclusive no Mapa de Intensidade.
*Conflito resolvido:* o prompt de redesign e o PDF v3 ainda usam 5 faixas
(Discreto, Moderado, Presente, Marcante, Dominante). O blueprint v2.2 diz que a
regua de 6 "substitui as de 5 e 7 zonas dos documentos anteriores". Vale a v2.2:
e a mais recente e declara precedencia. O **layout** do redesign e mantido.
**PENDENTE Valmer:** confirmar.

**D5 · As 42 paginas seguem o HTML editavel.** Onde o blueprint se contradiz
sobre numeracao, vale o molde:
- O arquetipo do perfil composto (secao 10) vai na pagina 07, *A sua combinacao
  natural*, que e onde o perfil composto e explicado. A secao 10 diz "pagina 23",
  mas a 23 e a Teoria de Valores em todas as outras secoes.
- `pdi` e `leituras_recomendadas` (restauradas do v1.0) nao tem pagina no molde
  de 42: as paginas 35-40 sao comunicacao e lideranca. O PDI entra na pagina 34,
  no lugar do bloco generico "Como acompanhar". As leituras entram na 41, com a
  mensagem final. O relatorio continua com 42 paginas. **PENDENTE Valmer.**

**D6 · Estilos de lideranca (pag. 29)** sao os da v2.2 — executivo, metodico,
motivador, sistematico, em percentual — no lugar das quatro barras de fator do
PDF v3. Os quatro cartoes do molde ficam, ordenados por percentual.

**D7 · Competencias.** 16 medidas por 4 adjetivos. Nomes da v2.2 em S
(Constancia, Cooperacao) e C (Analise, Investigacao). Radar da pag. 31 com 12
(sem Assertividade, Sociabilidade, Constancia, Detalhismo); barras da 32 com 16.
**PENDENTE Valmer (T4):** aprovar os nomes.

**D8 · Nomes pendentes em constante unica.** Valor PRI exibido como
"Principios" (T2); fator D como "Dominancia" (T3). Trocar e mudar uma linha.

**D9 · Niveis.** S1 = pag. 01-16, S2 = 01-28, S3 = 01-36, S4 = 01-42 (blueprint
secao 21). O inventario e sempre completo; o nivel so recorta paginas.

**D10 · IA.** JSON com as chaves da secao 18, modelo `claude-sonnet-5`. O que e
calculo ou tabela nunca passa pela IA (secao 23).
*Revisto em 2026-09-29:* o Valmer pediu o relatorio em menos de 30 s. Medido
com a API real e o caso de demonstracao:

| Configuracao | Tempo | Tokens de saida |
|---|---|---|
| 1 chamada, raciocinio alto (antes) | minutos | ~60 mil |
| 4 partes paralelas, raciocinio alto | 155 s | 60,8 mil |
| 4 partes, raciocinio baixo | 40 s | 9,4 mil |
| 7 partes, raciocinio medio | 44 s | 21 mil |
| 7 partes, baixo, 1 tentativa por vez | 21-23 s limpo, 35-49 s quando uma parte e refeita (~metade) | ~11 mil |
| **7 partes, baixo, 2 tentativas juntas** (adotado) | **22,6 / 25,4 / 26,7 s** | ~11 mil aproveitados |

O raciocinio era 80% do tempo e do custo: cada parte pensava 10 a 16 mil
tokens para escrever ~2 mil. Com raciocinio baixo, ~12% das partes voltavam
fora do pedido (paragrafo a menos, texto curto); refazer depois somava ~17 s.
Com duas tentativas de cada parte correndo juntas vale a primeira dentro do
pedido e a outra e cancelada. Custo estimado abaixo do de antes, mesmo pagando
as duas. Detalhes em `PARTES`, `ESFORCO` e `TENTATIVAS_JUNTAS`
(`lib/relatorio-mc/narrativa-escrita.ts`).

Cada parte recebe o pedido inteiro e o recorte do esquema; chaves de varios
paragrafos vao como lista, um paragrafo por item, e voltam a texto antes de
gravar (o contrato de chaves nao muda). Se uma parte falha de vez, as outras
sao canceladas na hora. A entrada se repete por parte, sem cache entre elas
(chamadas simultaneas nao leem o cache umas das outras). A regra de "no maximo
uma formula antitetica na resposta inteira" vira cota zero por parte.
**Tamanho do texto segue o molde (D5), nao o blueprint.** No HML a pagina 07
saiu cortada: o blueprint pede sintese de 300-400 palavras e cruzamentos sem
limite, e a folha do molde tem ~320 palavras ao todo (medido: coube com 546 a
0,917, cortou com 582). A sintese passou a 200-260 palavras e cada cruzamento a
2-3 frases, ate 50 palavras; a conferencia recusa a tentativa que somar mais de
480 palavras na pagina 07 (`TETO_PAGINA_07`) ou mais de 290 no custo da
adaptacao, pagina 08 (`TETOS`). Apertar a folga de todas as chaves para 120%
foi testado e descartado: com raciocinio baixo, o relatorio ia a ~46 s. Com os
tetos so onde a folha aperta: 24,3 / 22,4 / 25,0 s, nenhuma pagina cortada.
**Custo de qualidade, para o Valmer decidir:** com raciocinio baixo sobraram
~6 deslizes de estilo por relatorio ("em vez de", "neste mapa"), contra ~3 no
alto. Voltar para "medium" e mudar uma linha e custa ~15-20 s.

**D11 · Textos de aprovacao.** Definicoes do botao "?" (T1) e texto de
consentimento LGPD (T5) sao redigidos e marcados como rascunho para aprovacao.

## Consequencias

- Dois fluxos de respondente e dois relatorios convivem enquanto houver mapa
  `LEGADO`. O corte e um `if` na versao, em um lugar so.
- O motor TypeScript e verificavel por qualquer pessoa: mudou o Python, roda o
  gerador de fixtures, o teste de paridade diz se o porte acompanhou.
- Tudo que esta PENDENTE esta isolado em constante ou em dado: a decisao do
  Valmer vira edicao de uma linha, nao refatoracao.
