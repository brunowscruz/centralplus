import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession, newExp } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";

// MODO OWNER (seção 6): a agência "entra" no workspace de um cliente.
// A sessão continua role=owner (para exibir a barra e o botão "Voltar ao Console"),
// mas ganha o slug do cliente que está sendo visualizado.
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (s?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  let slug: string;
  try {
    const body = await req.json();
    slug = sanitizeSlug(body.slug);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }
  await setSession({ role: "owner", email: s.email, slug, exp: newExp() });
  return NextResponse.json({ redirect: `/c/${slug}` });
}
