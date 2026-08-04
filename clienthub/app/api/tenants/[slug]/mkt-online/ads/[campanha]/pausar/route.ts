import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/bos";
import { tenantExists } from "@/lib/tenants";
import { lerCampanha, registrarStatusGoogleAds, type PlataformaAds } from "@/lib/mktOnline";
import { googleAdsCustomerId } from "@/lib/integrations";
import { pausarOuRetomarCampanhaGoogleAds } from "@/lib/googleAds";
import { logAudit } from "@/lib/audit";

/** Pausa ou reativa uma campanha JÁ CRIADA de verdade no Google Ads — nunca
 * cria/apaga nada. Owner-only, mesmo padrão de risco de /aplicar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador pausa/ativa uma campanha" }, { status: 403 });
  }
  const { slug: raw, campanha } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  let body: { pausar?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (typeof body.pausar !== "boolean") {
    return NextResponse.json({ error: "informe pausar: true/false" }, { status: 400 });
  }

  const plataforma: PlataformaAds = "google";
  const nome = decodeURIComponent(campanha);
  const dados = lerCampanha(slug, plataforma, nome);
  if (!dados) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });
  if (dados.status !== "aplicada") {
    return NextResponse.json({ error: "essa campanha ainda não foi criada de verdade no Google Ads." }, { status: 400 });
  }

  const customerId = googleAdsCustomerId(slug);
  const resultado = await pausarOuRetomarCampanhaGoogleAds(customerId, dados.aplicacao?.googleCampaignId, dados.aplicacao?.googleAdGroupId, body.pausar);
  const campanhaAtualizada = resultado.ok
    ? registrarStatusGoogleAds(slug, plataforma, nome, body.pausar ? "PAUSED" : "ENABLED")
    : dados;

  logAudit({
    ator: session.email || "owner",
    acao: resultado.ok ? (body.pausar ? "google_ads.campanha_pausada" : "google_ads.campanha_ativada") : "google_ads.pausar_falhou",
    alvo: slug,
    detalhe: `${nome}: ${resultado.mensagem}`,
  });

  return NextResponse.json({ ...resultado, campanha: campanhaAtualizada });
}
