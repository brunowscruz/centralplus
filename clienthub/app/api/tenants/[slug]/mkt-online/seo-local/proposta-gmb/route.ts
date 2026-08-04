import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPropostaGmb } from "@/lib/seoLocal";

/** Proposta de otimização do perfil GMB (Agente 4) — leitura. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ proposta: lerPropostaGmb(auth.slug) });
}
