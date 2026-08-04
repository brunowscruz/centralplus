import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { publicarPost } from "@/lib/instagramPublish";

/**
 * Publica um post de verdade no feed do Instagram (Meta Graph API).
 * REGRA DE OURO: o cliente final não publica — só o operador, e só depois
 * de aprovado (publicarPost recusa post sem `.aprovado`). Ver
 * lib/instagramPublish.ts e docs/PUBLICACAO-INSTAGRAM.md pro contrato
 * completo (inclui exigências externas: App Review da Meta, HUB_URL público).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador publica" }, { status: 403 });
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

  const resultado = await publicarPost(slug, body.post);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
  }
  return NextResponse.json(resultado);
}
