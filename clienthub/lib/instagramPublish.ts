import { readIntegrations, renovarTokenSeNecessario } from "./integrations";
import { obterPost, salvarPublicacao, type Post } from "./instagram";

/**
 * Publicação real no feed do Instagram via Graph API — substitui a antiga
 * skill `aprovar-post` (que chamava scripts/postar-instagram.js, um arquivo
 * que nunca existiu no filesystem: era uma promessa quebrada, não um atalho
 * funcional). Contrato completo, exigências externas (App Review da Meta,
 * HUB_URL público) e checklist: docs/PUBLICACAO-INSTAGRAM.md — ler antes de
 * mudar este arquivo.
 *
 * Fluxo (https://developers.facebook.com/docs/instagram-platform/content-publishing):
 * 1 slide  → POST /{ig-user-id}/media (image_url+caption) → aguarda FINISHED → media_publish
 * N slides → POST /{ig-user-id}/media (is_carousel_item=true) por slide → aguarda cada um →
 *            POST /{ig-user-id}/media (media_type=CAROUSEL, children=[...], caption) →
 *            aguarda FINISHED → media_publish
 */

const GRAPH_VERSION = "v21.0";
const CAPTION_MAX = 2200; // limite real do Instagram

export interface ResultadoPublicacao {
  ok: boolean;
  mensagem: string;
  mediaId?: string;
}

function baseUrlPublica(): string | { erro: string } {
  const url = process.env.HUB_URL?.trim();
  if (!url) {
    return { erro: "HUB_URL não configurado nesta instalação (ver .env.local)." };
  }
  if (/localhost|127\.0\.0\.1/.test(url)) {
    return {
      erro:
        "HUB_URL aponta pra localhost — a Meta precisa baixar a imagem por uma URL pública de verdade. " +
        "Publicação real só funciona quando o Hub estiver numa VPS com domínio (ver docs/PUBLICACAO-INSTAGRAM.md).",
    };
  }
  return url.replace(/\/+$/, "");
}

function nomeArquivoDoSlide(rel: string): string {
  return rel.split("/").pop() || rel;
}

async function chamarGraph<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `erro ${res.status} na Graph API`);
  }
  return data;
}

async function criarContainer(
  igUserId: string,
  token: string,
  body: Record<string, string>,
): Promise<string> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`;
  const params = new URLSearchParams({ ...body, access_token: token });
  const data = await chamarGraph<{ id?: string }>(url, { method: "POST", body: params });
  if (!data.id) throw new Error("Graph API não devolveu id do container de mídia");
  return data.id;
}

/** Espera o container terminar de processar a imagem antes de publicar —
 * a Graph API processa a imagem baixada de forma assíncrona (poll de
 * status_code até FINISHED/ERROR), até ~60s (30 tentativas de 2s). */
async function aguardarProcessamento(containerId: string, token: string): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`;
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const data = await chamarGraph<{ status_code?: string }>(url);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("a Meta rejeitou o processamento da imagem");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("tempo esgotado esperando a Meta processar a imagem (30 tentativas)");
}

async function publicarContainer(igUserId: string, token: string, creationId: string): Promise<string> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`;
  const params = new URLSearchParams({ creation_id: creationId, access_token: token });
  const data = await chamarGraph<{ id?: string }>(url, { method: "POST", body: params });
  if (!data.id) throw new Error("Graph API não devolveu id da publicação");
  return data.id;
}

function urlPublicaDoSlide(base: string, slug: string, post: Post, rel: string): string {
  const arquivo = nomeArquivoDoSlide(rel);
  return `${base}/api/public/instagram-slides/${encodeURIComponent(slug)}/${encodeURIComponent(post.name)}/${encodeURIComponent(arquivo)}`;
}

/** Publica um post já aprovado no feed do Instagram do cliente. Nunca finge
 * sucesso: qualquer falha (token, App Review pendente, rate limit de 100
 * posts/24h, mídia rejeitada) volta como `{ok:false, mensagem}` clara —
 * sempre grava o resultado em publicacao.json antes de retornar. */
export async function publicarPost(slug: string, postName: string): Promise<ResultadoPublicacao> {
  const post = obterPost(slug, postName);
  if (!post) {
    return { ok: false, mensagem: "post não encontrado" };
  }
  if (!post.aprovado) {
    return { ok: false, mensagem: "post ainda não foi aprovado pelo operador" };
  }
  if (post.slides.length === 0 || post.slides.some((s) => s.kind !== "image")) {
    return { ok: false, mensagem: "post precisa ter os slides renderizados em PNG antes de publicar" };
  }

  const base = baseUrlPublica();
  if (typeof base !== "string") {
    return registrar(slug, postName, { ok: false, mensagem: base.erro });
  }

  const metaInstagram = await renovarTokenSeNecessario(slug);
  if (!metaInstagram?.pageAccessToken || !metaInstagram?.igUserId) {
    return registrar(slug, postName, {
      ok: false,
      mensagem: "Instagram não conectado — configure em Configurações → Instagram (API).",
    });
  }
  const { pageAccessToken: token, igUserId } = metaInstagram;

  const caption = (post.legenda || "").slice(0, CAPTION_MAX);

  try {
    let creationId: string;
    if (post.slides.length === 1) {
      const imageUrl = urlPublicaDoSlide(base, slug, post, post.slides[0].rel);
      creationId = await criarContainer(igUserId, token, { image_url: imageUrl, caption });
      await aguardarProcessamento(creationId, token);
    } else {
      const childIds: string[] = [];
      for (const slide of post.slides) {
        const imageUrl = urlPublicaDoSlide(base, slug, post, slide.rel);
        const childId = await criarContainer(igUserId, token, { image_url: imageUrl, is_carousel_item: "true" });
        await aguardarProcessamento(childId, token);
        childIds.push(childId);
      }
      creationId = await criarContainer(igUserId, token, {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption,
      });
      await aguardarProcessamento(creationId, token);
    }

    const mediaId = await publicarContainer(igUserId, token, creationId);
    return registrar(slug, postName, { ok: true, mensagem: "publicado com sucesso", mediaId });
  } catch (e) {
    return registrar(slug, postName, { ok: false, mensagem: (e as Error).message });
  }
}

function registrar(slug: string, postName: string, resultado: ResultadoPublicacao): ResultadoPublicacao {
  salvarPublicacao(slug, postName, {
    status: resultado.ok ? "publicado" : "falhou",
    em: new Date().toISOString(),
    erro: resultado.ok ? undefined : resultado.mensagem,
    mediaId: resultado.mediaId,
  });
  return resultado;
}
