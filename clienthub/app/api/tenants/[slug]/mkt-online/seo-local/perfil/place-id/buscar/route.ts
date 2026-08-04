import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { buscarPlaceIdPorNome } from "@/lib/googlePlaces";

/** Busca candidatos a Place ID por nome/endereço — evita o usuário ter que
 * ir num site externo achar isso na mão. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "informe o que buscar" }, { status: 400 });

  const resultado = await buscarPlaceIdPorNome(q);
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
  return NextResponse.json({ candidatos: resultado.candidatos });
}
