/**
 * Envio de e-mail pelo SMTP da Hostinger (nodemailer).
 *
 * As variaveis sao lidas NA CHAMADA, e nao no boot do modulo: o `next build`
 * importa o codigo sem ter segredo nenhum, e ler no topo derrubaria o build.
 * Sem elas o envio falha com erro claro — nunca finge que mandou.
 *
 * NAO e "use server": exportar isto de um modulo assim o faria endpoint POST
 * publico, e "mande um e-mail qualquer, de nossa conta" e abuso de relay.
 * Nem o assunto, nem o corpo, nem o link de nenhum e-mail entram em log.
 */
import nodemailer from "nodemailer";

export type Email = { para: string; assunto: string; texto: string; html: string };

type Envio = (email: Email) => Promise<void>;

/** Gancho de teste: os testes trocam o envio para nao falar com SMTP de verdade. */
let substituto: Envio | null = null;
export function substituirEnvioParaTeste(envio: Envio | null): void {
  substituto = envio;
}

const OBRIGATORIAS = ["SMTP_HOST", "SMTP_PORTA", "SMTP_USUARIO", "SMTP_SENHA", "EMAIL_REMETENTE"] as const;

export async function enviarEmail(email: Email): Promise<void> {
  if (substituto) return substituto(email);

  const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]?.trim());
  if (faltando.length > 0) {
    throw new Error(`Envio de e-mail não configurado (faltam: ${faltando.join(", ")}).`);
  }

  const porta = Number(process.env.SMTP_PORTA);
  if (!Number.isInteger(porta) || porta <= 0) {
    throw new Error("Envio de e-mail não configurado (SMTP_PORTA inválida).");
  }

  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    // 465 e SSL direto; as outras portas (587) sobem em texto e negociam STARTTLS.
    secure: porta === 465,
    auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA },
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    await transporte.sendMail({
      from: process.env.EMAIL_REMETENTE,
      to: email.para,
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    });
  } finally {
    transporte.close();
  }
}
