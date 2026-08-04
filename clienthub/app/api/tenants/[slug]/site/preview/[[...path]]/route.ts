import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolvePreviewFile, mimeFor } from "@/lib/site";

/**
 * Serve o site APROVADO (site/) do cliente para o iframe de preview. Pra
 * rascunhos (saidas/sites/<versão>/), a versão fica no PATH da rota irmã
 * ./rascunho/[version]/ — nunca em querystring aqui (ver o porquê no
 * comentário daquela rota: asset relativo em subpasta perde querystring na
 * resolução do navegador). Caminhos sempre sandboxed dentro da pasta do
 * cliente (assertInsideTenant). Assets relativos do HTML resolvem
 * naturalmente sob esta mesma rota.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug: raw, path: segments } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const relFile = (segments || []).join("/") || "index.html";

  let abs: string;
  try {
    abs = resolvePreviewFile(slug, null, relFile);
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
      // o site é editado ao vivo pelo chat — nunca deixar o navegador reusar
      // uma cópia antiga (nem em cache de disco/memória, nem por revalidação
      // condicional, já que não mandamos ETag/Last-Modified)
      "Cache-Control": "no-store, no-cache, must-revalidate",
      // preview interno; nunca deve ser embutido fora do Hub
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
