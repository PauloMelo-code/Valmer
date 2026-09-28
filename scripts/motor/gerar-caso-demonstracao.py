"""
Gera o CASO DE DEMONSTRACAO: as 69 respostas completas de um avaliado ficticio
cujo resultado tem o formato do relatorio-modelo do Valmer (natural DI marcado,
adaptado CS, ENT, Politico e Economico no topo).

Os numeros do PDF v3 (D 89, I 69, S 30, C 24) somam 212 e vem do instrumento
antigo; no MC-INV 2.2 o DISC soma sempre 200, entao eles nao sao reproduziveis.
Este caso e o mais proximo que o motor oficial produz, e o resultado esperado
sai do proprio motor_referencia.py, nunca de conta de cabeca (regra R7).

Usos: teste de ponta a ponta (as 69 telas pelo caminho de verdade), semente de
homologacao e a pagina-modelo do relatorio no painel do admin.

    python scripts/motor/gerar-caso-demonstracao.py
"""
import io, json, os, random, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(AQUI, "..", "..", "contexto", "referencias", "mc-inv-2.2")))
import motor_referencia as m  # noqa: E402

SAIDA = os.path.join(AQUI, "..", "..", "perfila", "tests", "fixtures", "caso-demonstracao.json")
gd, gv = m.montar_grupos_disc(), m.montar_grupos_valores()

def ordenar(grupo, base, rnd, chave, ruido):
    itens = sorted(grupo["itens"], key=lambda it: -(base[it[chave]] + rnd.gauss(0, ruido)))
    return {it["id"]: i + 1 for i, it in enumerate(itens)}

def tentar(semente):
    rnd = random.Random(semente)
    nat = {g["grupo"]: ordenar(g, {"D": 4, "I": 3, "S": 1.4, "C": 1.0}, rnd, "fator", 0.9) for g in gd}
    ada = {g["grupo"]: ordenar(g, {"D": 1.2, "I": 1.3, "S": 3.4, "C": 4.0}, rnd, "fator", 0.9) for g in gd}
    val = {g["grupo"]: ordenar(g, {"POL": 6, "ECO": 5, "SOC": 3.6, "PRI": 3.0, "TEO": 2.2, "EST": 1.0}, rnd, "valor", 0.9) for g in gv}
    alvo = {"EI": 19, "NS": 17, "TF": 16}  # E 70,4 · N 63,0 · T 59,3
    jung = {}
    for eixo, soma in alvo.items():
        v = [2] * 9
        while sum(v) != soma:
            i = rnd.randrange(9)
            if sum(v) < soma and v[i] < 3: v[i] += 1
            elif sum(v) > soma and v[i] > 0: v[i] -= 1
        jung[eixo] = v
    return nat, ada, jung, val

melhor = None
for semente in range(1, 20000):
    nat, ada, jung, val = tentar(semente)
    n, a = m.pontuar_disc(gd, nat), m.pontuar_disc(gd, ada)
    pn, on = m.perfil(n["escore"], n["primeiros"]); pa, oa = m.perfil(a["escore"], a["primeiros"])
    ix = m.indices(n["escore"], a["escore"]); v = m.pontuar_valores(gv, val)
    ok = (pn == "DI" and pa == "CS" and 80 <= n["escore"]["D"] <= 92 and 60 <= n["escore"]["I"] <= 72
          and v["ranking"][:2] == ["POL", "ECO"] and len(ix["polarizados"]) >= 2)
    if ok:
        melhor = (semente, nat, ada, jung, val, n, a, pn, pa, ix, v, on, oa)
        break
if not melhor:
    sys.exit("nenhum caso atendeu; afrouxe os criterios")

semente, nat, ada, jung, val, n, a, pn, pa, ix, v, on, oa = melhor
j = m.pontuar_jung(jung)
s = lambda d: {str(k): x for k, x in d.items()}
caso = {
    "descricao": "Caso de demonstracao ficticio. Formato do relatorio-modelo, numeros do motor oficial.",
    "semente_busca": semente,
    "avaliado": {"nome": "Adriana Prado", "email": "adriana.prado@example.com"},
    "respostas": {"natural": s(nat), "adaptado": s(ada), "jung": jung, "valores": s(val)},
    "esperado": {
        "natural": {"escore": n["escore"], "competencias": n["competencias"], "perfil": pn, "ordem": on},
        "adaptado": {"escore": a["escore"], "competencias": a["competencias"], "perfil": pa, "ordem": oa},
        "indices": ix, "lideranca": m.lideranca(n["escore"]), "jung": j,
        "valores": {k: x for k, x in v.items() if k != "bruto"},
    },
}
with io.open(SAIDA, "w", encoding="utf-8", newline="\n") as f:
    json.dump(caso, f, ensure_ascii=False, indent=1)
print(json.dumps(caso["esperado"], ensure_ascii=False, indent=1))
