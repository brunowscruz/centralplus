import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { atualizarCampoTagPerfil, CAMPOS_TAG_PERFIL, type CampoTagPerfil } from "@/lib/seoLocal";

/** Edição rápida por tag (atalho manual — mesmo arquivo que a IA escreve
 * pela entrevista) pros 4 campos de lista do perfil de SEO Local. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  let body: { campo?: string; valores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.campo || !CAMPOS_TAG_PERFIL.includes(body.campo as CampoTagPerfil)) {
    return NextResponse.json({ error: "campo inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.valores) || !body.valores.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "valores precisa ser uma lista de texto" }, { status: 400 });
  }

  const perfil = atualizarCampoTagPerfil(auth.slug, body.campo as CampoTagPerfil, body.valores as string[]);
  if (!perfil) return NextResponse.json({ error: "preencha o nome/telefone/endereço do perfil antes" }, { status: 400 });
  return NextResponse.json({ perfil });
}
