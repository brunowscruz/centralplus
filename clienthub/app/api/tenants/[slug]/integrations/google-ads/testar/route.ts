import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/bos";
import { readIntegrations, googleAdsConfigurado } from "@/lib/integrations";
import { testarConexaoGoogleAds } from "@/lib/googleAds";

/** Testa se o customer_id salvo pra este cliente está de fato acessível
 * pela Manager Account da instalação — não muda nada, não gasta nada, só
 * confirma antes do operador tentar aplicar uma campanha de verdade. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  const { slug: raw } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }

  if (!googleAdsConfigurado()) {
    return NextResponse.json({ error: "credenciais globais de Google Ads não configuradas nesta instalação (ver docs/GOOGLE-ADS-API.md)" }, { status: 400 });
  }
  const customerId = readIntegrations(slug).googleAds?.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "salve o Customer ID deste cliente antes de testar" }, { status: 400 });
  }

  const resultado = await testarConexaoGoogleAds(customerId);
  return NextResponse.json(resultado);
}
