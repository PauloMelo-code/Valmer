"""Banco de adjetivos DISC fornecido por Valmer Albuquerque (24.09.2026). Fonte única dos itens DISC."""
NUCLEO = {
 "D": "desafio, decisão, velocidade, autonomia e resultados",
 "I": "pessoas, comunicação, entusiasmo, persuasão, reconhecimento e interação",
 "S": "constância, cooperação, paciência, segurança, apoio e harmonia",
 "C": "qualidade, precisão, lógica, critérios, padrões e excelência",
}
BANCO = {
 "D": "Determinado, decidido, direto, assertivo, competitivo, objetivo, resoluto, ousado, firme, corajoso, independente, autônomo, intenso, exigente, pragmático, rápido, enérgico, empreendedor, desafiador, realizador, executor, incisivo, destemido, persistente, proativo, dominante, acelerado, categórico, autoconfiante, questionador, franco, audacioso, solucionador, orientado a metas, orientado a resultados, determinado a vencer, resistente à pressão, independente nas decisões, orientado à ação",
 "I": "Comunicativo, sociável, entusiasmado, persuasivo, otimista, expressivo, carismático, espontâneo, inspirador, envolvente, amigável, expansivo, convincente, influente, motivador, falante, acessível, caloroso, emocional, criativo, animado, divertido, descontraído, agregador, relacional, articulado, positivo, receptivo, energético, empolgante, popular, demonstrativo, improvisador, visionário, informal, contagiante, estimulante, aberto, gregário, acolhedor, mobilizador, inspirador de pessoas, orientado a relacionamentos",
 "S": "Paciente, constante, estável, tranquilo, cooperativo, leal, confiável, acolhedor, atencioso, gentil, compreensivo, prestativo, cuidadoso, sereno, equilibrado, previsível, consistente, persistente, conciliador, diplomático, tolerante, respeitoso, discreto, solidário, dedicado, disponível, harmonioso, moderado, amável, empático, ouvinte, colaborativo, metódico, ponderado, prudente, fiel, perseverante, resistente, calmo, cauteloso, reservado, paciente com processos, mantenedor, estabilizador, protetor, orientado à equipe, orientado à harmonia",
 "C": "Analítico, criterioso, preciso, detalhista, organizado, sistemático, lógico, racional, disciplinado, cuidadoso, meticuloso, técnico, prudente, rigoroso, exato, estruturado, planejador, metódico, observador, investigativo, reservado, formal, responsável, consistente, minucioso, questionador, objetivo, fundamentado, controlado, diplomático, cauteloso, estratégico, estudioso, concentrado, atento, reflexivo, correto, exigente com qualidade, orientado a padrões, orientado a regras, orientado a processos, orientado a evidências, orientado a dados, protocolar, preciso na execução",
}
RETIRADOS = {
 "D": "combativo, impaciente, controlador, autoritário, confrontador, agressivo, ríspido, inflexível, obstinado, individualista, arriscado, impetuoso",
 "I": "impulsivo, disperso, desorganizado, exagerado, inquieto, precipitado, crédulo, superficial, inconsistente, desatento aos detalhes",
 "S": "rotineiro, conservador, acomodado, passivo, indeciso, resistente a mudanças, dependente de segurança, avesso a conflitos, lento para decidir",
}
# Lista oficial de itens definida por Valmer (24.09.2026): 16 por fator.
LISTA_OFICIAL = {
 "D": ["Determinado","Decidido","Direto","Assertivo","Objetivo","Ousado","Firme","Independente","Pragmático","Enérgico","Desafiador","Resoluto","Proativo","Competitivo","Audacioso","Autoconfiante"],
 "I": ["Comunicativo","Sociável","Entusiasmado","Persuasivo","Otimista","Expressivo","Carismático","Espontâneo","Inspirador","Envolvente","Expansivo","Criativo","Articulado","Receptivo","Contagiante","Motivador"],
 "S": ["Paciente","Constante","Estável","Tranquilo","Cooperativo","Acolhedor","Atencioso","Compreensivo","Prestativo","Sereno","Conciliador","Tolerante","Ponderado","Colaborativo","Calmo","Moderado"],
 "C": ["Analítico","Criterioso","Preciso","Detalhista","Organizado","Sistemático","Lógico","Racional","Meticuloso","Técnico","Estruturado","Metódico","Observador","Investigativo","Estratégico","Minucioso"],
}
# Palavras ambiguas do banco que Valmer atribuiu explicitamente a um fator na lista oficial.
ATRIBUICAO_VALMER = {"objetivo": "D", "acolhedor": "S", "metódico": "C"}

def lista(txt): return [w.strip().lower() for w in txt.split(",") if w.strip()]
BANCO_L = {f: lista(t) for f, t in BANCO.items()}
RETIRADOS_L = {f: lista(t) for f, t in RETIRADOS.items()}
PROIBIDAS = {w for v in RETIRADOS_L.values() for w in v}
def ambiguas():
    """Palavras que aparecem em mais de um fator: não discriminam, não podem ser item DISC."""
    cont = {}
    for f, ws in BANCO_L.items():
        for w in set(ws): cont.setdefault(w, set()).add(f)
    return {w: sorted(fs) for w, fs in cont.items() if len(fs) > 1}
if __name__ == "__main__":
    for f in "DISC": print(f, len(BANCO_L[f]), "palavras")
    print("AMBÍGUAS:", ambiguas())
    import collections
    for f in "DISC":
        d=[w for w,c in collections.Counter(BANCO_L[f]).items() if c>1]
        if d: print("repetida dentro de", f, d)
