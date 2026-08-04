import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { listarDiagnosticos } from "@/lib/seoLocal";

/** Lista de diagnósticos já gerados (Agente 3), mais recente primeiro. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ diagnosticos: listarDiagnosticos(auth.slug) });
}
