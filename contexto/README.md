# Contexto do projeto

Material de origem que sustenta as decisões tomadas no código. Guardado no
repositório para que qualquer pessoa (ou qualquer ferramenta) que continue o
trabalho não dependa do histórico de uma conversa.

## `referencias/`

| Arquivo | O que é |
| --- | --- |
| `especificacao-plataforma-disc-impacto.html` | **A fonte de verdade.** Especificação completa escrita pelo cliente (Valmer Albuquerque): os 3 tipos de usuário, o fluxo do sistema, as 28 questões do assessment, a fórmula de cálculo do perfil, as tabelas por perfil, a estrutura do relatório, o modelo de dados e a tabela de preços. |
| `relatorio-atual-cis-assessment.pdf` | O relatório de 56 páginas que a plataforma antiga gera hoje. Serve para saber o que existe e o que foi deliberadamente cortado. |
| `relatorio-modelo-febracis.pdf` | O relatório da Febracis, usado pelo cliente como referência de layout. |

### `referencias/mc-inv-2.2/` e `referencias/mc-3.1/` (28/09/2026)

O pacote do Valmer que definiu o inventario MC-INV 2.2 e o relatorio MC 3.1 —
ver `docs/adr/0007-inventario-mc-inv-2-2-e-relatorio-mc-3-1.md`. Em
`mc-inv-2.2/`, a fonte da verdade das contas e `motor_referencia.py`.

`mc-3.1/` existe so na maquina de quem desenvolve: e o relatorio comportamental
real do Valmer (dado pessoal sensivel) e fica fora do git de proposito. Quem
precisar dele pede ao Paulo; nao o recoloque no repositorio.

## `extraido/`

Os mesmos três documentos em texto puro. Existem porque ferramentas e agentes
leem `.txt` sem depender de biblioteca de PDF instalada.

## O que NÃO está aqui

As capturas de tela da plataforma antiga que foram coladas ao longo da conversa
(telas do inventário, do painel do respondente, do cadastro, dos e-mails e as
mensagens de WhatsApp com os pedidos do cliente) chegaram como imagens dentro do
chat, não como arquivos. Não há como exportá-las daqui.

O que elas mostravam está registrado de duas formas, que na prática substituem as
imagens:

- **Como dados tipados** em `perfila/src/data/` — o inventário longo de 30
  ordenações, as 11 áreas do mapa de autoavaliação, os textos das telas.
- **Como decisões escritas** em `CONTINUIDADE.md`, na raiz do repositório.

Se precisar das imagens em si, elas terão de ser reenviadas.

## `../project/` e `../chats/`

O handoff original do Claude Design, anterior a tudo isto: os 22 screenshots da
plataforma antiga (`project/uploads/`), os protótipos em `.dc.html` e a transcrição
da conversa que gerou o design system.
