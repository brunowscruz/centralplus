import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerDiagnostico } from "@/lib/seoLocal";

/** Conteúdo de um diagnóstico específico (markdown já pronto). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; nome: string }> }) {
  const { slug: raw, nome } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const conteudo = lerDiagnostico(auth.slug, decodeURIComponent(nome));
  if (conteudo === null) {
    return NextResponse.json({ error: "diagnóstico não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ conteudo });
}
