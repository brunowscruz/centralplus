import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolveArquivoCampanha, type PlataformaAds } from "@/lib/mktOnline";
import { mimeFor } from "@/lib/site";

function parsePlataforma(v: string | null): PlataformaAds | null {
  return v === "google" || v === "meta" ? v : null;
}

/** Serve a imagem do criativo (img/<arquivo>) pra exibir na tela — sandboxed
 * dentro da pasta da campanha. Autenticado (diferente da rota pública do
 * Instagram): aqui é só pro próprio operador/cliente ver, não pra Meta/
 * Google baixarem nada. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; campanha: string; arquivo: string }> },
) {
  const { slug: raw, campanha, arquivo } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const plataforma = parsePlataforma(req.nextUrl.searchParams.get("plataforma"));
  if (!plataforma) return NextResponse.json({ error: "plataforma deve ser google ou meta" }, { status: 400 });

  let abs: string;
  try {
    abs = resolveArquivoCampanha(auth.slug, plataforma, decodeURIComponent(campanha), `img/${decodeURIComponent(arquivo)}`);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    return new NextResponse("não encontrado", { status: 404 });
  }
  const data = fs.readFileSync(abs);
  return new NextResponse(data as unknown as BodyInit, {
    headers: { "Content-Type": mimeFor(abs), "Cache-Control": "no-cache, no-transform" },
  });
}
