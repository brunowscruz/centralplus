import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolveMediaFile } from "@/lib/instagram";
import { mimeFor } from "@/lib/site";

/**
 * Serve os arquivos de um post (slides PNG/HTML, fotos) para o visualizador.
 * Sempre sandboxed dentro de marketing/conteudo/<post>/ do cliente.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; post: string; path?: string[] }> },
) {
  const { slug: raw, post, path: segments } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const relFile = (segments || []).join("/");
  let abs: string;
  try {
    abs = resolveMediaFile(auth.slug, decodeURIComponent(post), relFile);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    return new NextResponse("não encontrado", { status: 404 });
  }

  const data = fs.readFileSync(abs);
  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type": mimeFor(abs),
      "Cache-Control": "no-cache, no-transform",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
