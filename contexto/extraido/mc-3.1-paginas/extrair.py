"""
Extrai os ativos do molde visual MC 3.1 (ADR-0007 D5).

    PYTHONUTF8=1 python contexto/extraido/mc-3.1-paginas/extrair.py

O molde e um HTML unico de 2,5 MB, com fontes e imagens em base64: grande
demais para um editor e grande demais para um agente ler. Este script e a
unica coisa que toca nele. Se o Valmer mandar uma versao nova do molde, roda
de novo e confere o diff dos arquivos gerados em vez de redigitar CSS a mao.

Gera:
  perfila/public/relatorio-mc/fontes/*.woff2   (18 arquivos, nome legivel)
  perfila/public/relatorio-mc/imagens/*        (capa, retrato do Marston, brasao)
  perfila/src/components/relatorio-mc/relatorio-mc.css   (escopado em .mc31)
  contexto/extraido/mc-3.1-paginas/pag01.html .. pag42.html
"""
import base64
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
MOLDE = RAIZ / "contexto/referencias/mc-3.1/Mapa_Comportamental_MC_3_1_v3_editavel.html"
PUBLICO = RAIZ / "perfila/public/relatorio-mc"
CSS_SAIDA = RAIZ / "perfila/src/components/relatorio-mc/relatorio-mc.css"
PAGINAS = RAIZ / "contexto/extraido/mc-3.1-paginas"
URL_BASE = "/relatorio-mc"

# Familia real de cada apelido, lida da tabela 'name' de cada woff2 (fontTools).
# Todas sao subconjuntos de ~230 glifos (latim basico + acentos do portugues).
# MS (Montserrat) vem embutida mas nenhum seletor nem estilo inline a usa.
FAMILIAS = {"OS": "open-sans", "MS": "montserrat", "AR": "archivo", "CZ": "cinzel", "GA": "eb-garamond"}

# Ordem de aparicao no molde. Conferido abrindo cada arquivo.
IMAGENS = ["capa.png", "marston.jpg", "brasao-impacto-academy.png"]

# O script do molde nao vem para ca: virou ajuste-de-pagina.ts.
CABECALHO_CSS = """/* ============================================================
   Relatorio MC 3.1 · molde visual das 42 paginas (ADR-0007 D5)
   GERADO por contexto/extraido/mc-3.1-paginas/extrair.py a partir de
   contexto/referencias/mc-3.1/Mapa_Comportamental_MC_3_1_v3_editavel.html.
   Nao edite a mao: mude o molde ou o script e gere de novo.

   Todo seletor comeca em .mc31. O app carrega CSS global em todas as
   telas, e .page, .card, h1 e body do molde vazariam para o produto
   inteiro. O que era regra de html/body virou regra de .mc31.

   O @page e NOMEADO. O relatorio antigo declara um @page sem nome
   (A4, margem 20mm) e, na mesma impressao, os dois brigariam; com
   `page: mc31` so as folhas do molde pegam margem zero.

   Os apelidos de fonte (OS, AR, CZ, GA, MS) continuam os do molde
   porque os estilos inline das paginas e os <text> dos SVG usam
   esses nomes: OS = Open Sans, AR = Archivo, CZ = Cinzel,
   GA = EB Garamond, MS = Montserrat (embutida, nao usada).
   ============================================================ */
"""

# O molde contava com os padroes do navegador. O globals.css do app muda
# dois deles para todo elemento, e a pagina sairia diferente do molde:
# img/svg viram block com max-width (quebra os icones inline e os graficos)
# e a:hover ganha cor e sublinhado. Estas regras vem ANTES das do molde,
# entao qualquer regra do molde com mais especificidade continua valendo.
NEUTRALIZA_GLOBAIS = (
    "/* desfaz o globals.css do app, que o molde nao conhecia */\n"
    ".mc31 img,.mc31 svg{display:inline;max-width:none}\n"
    ".mc31 a:hover{color:inherit;text-decoration:none}\n"
)

# Tags que ganham quebra de linha logo depois do nome. A quebra fica
# DENTRO da tag (entre o nome e o primeiro atributo), onde espaco nao vira
# no de texto: o render e identico e as linhas deixam de ter 13 mil
# caracteres, que o leitor dos agentes corta.
TAGS_QUEBRA = r"div|section|span|p|h1|h2|h3|ul|li|table|tr|td|th|svg|rect|line|path|circle|text|pattern|polygon|defs|g|img|a|b|i"


def fonte_nome(apelido: str, peso: str) -> str:
    return f"{FAMILIAS[apelido]}-{peso}.woff2"


def extrair_fontes(css: str) -> str:
    padrao = re.compile(
        r"font-family:'(\w+)';font-weight:(\d+);font-style:normal;"
        r"src:url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\) format\('woff2'\)"
    )

    def troca(m: re.Match) -> str:
        apelido, peso, dados = m.groups()
        nome = fonte_nome(apelido, peso)
        (PUBLICO / "fontes" / nome).write_bytes(base64.b64decode(dados))
        return (
            f"font-family:'{apelido}';font-weight:{peso};font-style:normal;"
            f"src:url({URL_BASE}/fontes/{nome}) format('woff2')"
        )

    novo, n = padrao.subn(troca, css)
    assert n == 18, f"esperava 18 fontes, achei {n}"
    return novo


def escopar(css: str) -> str:
    saida = []
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        seletor, corpo = m.group(1).strip(), m.group(2)
        if seletor.startswith("@font-face"):
            saida.append(f"@font-face{{{corpo}}}")
        elif seletor.startswith("@page"):
            saida.append(f"@page mc31{{{corpo}}}")
        elif seletor.startswith("@"):
            raise ValueError(f"regra @ nao prevista: {seletor}")
        else:
            partes = []
            for s in (p.strip() for p in seletor.split(",")):
                if s in ("html", "body"):
                    novo = [".mc31"]
                elif s == "*":
                    novo = [".mc31", ".mc31 *"]
                else:
                    novo = [f".mc31 {s}"]
                partes += [n for n in novo if n not in partes]
            saida.append(f"{','.join(partes)}{{{corpo}}}")
            if seletor == ".page":
                saida.append(".mc31 .page{page:mc31}")
            if seletor == "*":
                saida.append(NEUTRALIZA_GLOBAIS.rstrip("\n"))
    return CABECALHO_CSS + "\n".join(saida) + "\n"


def quebrar_linhas(html: str) -> str:
    return re.sub(rf"<({TAGS_QUEBRA})(\s)", lambda m: f"<{m.group(1)}\n{m.group(2) if m.group(2) != chr(10) else ''}", html)


def main() -> None:
    (PUBLICO / "fontes").mkdir(parents=True, exist_ok=True)
    (PUBLICO / "imagens").mkdir(parents=True, exist_ok=True)
    fonte = MOLDE.read_text(encoding="utf-8")

    css = fonte[fonte.index("<style>") + 7 : fonte.index("</style>")]
    CSS_SAIDA.write_text(escopar(extrair_fontes(css)), encoding="utf-8", newline="\n")

    corpo = fonte[fonte.index("<body>") + 6 : fonte.rindex("</body>")]
    imagens = iter(IMAGENS)

    def troca_imagem(m: re.Match) -> str:
        nome = next(imagens)
        (PUBLICO / "imagens" / nome).write_bytes(base64.b64decode(m.group(1)))
        return f'src="{URL_BASE}/imagens/{nome}"'

    corpo, n = re.subn(r'src="data:image/\w+;base64,([A-Za-z0-9+/=]+)"', troca_imagem, corpo)
    assert n == 3 and "base64" not in corpo, "sobrou base64 no corpo"

    secoes = re.split(r'(?=<section class="page")', corpo)[1:]
    assert len(secoes) == 42, f"esperava 42 paginas, achei {len(secoes)}"
    for num, secao in enumerate(secoes, 1):
        secao = secao.strip()
        assert secao.startswith(f'<section class="page" id="p{num:02d}"'), num
        (PAGINAS / f"pag{num:02d}.html").write_text(
            "<!doctype html>\n"
            f"<!-- MC 3.1 · pagina {num:02d} de 42 · secao #p{num:02d} do molde, sem base64.\n"
            "     Gerado por extrair.py; o que e fixo, derivado e IA em cada\n"
            "     elemento esta em contexto/extraido/mc-3.1-mapa-de-dados.md.\n"
            "     As quebras de linha dentro das tags nao mudam o render. -->\n"
            '<html lang="pt-BR"><head><meta charset="utf-8">\n'
            '<link rel="stylesheet" href="../../../perfila/src/components/relatorio-mc/relatorio-mc.css">\n'
            '</head><body><div class="mc31">\n'
            f"{quebrar_linhas(secao)}\n"
            "</div></body></html>\n",
            encoding="utf-8",
            newline="\n",
        )


if __name__ == "__main__":
    main()
