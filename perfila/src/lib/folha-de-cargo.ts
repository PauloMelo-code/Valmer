/**
 * A folha de impressao de UM cargo, em HTML, para a pessoa salvar em PDF pelo
 * dialogo do proprio navegador.
 *
 * POR QUE NAO E UM PDF DE VERDADE
 * -------------------------------
 * O gerador de PDF do projeto (`lib/relatorio/pdf.ts`) roda no SERVIDOR, com
 * puppeteer, e serve o relatorio do avaliado — outro dado, outra pipeline,
 * outra permissao. Um cargo tem nome, quatro percentuais e a data: mandar isso
 * para uma rota nova e abrir um navegador headless no servidor para desenhar
 * meia pagina e trabalho que o "Salvar como PDF" do sistema ja faz de graca.
 *
 * Funcao pura, e nao `window.print()` direto: quem chama abre a janela e
 * escreve, e o que vai para dentro do HTML pode ser provado em teste — inclusive
 * o escape, que e a unica parte daqui que pode virar problema de seguranca.
 */

/** So o que a folha imprime. O resto da linha da tela nao interessa ao papel. */
export type CargoImpresso = {
  nome: string;
  alvo_d: number | null;
  alvo_i: number | null;
  alvo_s: number | null;
  alvo_c: number | null;
  dono: string;
  /** Ja formatado pelo servidor, no fuso de Sao Paulo. */
  criadoEm: string;
};

/**
 * Texto digitado por gente indo para dentro de HTML.
 *
 * O nome do cargo aceita qualquer caractere (so tem minimo e maximo em
 * `validators/cargo.ts`), entao um `<script>` cadastrado como nome rodaria na
 * janela aberta. Aspas nao entram na lista porque nada aqui vai para dentro de
 * atributo — se um dia for, a lista cresce junto.
 */
const escapar = (valor: string) =>
  valor.replace(/[&<>]/g, (caractere) =>
    caractere === "&" ? "&amp;" : caractere === "<" ? "&lt;" : "&gt;",
  );

export function folhaDeCargo(cargo: CargoImpresso, impressoEm: string): string {
  const alvo =
    cargo.alvo_d === null
      ? "Sem alvo definido — este cargo não entra nas comparações."
      : `D ${cargo.alvo_d}%  ·  I ${cargo.alvo_i}%  ·  S ${cargo.alvo_s}%  ·  C ${cargo.alvo_c}%`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapar(cargo.nome)} — Perfil Ideal por Cargo</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; color: #111; margin: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { margin: 0 0 4px; }
  .rotulo { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #555; margin-top: 24px; }
  .alvo { font-size: 20px; font-weight: 600; }
  footer { margin-top: 40px; font-size: 12px; color: #555; }
</style></head><body>
  <p class="rotulo">Perfil Ideal por Cargo</p>
  <h1>${escapar(cargo.nome)}</h1>
  <p class="rotulo">Alvo comportamental</p>
  <p class="alvo">${escapar(alvo)}</p>
  <p class="rotulo">Cadastro</p>
  <p>Criado por ${escapar(cargo.dono)} em ${escapar(cargo.criadoEm)}</p>
  <footer>Impresso pela plataforma em ${escapar(impressoEm)}.</footer>
</body></html>`;
}
