/**
 * Google Places API — busca de avaliações REAIS e públicas de um
 * estabelecimento. IMPORTANTE: essa é uma API DIFERENTE da Google Business
 * Profile API (essa sim travada esperando o token/OAuth aprovado) — a
 * Places API é self-service, qualquer projeto no Google Cloud com
 * faturamento habilitado já consegue usar, sem fila de aprovação. Por isso
 * "buscar avaliações" já pode ser feito de forma 100% oficial hoje, mesmo
 * antes do token da Business Profile sair.
 *
 * Limitação real da API (não é bug nosso): a Place Details só devolve as
 * 5 avaliações mais recentes — não dá pra puxar o histórico completo. Isso
 * é documentado pela própria Google, não escondemos isso do usuário.
 *
 * RESPONDER a avaliação (escrever de volta no Google) continua exigindo o
 * token da Business Profile API ou a ponte Claude-in-Chrome — a Places API
 * é só leitura.
 */

export interface AvaliacaoGooglePlaces {
  autor?: string;
  nota: number;
  texto: string;
  dataUnix: number; // segundos desde epoch
}

export interface CandidatoPlaceId {
  placeId: string;
  nome: string;
  endereco: string;
}

export function googlePlacesConfigurado(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

/** Busca por nome (Text Search) — pra achar o Place ID sem o usuário
 * precisar ir num site externo. Devolve os candidatos encontrados; quem
 * chama decide qual é o certo (nome+endereço na tela). */
export async function buscarPlaceIdPorNome(
  consulta: string,
): Promise<{ ok: true; candidatos: CandidatoPlaceId[] } | { ok: false; mensagem: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return { ok: false, mensagem: "GOOGLE_PLACES_API_KEY não configurada nesta instalação." };
  }
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(consulta)}&language=pt-BR&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      error_message?: string;
      results?: { place_id?: string; name?: string; formatted_address?: string }[];
    } | null;

    if (!res.ok || !data || (data.status !== "OK" && data.status !== "ZERO_RESULTS")) {
      return { ok: false, mensagem: data?.error_message || `Google recusou a busca (status: ${data?.status || res.status}).` };
    }

    const candidatos = (data.results || [])
      .filter((r) => r.place_id && r.name)
      .slice(0, 5)
      .map((r) => ({ placeId: r.place_id!, nome: r.name!, endereco: r.formatted_address || "" }));
    return { ok: true, candidatos };
  } catch (e) {
    return { ok: false, mensagem: `falha de conexão com a Places API: ${(e as Error).message}` };
  }
}

export async function buscarAvaliacoesReais(
  placeId: string,
): Promise<{ ok: true; avaliacoes: AvaliacaoGooglePlaces[] } | { ok: false; mensagem: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return { ok: false, mensagem: "GOOGLE_PLACES_API_KEY não configurada nesta instalação." };
  }
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&language=pt-BR&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      error_message?: string;
      result?: { reviews?: { author_name?: string; rating?: number; text?: string; time?: number }[] };
    } | null;

    if (!res.ok || !data || data.status !== "OK") {
      return { ok: false, mensagem: data?.error_message || `Google recusou a busca (status: ${data?.status || res.status}).` };
    }

    const avaliacoes = (data.result?.reviews || []).map((r) => ({
      autor: r.author_name,
      nota: r.rating ?? 0,
      texto: r.text || "",
      dataUnix: r.time || Math.floor(Date.now() / 1000),
    }));
    return { ok: true, avaliacoes };
  } catch (e) {
    return { ok: false, mensagem: `falha de conexão com a Places API: ${(e as Error).message}` };
  }
}
