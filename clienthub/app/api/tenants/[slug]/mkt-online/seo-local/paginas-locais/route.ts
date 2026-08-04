import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPaginasLocais } from "@/lib/seoLocal";

/** Páginas locais (serviço × localização, Agente 6) — leitura. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json(lerPaginasLocais(auth.slug));
}
