# Regras de Negocio do Cliente

## Como Usar Este Documento

Este arquivo e o registro oficial de TODAS as regras de negocio definidas pelo cliente.
Toda vez que uma regra nova for definida, ela DEVE ser adicionada aqui.
Agentes IA devem consultar este arquivo antes de implementar qualquer logica.

## Formato de Registro

Cada regra segue este formato:

```
### RN-[NUMERO] - [Titulo da Regra]
- **Definida por**: [Nome do cliente/stakeholder]
- **Data**: [YYYY-MM-DD]
- **Modulo**: [Qual parte do sistema]
- **Descricao**: [O que acontece]
- **Comportamento esperado**: [Como o sistema deve reagir]
- **Impacto se descumprida**: [O que da errado se nao seguir]
```

---

## Regras Globais (aplicam a todos os projetos)

### RN-001 - Exclusao Sempre Logica
- **Definida por**: Lucas Dettenborn
- **Data**: 2026-05-15
- **Modulo**: Todos
- **Descricao**: Nenhum registro pode ser excluido fisicamente do banco de dados
- **Comportamento esperado**: Ao excluir, marcar `is_deleted = true` e `deleted_at = now()`. Registro permanece no banco
- **Impacto se descumprida**: Perda de dados, impossibilidade de auditoria, cliente diz que "sumiu coisa"

### RN-002 - Rastreabilidade de Acoes
- **Definida por**: Lucas Dettenborn
- **Data**: 2026-05-15
- **Modulo**: Todos
- **Descricao**: Toda acao de criar, alterar ou excluir deve registrar quem fez e quando
- **Comportamento esperado**: Tabela de auditoria com user_id, acao, timestamp, dados anteriores e novos
- **Impacto se descumprida**: Impossibilidade de identificar origem de problemas

### RN-003 - Validacao Pre-Salvamento com Modal Block
- **Definida por**: Lucas Dettenborn
- **Data**: 2026-05-15
- **Modulo**: Lancamentos, Contratos, qualquer dado financeiro
- **Descricao**: Antes de salvar dados criticos, mostrar modal bloqueante por 3 segundos com resumo da acao
- **Comportamento esperado**: Modal aparece, tela bloqueia 3s, usuario le e confirma ou cancela
- **Impacto se descumprida**: Usuario salva dados errados sem perceber, gerando inconsistencias

### RN-004 - Versionamento de Documentos Gerados
- **Definida por**: Lucas Dettenborn
- **Data**: 2026-05-15
- **Modulo**: Relatorios, PDFs, Demonstrativos
- **Descricao**: Todo documento gerado (PDF, relatorio) deve ter versao incremental
- **Comportamento esperado**: v1, v2, v3... Sempre mostra ultima versao. Historico completo acessivel
- **Impacto se descumprida**: Cliente alega que dados mudaram sem prova do contrario

### RN-005 - Validacao de Categoria por Regex
- **Definida por**: Lucas Dettenborn
- **Data**: 2026-05-15
- **Modulo**: Lancamentos
- **Descricao**: Quando usuario lanca com categoria "Outros", validar por regex se a descricao corresponde a uma categoria existente
- **Comportamento esperado**: Sistema detecta que descricao "IPTU" deveria ser categoria IPTU, nao "Outros". Alerta o usuario
- **Impacto se descumprida**: Lancamentos ficam com categoria errada, relatorios ficam incorretos

---

## Regras Especificas do Projeto: Valmer (Perfila)

<!-- Adicionar regras especificas de cada cliente/projeto abaixo -->
<!-- Exemplo: -->

<!--
### RN-100 - [Titulo]
- **Definida por**: [Cliente]
- **Data**: [YYYY-MM-DD]
- **Modulo**: [Modulo]
- **Descricao**: [Descricao]
- **Comportamento esperado**: [Comportamento]
- **Impacto se descumprida**: [Impacto]
-->

### RN-100 - Assessment Consome Credito na Criacao
- **Definida por**: Valmer Albuquerque (especificacao da plataforma)
- **Data**: 2026-09-02
- **Modulo**: Assessments / Creditos
- **Descricao**: Cada nivel de relatorio custa creditos do facilitador: S1 = 1,
  S2 = 2, S3 = 3, S4 = 4. O debito acontece quando o assessment e criado, que e
  quando o link unico passa a existir, e nao quando o avaliado responde.
- **Comportamento esperado**: A criacao debita o saldo, grava a linha no extrato
  (`creditos_transacoes`) e cria o assessment na mesma transacao, com a linha do
  facilitador travada. Sem saldo, a criacao e recusada e nada e gravado.
- **Impacto se descumprida**: Duas criacoes simultaneas gastam o mesmo credito, ou
  o extrato deixa de explicar o saldo e a conferencia com o parceiro nao fecha.

### RN-101 - Facilitador So Enxerga o Que E Dele
- **Definida por**: Valmer Albuquerque (especificacao da plataforma)
- **Data**: 2026-09-02
- **Modulo**: Assessments
- **Descricao**: O portal do parceiro mostra apenas os assessments daquele
  facilitador. O admin, que e um so, enxerga os de todos os parceiros.
- **Comportamento esperado**: O recorte por dono entra no WHERE de toda funcao de
  `lib/actions/assessments.ts`, nao so na tela. Ler, atualizar e excluir de outro
  facilitador nao encontra o registro.
- **Impacto se descumprida**: Um parceiro ve os avaliados de outro. Sao dados
  comportamentais nominais de terceiros.

### RN-102 - Nivel do Relatorio Nao Muda Depois de Criado
- **Definida por**: Decisao tecnica, a confirmar com o cliente
- **Data**: 2026-09-02
- **Modulo**: Assessments
- **Descricao**: Depois de criado, o assessment nao troca de nivel (S1 a S4),
  porque o credito ja foi consumido. A edicao altera apenas nome e e-mail do
  avaliado. O credito tambem nao volta na exclusao logica, ja que o link pode
  ter sido enviado.
- **Comportamento esperado**: Para mudar de nivel, excluir e criar outro. Estorno
  e ato do admin, pela tela de creditos.
- **Impacto se descumprida**: Troca de nivel sem cobranca vira furo de receita.

### RN-103 - O Token E a Unica Credencial do Respondente
- **Definida por**: Valmer Albuquerque (especificacao da plataforma)
- **Data**: 2026-09-02
- **Modulo**: Assessments / Respondente
- **Descricao**: Quem responde o assessment nao tem cadastro nem login. O link
  `/avaliacao/<token>` e a credencial inteira, e vale por 7 dias. Exigir sessao
  nessa rota trancaria o avaliado para fora do proprio assessment.
- **Comportamento esperado**: Toda query da rota filtra `is_deleted = false` e
  busca pelo token. Token inexistente ou de assessment excluido responde 404,
  sem confirmar nem negar que o convite existe. As linhas gravadas pelo
  respondente sao assinadas com a sentinela do respondente (ver ADR-0002), nunca
  com o id do facilitador.
- **Impacto se descumprida**: Ou o avaliado nao consegue responder, ou a trilha
  de auditoria afirma que o facilitador respondeu o assessment que ele aplicou.

### RN-104 - Progresso Salvo a Cada Resposta, e a Segunda Gravacao E Correcao
- **Definida por**: Valmer Albuquerque (especificacao da plataforma)
- **Data**: 2026-09-02
- **Modulo**: Assessments / Respondente
- **Descricao**: Cada resposta e gravada assim que a pessoa escolhe, para o link
  poder ser fechado e retomado. Responder a mesma questao de novo e uma
  correcao, e nao uma resposta adicional.
- **Comportamento esperado**: Upsert por `(assessment_id, questao_codigo)` no
  indice unico `uq_respostas_assessment_questao`, com `is_deleted` e `deleted_at`
  limpos na correcao. A primeira resposta move a situacao de `pendente` para
  `em_andamento`, por UPDATE condicional. Retomar carrega exatamente as respostas
  gravadas.
- **Impacto se descumprida**: Contadores inflados por respostas duplicadas, ou
  uma questao presa para sempre porque o indice unico ficou ocupado por uma
  linha soft-deletada.

### RN-105 - Conclusao Exige as 28 Respostas e os Contadores Saem do Banco
- **Definida por**: Valmer Albuquerque (especificacao da plataforma)
- **Data**: 2026-09-02
- **Modulo**: Assessments / Respondente
- **Descricao**: O assessment so fecha com as 28 questoes respondidas. Os quatro
  contadores DISC sao contados no servidor, a partir das linhas do banco — nunca
  enviados pelo cliente nem recalculados na tela.
- **Comportamento esperado**: Contagem, checagem das 28 e gravacao de
  `contador_d/i/s/c`, `situacao = 'concluido'` e `concluido_em` acontecem na
  mesma transacao, com a linha do assessment travada. Faltando resposta, a
  recusa e "incompleto" e nada e gravado. Perfil primario, secundario e
  percentuais NAO sao gravados: derivam dos contadores.
- **Impacto se descumprida**: Contadores divergem das respostas, ou um perfil
  gravado passa a discordar do relatorio calculado a partir das mesmas linhas.

### RN-106 - Expiracao E Derivada, e Concluido Tem Precedencia
- **Definida por**: Decisao tecnica, a confirmar com o cliente
- **Data**: 2026-09-02
- **Modulo**: Assessments / Respondente
- **Descricao**: Um link esta expirado quando `expira_em` ja passou ou quando a
  situacao foi marcada como `expirado` a mao pelo admin. A rota nunca grava a
  transicao para `expirado`. Um assessment concluido e tratado como concluido
  mesmo com a data ja vencida.
- **Comportamento esperado**: A leitura verifica, nesta ordem: inexistente,
  concluido, expirado, e so entao libera o questionario. Expirar ou concluir
  enquanto a pessoa responde interrompe a tela com aviso, em vez de aceitar
  respostas para o vazio.
- **Impacto se descumprida**: Quem ja respondeu ve "seu link expirou", ou uma
  segunda fonte de verdade de expiracao passa a divergir de `expira_em`.

### RN-107 - Relatorio So Existe Para Assessment Concluido, e Le a Ultima Versao
- **Definida por**: Especificacao (estrutura do relatorio) + decisao tecnica
- **Data**: 2026-09-03
- **Modulo**: Relatorio
- **Descricao**: `/relatorio/<token>` le a linha do banco pelo mesmo token do
  assessment e so entrega documento quando a situacao e `concluido` E os quatro
  contadores estao gravados. A narrativa vem de `assessments_relatorios`, sempre
  na maior `versao` viva. Enquanto a geracao por IA nao rodou para aquele
  assessment, o documento sai com a narrativa de exemplo.
- **Comportamento esperado**: Token inexistente, assessment nao concluido e
  concluido sem contadores dao 404, os tres indistinguiveis para quem chama.
  Narrativa gravada fora do formato e tratada como ausente: o resto do
  documento continua correto em vez de o relatorio inteiro sumir.
- **Impacto se descumprida**: Um relatorio com percentuais derivados de
  contadores ausentes afirma numeros inventados sobre uma pessoa, assinados
  pela marca do cliente.

### RN-108 - Acesso do Parceiro Sai por E-mail, e Senha Nunca Viaja
- **Definida por**: Decisao do Paulo (e-mail por SMTP) + `docs/seguranca-login.md`
- **Data**: 2026-11-25
- **Modulo**: Facilitadores / Autenticacao
- **Descricao**: O parceiro nasce SEM senha. O cadastro (`facilitadores.criar`)
  e o botao "Reenviar acesso" (`enviarAcessoDoParceiro`) pedem ao Better Auth um
  link de uso unico (`requestPasswordReset`, validade de 48h) que o servidor
  envia por e-mail; o parceiro abre `/definir-senha` e escolhe a propria senha
  (minimo 10). O admin nunca escolhe nem ve a senha de outra pessoa, e nenhuma
  senha trafega por e-mail. `definirSenhaDoParceiro` fica como plano B.
- **Comportamento esperado**: O e-mail e enviado DEPOIS do commit do cadastro.
  Se o SMTP falhar o parceiro continua criado e creditado, e a tela diz
  "Parceiro criado, mas o e-mail nao saiu: <motivo>. Use Reenviar acesso."
  Reenviar recusa nao-admin e parceiro inativo. Sem as variaveis SMTP o envio
  falha com "Envio de e-mail nao configurado" — nunca finge sucesso. A trilha
  registra o evento ("Enviou o acesso por e-mail para X"), sem token.
- **Impacto se descumprida**: Senha escolhida pelo admin nasce conhecida por
  duas pessoas; ou o admin acredita que o parceiro recebeu o acesso com o SMTP
  fora do ar.

### RN-109 - Convite do Mapa por E-mail; Falha de Envio Nao Desfaz Nada
- **Definida por**: Decisao do Paulo
- **Data**: 2026-11-25
- **Modulo**: Assessments
- **Descricao**: Ao criar um mapa (`assessments.criar`, degustacao incluida) e
  ao criar um lote (`criarLote`), o avaliado recebe "Voce foi convidado para
  responder o seu mapa", com o link absoluto `/avaliacao/<token>`, o nome de
  quem convida e a validade. "Reenviar convite" (`reenviarConvite`) manda o
  MESMO link.
- **Comportamento esperado**: O envio e depois do commit. Falha de e-mail nao
  desfaz o mapa nem devolve credito; a resposta avisa que o e-mail nao saiu e
  que da para reenviar ou copiar o link. No lote os e-mails saem um por um, sem
  parar no primeiro erro, e o retorno lista quais falharam. Reenviar recusa mapa
  de outro facilitador (mesmo recorte de `obter`), respondido, vencido ou
  excluido. Trilha em cada envio, sem token.
- **Impacto se descumprida**: Cobranca de credito sem convite entregue e sem
  aviso, ou convite reenviado para um link morto.

### RN-110 - Avisos de Conclusao e de Relatorio Pronto
- **Definida por**: Decisao do Paulo
- **Data**: 2026-11-25
- **Modulo**: Assessments / Relatorio / Configuracoes
- **Descricao**: Quando o avaliado conclui (DISC em `concluir`, MC em
  `finalizarAplicacao`) o facilitador dono recebe "<Nome> concluiu o mapa", se a
  preferencia "Questionario respondido" por e-mail estiver ligada. Quando a
  narrativa e GRAVADA (nao quando so e reaproveitada), o avaliado recebe o link
  `/relatorio/<token>` e o facilitador tambem (mesma preferencia). As
  preferencias moram em `usuarios.preferencias_notificacao`; nula = nunca
  salvou, vale o padrao (e-mail LIGADO para "questionario").
- **Comportamento esperado**: Cada destinatario recebe o relatorio UMA vez por
  mapa (`assessments.relatorio_avaliado_enviado_em` e
  `relatorio_facilitador_enviado_em`, carimbados por UPDATE condicional antes do
  envio). Retry da IA ou "gerar de novo" nao duplicam; se o envio falha o
  carimbo volta a nulo e a proxima geracao tenta de novo. Falha de e-mail nunca
  quebra o fecho nem a geracao.
- **Impacto se descumprida**: Avaliado recebendo o mesmo relatorio varias vezes,
  ou o fecho do questionario falhando por causa de um SMTP fora do ar.
