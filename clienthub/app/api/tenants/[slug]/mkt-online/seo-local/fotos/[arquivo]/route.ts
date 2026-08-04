import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolveFotoPerfil, removerFotoPerfil } from "@/lib/seoLocal";
import { mimeFor } from "@/lib/site";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; arquivo: string }> }) {
  const { slug: raw, arquivo } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  let abs: string;
  try {
    abs = resolveFotoPerfil(auth.slug, decodeURIComponent(arquivo));
  } catch {
    return NextResponse.json({ error: "arquivo inválido" }, { status: 400 });
  }
  if (!fs.existsSync(abs)) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  const dados = fs.readFileSync(abs);
  return new NextResponse(dados, { headers: { "Content-Type": mimeFor(abs) } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; arquivo: string }> }) {
  const { slug: raw, arquivo } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  try {
    removerFotoPerfil(auth.slug, decodeURIComponent(arquivo));
  } catch {
    return NextResponse.json({ error: "arquivo inválido" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
