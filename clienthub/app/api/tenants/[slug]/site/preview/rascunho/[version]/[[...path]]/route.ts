import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolvePreviewFile, mimeFor } from "@/lib/site";

/**
 * Serve um RASCUNHO (saidas/sites/<version>/) pro iframe de preview — versão
 * fica no PATH da URL, não em querystring. Motivo: um HTML com asset relativo
 * (`<link href="css/main.css">`, `<img src="assets/foto.png">`) faz o próprio
 * navegador resolver esse caminho relativo — e resolução de URL relativa
 * NUNCA carrega a querystring da página base pro recurso resolvido, só o
 * path. Com `?v=` em querystring, index.html carregava certo mas
 * css/main.css e qualquer asset em subpasta perdiam o `?v=` na resolução e
 * caíam feio (404, ou pior, o site aprovado errado se ele existir) — bug
 * real encontrado 30/07/2026 revisando o rascunho migrado da Barbearia
 * Daniel Ribeiro (que usa css/js externos, não CSS/JS inline). Com a versão
 * no path, o navegador resolve o relativo DENTRO do mesmo prefixo de
 * versão automaticamente, sem precisar carregar nada explícito.
 * Site aprovado continua na rota irmã (sem prefixo de versão) — ver
 * ../../[[...path]]/route.ts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; version: string; path?: string[] }> },
) {
  const { slug: raw, version, path: segments } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const relFile = (segments || []).join("/") || "index.html";

  let abs: string;
  try {
    abs = resolvePreviewFile(slug, version, relFile);
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
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
