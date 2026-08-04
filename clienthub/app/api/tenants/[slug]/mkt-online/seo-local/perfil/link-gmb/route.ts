import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { atualizarLinkGmb } from "@/lib/seoLocal";

/** Link "Gerenciar perfil" do Google Business Profile — só o operador
 * configura (é um dado interno da ponte assistida, não algo que a IA
 * decide ou o cliente edita). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador configura isso" }, { status: 403 });
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

  let body: { linkGmb?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  const link = (body.linkGmb || "").trim();
  if (!link) return NextResponse.json({ error: "link vazio" }, { status: 400 });

  const perfil = atualizarLinkGmb(slug, link);
  if (!perfil) return NextResponse.json({ error: "preencha o perfil de negócio antes" }, { status: 400 });
  return NextResponse.json({ perfil });
}
