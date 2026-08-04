import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { approvePost, listPosts } from "@/lib/instagram";

/**
 * Aprovar um post (marker .aprovado na pasta do post) — pré-requisito pra
 * publicar de verdade (ver .../instagram/publish/route.ts).
 * REGRA DE OURO: o cliente final não publica — só o operador, e só depois
 * de aprovar aqui.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json(
      { error: "somente o operador aprova posts" },
      { status: 403 },
    );
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

  let body: { post?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.post) {
    return NextResponse.json({ error: "informe o post" }, { status: 400 });
  }

  try {
    approvePost(slug, body.post);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ posts: listPosts(slug) });
}
