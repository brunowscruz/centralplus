import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { renovarTokenSeNecessario } from "@/lib/integrations";

// Perfil + métricas do Instagram via Meta Graph API (seção 6/12 do spec).
// Usa o token guardado em lib/integrations.ts — nunca sai pro navegador.
// Se não tiver token, ou a Graph API recusar (token expirado, permissão
// faltando), devolve um erro claro — nunca dado inventado.
const GRAPH_VERSION = "v21.0";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  // Renova o token de longa duração antes de usar, se tiver App próprio
  // configurado (META_APP_ID/META_APP_SECRET) e ele estiver perto de vencer
  // — assim o cliente nunca vê "token expirado" por falta de manutenção.
  const metaInstagram = await renovarTokenSeNecessario(slug);
  if (!metaInstagram?.pageAccessToken || !metaInstagram?.igUserId) {
    return NextResponse.json(
      { connected: false, reason: "Nenhum token do Instagram configurado para este cliente." },
      { status: 200 },
    );
  }

  const fields =
    "username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website";
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${metaInstagram.igUserId}?fields=${fields}&access_token=${encodeURIComponent(metaInstagram.pageAccessToken)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data.error) {
      return NextResponse.json(
        {
          connected: false,
          reason:
            data.error?.message ||
            "Token inválido ou expirado. Gere um novo em Configurações → Instagram (API).",
        },
        { status: 200 },
      );
    }
    return NextResponse.json({ connected: true, profile: data });
  } catch {
    return NextResponse.json(
      { connected: false, reason: "Não foi possível falar com a Graph API agora." },
      { status: 200 },
    );
  }
}
