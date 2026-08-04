import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { listPosts } from "@/lib/instagram";

// Status do módulo Instagram: posts (pastas de marketing/conteudo) com
// slides, legenda e estado de aprovação.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ posts: listPosts(auth.slug) });
}
