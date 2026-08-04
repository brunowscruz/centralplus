import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { listarFotosPerfil, salvarFotoPerfil } from "@/lib/seoLocal";

/** Fotos reais do perfil (upload já recortado pelo ImageCropModal). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ fotos: listarFotosPerfil(auth.slug) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!form || !(arquivo instanceof File)) {
    return NextResponse.json({ error: "envie o arquivo no campo \"arquivo\"" }, { status: 400 });
  }
  if (arquivo.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "arquivo maior que 8MB" }, { status: 400 });
  }
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const nome = salvarFotoPerfil(auth.slug, arquivo.name || "foto.jpg", buffer);
  return NextResponse.json({ nome });
}
