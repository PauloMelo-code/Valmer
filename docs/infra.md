# Infraestrutura - Servidor, Deploy e Operacao

Como a plataforma fica de pe: o que roda no servidor, em que ordem instalar,
como conferir que deu certo e como desfazer quando nao deu.

Nada aqui roda sozinho. Os scripts em `scripts/infra/` sao para o Paulo executar
na VPS — nenhum agente tem acesso a ela, e nao deve ter.

---

## O servidor

**Uma unica maquina, comprada do zero em 2026-09-08.** A VPS anterior saiu
deste documento inteiro. O que esta abaixo e a maquina nova, lida no hPanel em
2026-09-09.

| Item | Valor | Situacao |
| --- | --- | --- |
| Provedor e plano | Hostinger KVM 8 | confirmado no hPanel |
| Hostname | `srv1965349.hstgr.cloud` | confirmado no hPanel |
| IPv4 | `179.199.148.252` | confirmado no hPanel |
| IPv6 | — | ativo (o UFW criou regra `(v6)`); o endereco em si nao foi anotado |
| SO | Ubuntu 24.04 | **veio com o template do EasyPanel** — ver abaixo |
| Disco | 400 GB | confirmado — 4 GB em uso |
| Trafego | 0 TB de 32 TB | confirmado |
| vCPU | — | **a confirmar** (`nproc`) |
| RAM | — | **a confirmar** (`free -h`) |
| Swap | — | a Etapa 3 cria 4 GB, `swappiness=10` |
| Dominios | `impacto.institutotopcursos.site` e dois sob ele | **provisorios** — ver abaixo |
| Vencimento do plano | — | **confirmar renovacao automatica** |
| Conta do provedor | — | **a confirmar** — ver [Seguranca](#seguranca--decisoes-registradas) |

O IPv4 e o hostname sobrevivem a uma reinstalacao — sao da VM, nao da imagem.

### Os tres dominios

Decisao do Paulo em 2026-09-09, e ele avisou que e **por enquanto**: a base e
`institutotopcursos.site`, que ja existe, e nao um dominio proprio da Impacto.

| Papel | Nome | Registro |
| --- | --- | --- |
| Producao | `impacto.institutotopcursos.site` | A → `179.199.148.252` |
| Homologacao | `hml.impacto.institutotopcursos.site` | A → `179.199.148.252` |
| Painel | `painel.impacto.institutotopcursos.site` | A → `179.199.148.252` |

Os tres sao registro A apontando para o mesmo IP; quem separa e o Traefik, pelo
nome do host. Nivel a mais de subdominio nao atrapalha o certificado: o desafio
HTTP-01 do Let's Encrypt nao liga para profundidade, e nenhum deles precisa de
curinga.

**Trocar de dominio depois nao e so mudar o DNS.** Cada ambiente reemite
certificado, e a `BETTER_AUTH_URL` muda junto — o cookie de sessao e preso ao
dominio, entao todo mundo que estiver logado cai. Enquanto for provisorio,
nenhum link definitivo deve ser impresso em relatorio, e-mail ou material de
venda.

Os tetos de memoria da Etapa 6 assumem 8 vCPU e 32 GB, que e o catalogo da linha
KVM 8. Antes de chegar nela, confirme por SSH e ajuste se vier diferente:

```bash
nproc && free -h && df -h /
```

**A imagem costuma vir sem swap.** Confirme com `free -h`; se vier assim,
a Etapa 3 cria 4 GB de swapfile com `vm.swappiness=10`. O numero baixo e o que
faz a diferenca — o swap fica de reserva para o pico de `next build`, que e
curto e violento, sem virar destino do dia a dia do Postgres. Swap generoso com
swappiness alto num host de banco troca uma morte rapida por lentidao que
ninguem diagnostica; 4 GB com swappiness 10 e o contrario disso.

Mesmo com swap, os tetos por container da Etapa 6 continuam sendo o mecanismo
de isolamento, e nao higiene: com teto, quem estoura e o container e o resto da
maquina sobrevive. E o monitor da Etapa 8 olha memoria disponivel e morte por
OOM no journal do kernel, nao so "esta de pe" — um container morto por OOM e
reiniciado pelo Docker responde ao healthcheck logo depois, e a checagem de
disponibilidade passa sem ninguem ficar sabendo.

### Template simples, de proposito

Na instalacao do sistema, **template puro do Ubuntu, sem painel**. Template que
ja traz painel sobe administracao de servidor exposta na internet antes de
existir Etapa 1 e Etapa 2, e a janela entre uma coisa e outra e justamente a que
este documento fecha. O painel entra na Etapa 4, na ordem.

**A maquina nova nasceu com o template EasyPanel da Hostinger, e por isso e
reinstalada antes da Etapa 1.** Nao e o painel que esta errado — ele e a Etapa
4 e vai voltar. E a ordem: o painel subiu numa maquina sem UFW, com root
aceitando senha por SSH, e a tela inicial do EasyPanel cria a conta de
administrador sem pedir autenticacao nenhuma. Quem achasse o IP naquela janela
virava dono do servidor. Nao da para provar que ninguem achou, e nao ha nada na
maquina que valha a investigacao: 4 GB de disco em uso, nenhum dado. Reinstalar
com Ubuntu 24.04 puro custa minutos e fecha as duas duvidas de uma vez.

Se a maquina vier com qualquer coisa ja rodando, levante o que e antes de
apagar. Na VPS anterior ninguem olhou, e isso fica registrado como o que nao
repetir.

---

## Quatro VPS viraram uma

O `CLAUDE.md` da raiz descreve quatro VPS: frontend e backend separados, HML e
PRD, cada par em maquinas distintas. Foi comprada uma. **Nao vale fingir que a
arquitetura foi cumprida.**

Duas observacoes honestas, e elas puxam para lados diferentes:

**A separacao frontend/backend nunca se aplicou a este produto.** O `perfila/` e
Next.js App Router com Server Components e Server Actions. Nao existe API
separada para morar em outra maquina — a decisao esta no ADR-0001 e o
`CLAUDE.md` confirma ("usar server-side nativo, sem API separada"). Duas das
quatro VPS eram para um backend que este projeto nao tem. O desenho real que
falta nao e 4 -> 1: e **2 -> 1**, uma maquina para HML e outra para PRD.

**A separacao HML/PRD, essa sim, foi perdida de verdade.** O que da para
recuperar dentro de uma maquina, e o que nao da, esta no
[ADR-0005](adr/0005-uma-vps-para-hml-e-prd.md). Resumo: processo, usuario de
banco, porta, segredo e volume ficam separados de verdade; kernel, disco, IP e
janela de manutencao sao compartilhados e nao ha como separar.

---
## Desenho — o que roda onde

O EasyPanel (ADR-0006) e dono do proxy, do TLS e do build. O que esta fora dele
— acesso, firewall, backup e monitoramento — continua sendo nosso, de proposito:
se o painel cair, essas quatro coisas precisam continuar de pe.

```
                          internet
                             |
                        [ UFW ] SSH, 80, 443 — o resto fechado
                             |
                    [ Traefik do EasyPanel ]  TLS, roteamento por dominio
                    /            |            \
       painel.perfila     hml.perfila       app.perfila
       (2a autenticacao)   projeto hml       projeto prd
                                |                 |
                          app + postgres    app + postgres
                          (containers)      (containers)

     fora do painel:  01/02 acesso e firewall · backup.sh · restore.sh
                      monitor.sh · timers do systemd
```

Nada alem do Traefik escuta em interface publica. O Postgres nunca — e isso
precisa ser CONFERIDO depois de criar cada servico, e nao presumido.

```
/srv/valmer/
  bin/                       scripts de operacao (os timers chamam daqui)
  monitor.env                HEARTBEAT_URL e o que checar (0600)
  <amb>/
    env/backup.env           DATABASE_URL e destino off-site (0600)
    backups/                 dumps diarios + semanal/
```

As variaveis da aplicacao vivem no painel. O `backup.env` existe porque os
scripts de backup rodam fora dele e precisam da string de conexao — e a unica
duplicata, e ela e deliberada.

Usuarios: `paulo` (sudo, administra) e `deploy` (sem sudo). Root nao entra por
SSH. O painel tem conta propria, que **nao** e a do sistema.

## Ordem de instalacao

### Onde estamos — 2026-09-09

| Etapa | Estado |
| --- | --- |
| 0 — Reinstalar | **feita**. Ubuntu 24.04 puro no lugar do template EasyPanel; IP e hostname mantidos |
| 1 — Acesso | **feita**. `paulo` (sudo, senha local) e `deploy`, fail2ban na 22, sshd em v4 e v6, e `sshd -T` devolvendo `passwordauthentication no` e `permitrootlogin no` — depois do conserto do prefixo, ver a nota do `10-valmer.conf` abaixo |
| 2 — Firewall | **feita**. UFW `deny incoming`, so 22 (`limit`), 80 e 443, em v4 e v6 |
| 3 — Runtime | **feita**. Docker 29.8.0, unattended-upgrades com reboot as 04:00, swap de 4 GB |
| 4 — EasyPanel | **feita**. Painel em `painel.impacto.institutotopcursos.site` com certificado valido. Duas pontas em aberto: o "Servir no endereco IP" continua ligado, e a 3000 segue publica (pendencia 9a) |
| 5 — Proteger o painel | **nao feita** |
| 6 — Ambientes | **HML feita**, em `hml.impacto.institutotopcursos.site`: app do `/perfila` na `develop`, Postgres interno sem porta publica, migracoes aplicadas e seed rodado. Falta validar o login, e falta o PRD, que espera o merge |
| 7 e 8 | **nao feitas** |

A Etapa 4 e a proxima, e ela depende de um subdominio apontado para o IP: o
painel emite o proprio certificado e nunca deve ser acessado por IP.

A porta fica em 22, nao em 2222 — ver a nota na Etapa 1.

Dois grupos, e os dois sao decisao, nao descuido: `paulo` esta em `adm` para ler
o journal sem elevar (diagnostico que exige `sudo` faz todo mundo usar `sudo`
para tudo), e **nao** esta em `docker`, porque quem esta nesse grupo tem root na
maquina sem senha e o `sudo` com senha viraria enfeite. Docker pelo `paulo` e
com `sudo docker`. So o `deploy` entra no grupo, e so porque sobe o Postgres.

### Etapa 1 — Acesso  *(obrigatoria agora)*

Trava tudo o mais: sem entrar na maquina com seguranca, o resto nao comeca.

```bash
ADMIN_USER=paulo SSH_PORT=22 bash 01-acesso.sh
```

Cria `paulo` (sudo) e `deploy` (sem sudo), desliga senha, tira o login direto de
root, instala o fail2ban.

**Sobre a porta — e um caso que ficou sem causa confirmada.** A Etapa 1 rodou
primeiro com `SSH_PORT=2222`, e de fora a conexao falhava. Voltando para 22
funcionou de primeira. O que ficou provado:

- de fora, IPv4 na 2222: `timed out`;
- **de dentro da maquina para o proprio IP publico, IPv4 na 2222:
  `Connection refused`**;
- o `ss` mostrava `LISTEN ... [::]:2222`, com o socket na mao do systemd;
- o UFW estava inativo no primeiro teste, entao nao era ele.

`refused` e resposta, `timed out` e silencio. Refused prova que o pacote chegou
na pilha TCP e ninguem aceitou — elimina firewall e joga a culpa para dentro.
**Esse teste de dentro para o proprio IP publico custa um comando e separa as
duas causas; e o primeiro a fazer da proxima vez.**

O que **nao** ficou provado e o mecanismo. A hipotese principal e socket
so-IPv6 (`ListenStream=2222` sozinho depende de `net.ipv6.bindv6only=0`), mas um
socket dual-stack aparece no `ss` com a mesma cara — so a linha `[::]` — entao a
ausencia de `0.0.0.0` nao prova nada. Suspeito secundario: o script dava
`systemctl restart ssh.socket` e logo em seguida `systemctl restart ssh`,
misturando ativacao por socket com daemon autonomo. Nenhum dos dois foi
confirmado, e fica registrado como em aberto em vez de virar explicacao bonita.

Duas mudancas no script, e a segunda vale mais que a primeira:

1. o override declara `0.0.0.0:$SSH_PORT` e `[::]:$SSH_PORT` explicitamente,
   sem depender de padrao de kernel;
2. no fim, o script **falha** se o `ss` nao mostrar a porta nas duas familias.
   Diagnostico incerto se resolve com verificacao, nao com teoria: qualquer que
   fosse a causa, essa checagem teria parado o script com a sessao antiga ainda
   aberta, em vez de deixar descobrir de fora.

Ele tambem sabe voltar: rodar com `SSH_PORT=22` remove o override, coisa que
antes nao fazia — nao havia caminho de volta pelo proprio script.

O script pede uma **senha local** para `paulo` se ele ainda nao tiver. Ela nao
serve para entrar por SSH e nunca vai servir: e para o `sudo`, que pede senha
local. Sao coisas separadas, e trata-las como uma quebra o usuario — criado sem
senha e no grupo `sudo`, o administrador fica com `sudo` inutilizavel, negando
tres vezes uma senha que nao existe. Chave para entrar, senha para elevar.

O script **nao desliga a senha do SSH** enquanto `paulo` nao tiver uma chave publica —
ficar do lado de fora da propria maquina e o jeito mais comum de estragar este
passo. Se ele avisar que falta chave, rode da sua maquina e repita a etapa:

```bash
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<ip> "mkdir -p ~/.ssh; chmod 700 ~/.ssh; cat >> ~/.ssh/authorized_keys; sort -u -o ~/.ssh/authorized_keys ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys"
```

O `ssh-copy-id` nao existe no OpenSSH do Windows; a linha acima e o equivalente,
e o `sort -u` no meio e o que a torna repetivel sem duplicar a chave.

No Ubuntu 24.04 o sshd sobe por socket activation: mudar `Port` no
`sshd_config` nao tem efeito nenhum. O script escreve um override em
`ssh.socket`, que e o que funciona.

**O arquivo do sshd chama `10-valmer.conf`, e o numero e a correcao de um bug
real.** Ele era `99-valmer.conf`. O sshd usa o **primeiro** valor de cada
palavra-chave, e o `Include` do `sshd_config` le `sshd_config.d/*.conf` em
ordem alfabetica. A imagem vem com `50-cloud-init.conf`, que traz
`PasswordAuthentication yes`. Com o nosso em 99 ele era lido depois e perdia:
o script imprimia "senha desligada" e o SSH continuava aceitando senha. Foi
assim em 2026-09-09, e so apareceu porque o teste de login foi feito de dentro
da propria maquina, onde o cliente nao tinha chave e caiu na senha.

Duas mudancas, e a segunda vale mais que a primeira:

1. o arquivo passou a ser `10-valmer.conf`, lido antes de qualquer coisa que a
   imagem traga, e o `99-valmer.conf` antigo e removido se existir. Nesta
   maquina o conserto foi um `mv` do 99 para o 10, com o conteudo intacto: o
   texto do arquivo sempre esteve certo, so era lido tarde demais;
2. no fim, o script le `sshd -T` — a configuracao **efetiva**, ja resolvida
   entre todos os includes — e **falha** se `passwordauthentication` ou
   `permitrootlogin` nao estiverem em `no`. Arquivo escrito nao e arquivo
   valendo, e a diferenca entre os dois foi exatamente o buraco.

- **Conferir**: de um terminal NOVO **e de fora da maquina**, `ssh paulo@<ip>`
  entra **sem pedir senha**; `ssh root@<ip>` e recusado;
  `sudo fail2ban-client status sshd` responde. Se pedir senha, a etapa nao
  terminou, por mais que o script diga que sim.
  **So feche a sessao antiga depois disso.**
- **Desfazer**: `rm /etc/ssh/sshd_config.d/10-valmer.conf` e
  `rm -rf /etc/systemd/system/ssh.socket.d`, depois
  `systemctl daemon-reload && systemctl restart ssh.socket ssh`.

### Etapa 2 — Firewall  *(obrigatoria agora)*

```bash
sudo bash 02-firewall.sh
```

Nega tudo que entra, libera 80, 443 e a porta do SSH (com `limit`). A porta e
lida do que a Etapa 1 configurou, e nao de uma segunda copia da verdade.

O Docker escreve direto no iptables: uma porta publicada como `-p 5432:5432`
**fura o UFW**. Por isso todo compose deste projeto publica como
`127.0.0.1:PORTA:5432`. Se alguem trocar, o banco vai para a internet com o
firewall fechado e nada avisa.

**Isso deixou de ser teoria em 2026-09-09.** O EasyPanel publica a porta 3000
como servico do Swarm, e ela ficou servindo a tela de login do painel, em texto
claro, com o UFW dizendo `deny (incoming)` e so 22, 80 e 443 liberadas. Medido
de fora: `http://<ip>:3000` respondeu 200.

E **nao adianta consertar por iptables aqui**. Tentamos, e nesta maquina a
cadeia `DOCKER-INGRESS` nao existe na tabela filter e o binario devolve
`Incompatible with this kernel` — o Ubuntu 24.04 usa nftables por baixo, e as
regras do Swarm nao estao onde a receita comum manda procurar. Alem disso, regra
escrita a mao nao sobrevive ao reboot que o unattended-upgrades faz as 04:00.

**Quem fecha porta publicada por Docker e o firewall da borda, no provedor.** Ele
esta antes da maquina, entao o Docker nao tem como furar, e ele persiste sozinho.
E a mesma regra da Etapa 2, so que do lado de fora: aceitar 22, 80 e 443, negar o
resto. A alternativa, se a borda nao servir, e tirar a porta do servico com
`sudo docker service update --publish-rm 3000 easypanel` — mas ai o painel perde
o caminho de emergencia por IP, e quem sobra e o SSH.

A maquina tem **IPv6 publico** — confirme o endereco no painel antes de rodar
esta etapa. Um firewall que fecha
so o IPv4 nao fecha nada: a porta v6 continua aberta e o `ufw status` nao
denuncia. O script forca `IPV6=yes` e **falha** se nao aparecer regra `(v6)` no
fim — melhor parar do que dar por fechado o que esta aberto.

- **Conferir**: `sudo ufw status verbose` mostra `deny (incoming)` e so as tres
  portas, cada uma duas vezes (v4 e v6). De fora: `nmap <ip>` nao mostra 5432,
  e `nmap -6 <ipv6>` tambem nao.
- **Desfazer**: `sudo ufw disable`.

### Etapa 3 — Runtime  *(obrigatoria agora)*

```bash
sudo bash 03-runtime.sh
```

Patch de seguranca automatico (com reboot as 04:00), Docker,
`postgresql-client-16` (o `pg_dump` roda no host) e 4 GB de swap.

Node, Nginx e Certbot **nao** entram aqui: no caminho do painel quem faz proxy e
TLS e o Traefik, e um Nginx ocupando 80 e 443 impede o painel de subir. Quem for
pelo Anexo os instala com o `04-ambiente.sh`.

O `deploy` entra no grupo `docker` para subir e descer o Postgres. Grupo docker
equivale a root na maquina — e uma concessao consciente: sem ela, cada operacao
de banco precisaria de sudo, e a chave que o CI usa passaria a ter caminho para
sudo. O risco fica contido pelo que o `deploy` **nao** tem: shell interativo
comum, senha e acesso a `/etc/sudoers.d` alem da linha dos servicos.

- **Conferir**: `sudo docker ps`, `free -h` (swap 4G),
  `systemctl status unattended-upgrades`. E `sudo docker`, com sudo: o `paulo`
  nao esta no grupo `docker` de proposito, entao `docker ps` cru responde
  `permission denied` — isso e a decisao funcionando, nao a etapa falhando.
- **Desfazer**: `sudo apt-get remove --purge docker-ce` e
  `sudo swapoff /swapfile`.
### Etapa 4 — EasyPanel  *(obrigatoria)*

O painel instala o proprio Docker, sobe o Traefik e assume 80 e 443. Por isso o
03 nao instala mais Nginx: os dois brigam pela mesma porta.

O DNS ja tem que estar apontando antes de rodar: sem nome resolvendo, o painel
nao emite certificado e a unica porta de entrada e o IP.

```bash
curl -sSL https://get.easypanel.io | sudo sh
```

**A instalacao abre uma janela, e ela e a mesma que fez esta maquina ser
reinstalada.** O primeiro acesso ao painel e por `http://<ip>:3000`, e essa tela
cria a conta de administrador **sem pedir autenticacao nenhuma**: quem chegar
nela primeiro vira dono do servidor. E o UFW nao protege essa porta — o painel
publica a 3000 pelo Docker, que escreve direto no iptables e passa por cima do
firewall, exatamente como a nota do Postgres na Etapa 2 avisa.

Entao a ordem importa e nao ha intervalo confortavel:

1. rodar o instalador;
2. conferir onde a 3000 esta escutando: `sudo ss -ltnp | grep 3000`. Se aparecer
   `0.0.0.0:3000`, ela esta na internet **agora**;
3. abrir `http://<ip>:3000` e criar a conta de administrador na hora, com senha
   longa e unica. Isso fecha a tela aberta;
4. dentro do painel, configurar o dominio
   `painel.impacto.institutotopcursos.site` para ele emitir o proprio
   certificado;
5. confirmar que o HTTPS responde e que o IP nao serve mais o painel.

Quem quiser fechar a janela por completo faz o passo 3 por tunel, sem expor a
3000 a ninguem: `ssh -L 3000:localhost:3000 paulo@<ip>` e depois
`http://localhost:3000` no navegador da propria maquina.

**O webhook de deploy vai no dominio, nunca no IP.** O painel oferece a URL de
implantacao na forma `http://<ip>:3000/api/deploy/<token>`, e ela tem dois
defeitos no mesmo endereco: o token trafega em texto claro, e o dia em que a
3000 fechar (pendencia 9a) o webhook morre calado — a publicacao simplesmente
para de disparar e ninguem percebe ate procurar. Use
`https://painel.impacto.institutotopcursos.site/api/deploy/<token>`. O token e
segredo de verdade: nao entra no git, nao entra em chat, e se sair de casa,
gera-se outro no painel.

- **Conferir**: `sudo docker ps` mostra os containers do painel; `curl -I
  https://painel...` responde 200; acessar pelo IP **nao** deve servir o painel.
- **Desfazer**: `sudo docker rm -f` nos containers do painel e apagar
  `/etc/easypanel`. Feito isso, o caminho manual do Anexo volta a ser possivel.

### Etapa 5 — Proteger o painel  *(obrigatoria, junto com a 4)*

Quem entra no painel controla os dois ambientes e todos os segredos. **A senha
do painel nao pode ser a unica coisa entre a internet e o root da maquina.**

1. Segunda camada antes do painel: Cloudflare Access no subdominio, ou
   restricao por IP. Sem isso, uma senha vazada entrega a plataforma inteira.
2. 2FA no painel, se o produto oferecer — **a verificar na instalacao**.
3. Painel so pelo subdominio, nunca por IP.
4. Atualizar o painel faz parte da rotina: e software exposto na internet.

- **Conferir**: de uma rede nao autorizada, o painel nao deve nem mostrar a tela
  de login. Se mostrar, a camada 1 nao esta valendo.
- **Desfazer**: remover a politica de acesso — e voltar a ter so a senha.

### Etapa 6 — Os dois ambientes no painel  *(HML primeiro)*

Um **projeto** por ambiente: `valmer-hml` e `valmer-prd`. Dentro de cada um,
dois servicos: a aplicacao (do repositorio, pasta `perfila/`) e o Postgres.

Configuracao que nao e opcional:

| Item | HML | PRD |
| --- | --- | --- |
| Branch de deploy | `develop` | `master` |
| Dominio | `hml.impacto.institutotopcursos.site` | `impacto.institutotopcursos.site` |
| Limite de memoria | 4 GB | 8 GB |
| Postgres | servico proprio, **sem porta publicada** | idem |

Variaveis, por ambiente: `DATABASE_URL`, `BETTER_AUTH_SECRET` (um por ambiente,
`openssl rand -base64 32`), `BETTER_AUTH_URL`, `ANTHROPIC_API_KEY` e
`NODE_ENV=production`.

**`SESSAO_DEV_USUARIO_ID` nunca.** Ela entra como qualquer usuario sem senha, e
o unico freio e `NODE_ENV=production`. No painel ela entra com dois cliques —
antes exigia editar um arquivo `0600` por SSH. Nao a crie em ambiente nenhum.

As migracoes (`npm run db:migrate`) precisam rodar no deploy, e o lugar delas e
o **start command**, nunca o build: no build o Postgres nao esta alcancavel. O
comando do servico e `npm run db:migrate && npm run start`. Migracao e
idempotente pelo journal do Drizzle, entao rodar a cada boot e seguro.

Isso deixou de ser teoria em 2026-09-10: o primeiro deploy do HML subiu verde,
com a raiz respondendo 200, e as duas rotas que consultam o banco devolvendo
500. **Deploy verde nao prova banco migrado** — valide sempre por uma rota que
consulta, e nao pela raiz.

- **Conferir**: `https://hml...` responde 200 e o login funciona (o cookie
  `secure` exige TLS valido); `ss -ltnp | grep 5432` **nao** mostra `0.0.0.0`;
  publicar um commit em `develop` atualiza so o HML.
- **Desfazer**: o painel guarda historico de deploy — redeploy do commit
  anterior. **Isso devolve o codigo, nao o banco**; ver a secao de rollback.

### Etapa 6b — MinIO, o armazenamento de arquivo  *(por ambiente)*

Decisao do Paulo em 2026-09-10, e o HML ja esta de pe. Guarda o que nao cabe em
coluna de banco: PDF de relatorio, capa e video de curso, foto de mentor.

| Item | HML |
| --- | --- |
| Imagem | `pgsty/minio:RELEASE.2026-06-18T00-00-00Z`, usuario e senha de registro **vazios** |
| API S3 | `https://valmer-hml-miniohml.5wp0gs.easypanel.host` |
| Bucket | `valmer-hml`, **privado** |
| Prefixos | `relatorios/`, `cursos/capas/`, `cursos/videos/`, `mentores/` |
| Credencial da app | conta de servico com politica so desse bucket — **nunca o root** |

**A imagem nao e a oficial.** A MinIO apagou `minio/minio` do Docker Hub em
2026-09-11, e `quay.io/minio/minio` passou a devolver 401: o servico parou e o
redeploy falhava no pull. Em 2026-09-29 o HML trocou para o fork `pgsty/minio`,
que mantem entrypoint, variaveis `MINIO_*` e o formato de `/data` — os arquivos
existentes voltaram sem migracao. O PRD nasce com a mesma imagem. O fork e
mantido pela comunidade; se ele parar, a saida e outro armazenamento S3
(SeaweedFS, RustFS), mudando so as variaveis da app e copiando o bucket.

Quatro regras, e cada uma existe por um motivo que ja custou caro em algum
projeto:

**O bucket e privado, e nao ha excecao.** O acesso sai por URL assinada de prazo
curto, gerada pela aplicacao DEPOIS de conferir a sessao. Bucket publico entrega
o arquivo a quem tiver o endereco, para sempre, sem login — e um relatorio
carrega nome, e-mail e resultado comportamental de pessoa real. URL assinada
aceita requisicao por faixa, entao video continua permitindo arrastar a barra
de progresso: nao se perde nada sendo privado.

**A aplicacao nao usa o root.** O root administra; quem le e escreve e uma conta
de servico limitada ao bucket. Root em variavel de ambiente de app significa que
qualquer falha que vaze o ambiente entrega o armazenamento inteiro, dos dois
ambientes.

**O banco guarda a CHAVE do objeto, nunca a URL.** `relatorios/k3mq81/v1.pdf`,
e nao o endereco completo. O dominio de hoje e o subdominio padrao do EasyPanel;
no dia em que virar dominio proprio, toda URL gravada quebraria de uma vez. A
URL nasce no clique e morre no prazo.

**O video sai do MinIO direto para o navegador.** Se ele passar pela aplicacao,
o Node vira servidor de streaming e o gargalo deixa de ser o banco e passa a ser
o processo que atende todo o resto.

### Etapa 7 — Backup e restore  *(obrigatoria antes do PRD receber dado real)*

**Atencao: com o MinIO, este passo ficou incompleto.** O `backup.sh` faz dump do
Postgres e mais nada. A partir do momento em que PDF, capa e video vivem em
bucket, metade do produto esta fora do backup, e restaurar so o banco devolve um
sistema com linha apontando para arquivo que nao existe mais. Falta espelhar o
bucket para o mesmo destino off-site — ver a pendencia 13.

Configure o destino off-site antes de ligar o agendamento:

```bash
sudo -u deploy rclone config                       # uma vez, interativo
echo 'BACKUP_REMOTE=<remote>:valmer/prd' | sudo -u deploy tee /srv/valmer/prd/env/backup.env
sudo chmod 600 /srv/valmer/prd/env/backup.env
```

`backup.sh` faz o dump com as flags do `CLAUDE.md`, confere que ele nao esta
vazio (tamanho e cabecalho), copia semanal aos domingos, manda para fora e
aplica a retencao (diario 30 dias, semanal 90). **PRD sem destino off-site
falha de proposito**: backup que nunca saiu do servidor vai junto com o disco.

- **Conferir** — o unico teste que vale e o restore:
  ```bash
  sudo -u deploy bash /srv/valmer/bin/backup.sh prd
  sudo -u deploy bash /srv/valmer/bin/restore.sh hml /srv/valmer/prd/backups/<arquivo>.sql
  ```
  O `restore.sh` para o servico, restaura, conta tabelas e usuarios ativos, e
  sobe de novo. Se o schema voltar incompleto, ele falha. **Repita uma vez por
  mes** — backup sem restore testado e suposicao.
- **Desfazer**: o restore em HML e destrutivo em HML e so em HML. Producao exige
  `CONFIRMA=RESTAURAR-PRD` explicito.

### Etapa 8 — Agendamentos e monitoramento  *(obrigatoria)*

```bash
sudo bash 05-agendamentos.sh
```

Timers do systemd: backup diario 02:00 por ambiente, checagem de saude a cada
10 minutos, e limite de 500 MB no journal (log sem teto enche disco e derruba a
maquina inteira).

O alerta precisa chegar em alguem. Crie um check gratuito no Healthchecks.io e:

```bash
echo 'HEARTBEAT_URL=https://hc-ping.com/<uuid>' | sudo tee /srv/valmer/monitor.env
sudo chmod 600 /srv/valmer/monitor.env
```

`monitor.sh` verifica disco acima de 85%, servico parado, Postgres sem
responder, app sem responder e certificado a menos de 14 dias do vencimento.
Rodada boa manda um ping; rodada ruim manda a lista de problemas para
`/fail`, e o Healthchecks manda e-mail. O ping serve tambem como
dead-man's-switch: **se a maquina morrer inteira, o silencio dispara o
alerta** — que e a unica forma de um monitor que roda na propria maquina avisar
que a maquina caiu.

- **Conferir**: `systemctl list-timers 'valmer-*'`; force uma rodada com
  `sudo systemctl start valmer-monitor.service` e veja o check ficar verde;
  pare o HML de proposito (`sudo systemctl stop valmer-hml`), rode de novo e
  confirme que o e-mail chega.
- **Desfazer**:
  `sudo systemctl disable --now valmer-backup@{hml,prd}.timer valmer-monitor.timer`.

---

## Operacao do dia a dia

| Situacao | Onde |
| --- | --- |
| Publicar em HML | push em `develop` — o painel publica sozinho |
| Publicar em PRD | merge em `master` — **com backup antes**, ver abaixo |
| Voltar a versao anterior | painel: historico de deploy, redeploy do commit anterior |
| Ver log da app, variaveis, containers | painel |
| Backup manual | `bash /srv/valmer/bin/backup.sh prd` |
| Testar o restore | `bash /srv/valmer/bin/restore.sh hml` |
| Estado geral (fora do painel) | `valmer status` |
| Abrir o banco | `valmer db prd` |

O que esta no painel voce aprende em video. O que ficou no SSH e justamente o
que nao pode depender do painel estar de pe.
### Por que ha painel, e o que ele custa

A decisao esta no ADR-0006. O motivo nao e tecnico, e de continuidade: uma
estrutura sob medida so se aprende com quem a escreveu, e a hipotese de trabalho
e que essa pessoa pode nao estar mais no projeto. EasyPanel se aprende por
material publico.

O preco esta pago com olhos abertos, e nao escondido:

- **O painel e root na maquina.** Uma sessao de navegador vazada desfaz a chave
  de SSH, o UFW e o fail2ban de uma vez. E por isso que a Etapa 5 nao e opcional.
- **Deploy deixa de ter uma verdade so.** Mitigado ao amarrar cada projeto a uma
  branch e nao publicar por upload manual.
- **Dependencia de produto.** Por isso o Anexo existe.

**Portainer nao entra.** O EasyPanel ja mostra container, log e variavel; o
Portainer nao acrescenta capacidade e soma mais uma porta com acesso ao Docker.

Backup, restore e monitoramento seguem **fora** do painel, por timer do systemd.
Se o painel cair, o backup continua.

### Rollback — o que ele devolve e o que nao devolve

No painel: historico de deploy, redeploy do commit anterior. E rapido e a
imagem antiga ainda esta la.

**Ele devolve o codigo, nao o banco.** Se o deploy que voce esta desfazendo
rodou migracao, o schema continua o novo e o codigo antigo pode nao entender
mais as tabelas. Nesse caso e preciso o dump anterior ao deploy:

```bash
CONFIRMA=RESTAURAR-PRD bash /srv/valmer/bin/restore.sh prd /srv/valmer/prd/backups/<arquivo>.sql
```

**Regressao que veio junto com o painel, e precisa de disciplina:** o
`deploy.sh` fazia o dump de PRD sozinho, antes de migrar. O painel nao faz. Ate
existir um hook de pre-deploy — **a verificar na instalacao** — a regra do
`CLAUDE.md` ("SEMPRE backup ANTES de deploy em PRD") passa a depender de alguem
lembrar:

```bash
bash /srv/valmer/bin/backup.sh prd      # ANTES de mergear em master
```

Drizzle nao gera migracao reversivel automatica. Enquanto for assim, restore e o
unico rollback de schema que existe aqui. **Ensaie isso em HML antes de
precisar.**

---

## Seguranca — decisoes registradas

**O Postgres nunca sai do localhost.** Publicado como `127.0.0.1:PORTA:5432`,
sem regra de firewall, com usuario e senha proprios por ambiente. Isso e a
mitigacao que o ADR-0004 pede em texto: o token de sessao fica em claro na
tabela `sessoes`, e quem le essa tabela se passa por qualquer sessao viva.
Restringir acesso ao banco e o que segura essa ponta.

**`SESSAO_DEV_USUARIO_ID` nao pode existir no servidor.** A funcao
`sessaoDeDesenvolvimento` (`src/lib/auth/sessao.ts`) entra como qualquer usuario
sem senha, e o unico freio e `NODE_ENV === "production"`. Os dois ambientes
declaram `NODE_ENV=production`, e a variavel nao existe em nenhum deles. Com o
painel ela passou a ser dois cliques em vez de um arquivo `0600` por SSH — o
risco de alguem a criar "so para testar" subiu, e nao desceu.

**Segredos.** As variaveis da aplicacao vivem no painel. A copia da
`DATABASE_URL` em `/srv/valmer/<amb>/env/backup.env` e `0600`, dono `deploy`, e
existe porque o backup roda fora do painel. Nada disso esta no git, passa pelo
GitHub ou vai em `ARG` de Dockerfile — e nao aparece em linha de comando: o
`backup.sh` exporta `PGPASSWORD` em vez de passar a URL como argumento, porque
argumento de processo aparece inteiro num `ps aux` para qualquer usuario da
maquina.

**A string de conexao de producao nao e secret do GitHub.** O backup roda no
proprio servidor. Um dump de producao carrega nome, e-mail e resultado de
assessment de gente real; ele nao passa pela infraestrutura de terceiro nem vira
artifact do Actions.

**Superficie minima, com uma excecao assumida.** So o Traefik do painel escuta
em porta publica: sem FTP, sem banco exposto. A excecao e o proprio painel, que
e administracao de servidor exposta na internet — o ADR-0006 registra o porque,
e a Etapa 5 e o que impede que ele seja a porta mais fraca da casa.

**O painel do provedor e uma via de acesso privilegiada.** Em qual conta a VPS
nova esta, e quem mais entra nela, e pendencia aberta e precisa ser respondida
antes do PRD receber dado real. Quem tem esse painel reinstala a VM, troca a
senha de root pelo console web e apaga snapshot — por cima da chave de SSH, do
UFW e do fail2ban, que sao defesas de dentro da maquina e nao valem contra quem
controla o hipervisor. Nao ha como fechar essa porta daqui, e por isso ela muda
uma prioridade: o backup off-site (Etapa 7) deixa de ser protecao contra falha
de disco e passa a ser a unica coisa que sobra se essa via for usada, por engano
ou nao. Ele nao pode viver no mesmo provedor da VPS.

**Snapshot do provedor nao e backup.** Snapshot mora no mesmo provedor, na mesma
conta, e cai junto com ela; e uma imagem da maquina
inteira, nao um dump restauravel por tabela. Ele e util para desfazer um erro de
sistema no mesmo dia, e e isso. A Etapa 7 continua sendo o backup de verdade.

**Estado de fabrica da maquina** — o que conferir no painel do provedor antes
de comecar. Tudo abaixo e o que as Etapas 1 e 2 existem para corrigir:

| O que | Como costuma vir | Etapa que corrige |
| --- | --- | --- |
| Regras de firewall na borda | nenhuma | 2 (UFW), e criar regra tambem na borda |
| Usuario de SSH | `root`, com senha, e "Reset password" no painel | 1 |
| Backup automatico | desligado | 7 |

O firewall do provedor e uma segunda camada, na borda, antes do pacote chegar
na maquina. Ele nao substitui o UFW da Etapa 2 e nao e substituido por ele: o
UFW cai se alguem errar uma regra de dentro, a borda nao. Enquanto as duas
estiverem em zero, a Etapa 2 e a mais urgente da lista depois da 1.

---

## O que ficou de fora, e quando entra

**Redis / BullMQ.** A fila FIFO do `CLAUDE.md` ainda nao tem consumidor: nao ha
envio de e-mail nem geracao de PDF implementados. Entra junto com o primeiro
job assincrono de verdade — mais um container, `127.0.0.1:6379`, teto de 512 MB.

**Puppeteer / Chromium.** Quando o PDF sair do papel: `apt-get install
chromium-browser` mais as dependencias de fonte, `--no-sandbox` **nao** (rodar
Chromium sem sandbox recebendo HTML gerado a partir de dado de usuario e
entregar execucao de codigo). Reserve 1 GB por instancia e limite a uma de cada
vez, ou o PDF passa a ser o processo que come a memoria do PRD. Isso muda os
tetos da Etapa 4 e deve virar revisao deste documento.

**Segunda VPS.** O gatilho esta no ADR-0005. Em resumo: quando existir cliente
pagante com dado real, PRD vai sozinho para uma maquina propria e HML fica com
esta. Nao e "quando sobrar orcamento", e sim quando a queda deixar de ser
constrangimento e passar a ser prejuizo.

**Metrica e APM.** Fora de escopo agora. O monitor responde "esta de pe?" e nao
"esta rapido?". Prometheus, Grafana e afins entram quando houver volume que
justifique.

---

## Pendencias — dependem do Paulo

Em ordem de urgencia. A lista voltou ao inicio: a VPS e outra.

| # | O que falta | Trava o que |
| --- | --- | --- |
| 0 | **Reinstalar com Ubuntu 24.04 puro**, sem o template EasyPanel | Etapa 1, e tudo depois dela |
| 0a | **Confirmar renovacao automatica do plano** e a data de vencimento | tudo; a maquina some |
| 0d | Em qual conta da Hostinger a VPS esta, e quem mais tem acesso | nada agora; muda a Etapa 7 |
| 0b | Regra de firewall na borda do provedor, alem do UFW da Etapa 2 | nada agora; e a segunda camada |
| 1 | Criar os tres registros A apontando para `179.199.148.252` | Etapas 4 a 6 |
| 2 | Confirmar vCPU e RAM (`nproc && free -h`) e ajustar os tetos da Etapa 6 | Etapa 6 |
| 3 | Chave da Anthropic nas variaveis de cada ambiente, no painel | geracao de narrativa |
| 4 | Destino off-site do backup (`rclone config`) e a `DATABASE_URL` em `backup.env` | Etapa 7 |
| 5 | Check no Healthchecks.io, `HEARTBEAT_URL` e os `CHECK_*` em `monitor.env` | Etapa 8 |
| 9 | Segunda camada de autenticacao na frente do painel (Cloudflare Access ou IP) | Etapa 5 — **sem isso o painel e a porta mais fraca** |
| 9a | **Fechar a 3000 no firewall da Hostinger** (so tres regras de aceitar: 22, 80, 443, e ativar o conjunto NA VPS) | Etapa 5. Adiado em 2026-09-09 por decisao do Paulo, com prazo: fecha **antes** da Etapa 5 e **antes** de dado real em PRD. Enquanto estiver aberta, a segunda camada e encenacao — ela protege o nome, e a 3000 passa por fora |
| 10 | Verificar no painel: 2FA, hook de pre-deploy e onde rodam as migracoes | Etapas 5 e 6, e o backup antes do PRD |
| 6 | Renomear `main` para `master` no GitHub e enviar a `develop` (ver abaixo) | o CI, que dispara nelas |
| 7 | Secrets de SSH no GitHub, por Environment `hml` e `prd` | deploy automatico |
| 8 | Variavel `DEPLOY_HABILITADO=true` nos Environments, quando os ambientes subirem | o job de deploy, que fica parado ate la |
| 11 | Decidir sobre o backup automatico pago do provedor, hoje desligado | nada — e complemento da Etapa 7, nao substituto |
| 13 | **Espelhar o bucket do MinIO para o destino off-site**, junto do dump do Postgres. Hoje a Etapa 7 so cobre o banco, e restaurar so o banco devolve linha apontando para arquivo inexistente | o PRD receber dado real |
| 14 | **Trocar a senha do root do MinIO e criar a conta de servico** do bucket. A senha inicial foi curta e derivada do nome do projeto, e circulou em chat | nada agora; e divida de seguranca aberta |
| 12 | **Devolver o Puppeteer ao container quando o PDF em lote tiver que rodar no servidor.** Ele desceu para devDependencies antes do primeiro deploy: nada que atende requisicao o importa (so o CLI `relatorio:gerar`), e em dependencies ele baixava ~350 MB de Chromium a cada build, num cache fora de `/app` que a imagem final descarta, numa imagem sem as libs do Chrome. Para trazer de volta: subir para `dependencies`, `PUPPETEER_CACHE_DIR=/app/.cache/puppeteer` no ambiente, e um `perfila/nixpacks.toml` com libnss3, libgbm1, libasound2, libatk-bridge2.0-0 e libxkbcommon0 | a remessa de 700 PDF, quando ela rodar de dentro da VPS |

### Branches — o estado hoje e o que falta

Remoto: `develop` (publicada, com todo o trabalho), `master` e `main` — as duas
ultimas no mesmo commit `8e8c98b`, o estado anterior ao app, com `main` ainda
marcada como padrao.

`master` nasceu de um `push origin main:master`, e nao do renomear do GitHub.
Da no mesmo, com uma perda: o renomear cria redirecionamento automatico de links
e PRs antigos, e o push nao. Sem PR aberto, o custo e zero — mas fica registrado
para ninguem procurar um redirecionamento que nao existe.

`master` aponta para o estado anterior ao app de proposito: nada foi validado em
HML ainda, e a primeira publicacao em PRD e o merge `develop -> master` depois
dessa validacao — o fluxo do `CLAUDE.md`, sem atalho.

Falta desfazer a duplicata. `main` e `master` sao a mesma coisa com dois nomes, e
o git nao apaga a branch padrao: e preciso trocar o padrao primeiro, e isso so
existe na interface do GitHub.

1. Settings > General > Default branch > trocar `main` por `master`.
2. Depois, daqui:

```bash
git push origin --delete main
git fetch origin --prune
git branch -D main
git remote set-head origin -a
```

- **Conferir**: `git branch -r` mostra so `origin/develop`, `origin/master` e
  `origin/HEAD -> origin/master`.
- **Desfazer**: `git push origin master:main` recria a branch, e o padrao volta
---

## Anexo — o caminho manual, sem painel

`04-ambiente.sh` e `deploy.sh` montam a estrutura anterior: systemd para a
aplicacao, Nginx para proxy e TLS, Postgres em compose no localhost, deploy por
release com symlink e rollback em segundos.

Eles **nao sao apagados** de proposito. Se o EasyPanel quebrar numa atualizacao,
mudar de licenca ou for descontinuado, esta e uma estrutura que ja funcionava, e
o historico do git prova. Os dois caminhos nao convivem: o Nginx do manual e o
Traefik do painel disputam 80 e 443.

```bash
sudo DOMINIO=hml.impacto.institutotopcursos.site bash 04-ambiente.sh hml
sudo certbot --nginx -d hml.impacto.institutotopcursos.site --agree-tos -m <email> --redirect --hsts
sudo -u deploy bash /srv/valmer/bin/deploy.sh hml develop
```

Nesse caminho o `monitor.env` pode ficar sem os `CHECK_*`: o `monitor.sh` cai
sozinho no padrao de systemd nas portas 3000 e 3001.
