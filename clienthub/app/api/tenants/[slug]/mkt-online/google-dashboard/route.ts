import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { googleAdsCustomerId } from "@/lib/integrations";
import { buscarMetricasCampanhas, buscarMetricasPalavrasChave, buscarMetricasDiarias } from "@/lib/googleAds";
import { readCrm } from "@/lib/crm";
import { listarConversa } from "@/lib/whatsapp";
import { lerReviews } from "@/lib/seoLocal";

export const dynamic = "force-dynamic";

/**
 * Dashboard "Google" do MKT Online: junta 3 fontes de dado REAL — Google
 * Ads (API), Leads (CRM + WhatsApp, arquivo do tenant), Avaliações (Google
 * Places API, já sincronizadas via seo-local/reviews). Nunca inventa
 * número: cada bloco tem seu próprio `ok`/`configurado`, a tela decide como
 * mostrar honestamente quando uma fonte não tem dado ainda (regra de ouro
 * do produto — ver CLAUDE.md).
 *
 * Não inclui "Google orgânico" (visualizações no Maps/busca) — isso
 * depende da Google Business Profile Performance API, que exige um pedido
 * de acesso separado ao Google (em andamento, ver docs). Sem credencial
 * configurada, esse bloco simplesmente não aparece no retorno.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const dias = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("dias")) || 30));
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const customerId = googleAdsCustomerId(slug);

  const [campanhas, palavrasChave, diarias] = await Promise.all([
    buscarMetricasCampanhas(customerId, dias),
    buscarMetricasPalavrasChave(customerId, dias, 8),
    buscarMetricasDiarias(customerId, dias),
  ]);

  // Leads: CRM (todas as origens) + contagem de conversas novas de WhatsApp
  // no período — não soma os dois cegamente (um lead vindo do WhatsApp já
  // é um CrmLead com origem "WhatsApp", contar os dois juntos duplicaria).
  const crm = readCrm(slug);
  const leadsNoPeriodo = crm.leads.filter((l) => new Date(l.criadoEm) >= desde);
  const porOrigem: Record<string, number> = {};
  for (const l of leadsNoPeriodo) {
    const origem = l.origem?.trim() || "Não informado";
    porOrigem[origem] = (porOrigem[origem] || 0) + 1;
  }

  const mensagens = listarConversa(slug);
  const primeiraMensagemPorNumero = new Map<string, string>();
  for (const m of mensagens) {
    const atual = primeiraMensagemPorNumero.get(m.numero);
    if (!atual || m.criadoEm < atual) primeiraMensagemPorNumero.set(m.numero, m.criadoEm);
  }
  const conversasNovasWhatsapp = Array.from(primeiraMensagemPorNumero.values()).filter(
    (dataIso) => new Date(dataIso) >= desde,
  ).length;

  // Avaliações: a Google Places API só devolve as 5 mais recentes (limite
  // do próprio Google, não é filtro nosso) — nota/total refletem isso, não
  // o histórico completo do perfil.
  const reviews = lerReviews(slug).reviews;
  const notaMedia = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.notaEstrelas, 0) / reviews.length) * 10) / 10 : null;

  return NextResponse.json({
    periodo: { dias, desde: desde.toISOString().slice(0, 10), ate: new Date().toISOString().slice(0, 10) },
    googleAds: {
      configurado: !!customerId,
      customerId: customerId || null,
      campanhas: { ok: campanhas.ok, mensagem: campanhas.mensagem, dados: campanhas.dados },
      palavrasChave: { ok: palavrasChave.ok, mensagem: palavrasChave.mensagem, dados: palavrasChave.dados },
      diarias: { ok: diarias.ok, mensagem: diarias.mensagem, dados: diarias.dados },
    },
    leads: {
      totalCrm: leadsNoPeriodo.length,
      conversasNovasWhatsapp,
      porOrigem,
    },
    avaliacoes: {
      configurado: reviews.length > 0,
      notaMedia,
      total: reviews.length,
      recentes: reviews.slice(0, 5).map((r) => ({
        autor: r.avaliacaoAutor || "Anônimo",
        texto: r.avaliacaoTexto,
        nota: r.notaEstrelas,
        data: r.dataRecebida,
        respondida: r.status === "aplicada",
      })),
    },
    // Google orgânico (Maps/busca) — sem credencial da Business Profile
    // Performance API nesta instalação ainda. Ver
    // docs/GOOGLE-BUSINESS-PROFILE-API.md quando existir.
    buscaOrganica: {
      configurado: !!process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN,
    },
  });
}
