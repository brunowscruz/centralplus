import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerCalendarioPosts } from "@/lib/seoLocal";

/** Calendário de posts do GMB (Agente 5) — leitura. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json(lerCalendarioPosts(auth.slug));
}
