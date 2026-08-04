import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { atualizarStatusPost, type StatusPostGmb } from "@/lib/seoLocal";

const STATUS_VALIDOS: StatusPostGmb[] = ["rascunho", "aprovado", "aplicado", "falhou"];

/** Aprova (ou muda o status de) um post do calendário do GMB. */
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
  if (!body.status || !STATUS_VALIDOS.includes(body.status as StatusPostGmb)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const calendario = atualizarStatusPost(auth.slug, id, body.status as StatusPostGmb);
  return NextResponse.json(calendario);
}
