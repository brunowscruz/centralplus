import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, fileExists } from "./bos";
import { readIntegrations, type WordPressConfig } from "./integrations";

/**
 * Publicação de página local (SEO Local, Agente 6) no WordPress do cliente
 * via REST API — Application Password (nativo do WordPress 5.6+, não
 * depende de plugin nem de OAuth). Sempre extração DETERMINÍSTICA do
 * conteúdo (nunca a IA decidindo o que publicar na hora) — o agente só gera
 * o HTML do rascunho, envolvendo o conteúdo principal em
 * `<main id="conteudo-principal">` (ver MODULE_PREFIX["mkt-online"], seção
 * 6); esta função extrai exatamente esse trecho, nunca o header/rodapé do
 * template do CentralPlus.
 */

export interface ResultadoPublicacaoWp {
  ok: boolean;
  wpPostId?: number;
  url?: string;
  mensagem: string;
}

function extrairTitulo(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return title[1].trim();
  return "Página sem título";
}

function extrairConteudoPrincipal(html: string): string | null {
  const m = html.match(/<main[^>]*id=["']conteudo-principal["'][^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1].trim() : null;
}

export function wordpressConfigurado(slug: string): boolean {
  const { wordpress } = readIntegrations(slug);
  return !!(wordpress?.baseUrl && wordpress?.usuario && wordpress?.applicationPassword);
}

/**
 * Publica (cria) uma página no WordPress a partir do rascunho HTML já
 * gerado. `pastaRascunho` é relativa a `saidas/sites/` dentro do sandbox do
 * tenant (mesma convenção do módulo Site) — sempre passada por
 * `assertInsideTenant`, nunca um path arbitrário.
 */
export async function publicarPaginaNoWordpress(slug: string, pastaRascunho: string): Promise<ResultadoPublicacaoWp> {
  const { wordpress } = readIntegrations(slug);
  if (!wordpress?.baseUrl || !wordpress?.usuario || !wordpress?.applicationPassword) {
    return { ok: false, mensagem: "WordPress não configurado — preencha em Configurações → WordPress." };
  }

  const abs = assertInsideTenant(slug, path.join("saidas/sites", pastaRascunho, "index.html"));
  if (!fileExists(abs)) {
    return { ok: false, mensagem: `rascunho não encontrado: ${pastaRascunho}` };
  }
  const html = fs.readFileSync(abs, "utf8");
  const conteudo = extrairConteudoPrincipal(html);
  if (!conteudo) {
    return { ok: false, mensagem: 'a página não tem <main id="conteudo-principal"> — o agente precisa gerar seguindo esse contrato antes de publicar.' };
  }
  const titulo = extrairTitulo(html);

  const baseUrl = wordpress.baseUrl.replace(/\/+$/, "");
  const auth = Buffer.from(`${wordpress.usuario}:${wordpress.applicationPassword}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ title: titulo, content: conteudo, status: "draft" }),
    });
    const data = (await res.json().catch(() => null)) as { id?: number; link?: string; message?: string } | null;
    if (!res.ok || !data?.id) {
      return { ok: false, mensagem: data?.message || `WordPress recusou a publicação (HTTP ${res.status}).` };
    }
    return {
      ok: true,
      wpPostId: data.id,
      url: data.link,
      mensagem: "Página criada como rascunho no WordPress — revise e publique por lá quando estiver pronta.",
    };
  } catch (e) {
    return { ok: false, mensagem: `falha de conexão com o WordPress: ${(e as Error).message}` };
  }
}

export type { WordPressConfig };
