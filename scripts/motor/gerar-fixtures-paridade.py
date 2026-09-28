"""
Gera os casos de paridade que o motor TypeScript (perfila/src/lib/motor) precisa
reproduzir byte a byte.

A fonte da verdade e contexto/referencias/mc-inv-2.2/motor_referencia.py (regra
R3 do AGENTE-INVENTARIO-MC.md). Os testes de ouro T1-T8 cobrem oito situacoes;
estes casos cobrem centenas, sorteados com semente fixa, e existem porque um
porte pode passar nos oito e errar no desempate, na borda do arredondamento ou
no eixo de Jung que so aparece com certas combinacoes.

Quando Valmer mudar o motor: rode este script de novo e o teste de paridade diz
na hora se o TypeScript acompanhou.

    python scripts/motor/gerar-fixtures-paridade.py
"""
import io, json, os, random, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(AQUI, "..", "..", "contexto", "referencias", "mc-inv-2.2")
sys.path.insert(0, os.path.normpath(REF))
import motor_referencia as m  # noqa: E402

SAIDA = os.path.join(AQUI, "..", "..", "perfila", "tests", "fixtures", "motor-paridade.json")
rnd = random.Random(20260928)
gd, gv = m.montar_grupos_disc(), m.montar_grupos_valores()

def ordem_disc():
    return {g["grupo"]: dict(zip([i["id"] for i in g["itens"]], rnd.sample([1, 2, 3, 4], 4))) for g in gd}

def ordem_val():
    return {g["grupo"]: dict(zip([i["id"] for i in g["itens"]], rnd.sample([1, 2, 3, 4, 5, 6], 6))) for g in gv}

def jung_resp():
    return {e: [rnd.randint(0, 3) for _ in range(9)] for e in ("EI", "NS", "TF")}

def chaves_str(d):
    return {str(k): v for k, v in d.items()}

casos = {"r1": [], "zona": [], "disc": [], "perfil": [], "indices": [], "lideranca": [], "jung": [], "valores": [], "completos": []}

# Bordas do arredondamento: e exatamente aqui que Math.round e round() bancario erram.
for x in [66.65, -66.65, 0.05, -0.05, 2.25, 2.35, 12.45, 33.33333, 66.66666, 99.95, 0.0, 100.0, -0.0, 1.15, 1.25, 8.345]:
    casos["r1"].append({"x": x, "esperado": m.r1(x)})

for x in [100, 88, 87.9, 70, 69.9, 51, 50.9, 33, 32.9, 16, 15.9, 0, 50.95, 87.95]:
    casos["zona"].append({"x": x, "esperado": m.zona(x)})

for _ in range(300):
    resp = ordem_disc()
    r = m.pontuar_disc(gd, resp)
    casos["disc"].append({"respostas": chaves_str(resp), "esperado": r})

# Perfil: forca empates de escore para exercitar o desempate por "mais vezes em 1o".
for _ in range(200):
    r = m.pontuar_disc(gd, ordem_disc())
    p, ordem = m.perfil(r["escore"], r["primeiros"])
    casos["perfil"].append({"escore": r["escore"], "primeiros": r["primeiros"], "esperado": {"sigla": p, "ordem": ordem}})
for esc, pri in [
    ({"D": 50.0, "I": 50.0, "S": 50.0, "C": 50.0}, {"D": 4, "I": 4, "S": 4, "C": 4}),
    ({"D": 60.0, "I": 60.0, "S": 40.0, "C": 40.0}, {"D": 3, "I": 5, "S": 4, "C": 4}),
    ({"D": 60.0, "I": 60.0, "S": 40.0, "C": 40.0}, {"D": 5, "I": 5, "S": 3, "C": 3}),
    ({"D": 51.0, "I": 50.9, "S": 49.1, "C": 49.0}, {"D": 4, "I": 4, "S": 4, "C": 4}),
    ({"D": 100.0, "I": 33.3, "S": 33.3, "C": 33.3}, {"D": 16, "I": 0, "S": 0, "C": 0}),
]:
    p, ordem = m.perfil(esc, pri)
    casos["perfil"].append({"escore": esc, "primeiros": pri, "esperado": {"sigla": p, "ordem": ordem}})

for _ in range(200):
    n = m.pontuar_disc(gd, ordem_disc())["escore"]
    a = m.pontuar_disc(gd, ordem_disc())["escore"]
    casos["indices"].append({"natural": n, "adaptado": a, "esperado": m.indices(n, a)})
for n, a in [({"D": 20, "I": 80, "S": 50, "C": 50}, {"D": 75, "I": 25, "S": 50, "C": 50}),
             ({"D": 32, "I": 70, "S": 50, "C": 48}, {"D": 70, "I": 32, "S": 50, "C": 48}),
             ({"D": 32.1, "I": 69.9, "S": 50, "C": 48}, {"D": 70, "I": 32, "S": 50, "C": 48})]:
    casos["indices"].append({"natural": n, "adaptado": a, "esperado": m.indices(n, a)})

for _ in range(150):
    n = m.pontuar_disc(gd, ordem_disc())["escore"]
    casos["lideranca"].append({"natural": n, "esperado": m.lideranca(n)})

for _ in range(300):
    j = jung_resp()
    casos["jung"].append({"respostas": j, "esperado": m.pontuar_jung(j)})
# Empate de clareza entre percepcao e julgamento: a regra manda percepcao.
for j in [{"EI": [3] * 9, "NS": [3, 3, 3, 3, 3, 3, 0, 0, 0], "TF": [3, 3, 3, 3, 3, 3, 0, 0, 0]},
          {"EI": [0] * 9, "NS": [0, 0, 0, 0, 0, 0, 3, 3, 3], "TF": [3, 3, 3, 3, 3, 3, 0, 0, 0]}]:
    casos["jung"].append({"respostas": j, "esperado": m.pontuar_jung(j)})

for _ in range(200):
    resp = ordem_val()
    casos["valores"].append({"respostas": chaves_str(resp), "esperado": m.pontuar_valores(gv, resp)})

# Aplicacao completa: o contrato de dados da secao 7, tudo junto.
for _ in range(40):
    rn, ra, rj, rv = ordem_disc(), ordem_disc(), jung_resp(), ordem_val()
    nat, ada = m.pontuar_disc(gd, rn), m.pontuar_disc(gd, ra)
    pn, on = m.perfil(nat["escore"], nat["primeiros"])
    pa, oa = m.perfil(ada["escore"], ada["primeiros"])
    casos["completos"].append({
        "respostas": {"natural": chaves_str(rn), "adaptado": chaves_str(ra), "jung": rj, "valores": chaves_str(rv)},
        "esperado": {
            "natural": {"escore": nat["escore"], "competencias": nat["competencias"], "perfil": pn, "ordem": on},
            "adaptado": {"escore": ada["escore"], "competencias": ada["competencias"], "perfil": pa, "ordem": oa},
            "indices": m.indices(nat["escore"], ada["escore"]),
            "lideranca": m.lideranca(nat["escore"]),
            "jung": m.pontuar_jung(rj),
            "valores": {k: v for k, v in m.pontuar_valores(gv, rv).items() if k != "bruto"},
        },
    })

m.testes()  # a referencia precisa estar verde antes de virar gabarito
with io.open(SAIDA, "w", encoding="utf-8", newline="\n") as f:
    json.dump({"fonte": "motor_referencia.py MC-INV 2.2", "semente": 20260928, "casos": casos}, f, ensure_ascii=False, indent=1)
print("fixtures:", {k: len(v) for k, v in casos.items()}, "->", os.path.normpath(SAIDA))
