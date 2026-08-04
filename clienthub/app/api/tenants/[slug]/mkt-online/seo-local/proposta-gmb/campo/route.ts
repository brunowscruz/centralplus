import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { atualizarStatusCampoProposta, CAMPOS_PROPOSTA_GMB, type CampoPropostaNome, type StatusCampo } from "@/lib/seoLocal";

const STATUS_VALIDOS: StatusCampo[] = ["proposta", "aprovada", "rejeitada", "aplicada"];

/** Aprova/rejeita UM campo da proposta de otimização do GMB — é decisão de
 * conteúdo do negócio, aberto a qualquer usuário do workspace (não é
 * publicação real, isso só acontece na sessão assistida da Fase 3). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  let body: { campo?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (!body.campo || !CAMPOS_PROPOSTA_GMB.includes(body.campo as CampoPropostaNome)) {
    return NextResponse.json({ error: "campo inválido" }, { status: 400 });
  }
  if (!body.status || !STATUS_VALIDOS.includes(body.status as StatusCampo)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const proposta = atualizarStatusCampoProposta(auth.slug, body.campo as CampoPropostaNome, body.status as StatusCampo);
  if (!proposta) {
    return NextResponse.json({ error: "ainda não existe proposta gerada" }, { status: 404 });
  }
  return NextResponse.json({ proposta });
}
