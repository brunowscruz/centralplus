import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { listarCampanhas, type PlataformaAds } from "@/lib/mktOnline";

function parsePlataforma(v: string | null): PlataformaAds | null {
  return v === "google" || v === "meta" ? v : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const plataforma = parsePlataforma(req.nextUrl.searchParams.get("plataforma"));
  if (!plataforma) {
    return NextResponse.json({ error: "plataforma deve ser google ou meta" }, { status: 400 });
  }
  return NextResponse.json({ campanhas: listarCampanhas(auth.slug, plataforma) });
}
