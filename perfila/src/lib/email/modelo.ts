/** Modelo unico dos e-mails da plataforma: texto simples + HTML leve com o mesmo conteudo. */
import type { Email } from "./enviar";

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function montarEmail(dados: {
  assunto: string;
  saudacao: string;
  paragrafos: string[];
  botao: { rotulo: string; url: string };
  rodape: string;
}): Omit<Email, "para"> {
  const { assunto, saudacao, paragrafos, botao, rodape } = dados;
  const texto = [saudacao, "", ...paragrafos.flatMap((p) => [p, ""]), botao.url, "", rodape].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b1b1b;max-width:520px">
<p>${escapar(saudacao)}</p>
${paragrafos.map((p) => `<p>${escapar(p)}</p>`).join("\n")}
<p><a href="${escapar(botao.url)}" style="display:inline-block;padding:12px 20px;background:#1b1b1b;color:#fff;text-decoration:none;border-radius:6px">${escapar(botao.rotulo)}</a></p>
<p style="font-size:13px;color:#555">${escapar(rodape)}</p>
</div>`;

  return { assunto, texto, html };
}

export function saudar(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "";
  return primeiro ? `Olá, ${primeiro}!` : "Olá!";
}
