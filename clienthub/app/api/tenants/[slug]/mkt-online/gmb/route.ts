import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPerfilGMB } from "@/lib/mktOnline";

/** Perfil do Google Meu Negócio gerado pela IA — autoatendimento, owner ou
 * cliente do próprio tenant podem ler (nada aqui publica sozinho). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ perfil: lerPerfilGMB(auth.slug) });
}
