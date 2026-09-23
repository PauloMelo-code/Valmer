/**
 * Marca Impacto
 * -------------
 * Símbolo oficial da Impacto Academy. Vive em `components/layout/`
 * porque vale para o produto inteiro: login, assessment, admin, portal
 * do facilitador e relatório.
 *
 * O nome ao lado do símbolo é sempre "Impacto Academy", em todo lugar.
 * Decisão do Paulo em 10/09/2026, que REVOGA a regra de dois nomes de
 * 03/09: o software assinava "Impacto DISC" e só o relatório assinava
 * "Impacto Academy". Agora é uma marca só, e `NOME_MARCA` é a fonte
 * dela — se você for escrever o nome à mão em algum lugar novo, use a
 * constante, foi a literal espalhada que fez esta troca custar 10
 * arquivos. "Mapa Comportamental" segue sendo o nome do INSTRUMENTO, e
 * não da empresa: ele aparece na capa e no rodapé do relatório e no
 * cabeçalho do assessment.
 *
 * O desenho é o escudo com as duas espadas, entregue pelo cliente em
 * 04/09/2026. O arquivo que ele mandou (`impacto academy.svg`) não era
 * vetor: eram dois PNG de 2160×2160 embutidos em base64, 269 KB, que
 * empastavam a 14px. Os `path` abaixo são a vetorização desse arquivo,
 * medida linha a linha sobre o raster (IoU 0,9976 contra o original).
 * Não os redesenhe "no olho": qualquer retoque tem que voltar a bater
 * com o original.
 *
 * A caixa é 505×655, ou seja RETRATO. `size` é a ALTURA, e a largura
 * sai da proporção — quem envolve o símbolo num quadrado precisa
 * dimensionar pela altura, senão sobra ar dos dois lados.
 *
 * Cor: o manual (seção 02) fixa cinco versões, e duas delas vivem
 * aqui. Sobre fundo escuro o símbolo é o ouro
 * `--color-marca-sobre-escuro` (9,81:1 sobre o Azul Impacto, 11,87:1
 * sobre o Preto Impacto). Sobre fundo claro o ouro dá 1,48:1 contra a
 * Areia e some, então entra a monocromática em azul, `--color-marca`
 * (14,54:1). Por isso o padrão é o azul: fundo claro é o caso comum, e
 * quem põe o símbolo sobre o quadrado escuro passa `cor`
 * explicitamente. Impresso, o `@media print` de `globals.css` devolve
 * as duas ao azul e o símbolo sai de uma cor só.
 */

type MarcaImpactoProps = {
  /** Altura em px. A largura sai da proporção 505:655. */
  size?: number
  /**
   * Cor do símbolo. O padrão é a monocromática em azul, que é a versão
   * para fundo claro. Sobre o quadrado escuro da marca, passe
   * `var(--color-marca-sobre-escuro)`.
   */
  cor?: string
}

export function MarcaImpacto({ size = 16, cor = 'var(--color-marca)' }: MarcaImpactoProps) {
  return (
    <svg
      width={(size * 505) / 655}
      height={size}
      viewBox="0 0 505 655"
      fill={cor}
      aria-hidden
      style={{ flex: 'none' }}
    >
      <path d="M20,107L225,107 225,108 232,109 232,172 231,173 226,173 226,174 77,174 76,175 76,234 75,234 76,477 80,482 86,484 90,488 94,489 95,491 99,492 100,494 104,495 110,500 116,502 123,508 132,512 132,597 128,597 120,593 119,591 115,590 109,585 103,583 102,581 96,579 95,577 89,575 88,573 80,570 79,568 71,565 70,563 62,560 61,558 53,555 52,553 30,542 29,540 21,537 20,535 10,531 9,529 5,528 2,525 2,496 1,496 2,494 2,109 3,108 20,108Z" />
      <path d="M352,106L498,106 498,107 504,108 504,524 499,530 475,541 474,543 456,552 450,557 442,560 441,562 433,565 432,567 424,570 423,572 415,575 414,577 406,580 405,582 399,584 398,586 390,589 389,591 383,593 382,595 378,597 373,597 373,512 381,508 382,506 390,503 391,501 397,499 398,497 404,495 405,493 409,492 415,487 423,484 430,477 430,174 428,173 274,173 273,172 273,108 276,108 276,107 352,107Z" />
      <path d="M158,192L230,192 232,193 232,652 231,653 226,653 220,650 219,648 213,646 207,641 189,632 188,630 184,629 178,624 172,622 171,620 157,613 154,607 155,193 158,193Z" />
      <path d="M305,192L349,193 350,194 351,345 352,345 352,607 351,607 351,610 345,615 328,623 327,625 321,627 320,629 314,631 313,633 302,638 301,640 287,647 286,649 279,652 278,654 274,654 273,652 273,194 274,193 305,193Z" />
      <path d="M155,1L231,1 232,2 232,90 231,91 155,91Z" />
      <path d="M274,1L350,1 351,2 351,90 338,91 338,92 278,92 278,91 274,91 274,87 273,87 273,2Z" />
    </svg>
  )
}

/** O nome por extenso, do jeito que ele assina em todo o documento. */
export const NOME_MARCA = 'Impacto Academy'

/**
 * Linha de crédito do rodapé, exigida pela especificação do cliente
 * (seção "Estrutura do Relatório", rodapé). O site e o telefone são da
 * Impacto Academy, e não do facilitador que emitiu: quem emitiu já está
 * nomeado no bloco ao lado.
 */
export const CREDITO_MARCA = {
  site: 'impactoacademy.com.br',
  telefone: '(44) 99159-5998',
}
