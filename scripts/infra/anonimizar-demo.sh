#!/usr/bin/env bash
# anonimizar-demo.sh — troca as pessoas REAIS do seed por ficticias, no banco.
#
#   bash anonimizar-demo.sh hml
#   CONFIRMA=ANONIMIZAR-PRD bash anonimizar-demo.sh prd
#
# POR QUE ESTE SCRIPT EXISTE
# --------------------------
# O seed de 2026-09 semeou NOVE pessoas reais, com nome completo, e-mail pessoal
# e telefone: tres facilitadores de demonstracao e cinco avaliados. Entre eles
# Dani Pires, que o Valmer ja tinha mandado tirar da lista de mentores em 10/09
# pelo mesmo motivo. O codigo foi corrigido no commit 25f5959, mas codigo nao
# reescreve linha que ja esta gravada: HML foi semeada antes.
#
# Este script conserta o DADO. Ele e cirurgico de proposito — casa pelo e-mail
# antigo, que e unico por indice — entao nao encosta em nada que o Valmer tenha
# criado testando: cliente que ele cadastrou, curso que ele publicou, turma que
# ele montou. Apagar e re-semear tambem resolveria o vazamento e levaria o
# trabalho dele junto.
#
# E IDEMPOTENTE: casa pelo valor ANTIGO, entao a segunda execucao acha zero
# linhas e nao faz nada. Rodar duas vezes e seguro.
#
# Roda no host, como backup.sh e restore.sh (usa o postgresql-client-16 da
# Etapa 3). Nenhum agente tem acesso a VPS, e nao deve ter — ver docs/infra.md.
set -euo pipefail

AMB="${1:?uso: bash anonimizar-demo.sh <hml|prd>}"
BASE="/srv/valmer/$AMB"
[ -d "$BASE" ] || { echo "erro: $BASE nao existe."; exit 1; }
info() { echo "[anonimizar-$AMB] $*"; }

# Producao NAO deveria ter dado de demonstracao. Se tiver, o vazamento e pior e
# a correcao e mais urgente — mas nao acontece por engano de digitacao.
if [ "$AMB" = "prd" ] && [ "${CONFIRMA:-}" != "ANONIMIZAR-PRD" ]; then
  echo "erro: isto reescreve nome e e-mail de usuario em PRODUCAO." >&2
  echo "      Se e isso mesmo: CONFIRMA=ANONIMIZAR-PRD bash anonimizar-demo.sh prd" >&2
  exit 1
fi

# --- conexao ------------------------------------------------------------------
# Mesma ordem de backup.sh: com EasyPanel as variaveis vivem no painel e nao ha
# app.env no disco, entao backup.env e o caminho; no manual o app.env ja tem
# tudo. A senha vai por variavel de ambiente, nunca na linha de comando.
set -a
[ -f "$BASE/env/app.env" ]    && . "$BASE/env/app.env"
[ -f "$BASE/env/backup.env" ] && . "$BASE/env/backup.env"
set +a
[ -n "${DATABASE_URL:-}" ] || {
  echo "erro: DATABASE_URL nao encontrada em $BASE/env/{app,backup}.env" >&2
  exit 1
}
. "$(dirname "$(readlink -f "$0")")/lib-pg.sh"
pg_conexao "$DATABASE_URL"

# --- rede de seguranca --------------------------------------------------------
# UPDATE em nome e e-mail de usuario nao tem CTRL+Z. O dump sai ANTES, e se ele
# falhar o script para aqui mesmo.
DESTINO="$BASE/backups"
mkdir -p "$DESTINO"
ANTES="$DESTINO/antes-anonimizar_$(date +%d_%m_%Y_%H_%M).sql"
info "dump de seguranca em $ANTES"
pg_dump --no-owner --no-acl --clean --if-exists --file="$ANTES"
grep -q 'PostgreSQL database dump' "$ANTES" || { echo "erro: dump saiu ruim; nao vou seguir." >&2; exit 1; }
info "dump ok ($(du -h "$ANTES" | cut -f1))"

# --- o de-para ----------------------------------------------------------------
# Os mesmos nomes que `src/lib/db/seed.ts` passou a usar, para banco novo e banco
# antigo contarem a mesma historia. `@example.com` e reservado pela IANA: por
# definicao nao resolve, entao homologacao mal configurada nao consegue mandar
# e-mail para ninguem por engano.
SQL=$(cat <<'FIM'
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE mapa_demo (
  email_antigo    text,
  nome_antigo     text,
  primeiro_antigo text,
  nome_novo       text,
  primeiro_novo   text,
  email_novo      text,
  telefone_novo   text
) ON COMMIT DROP;

INSERT INTO mapa_demo VALUES
  -- facilitadores de demonstracao
  ('juliana@rhconsult.com.br',    'Juliana Rocha',            'Juliana',  'Beatriz Nunes',  'Beatriz',  'beatriz.nunes@example.com',   '+55 (11) 90000-0002'),
  ('marcos@grupotavares.com',     'Marcos Tavares',           'Marcos',   'Rogerio Lima',   'Rogerio',  'rogerio.lima@example.com',    '+55 (41) 90000-0003'),
  ('dani@danipires.com.br',       'Dani Pires',               'Dani',     'Carla Menezes',  'Carla',    'carla.menezes@example.com',   '+55 (48) 90000-0004'),
  -- avaliados
  ('contatopaulonvr@gmail.com',   'Paulo V S Melo',           'Paulo',    'Fernanda Lopes', 'Fernanda', 'fernanda.lopes@example.com',   NULL),
  ('elmaiasilva83@gmail.com',     'Elias da Silva Maia',      'Elias',    'Bruno Carvalho', 'Bruno',    'bruno.carvalho@example.com',  NULL),
  ('thaismuniz83@gmail.com',      'Thais da Silva Muniz',     'Thais',    'Camila Ferraz',  'Camila',   'camila.ferraz@example.com',   NULL),
  ('fernandobrambilla@hotmail.com','Fernando Brambilla',      'Fernando', 'Diego Antunes',  'Diego',    'diego.antunes@example.com',   NULL),
  ('vidalantonio6167@gmail.com',  'Antonio Rodrigues Vidal',  'Antonio',  'Eduardo Salles', 'Eduardo',  'eduardo.salles@example.com',  NULL);

-- Quem assina a mudanca na auditoria: o dono da plataforma, que e quem roda
-- isto. Inventar um uuid de sentinela poluiria a trilha com um autor que nao
-- existe em `usuarios`.
CREATE TEMP TABLE quem (id uuid) ON COMMIT DROP;
INSERT INTO quem
SELECT id FROM usuarios WHERE papel = 'admin' AND is_deleted = false
ORDER BY created_at LIMIT 1;

\echo ''
\echo '=== ANTES ==='
SELECT 'usuarios'              AS tabela, count(*) AS linhas FROM usuarios u    JOIN mapa_demo m ON lower(u.email) = lower(m.email_antigo)
UNION ALL SELECT 'assessments',           count(*) FROM assessments a           JOIN mapa_demo m ON lower(a.avaliado_email) = lower(m.email_antigo)
UNION ALL SELECT 'clientes',              count(*) FROM clientes c              JOIN mapa_demo m ON lower(c.email) = lower(m.email_antigo)
UNION ALL SELECT 'contas',                count(*) FROM contas ct               JOIN mapa_demo m ON lower(ct.conta_externa_id) = lower(m.email_antigo)
UNION ALL SELECT 'verificacoes',          count(*) FROM verificacoes v          JOIN mapa_demo m ON lower(v.identificador) = lower(m.email_antigo)
UNION ALL SELECT 'extrato (nome dentro)', count(*) FROM creditos_transacoes t   JOIN mapa_demo m ON t.descricao LIKE '%' || m.nome_antigo || '%'
UNION ALL SELECT 'extrato (Assessment)',  count(*) FROM creditos_transacoes WHERE descricao LIKE 'Assessment %'
UNION ALL SELECT 'narrativas geradas',    count(*) FROM assessments_relatorios r JOIN assessments a ON a.id = r.assessment_id
                                                                                 JOIN mapa_demo m ON lower(a.avaliado_email) = lower(m.email_antigo);

-- A NARRATIVA VEM PRIMEIRO, e isso e ordem obrigatoria: ela se acha pelo
-- `avaliado_email` do mapa, e o UPDATE de `assessments` logo abaixo apaga
-- exatamente esse valor. Invertido, a narrativa ficaria com o nome real dentro
-- para sempre — e e o texto que o avaliado LE, o unico documento que sai da
-- plataforma.
--
-- Nome completo antes do primeiro nome: "Paulo V S Melo" contem "Paulo", e
-- trocar o curto primeiro deixaria "Fernanda V S Melo" no meio do texto.
UPDATE assessments_relatorios r
SET narrativa = replace(replace(r.narrativa::text, m.nome_antigo, m.nome_novo), m.primeiro_antigo, m.primeiro_novo)::jsonb,
    updated_at = now(),
    modified_by = COALESCE((SELECT id FROM quem), r.modified_by)
FROM assessments a, mapa_demo m
WHERE r.assessment_id = a.id
  AND lower(a.avaliado_email) = lower(m.email_antigo)
  AND r.narrativa::text LIKE '%' || m.primeiro_antigo || '%';

-- O extrato guarda o nome do avaliado DENTRO da descricao ("Assessment CIS ·
-- Paulo V S Melo"), e aquela linha aparece na tela de Creditos de Mapeamento.
-- De carona sai a palavra "Assessment", que era vocabulario da plataforma de
-- referencia e virou "Mapa" no resto do produto.
UPDATE creditos_transacoes t
SET descricao = replace(t.descricao, m.nome_antigo, m.nome_novo),
    updated_at = now(),
    modified_by = COALESCE((SELECT id FROM quem), t.modified_by)
FROM mapa_demo m
WHERE t.descricao LIKE '%' || m.nome_antigo || '%';

UPDATE creditos_transacoes
SET descricao = replace(descricao, 'Assessment ', 'Mapa '),
    updated_at = now()
WHERE descricao LIKE 'Assessment %';

UPDATE assessments a
SET avaliado_nome = m.nome_novo,
    avaliado_email = m.email_novo,
    updated_at = now(),
    modified_by = COALESCE((SELECT id FROM quem), a.modified_by)
FROM mapa_demo m
WHERE lower(a.avaliado_email) = lower(m.email_antigo);

-- `contas` e `verificacoes` sao do Better Auth. Na credencial de e-mail e senha
-- o `conta_externa_id` costuma ser o uuid do usuario e nao o e-mail, entao aqui
-- normalmente da zero linha. Fica porque "normalmente" nao e "sempre", e um
-- e-mail real esquecido na tabela de credencial e o mesmo vazamento.
UPDATE contas ct
SET conta_externa_id = m.email_novo, updated_at = now()
FROM mapa_demo m
WHERE lower(ct.conta_externa_id) = lower(m.email_antigo);

UPDATE verificacoes v
SET identificador = m.email_novo, updated_at = now()
FROM mapa_demo m
WHERE lower(v.identificador) = lower(m.email_antigo);

-- `clientes` entra porque, se um avaliado do seed virou cliente, e a MESMA
-- pessoa real na mesma base. O que o Valmer cadastrou a mao nao casa com
-- nenhum dos oito e-mails e fica intacto.
UPDATE clientes c
SET nome = m.nome_novo,
    email = m.email_novo,
    updated_at = now(),
    modified_by = COALESCE((SELECT id FROM quem), c.modified_by)
FROM mapa_demo m
WHERE lower(c.email) = lower(m.email_antigo);

-- Por ultimo o proprio usuario: as consultas acima nao dependem dele, e deixar
-- para o fim mantem o `usuarios.email` disponivel caso alguma delas precise.
-- O Valmer NAO esta no de-para: aquela e a conta real do dono, nao demonstracao.
UPDATE usuarios u
SET nome = m.nome_novo,
    email = m.email_novo,
    telefone = COALESCE(m.telefone_novo, u.telefone),
    updated_at = now(),
    modified_by = COALESCE((SELECT id FROM quem), u.modified_by)
FROM mapa_demo m
WHERE lower(u.email) = lower(m.email_antigo);

\echo ''
\echo '=== DEPOIS (tudo tem de ser zero) ==='
SELECT 'usuarios'              AS tabela, count(*) AS sobrou FROM usuarios u    JOIN mapa_demo m ON lower(u.email) = lower(m.email_antigo)
UNION ALL SELECT 'assessments',           count(*) FROM assessments a           JOIN mapa_demo m ON lower(a.avaliado_email) = lower(m.email_antigo)
UNION ALL SELECT 'clientes',              count(*) FROM clientes c              JOIN mapa_demo m ON lower(c.email) = lower(m.email_antigo)
UNION ALL SELECT 'contas',                count(*) FROM contas ct               JOIN mapa_demo m ON lower(ct.conta_externa_id) = lower(m.email_antigo)
UNION ALL SELECT 'verificacoes',          count(*) FROM verificacoes v          JOIN mapa_demo m ON lower(v.identificador) = lower(m.email_antigo)
UNION ALL SELECT 'extrato (nome dentro)', count(*) FROM creditos_transacoes t   JOIN mapa_demo m ON t.descricao LIKE '%' || m.nome_antigo || '%'
UNION ALL SELECT 'extrato (Assessment)',  count(*) FROM creditos_transacoes WHERE descricao LIKE 'Assessment %'
UNION ALL SELECT 'narrativas com nome',   count(*) FROM assessments_relatorios r JOIN assessments a ON a.id = r.assessment_id, mapa_demo m
                                          WHERE r.narrativa::text LIKE '%' || m.primeiro_antigo || '%';

\echo ''
\echo '=== quem ficou na base ==='
SELECT papel, nome, email FROM usuarios WHERE is_deleted = false ORDER BY papel, nome;

COMMIT;
FIM
)

info "aplicando (uma transacao; qualquer erro desfaz tudo)"
printf '%s\n' "$SQL" | psql --quiet --no-psqlrc -v ON_ERROR_STOP=1

info "pronto. Se alguma linha de DEPOIS nao for zero, o restore esta em:"
info "  bash restore.sh $AMB $ANTES"
