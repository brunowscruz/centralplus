import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { lerPerfilNegocioSeo, lerReviews, salvarReview, type SentimentoReview } from "@/lib/seoLocal";
import { buscarAvaliacoesReais, googlePlacesConfigurado } from "@/lib/googlePlaces";

/**
 * Busca avaliações REAIS via Google Places API (oficial, sem depender do
 * token pendente da Business Profile API — ver lib/googlePlaces.ts) e
 * registra as que ainda não conhecíamos, sem resposta sugerida ainda (isso
 * continua sendo um passo separado, disparado pelo usuário na tela).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  if (!googlePlacesConfigurado()) {
    return NextResponse.json({ error: "Busca automática de avaliações não configurada nesta instalação (falta GOOGLE_PLACES_API_KEY)." }, { status: 400 });
  }
  const perfil = lerPerfilNegocioSeo(auth.slug);
  if (!perfil?.placeId) {
    return NextResponse.json({ error: "Configure o Place ID do Google nesta tela antes de buscar." }, { status: 400 });
  }

  const resultado = await buscarAvaliacoesReais(perfil.placeId);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
  }

  const atuais = lerReviews(auth.slug).reviews;
  const jaConhecidas = new Set(atuais.map((r) => `${r.avaliacaoAutor || ""}-${r.dataRecebida}`));
  let novas = 0;

  for (const av of resultado.avaliacoes) {
    const dataRecebida = new Date(av.dataUnix * 1000).toISOString();
    const chave = `${av.autor || ""}-${dataRecebida}`;
    if (jaConhecidas.has(chave)) continue;

    const sentimento: SentimentoReview = av.nota <= 2 ? "negativa" : av.nota === 3 ? "neutra" : "positiva";
    const agora = new Date().toISOString();
    salvarReview(auth.slug, {
      id: `places-${av.dataUnix}-${Math.random().toString(36).slice(2, 7)}`,
      avaliacaoTexto: av.texto,
      avaliacaoAutor: av.autor,
      notaEstrelas: av.nota,
      dataRecebida,
      sentimento,
      respostaSugerida: "",
      exigeAprovacao: sentimento === "negativa",
      status: "rascunho",
      slaVencimentoEm: new Date(av.dataUnix * 1000 + 48 * 60 * 60 * 1000).toISOString(),
      criadoEm: agora,
      atualizadoEm: agora,
    });
    novas++;
  }

  return NextResponse.json({ ok: true, novas, total: resultado.avaliacoes.length });
}
