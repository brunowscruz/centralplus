import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { rawFilePath } from "@/lib/files";
import { mimeFor } from "@/lib/site";

/**
 * Serve os bytes crus de um arquivo do workspace — usado pro preview de
 * imagem no navegador de arquivos (Claude Code) e pra "baixar" qualquer
 * arquivo binário que o editor de texto não consegue abrir.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const rel = req.nextUrl.searchParams.get("path") || "";
  let abs: string;
  try {
    abs = rawFilePath(auth.slug, rel);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
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
