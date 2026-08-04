import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { atualizarPlaceId } from "@/lib/seoLocal";

/** Place ID do Google Maps (pra Places API, busca de avaliações reais) —
 * dado técnico que o operador cola uma vez, nada a ver com o link de
 * gerenciar o perfil (esse é público, aquele é de gestão). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  let body: { placeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  const placeId = (body.placeId || "").trim();
  if (!placeId) return NextResponse.json({ error: "Place ID vazio" }, { status: 400 });

  const perfil = atualizarPlaceId(auth.slug, placeId);
  if (!perfil) return NextResponse.json({ error: "preencha o perfil de negócio antes" }, { status: 400 });
  return NextResponse.json({ perfil });
}
