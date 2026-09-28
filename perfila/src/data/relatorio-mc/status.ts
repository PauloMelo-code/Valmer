/**
 * De onde veio cada texto do relatorio MC 3.1.
 *
 * O relatorio mistura tres origens e o Valmer precisa enxergar qual e qual
 * antes de aprovar (ADR-0007, D11; blueprint secao 05, P04):
 *   - 'transcrito'  copiado da fonte (blueprint v2.2 ou molde MC 3.1) sem mudar
 *                   acento nem pontuacao. Editar aqui e editar o metodo.
 *   - 'rascunho'    redigido aqui, original, no tom do Valmer. Vai ao ar, mas
 *                   espera aprovacao.
 *   - 'a confirmar' regra ou dado que a fonte nao deixa claro; a proposta e
 *                   deterministica, mas a decisao e do Valmer.
 *
 * Onde so parte de um registro foi redigida, o registro traz `redigidos` com o
 * nome dos campos escritos aqui — o resto e transcrito.
 */
export type Status = 'transcrito' | 'rascunho' | 'a confirmar'
