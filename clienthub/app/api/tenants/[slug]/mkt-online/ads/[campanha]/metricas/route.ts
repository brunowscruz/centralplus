import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerCampanha, type PlataformaAds } from "@/lib/mktOnline";
import { googleAdsCustomerId } from "@/lib/integrations";
import { buscarMetricasDeUmaCampanha } from "@/lib/googleAds";

export const dynamic = "force-dynamic";

/** Drill-down de UMA campanha — série diária de cliques/custo/impressões,
 * pra quem clica em "ver desempenho" na lista. Só faz sentido pra campanhas
 * já aplicadas de verdade (com googleCampaignId). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const { slug: raw, campanha } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const dias = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("dias")) || 30));
  const plataforma: PlataformaAds = "google";
  const nome = decodeURIComponent(campanha);
  const dados = lerCampanha(slug, plataforma, nome);
  if (!dados) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });

  const customerId = googleAdsCustomerId(slug);
  const resultado = await buscarMetricasDeUmaCampanha(customerId, dados.aplicacao?.googleCampaignId, dias);

  return NextResponse.json({ ...resultado, campanha: dados });
}
