import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/bos";
import { tenantExists } from "@/lib/tenants";
import { lerCampanha, registrarResultadoAplicacaoCampanha, type PlataformaAds } from "@/lib/mktOnline";
import { googleAdsCustomerId } from "@/lib/integrations";
import { aplicarCampanhaGoogleAds } from "@/lib/googleAds";
import { logAudit } from "@/lib/audit";

/** Cria a campanha DE VERDADE (pausada) na conta de Google Ads do cliente
 * via API — dinheiro real do cliente, mesmo pausada. Owner-only, mesmo
 * padrão de risco de `site/approve` e `publicar-wordpress`. Só suporta
 * plataforma "google" (Meta Ads continua 100% manual, ver
 * docs/GOOGLE-ADS-API.md). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador aplica uma campanha de verdade" }, { status: 403 });
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

  const plataforma: PlataformaAds = "google";
  const nome = decodeURIComponent(campanha);
  const dados = lerCampanha(slug, plataforma, nome);
  if (!dados) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });

  const customerId = googleAdsCustomerId(slug);
  const resultado = await aplicarCampanhaGoogleAds(customerId, dados);
  const campanhaAtualizada = registrarResultadoAplicacaoCampanha(slug, plataforma, nome, resultado);

  logAudit({
    ator: session.email || "owner",
    acao: resultado.ok ? "google_ads.campanha_aplicada" : "google_ads.campanha_falhou",
    alvo: slug,
    detalhe: `${nome}: ${resultado.mensagem}`,
  });

  return NextResponse.json({ ...resultado, campanha: campanhaAtualizada });
}
