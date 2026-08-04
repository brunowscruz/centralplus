import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { lerPerfilNegocioSeo, lerPropostaGmb, lerCalendarioPosts, lerReviews } from "@/lib/seoLocal";
import { gerarPromptProposta, gerarPromptPost, gerarPromptReview } from "@/lib/gmbApplyPrompt";

/**
 * Gera o texto da sessão assistida (ponte Claude-in-Chrome) direto pelo
 * botão do Hub — substitui o script de terminal `gerar-prompt-aplicacao-
 * gmb.mjs` pra quem prefere um clique só (o script continua existindo como
 * caminho alternativo, mesma lógica compartilhada via lib/gmbApplyPrompt.ts).
 * Owner-only: é a mesma pessoa que vai rodar a sessão assistida.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador gera isso" }, { status: 403 });
  }

  const { slug: raw } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  const tipo = req.nextUrl.searchParams.get("tipo");
  const id = req.nextUrl.searchParams.get("id") || undefined;

  const perfil = lerPerfilNegocioSeo(slug);
  const nomeLegal = perfil?.nomeLegal || slug;

  let prompt: string | null = null;
  if (tipo === "proposta-gmb") {
    const proposta = lerPropostaGmb(slug);
    prompt = proposta ? gerarPromptProposta(nomeLegal, proposta) : null;
  } else if (tipo === "calendario-post") {
    const post = id ? lerCalendarioPosts(slug).posts.find((p) => p.id === id) : undefined;
    prompt = post ? gerarPromptPost(nomeLegal, post) : null;
  } else if (tipo === "review") {
    const review = id ? lerReviews(slug).reviews.find((r) => r.id === id) : undefined;
    prompt = review ? gerarPromptReview(nomeLegal, review) : null;
  } else {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "nada aprovado ainda pra gerar o prompt" }, { status: 400 });
  }
  return NextResponse.json({ prompt, linkGmb: perfil?.linkGmb || null });
}
