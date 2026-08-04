import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { googleAdsCustomerId } from "@/lib/integrations";
import { listarCampanhasNaContaGoogleAds, importarCampanhaDaContaGoogleAds } from "@/lib/googleAds";
import { listarCampanhas, criarPastaCampanha, salvarCampanha, type CampanhaAds } from "@/lib/mktOnline";

/**
 * Campanhas de Google Ads que já existem na conta do cliente mas ainda não
 * são rastreadas pelo Hub (cliente que já anunciava antes de usar o
 * CentralPlus, ou campanha criada direto na interface do Google) — ver
 * docs/GOOGLE-ADS-API.md. GET lista o que dá pra importar, POST importa uma.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const resultado = await listarCampanhasNaContaGoogleAds(googleAdsCustomerId(slug));
  if (!resultado.ok) return NextResponse.json({ error: resultado.mensagem }, { status: 502 });

  const jaRastreadas = new Set(
    listarCampanhas(slug, "google")
      .map((c) => c.campanha.aplicacao?.googleCampaignId)
      .filter(Boolean),
  );
  const naoRastreadas = resultado.dados.filter((c) => !jaRastreadas.has(c.id));
  return NextResponse.json({ campanhas: naoRastreadas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  let body: { googleCampaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.googleCampaignId) return NextResponse.json({ error: "googleCampaignId obrigatório" }, { status: 400 });

  const resultado = await importarCampanhaDaContaGoogleAds(googleAdsCustomerId(slug), body.googleCampaignId);
  if (!resultado.ok || !resultado.campanha) {
    return NextResponse.json({ error: resultado.mensagem }, { status: 502 });
  }
  const c = resultado.campanha;
  const now = new Date().toISOString();
  const campanha: CampanhaAds = {
    plataforma: "google",
    titulo: c.titulo,
    tipo: "servico",
    descricaoNegocio: "Importada da conta real do Google Ads — conteúdo original, não gerado pelo Hub.",
    headlines: c.headlines,
    descriptions: c.descriptions,
    palavrasChave: c.palavrasChave,
    palavrasNegativas: c.palavrasNegativas,
    localizacoes: c.localizacoes,
    publico: "",
    orcamentoSugeridoDia: c.orcamentoSugeridoDia,
    tipoOrcamento: "diario",
    urlDestino: c.urlDestino,
    status: "aplicada",
    statusGoogleAds: c.statusGoogleAds,
    aplicacao: {
      tentadoEm: now,
      ok: true,
      mensagem: "Importada de uma campanha que já existia na conta do Google Ads.",
      googleCampaignId: c.googleCampaignId,
      googleAdGroupId: c.googleAdGroupId,
    },
    criadoEm: now,
    atualizadoEm: now,
  };
  const nome = criarPastaCampanha(slug, "google", c.titulo);
  salvarCampanha(slug, "google", nome, campanha);
  return NextResponse.json({ ok: true, mensagem: resultado.mensagem, nome, campanha });
}
