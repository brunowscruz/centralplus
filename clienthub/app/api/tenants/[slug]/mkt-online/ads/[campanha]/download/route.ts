import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerCampanha, gerarCsvGoogleAds, gerarResumoMetaAds, type PlataformaAds } from "@/lib/mktOnline";

function parsePlataforma(v: string | null): PlataformaAds | null {
  return v === "google" || v === "meta" ? v : null;
}

/** Google → CSV real, importável no Google Ads Editor. Meta → resumo de
 * texto organizado (o formato de importação em massa da Meta exige
 * template baixado na hora, não dá pra fixar com segurança — ver
 * lib/mktOnline.ts). Nunca finge que os dois são a mesma coisa. */
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

  if (plataforma === "google") {
    return new NextResponse(gerarCsvGoogleAds(campanhaData), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${decodeURIComponent(campanha)}.csv"`,
      },
    });
  }
  return new NextResponse(gerarResumoMetaAds(campanhaData), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${decodeURIComponent(campanha)}.txt"`,
    },
  });
}
