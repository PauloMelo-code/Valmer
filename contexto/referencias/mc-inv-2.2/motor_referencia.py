"""
MOTOR DE REFERENCIA DO INVENTARIO MAPA COMPORTAMENTAL (MC-INV 2.0)
Implementacao oficial das contas. O software de producao deve reproduzir
exatamente estes resultados (ver testes no final: python3 motor_referencia.py).
"""
import json, random
from banco_adjetivos import BANCO_L, PROIBIDAS, ambiguas, LISTA_OFICIAL, ATRIBUICAO_VALMER

# ---------------------------------------------------------------- DADOS
# 64 adjetivos DISC: 4 fatores x 4 competencias x 4 adjetivos
# 64 itens DISC = LISTA OFICIAL de Valmer (banco_adjetivos.LISTA_OFICIAL), distribuidos em
# 4 fatores x 4 competencias x 4 adjetivos.
DISC = {
 "D": {"ousadia":["Ousado","Audacioso","Desafiador","Competitivo"],
       "comando":["Firme","Independente","Autoconfiante","Enérgico"],
       "objetividade":["Objetivo","Pragmático","Proativo","Resoluto"],
       "assertividade":["Determinado","Decidido","Direto","Assertivo"]},
 "I": {"persuasao":["Persuasivo","Carismático","Articulado","Motivador"],
       "extroversao":["Comunicativo","Expressivo","Expansivo","Espontâneo"],
       "entusiasmo":["Entusiasmado","Otimista","Contagiante","Inspirador"],
       "sociabilidade":["Sociável","Receptivo","Envolvente","Criativo"]},
 "S": {"empatia":["Acolhedor","Atencioso","Compreensivo","Tolerante"],
       "paciencia":["Paciente","Tranquilo","Sereno","Calmo"],
       "constancia":["Constante","Estável","Ponderado","Moderado"],
       "cooperacao":["Cooperativo","Prestativo","Conciliador","Colaborativo"]},
 "C": {"organizacao":["Organizado","Sistemático","Estruturado","Metódico"],
       "detalhismo":["Detalhista","Minucioso","Meticuloso","Preciso"],
       "analise":["Analítico","Lógico","Racional","Técnico"],
       "investigacao":["Criterioso","Observador","Investigativo","Estratégico"]},
}
# Grupos do CIS observados nas capturas de 24.09.2026. Palavras avulsas podem coincidir
# (ninguem e dono de um adjetivo); o que nao pode e repetir a COMBINACAO de um grupo.
CIS_GRUPOS = [
 {"Preciso","Consistente","Determinado","Confiante"},{"Compreensivo","Cuidadoso","Persuasivo","Direto"},
 {"Lógico","Paciente","Otimista","Assertivo"},{"Organizado","Persistente","Inspirador","Executor"},
 {"Exato","Estável","Flexível","Decidido"},{"Disciplinado","Calmo","Entusiasmado","Enérgico"},
 {"Formal","Firme","Amável","Expressivo"},{"Ponderado","Detalhista","Criativo","Visionário"},
 {"Cauteloso","Planejador","Convincente","Audacioso"},{"Conservador","Leal","Exigente","Sociável"}]
MAX_COMUM_CIS = 1   # no maximo 1 palavra em comum entre um grupo nosso e qualquer grupo do CIS
FATORES = ["D","I","S","C"]
G_DISC = 16

def _latino(perm):
    grupos = []
    for g in range(G_DISC):
        itens = []
        for k, f in enumerate(FATORES):
            comps = list(DISC[f].keys())
            comp = comps[(g + k) % 4]
            adj = DISC[f][comp][perm[(f, comp)][g // 4]]
            itens.append({"id": f"G{g+1:02d}-{f}", "texto": adj, "fator": f, "competencia": comp})
        grupos.append({"grupo": g + 1, "itens": itens})
    return grupos

def _respeita_cis(grupos):
    return all(len({i["texto"] for i in g["itens"]} & c) <= MAX_COMUM_CIS for g in grupos for c in CIS_GRUPOS)

def montar_grupos_disc():
    """Quadrado latino: cada grupo tem 1 adjetivo de cada fator, cada competencia
    aparece em 4 grupos diferentes, cada adjetivo 1 vez. A ordem dos adjetivos dentro
    de cada competencia e escolhida por busca com semente fixa (resultado sempre igual)
    ate que nenhum grupo repita mais de 1 palavra de um grupo do CIS."""
    rnd = random.Random(2026)
    chaves = [(f, c) for f in FATORES for c in DISC[f]]
    perm = {k: [0, 1, 2, 3] for k in chaves}
    for _ in range(20000):
        gr = _latino(perm)
        if _respeita_cis(gr): return gr
        perm = {k: rnd.sample([0, 1, 2, 3], 4) for k in chaves}
    raise RuntimeError("nao achou combinacao valida")

# 27 pares bipolares de Jung: (polo_A_texto, polo_B_texto). Polo A = E, N, T.
JUNG = {
 "EI": [("Agitado","Quieto"),("Falante","Calado"),("Desinibido","Contido"),
        ("Enturmado","Solitário"),("Impulsivo","Pensativo"),("Solto","Discreto"),
        ("Conversador","Silencioso"),("Aberto","Recolhido"),("Festeiro","Caseiro")],
 "NS": [("Imaginativo","Realista"),("Inventivo","Prático"),("Sonhador","Pé no chão"),
        ("Inovador","Tradicional"),("Intuitivo","Concreto"),("Original","Convencional"),
        ("Das ideias","Dos fatos"),("Do futuro","Do presente"),("Visionário","Experiente")],
 "TF": [("Pela razão","Pela emoção"),("Imparcial","Sentimental"),("Crítico","Gentil"),
        ("Justo","Bondoso"),("Impessoal","Pessoal"),("Cabeça","Coração"),
        ("Exigente","Compassivo"),("Argumentativo","Afetuoso"),("Pela lógica","Pelo sentimento")],
}
POLOS = {"EI":("E","I"), "NS":("N","S"), "TF":("T","F")}

# 60 expressoes de valor: 6 valores x 10
VALORES = {
 "TEO":["Aprender","Conhecimento","Estudo","Curiosidade","Leitura","Pesquisa","Descobrir","Sabedoria","Cultura","Ciência"],
 "ECO":["Dinheiro","Lucro","Retorno","Riqueza","Investir","Negócios","Economizar","Patrimônio","Ganhar bem","Eficiência"],
 "EST":["Beleza","Arte","Harmonia","Natureza","Bom gosto","Música","Estilo","Conforto","Viver bem","Bem-estar"],
 "SOC":["Ajudar","Servir","Caridade","Voluntariado","Cuidar","Generosidade","Solidariedade","Doar","Acolher","Fazer o bem"],
 "POL":["Poder","Liderar","Status","Influência","Reconhecimento","Vencer","Comandar","Destaque","Prestígio","Autoridade"],
 "PRI":["Princípios","Fé","Ética","Tradição","Valores","Honestidade","Crenças","Regras","Integridade","Propósito"],
}
VAL_KEYS = ["TEO","ECO","EST","SOC","POL","PRI"]
G_VAL = 10

def montar_grupos_valores():
    return [{"grupo": k+1, "itens": [{"id": f"V{k+1:02d}-{v}", "texto": VALORES[v][k], "valor": v} for v in VAL_KEYS]}
            for k in range(G_VAL)]

# ---------------------------------------------------------------- CONTAS
from decimal import Decimal, ROUND_HALF_UP
def r1(x):  # 1 casa, meio para longe do zero (NAO usar round() bancario do Python/JS)
    return float(Decimal(repr(x)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))

def validar_ordenacao(ordem, n):
    assert sorted(ordem) == list(range(1, n+1)), f"ordenacao invalida: {ordem}"

def pontuar_disc(grupos, respostas):
    """respostas[g] = dict id_item -> posicao (1 = mais parece, 4 = menos parece)
    pontos = 5 - posicao  (1a=4, 2a=3, 3a=2, 4a=1)"""
    bruto_f = {f: 0 for f in FATORES}
    bruto_c = {}
    primeiros = {f: 0 for f in FATORES}
    for g in grupos:
        pos = respostas[g["grupo"]]
        validar_ordenacao([pos[i["id"]] for i in g["itens"]], 4)
        for it in g["itens"]:
            p = 5 - pos[it["id"]]
            bruto_f[it["fator"]] += p
            bruto_c[it["competencia"]] = bruto_c.get(it["competencia"], 0) + p
            if pos[it["id"]] == 1: primeiros[it["fator"]] += 1
    assert sum(bruto_f.values()) == 10 * G_DISC
    fatores = {f: r1((bruto_f[f] - G_DISC) / (3 * G_DISC) * 100) for f in FATORES}
    comps = {c: r1((b - 4) / 12 * 100) for c, b in bruto_c.items()}
    return {"bruto": bruto_f, "escore": fatores, "competencias": comps, "primeiros": primeiros}

ZONAS = [(88,"EA","Extremo alto"),(70,"MA","Muito alto"),(51,"A","Alto"),
         (33,"B","Baixo"),(16,"MB","Muito baixo"),(0,"EB","Extremo baixo")]
def zona(score):
    for lim, cod, nome in ZONAS:
        if score >= lim: return cod
    return "EB"

def perfil(escore, primeiros):
    ordem = sorted(FATORES, key=lambda f: (-escore[f], -primeiros[f], FATORES.index(f)))
    acima = [f for f in ordem if escore[f] >= 51]
    if not acima: return "EQUILIBRADO", ordem
    return "".join(acima[:2]), ordem

def indices(nat, ada):
    var = {f: r1(ada[f] - nat[f]) for f in FATORES}
    media = r1(sum(abs(v) for v in var.values()) / 4)
    cls = ("baixa" if media <= 10 else "moderada" if media <= 20 else "alta" if media <= 25
           else "muito alta" if media <= 35 else "extremamente alta")
    polar = [f for f in FATORES if (nat[f] <= 32 and ada[f] >= 70) or (nat[f] >= 70 and ada[f] <= 32)]
    amplitude = r1(max(nat.values()) - min(nat.values()))
    return {"variacao": var, "indice_adaptacao": media, "classe": cls,
            "polarizados": polar, "amplitude_natural": amplitude}

def lideranca(n):
    e = {"executivo": n["D"]*.6 + n["C"]*.4, "metodico": n["S"]*.6 + n["C"]*.4,
         "motivador": n["I"]*.6 + n["S"]*.4, "sistematico": n["C"]*.6 + n["D"]*.4}
    t = sum(e.values())
    return {k: r1(v / t * 100) for k, v in e.items()}

def pontuar_jung(resp):
    """resp[eixo] = lista de 9 inteiros 0..3 JA orientados ao polo A
    (3 = claramente A ... 0 = claramente B). O front grava o lado exibido;
    o backend converte para o polo A antes de chamar esta funcao."""
    out = {}
    for eixo, (a, b) in POLOS.items():
        v = resp[eixo]; assert len(v) == 9 and all(x in (0,1,2,3) for x in v)
        pa = r1(sum(v) / 27 * 100)
        out[a], out[b] = pa, r1(100 - pa)
    tipo = ("E" if out["E"] > 50 else "I") + ("N" if out["N"] > 50 else "S") + ("T" if out["T"] > 50 else "F")
    clar_p = abs(out["N"] - 50); clar_j = abs(out["T"] - 50)
    nome = {"N":"Intuição","S":"Sensação","T":"Pensamento","F":"Sentimento"}
    op = {"N":"S","S":"N","T":"F","F":"T"}
    att = tipo[0]; outra = "I" if att == "E" else "E"
    fem = {"N","S"}
    def adj(f, a): return ("Extrovertid" if a == "E" else "Introvertid") + ("a" if f in fem else "o")
    dom = tipo[1] if clar_p >= clar_j else tipo[2]      # empate -> percepcao
    aux = tipo[2] if dom == tipo[1] else tipo[1]
    hier = [f"{nome[dom]} {adj(dom, att)}", f"{nome[aux]} {adj(aux, outra)}",
            f"{nome[op[aux]]} {adj(op[aux], att)}", f"{nome[op[dom]]} {adj(op[dom], outra)}"]
    return {"percentuais": out, "tipo": tipo, "hierarquia": hier}

def pontuar_valores(grupos, respostas):
    bruto = {v: 0 for v in VAL_KEYS}
    for g in grupos:
        pos = respostas[g["grupo"]]
        validar_ordenacao([pos[i["id"]] for i in g["itens"]], 6)
        for it in g["itens"]:
            bruto[it["valor"]] += 7 - pos[it["id"]]
    assert sum(bruto.values()) == 21 * G_VAL
    esc = {v: r1((bruto[v] - G_VAL) / (5 * G_VAL) * 100) for v in VAL_KEYS}
    nivel = {v: "Significativo" if s >= 66 else "Circunstancial" if s >= 31 else "Indiferente" for v, s in esc.items()}
    ranking = sorted(VAL_KEYS, key=lambda v: (-esc[v], VAL_KEYS.index(v)))
    return {"bruto": bruto, "escore": esc, "nivel": nivel, "ranking": ranking}

# ---------------------------------------------------------------- TESTES
def resposta_fixa(grupos, pref, n):
    """Ordena cada grupo seguindo uma lista de preferencia de fatores/valores."""
    key = "fator" if n == 4 else "valor"
    return {g["grupo"]: {it["id"]: pref.index(it[key]) + 1 for it in g["itens"]} for g in grupos}

def testes():
    gd, gv = montar_grupos_disc(), montar_grupos_valores()
    todos = [i["texto"] for g in gd for i in g["itens"]]
    assert len(todos) == 64 == len(set(todos))
    assert _respeita_cis(gd), "grupo repete combinacao do CIS"
    amb = ambiguas()
    for f in FATORES:
        assert sorted(w for ws in DISC[f].values() for w in ws) == sorted(LISTA_OFICIAL[f]), f"fator {f} difere da lista oficial"
    for f in FATORES:
        for comp, adjs in DISC[f].items():
            for w in adjs:
                wl = w.lower()
                assert wl in BANCO_L[f], f"{w} nao esta no banco do fator {f}"
                assert wl not in amb or ATRIBUICAO_VALMER.get(wl) == f, f"{w} e ambigua {amb.get(wl)}"
                assert wl not in PROIBIDAS, f"{w} esta na lista de retirados"
    jung_txt = [t for p in JUNG.values() for par in p for t in par]
    assert len(jung_txt) == len(set(jung_txt)) == 54
    assert not (set(todos) & set(jung_txt)), "palavra repetida entre DISC e Jung"
    val_txt = [t for v in VALORES.values() for t in v]
    assert len(val_txt) == len(set(val_txt)) == 60
    for c in [c for f in FATORES for c in DISC[f]]:
        assert sum(1 for g in gd for i in g["itens"] if i["competencia"] == c) == 4

    T = {}
    # T1: D sempre em 1o, I 2o, S 3o, C 4o
    r = pontuar_disc(gd, resposta_fixa(gd, ["D","I","S","C"], 4))
    assert r["escore"] == {"D":100.0,"I":66.7,"S":33.3,"C":0.0}; T["T1"] = r["escore"]
    assert r["competencias"]["ousadia"] == 100.0 and r["competencias"]["analise"] == 0.0
    # T2: soma sempre 200 em 2000 respostas aleatorias
    rnd = random.Random(7)
    for _ in range(2000):
        resp = {g["grupo"]: dict(zip([i["id"] for i in g["itens"]], rnd.sample([1,2,3,4], 4))) for g in gd}
        e = pontuar_disc(gd, resp)["escore"]
        assert abs(sum(e.values()) - 200) <= 0.2
    # T3: perfil e indices
    nat = {"D":100.0,"I":66.7,"S":33.3,"C":0.0}; ada = {"D":33.3,"I":0.0,"S":100.0,"C":66.7}
    p, _ = perfil(nat, {"D":16,"I":0,"S":0,"C":0}); assert p == "DI"
    ix = indices(nat, ada); T["T3"] = ix
    assert ix["indice_adaptacao"] == 66.7 and ix["polarizados"] == [] and ix["classe"] == "extremamente alta"
    assert indices({"D":20,"I":80,"S":50,"C":50}, {"D":75,"I":25,"S":50,"C":50})["polarizados"] == ["D","I"]
    # T4: zonas nas bordas
    assert [zona(x) for x in (100,88,87.9,70,69.9,51,50.9,33,32.9,16,15.9,0)] == \
           ["EA","EA","MA","MA","A","A","B","B","MB","MB","EB","EB"]
    # T5: lideranca soma 100 (+-0.2)
    L = lideranca(nat); T["T5"] = L; assert abs(sum(L.values()) - 100) <= 0.2
    # T6: Jung
    j = pontuar_jung({"EI":[3,3,2,2,2,1,2,3,2], "NS":[2,2,1,2,3,2,2,1,2], "TF":[3,2,2,3,2,2,3,2,1]})
    T["T6"] = j
    assert j["percentuais"] == {"E":74.1,"I":25.9,"N":63.0,"S":37.0,"T":74.1,"F":25.9}
    assert j["tipo"] == "ENT"
    assert j["hierarquia"] == ["Pensamento Extrovertido","Intuição Introvertida","Sensação Extrovertida","Sentimento Introvertido"]
    # T7: valores
    v = pontuar_valores(gv, resposta_fixa(gv, ["PRI","ECO","SOC","POL","TEO","EST"], 6)); T["T7"] = v["escore"]
    assert v["escore"] == {"PRI":100.0,"ECO":80.0,"SOC":60.0,"POL":40.0,"TEO":20.0,"EST":0.0}
    assert abs(sum(v["escore"].values()) - 300) <= 0.3
    return T

if __name__ == "__main__":
    print(json.dumps(testes(), ensure_ascii=False, indent=1))
    json.dump({"versao":"MC-INV 2.2","disc":montar_grupos_disc(),"jung":JUNG,"valores":montar_grupos_valores()},
              open(__file__.replace("motor_referencia.py","inventario.json"),"w"), ensure_ascii=False, indent=1)
    print("TODOS OS TESTES PASSARAM")
