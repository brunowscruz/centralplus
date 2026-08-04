import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerCampanha, removerCampanha, listarCampanhas, salvarCampanha, type PlataformaAds } from "@/lib/mktOnline";
import { googleAdsCustomerId } from "@/lib/integrations";
import { removerCampanhaGoogleAds } from "@/lib/googleAds";

function parsePlataforma(v: string | null): PlataformaAds | null {
  return v === "google" || v === "meta" ? v : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const { slug: raw, campanha } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const plataforma = parsePlataforma(req.nextUrl.searchParams.get("plataforma"));
  if (!plataforma) return NextResponse.json({ error: "plataforma deve ser google ou meta" }, { status: 400 });

  let campanhaData;
  try {
    campanhaData = lerCampanha(auth.slug, plataforma, decodeURIComponent(campanha));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!campanhaData) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });
  return NextResponse.json({ campanha: campanhaData });
}

/** Edita campos de texto/número editáveis direto pela UI (URL de destino,
 * orçamento) — o resto do conteúdo é sempre via chat, ver AdsTab.tsx. A
 * Google Ads API exige final_url em todo anúncio e só aceita orçamento
 * DIÁRIO nativamente — quando tipoOrcamento é "mensal", quem chama esta
 * rota já manda orcamentoSugeridoDia convertido (valor mensal ÷ 30.4), este
 * campo aqui só guarda a forma como o operador pensou o valor. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const { slug: raw, campanha } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const plataforma = parsePlataforma(req.nextUrl.searchParams.get("plataforma"));
  if (!plataforma) return NextResponse.json({ error: "plataforma deve ser google ou meta" }, { status: 400 });

  let body: { urlDestino?: string; orcamentoSugeridoDia?: number; tipoOrcamento?: "diario" | "mensal"; localizacoes?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const nome = decodeURIComponent(campanha);
  const atual = lerCampanha(auth.slug, plataforma, nome);
  if (!atual) return NextResponse.json({ error: "campanha não encontrada" }, { status: 404 });

  const proxima = {
    ...atual,
    ...("urlDestino" in body ? { urlDestino: (body.urlDestino || "").trim() || undefined } : {}),
    ...("orcamentoSugeridoDia" in body ? { orcamentoSugeridoDia: body.orcamentoSugeridoDia || undefined } : {}),
    ...("tipoOrcamento" in body ? { tipoOrcamento: body.tipoOrcamento } : {}),
    ...("localizacoes" in body ? { localizacoes: (body.localizacoes || []).map((l) => l.trim()).filter(Boolean) } : {}),
    atualizadoEm: new Date().toISOString(),
  };
  salvarCampanha(auth.slug, plataforma, nome, proxima);
  return NextResponse.json({ campanha: proxima });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; campanha: string }> }) {
  const { slug: raw, campanha } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const plataforma = parsePlataforma(req.nextUrl.searchParams.get("plataforma"));
  if (!plataforma) return NextResponse.json({ error: "plataforma deve ser google ou meta" }, { status: 400 });

  const nome = decodeURIComponent(campanha);

  // Se já foi aplicada de verdade na API, precisa remover de lá TAMBÉM —
  // senão fica uma campanha pausada esquecida na conta, sem ninguém
  // rastreando (só apagamos o registro local, nada muda na conta real).
  if (plataforma === "google") {
    const atual = lerCampanha(auth.slug, plataforma, nome);
    const googleCampaignId = atual?.aplicacao?.googleCampaignId;
    if (googleCampaignId) {
      const resultado = await removerCampanhaGoogleAds(googleAdsCustomerId(auth.slug), googleCampaignId);
      if (!resultado.ok) {
        return NextResponse.json({ error: `Não removida: ${resultado.mensagem}` }, { status: 502 });
      }
    }
  }

  try {
    removerCampanha(auth.slug, plataforma, nome);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ campanhas: listarCampanhas(auth.slug, plataforma) });
}
