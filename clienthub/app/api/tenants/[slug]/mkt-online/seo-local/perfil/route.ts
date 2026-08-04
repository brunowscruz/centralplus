import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPerfilNegocioSeo } from "@/lib/seoLocal";

/** Perfil de negócio do SEO Local (NAP/serviços/áreas) — leitura. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ perfil: lerPerfilNegocioSeo(auth.slug) });
}
