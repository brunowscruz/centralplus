import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { atualizarStatusReview, type StatusReview } from "@/lib/seoLocal";

const STATUS_VALIDOS: StatusReview[] = ["rascunho", "aprovada", "aplicada"];

/** Aprova a resposta sugerida pra uma avaliação. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: raw, id } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.status || !STATUS_VALIDOS.includes(body.status as StatusReview)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const reviews = atualizarStatusReview(auth.slug, id, body.status as StatusReview);
  return NextResponse.json(reviews);
}
