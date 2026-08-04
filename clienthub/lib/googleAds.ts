import { GoogleAdsApi, ResourceNames, enums, toMicros, MutateOperation } from "google-ads-api";
import type { CampanhaAds } from "./mktOnline";

/**
 * Aplicação REAL de campanha na Google Ads API — ver docs/GOOGLE-ADS-API.md
 * pro contrato completo. Credenciais são globais da instalação (uma MCC,
 * um Developer Token servem a agência inteira — nunca por-tenant), só o
 * `customer_id` (conta de Ads do cliente) é por-tenant.
 *
 * Mesmo espírito de lib/publish.ts: nunca lança erro pra fora, sempre
 * devolve { ok, mensagem } — falha de API não pode derrubar a rota que
 * chamou, só ser reportada com uma mensagem clara.
 */

function clienteGlobal(): GoogleAdsApi {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
}

function criarClienteGoogleAds(customerId: string) {
  return clienteGlobal().Customer({
    customer_id: customerId,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });
}

/** A `google-ads-api` não lança `Error` de verdade quando a falha vem da
 * própria Google Ads API (ex: mutateResources) — lança o objeto decodificado
 * `GoogleAdsFailure` (`{ errors: [{ message, error_code }], request_id }`),
 * que não tem `.message` — por isso `(e as Error).message` virava
 * "undefined" na tela (é exatamente isso que aconteceu na campanha "Marketing
 * Digital IA PME" do exacta-labs). Aqui extrai a mensagem real de qualquer um
 * dos dois formatos, com fallback pro texto bruto se nem isso existir. */
function mensagemErroGoogleAds(e: unknown): string {
  const falha = e as {
    errors?: {
      message?: string;
      error_code?: unknown;
      location?: { field_path_elements?: { field_name?: string; index?: number }[] };
    }[];
    message?: string;
  };
  if (Array.isArray(falha?.errors) && falha.errors.length > 0) {
    return falha.errors
      .map((err) => {
        const campo = err.location?.field_path_elements?.map((f) => f.field_name).filter(Boolean).join(".");
        const base = err.message || (err.error_code ? JSON.stringify(err.error_code) : "erro sem detalhe");
        return campo ? `${base} (campo: ${campo})` : base;
      })
      .join(" | ");
  }
  if (falha?.message) return falha.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export interface ResultadoGoogleAds {
  ok: boolean;
  mensagem: string;
  googleCampaignId?: string;
  googleAdGroupId?: string;
}

// ---------------------------------------------------------------------------
// Leitura de métricas (dashboard) — só SELECT via GAQL, nunca muda nada na
// conta do cliente. Mesmo padrão de nunca lançar erro pra fora: devolve
// { ok:false, mensagem } explicando o que faltou, pra tela mostrar honesto
// em vez de fingir que tem dado.
// ---------------------------------------------------------------------------

export interface MetricasCampanha {
  id: string;
  nome: string;
  status: string;
  cliques: number;
  impressoes: number;
  custoReais: number;
  conversoes: number;
}

export interface MetricasPalavraChave {
  texto: string;
  impressoes: number;
  cliques: number;
}

export interface MetricasDiarias {
  data: string; // YYYY-MM-DD
  cliques: number;
  custoReais: number;
  impressoes: number;
}

export interface ResultadoMetricas<T> {
  ok: boolean;
  mensagem: string;
  dados: T[];
}

function microsParaReais(micros: string | number | null | undefined): number {
  const n = Number(micros ?? 0);
  return Math.round((n / 1_000_000) * 100) / 100;
}

/** Janela de datas no formato aceito pelo GAQL (BETWEEN 'YYYY-MM-DD' AND
 * 'YYYY-MM-DD') — evita LAST_30_DAYS fixo pra permitir período customizado
 * igual o resto do produto usa (financeiro, relatório de ads). */
function clausulaPeriodo(diasAtras: number): string {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - diasAtras);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `segments.date BETWEEN '${fmt(inicio)}' AND '${fmt(fim)}'`;
}

function semCredenciais(customerId?: string): string | null {
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return "credenciais globais de Google Ads não configuradas nesta instalação.";
  }
  if (!customerId) {
    return "este cliente ainda não tem uma conta de Google Ads vinculada — configure em Configurações → Google Ads.";
  }
  return null;
}

// A lib `google-ads-api` (v24.1.0, a mais recente no npm) fala internamente
// com uma versão da Google Ads API já descontinuada pelo Google (v17-v19,
// confirmado em teste manual: 404) e ainda tem um bug ao decodificar o erro
// disso (`Cannot read properties of undefined (reading 'get')`), o que deixa
// qualquer falha ilegível. Testado manualmente contra a API REST (v20 também
// já descontinuada; v21 em diante funciona) — por isso as funções de LEITURA
// de métrica abaixo chamam a REST API direto, sem depender da lib. A criação
// de campanha (`aplicarCampanhaGoogleAds`, `mutateResources`) continua na lib
// porque esse caminho específico já foi validado funcionando em produção.
const GOOGLE_ADS_API_VERSION = "v21";

async function tokenDeAcesso(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`falha ao renovar token de acesso: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token as string;
}

interface GoogleAdsSearchRow {
  campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
  campaignBudget?: { amountMicros?: string };
  campaignCriterion?: { location?: { geoTargetConstant?: string }; negative?: boolean };
  geoTargetConstant?: { canonicalName?: string; name?: string };
  adGroup?: { id?: string; name?: string; status?: string };
  adGroupAd?: { ad?: { id?: string; finalUrls?: string[]; responsiveSearchAd?: { headlines?: { text?: string }[]; descriptions?: { text?: string }[] } } };
  adGroupCriterion?: { keyword?: { text?: string }; negative?: boolean };
  sharedSet?: { resourceName?: string };
  sharedCriterion?: { keyword?: { text?: string } };
  conversionAction?: { resourceName?: string };
  metrics?: { clicks?: string; impressions?: string; costMicros?: string; conversions?: string };
  segments?: { date?: string };
}

async function queryGoogleAdsRest(customerId: string, gaql: string): Promise<GoogleAdsSearchRow[]> {
  const accessToken = await tokenDeAcesso();
  const results: GoogleAdsSearchRow[] = [];
  let pageToken: string | undefined;
  do {
    const res = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gaql, pageToken }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error?.details?.[0]?.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    results.push(...(data.results || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return results;
}

/** Desempenho por campanha (usado no dashboard "Google Ads — o que tá
 * entrando"). Só campanhas SEARCH criadas por este produto fazem sentido
 * aqui, mas a query não filtra por origem — mostra tudo que existir na
 * conta, real. */
export async function buscarMetricasCampanhas(
  customerId: string | undefined,
  diasAtras = 30,
): Promise<ResultadoMetricas<MetricasCampanha>> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro, dados: [] };
  try {
    const linhas = await queryGoogleAdsRest(
      customerId!,
      `SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE ${clausulaPeriodo(diasAtras)}
      ORDER BY metrics.cost_micros DESC`,
    );
    const dados: MetricasCampanha[] = linhas.map((r) => ({
      id: String(r.campaign?.id ?? ""),
      nome: r.campaign?.name ?? "(sem nome)",
      status: String(r.campaign?.status ?? ""),
      cliques: Number(r.metrics?.clicks ?? 0),
      impressoes: Number(r.metrics?.impressions ?? 0),
      custoReais: microsParaReais(r.metrics?.costMicros),
      conversoes: Number(r.metrics?.conversions ?? 0),
    }));
    return { ok: true, mensagem: "", dados };
  } catch (e) {
    return { ok: false, mensagem: `falha ao buscar métricas de campanhas: ${mensagemErroGoogleAds(e)}`, dados: [] };
  }
}

/** Top palavras-chave por impressões — "o que mais convertem" no dashboard. */
export async function buscarMetricasPalavrasChave(
  customerId: string | undefined,
  diasAtras = 30,
  limite = 8,
): Promise<ResultadoMetricas<MetricasPalavraChave>> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro, dados: [] };
  try {
    const linhas = await queryGoogleAdsRest(
      customerId!,
      `SELECT
        ad_group_criterion.keyword.text,
        metrics.impressions,
        metrics.clicks
      FROM keyword_view
      WHERE ${clausulaPeriodo(diasAtras)}
      ORDER BY metrics.impressions DESC
      LIMIT ${limite}`,
    );
    const dados: MetricasPalavraChave[] = linhas.map((r) => ({
      texto: r.adGroupCriterion?.keyword?.text ?? "",
      impressoes: Number(r.metrics?.impressions ?? 0),
      cliques: Number(r.metrics?.clicks ?? 0),
    }));
    return { ok: true, mensagem: "", dados };
  } catch (e) {
    return { ok: false, mensagem: `falha ao buscar palavras-chave: ${mensagemErroGoogleAds(e)}`, dados: [] };
  }
}

/** Série diária de cliques/custo/impressões — alimenta o gráfico de linha. */
export async function buscarMetricasDiarias(
  customerId: string | undefined,
  diasAtras = 30,
): Promise<ResultadoMetricas<MetricasDiarias>> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro, dados: [] };
  try {
    const linhas = await queryGoogleAdsRest(
      customerId!,
      `SELECT
        segments.date,
        metrics.clicks,
        metrics.cost_micros,
        metrics.impressions
      FROM customer
      WHERE ${clausulaPeriodo(diasAtras)}
      ORDER BY segments.date ASC`,
    );
    const dados: MetricasDiarias[] = linhas.map((r) => ({
      data: String(r.segments?.date ?? ""),
      cliques: Number(r.metrics?.clicks ?? 0),
      custoReais: microsParaReais(r.metrics?.costMicros),
      impressoes: Number(r.metrics?.impressions ?? 0),
    }));
    return { ok: true, mensagem: "", dados };
  } catch (e) {
    return { ok: false, mensagem: `falha ao buscar série diária: ${mensagemErroGoogleAds(e)}`, dados: [] };
  }
}

export interface CampanhaGoogleAdsExistente {
  id: string;
  nome: string;
  status: string;
  orcamentoDiario?: number;
}

/** Campanhas de Rede de Pesquisa que já existem na conta — usado pra
 * cliente que já tinha Google Ads antes de usar o Hub (agência anterior,
 * ele mesmo configurou etc). Quem chama filtra pelos ids que já viraram
 * campanha.json local, pra só oferecer importar o que ainda não é
 * rastreado. Não filtra REMOVED nem PAUSED — o operador decide o que
 * importar. */
export async function listarCampanhasNaContaGoogleAds(
  customerId: string | undefined,
): Promise<ResultadoMetricas<CampanhaGoogleAdsExistente>> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro, dados: [] };
  try {
    const linhas = await queryGoogleAdsRest(
      customerId!,
      `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros
       FROM campaign
       WHERE campaign.status != 'REMOVED'
       ORDER BY campaign.name`,
    );
    const dados: CampanhaGoogleAdsExistente[] = linhas
      .filter((r) => r.campaign?.advertisingChannelType === "SEARCH")
      .map((r) => ({
        id: String(r.campaign?.id ?? ""),
        nome: r.campaign?.name || "(sem nome)",
        status: String(r.campaign?.status ?? ""),
        orcamentoDiario: r.campaignBudget?.amountMicros ? microsParaReais(r.campaignBudget.amountMicros) : undefined,
      }));
    return { ok: true, mensagem: "", dados };
  } catch (e) {
    return { ok: false, mensagem: `falha ao listar campanhas da conta: ${mensagemErroGoogleAds(e)}`, dados: [] };
  }
}

export interface CampanhaImportadaGoogleAds {
  titulo: string;
  headlines: string[];
  descriptions: string[];
  palavrasChave: string[];
  palavrasNegativas: string[];
  localizacoes: string[];
  urlDestino?: string;
  orcamentoSugeridoDia?: number;
  googleCampaignId: string;
  googleAdGroupId?: string;
  statusGoogleAds: "ENABLED" | "PAUSED";
}

/** Puxa o conteúdo de UMA campanha que já existe na conta pra virar
 * campanha.json local (editável/pausável/removível pelo Hub dali em
 * diante). Nosso modelo é "1 campanha.json = 1 grupo de anúncio" — se a
 * campanha real tiver mais de um grupo, só o primeiro (ativo) é
 * importado; os outros continuam existindo na conta, só não aparecem
 * aqui. Sempre honesto sobre isso na mensagem de retorno. */
export async function importarCampanhaDaContaGoogleAds(
  customerId: string | undefined,
  googleCampaignId: string,
): Promise<{ ok: boolean; mensagem: string; campanha?: CampanhaImportadaGoogleAds }> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro };
  try {
    const [campanhaLinhas, gruposLinhas] = await Promise.all([
      queryGoogleAdsRest(
        customerId!,
        `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros
         FROM campaign WHERE campaign.id = ${googleCampaignId}`,
      ),
      queryGoogleAdsRest(
        customerId!,
        `SELECT ad_group.id, ad_group.name, ad_group.status FROM ad_group
         WHERE campaign.id = ${googleCampaignId} AND ad_group.status != 'REMOVED' LIMIT 1`,
      ),
    ]);
    const campanhaRow = campanhaLinhas[0];
    if (!campanhaRow) return { ok: false, mensagem: "campanha não encontrada na conta." };
    const grupoRow = gruposLinhas[0];
    const adGroupId = grupoRow?.adGroup?.id;

    const [criteriosLinhas, anuncioLinhas, geoLinhas] = await Promise.all([
      adGroupId
        ? queryGoogleAdsRest(
            customerId!,
            `SELECT ad_group_criterion.keyword.text, ad_group_criterion.negative FROM ad_group_criterion
             WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status != 'REMOVED'`,
          )
        : Promise.resolve([]),
      adGroupId
        ? queryGoogleAdsRest(
            customerId!,
            `SELECT ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.final_urls
             FROM ad_group_ad WHERE ad_group.id = ${adGroupId} AND ad_group_ad.status != 'REMOVED' LIMIT 1`,
          )
        : Promise.resolve([]),
      queryGoogleAdsRest(
        customerId!,
        `SELECT campaign_criterion.location.geo_target_constant FROM campaign_criterion
         WHERE campaign.id = ${googleCampaignId} AND campaign_criterion.type = 'LOCATION' AND campaign_criterion.negative = false`,
      ),
    ]);

    const palavrasChave = criteriosLinhas.filter((r) => !r.adGroupCriterion?.negative).map((r) => r.adGroupCriterion?.keyword?.text || "").filter(Boolean);
    const palavrasNegativas = criteriosLinhas.filter((r) => r.adGroupCriterion?.negative).map((r) => r.adGroupCriterion?.keyword?.text || "").filter(Boolean);
    const anuncio = anuncioLinhas[0]?.adGroupAd?.ad;
    const headlines = (anuncio?.responsiveSearchAd?.headlines || []).map((h) => h.text || "").filter(Boolean);
    const descriptions = (anuncio?.responsiveSearchAd?.descriptions || []).map((d) => d.text || "").filter(Boolean);

    const localizacoes: string[] = [];
    for (const row of geoLinhas) {
      const geoRN = row.campaignCriterion?.location?.geoTargetConstant;
      if (!geoRN) continue;
      try {
        const [nomeLinha] = await queryGoogleAdsRest(customerId!, `SELECT geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.resource_name = '${geoRN}'`);
        if (nomeLinha?.geoTargetConstant?.canonicalName) localizacoes.push(nomeLinha.geoTargetConstant.canonicalName);
      } catch {
        /* localização individual falhando não deve derrubar a importação inteira */
      }
    }

    return {
      ok: true,
      mensagem: adGroupId
        ? "Campanha importada."
        : "Campanha importada, mas não tem nenhum grupo de anúncio ativo — conteúdo (títulos/palavras-chave) veio vazio, só dá pra pausar/remover.",
      campanha: {
        titulo: campanhaRow.campaign?.name || `Campanha ${googleCampaignId}`,
        headlines,
        descriptions,
        palavrasChave,
        palavrasNegativas,
        localizacoes,
        urlDestino: anuncio?.finalUrls?.[0],
        orcamentoSugeridoDia: campanhaRow.campaignBudget?.amountMicros ? microsParaReais(campanhaRow.campaignBudget.amountMicros) : undefined,
        googleCampaignId,
        googleAdGroupId: adGroupId,
        statusGoogleAds: campanhaRow.campaign?.status === "ENABLED" ? "ENABLED" : "PAUSED",
      },
    };
  } catch (e) {
    return { ok: false, mensagem: `falha ao importar campanha: ${mensagemErroGoogleAds(e)}` };
  }
}

/** Confirma que o customer_id colado pelo operador é válido e está
 * acessível pela MCC configurada — não muda nada, só lista. Usado pelo
 * botão "Testar conexão" ANTES de qualquer campanha real ser aplicada. */
export async function testarConexaoGoogleAds(customerId: string): Promise<ResultadoGoogleAds> {
  try {
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    if (!refreshToken) {
      return { ok: false, mensagem: "GOOGLE_ADS_REFRESH_TOKEN não configurado nesta instalação." };
    }
    const client = clienteGlobal();
    const resp = await client.listAccessibleCustomers(refreshToken);
    const acessiveis = (resp.resource_names || []).map((rn) => rn.replace("customers/", ""));
    if (!acessiveis.includes(customerId)) {
      return {
        ok: false,
        mensagem: `A conta ${customerId} não aparece entre as contas acessíveis pela Manager Account desta instalação — confirme se ela já foi vinculada de verdade (convite aceito) à MCC ${process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID}.`,
      };
    }
    return { ok: true, mensagem: "Conexão confirmada — a conta está acessível." };
  } catch (e) {
    return { ok: false, mensagem: `falha ao testar conexão: ${mensagemErroGoogleAds(e)}` };
  }
}

function extrairId(resourceName: string | null | undefined): string | undefined {
  if (!resourceName) return undefined;
  return resourceName.split("/").pop();
}

/** Cabeçalho de "snippet estruturado" é validado pela API contra uma lista
 * fixa — sempre em inglês, mesmo em conta PT-BR (o Google traduz na hora de
 * exibir). Fora dessa lista, a API rejeita a campanha inteira. */
export const HEADERS_SNIPPET_VALIDOS = [
  "Amenities",
  "Brands",
  "Courses",
  "Degree programs",
  "Destinations",
  "Featured hotels",
  "Insurance coverage",
  "Models",
  "Neighborhoods",
  "Service catalog",
  "Services",
  "Styles",
  "Types",
] as const;

interface GeoTargetConstantSugestao {
  geoTargetConstant?: { resourceName?: string; name?: string; countryCode?: string; targetType?: string };
  reach?: string;
  searchTerm?: string;
}

/** Resolve nome de cidade/região (texto livre, ex: "Santos, SP") pro
 * resource_name interno que a Google Ads API exige pra segmentação
 * geográfica (`campaign_criterion.location.geo_target_constant`) — não tem
 * como aplicar geo-segmentação sem esse ID, e ele não é previsível (não é
 * um hash do nome), então precisa de uma chamada própria à API pra achar.
 * Sem geo-segmentação nenhuma, a campanha roda com o alcance default da
 * conta — quase sempre grande demais pra um negócio local, daí a campanha
 * inteira falhar (nunca aplicar "sem querer" sem segmentação) quando o
 * operador pediu localização e ela não foi encontrada. */
/** A busca da própria Google só casa bem com o nome "puro" da cidade — testado
 * manualmente: "Santos, SP" (com vírgula+UF, do jeito que a IA/operador
 * normalmente escreve) não acha nada ou acha lugar errado (município da
 * Espanha!); "Santos" sozinho acha certo. locale "pt" também dá resultado
 * pior que "en" pra cidade brasileira (motivo não documentado pela Google,
 * validado testando os dois). Por isso: tira a parte depois da vírgula
 * (UF/país) e os acentos antes de perguntar, manda locale "en", e filtra o
 * resultado pra Brasil no nosso lado (o parâmetro countryCode do pedido
 * também piora o casamento quando combinado com sufixo de UF). */
function nomeParaBusca(nome: string): string {
  return nome
    .split(",")[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

async function resolverLocalizacoes(nomes: string[]): Promise<{ encontrados: string[]; naoEncontrados: string[] }> {
  const accessToken = await tokenDeAcesso();
  const encontrados: string[] = [];
  const naoEncontrados: string[] = [];
  for (const nome of nomes) {
    const res = await fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/geoTargetConstants:suggest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: "en", locationNames: { names: [nomeParaBusca(nome)] } }),
    });
    if (!res.ok) {
      naoEncontrados.push(nome);
      continue;
    }
    const data = (await res.json()) as { geoTargetConstantSuggestions?: GeoTargetConstantSugestao[] };
    const sugestoes = (data.geoTargetConstantSuggestions || []).filter((s) => s.geoTargetConstant?.countryCode === "BR");
    const melhor =
      sugestoes.find((s) => s.geoTargetConstant?.targetType === "City") ||
      sugestoes.sort((a, b) => Number(b.reach || 0) - Number(a.reach || 0))[0];
    const resourceName = melhor?.geoTargetConstant?.resourceName;
    if (resourceName) encontrados.push(resourceName);
    else naoEncontrados.push(nome);
  }
  return { encontrados, naoEncontrados };
}

const NOME_LISTA_NEGATIVAS_COMPARTILHADA = "CentralPlus — Negativas globais";

/** Garante que existe UMA lista de negativas compartilhada por CLIENTE (não
 * por campanha) — sem isso, cada campanha só tinha a própria lista, criada
 * do zero toda vez; negativa nova de uma campanha nunca protegia as outras
 * já existentes. Devolve o resource_name da lista (existente ou recém-
 * criada) — quem chama linka a campanha nova nela via campaign_shared_set. */
async function garantirListaNegativasCompartilhada(customerId: string): Promise<string> {
  const linhas = await queryGoogleAdsRest(
    customerId,
    `SELECT shared_set.resource_name FROM shared_set
     WHERE shared_set.name = '${NOME_LISTA_NEGATIVAS_COMPARTILHADA}' AND shared_set.type = 'NEGATIVE_KEYWORDS' AND shared_set.status != 'REMOVED'`,
  );
  const existente = linhas[0]?.sharedSet?.resourceName;
  if (existente) return existente;

  const customer = criarClienteGoogleAds(customerId);
  const tempRN = ResourceNames.sharedSet(customerId, "-1");
  const resposta = await customer.mutateResources([
    {
      entity: "shared_set",
      operation: "create",
      resource: { resource_name: tempRN, name: NOME_LISTA_NEGATIVAS_COMPARTILHADA, type: enums.SharedSetType.NEGATIVE_KEYWORDS },
    } as MutateOperation<unknown>,
  ]);
  const resultados = resposta.mutate_operation_responses || [];
  const criado = resultados.find((r) => r.shared_set_result)?.shared_set_result?.resource_name;
  return criado || tempRN;
}

/** Soma termos novos na lista compartilhada do cliente, sem duplicar o que
 * já está lá (Google aceita duplicata sem erro, mas polui a lista à toa).
 * Chamado DEPOIS que a campanha em si já foi criada com sucesso — negativa
 * nunca deve travar a criação da campanha. */
async function adicionarNegativasNaListaCompartilhada(customerId: string, sharedSetRN: string, termos: string[]): Promise<void> {
  const unicos = Array.from(new Set(termos.map((t) => t.trim()).filter(Boolean)));
  if (unicos.length === 0) return;
  const sharedSetId = sharedSetRN.split("/").pop();
  const existentes = await queryGoogleAdsRest(customerId, `SELECT shared_criterion.keyword.text FROM shared_criterion WHERE shared_set.id = ${sharedSetId}`);
  const jaTem = new Set(existentes.map((r) => (r.sharedCriterion?.keyword?.text || "").toLowerCase()));
  const novos = unicos.filter((t) => !jaTem.has(t.toLowerCase()));
  if (novos.length === 0) return;
  const customer = criarClienteGoogleAds(customerId);
  await customer.mutateResources(
    novos.map(
      (t): MutateOperation<unknown> =>
        ({
          entity: "shared_criterion",
          operation: "create",
          resource: { shared_set: sharedSetRN, keyword: { text: t, match_type: enums.KeywordMatchType.BROAD } },
        }) as MutateOperation<unknown>,
    ),
  );
}

const NOME_CONVERSAO_PRINCIPAL = "CentralPlus — Contato (WhatsApp/formulário)";

/** Garante 1 ação de conversão "principal" por CLIENTE (não por campanha) —
 * sem isso, mesmo a campanha perfeita fica sem o Google ter o que otimizar
 * (a própria skill anuncio-google documenta essa regra no Passo 7.5: "sem
 * conversão configurada, o Google não otimiza"). Idempotente — só cria na
 * primeira campanha aplicada do cliente, reaproveita depois.
 *
 * IMPORTANTE — isto cria só o REGISTRO da ação no Google Ads. Pra ela
 * contar de verdade, ainda falta colocar a tag de conversão do Google no
 * site do cliente (dispara quando alguém clica no WhatsApp/manda
 * formulário) — isso depende do módulo Meu Site e fica de propósito fora
 * daqui (ver auditoria 2026-07-31, mesmo motivo do item de LP por anúncio:
 * junta os dois quando for pedido explicitamente). Sem a tag, a ação
 * existe na conta mas nunca dispara sozinha. */
async function garantirConversaoPrincipal(customerId: string): Promise<void> {
  const linhas = await queryGoogleAdsRest(
    customerId,
    `SELECT conversion_action.resource_name FROM conversion_action
     WHERE conversion_action.name = '${NOME_CONVERSAO_PRINCIPAL}' AND conversion_action.status != 'REMOVED'`,
  );
  if (linhas[0]?.conversionAction?.resourceName) return;

  const customer = criarClienteGoogleAds(customerId);
  await customer.mutateResources([
    {
      entity: "conversion_action",
      operation: "create",
      resource: {
        name: NOME_CONVERSAO_PRINCIPAL,
        type: enums.ConversionActionType.WEBPAGE,
        category: enums.ConversionActionCategory.CONTACT,
        status: enums.ConversionActionStatus.ENABLED,
        click_through_lookback_window_days: 30,
      },
    } as MutateOperation<unknown>,
  ]);
}

/** Cria a campanha DE VERDADE na conta do cliente — sempre PAUSADA (a
 * ativação é sempre manual, mesma decisão de risco já usada no CSV: um erro
 * aqui custa no máximo "gastou tempo criando algo pausado", nunca dinheiro
 * sozinho). Valida pré-condições antes de chamar a API, pra falhar cedo com
 * mensagem clara em vez de um erro genérico da API. */
export async function aplicarCampanhaGoogleAds(
  customerId: string | undefined,
  campanha: CampanhaAds,
): Promise<ResultadoGoogleAds> {
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return { ok: false, mensagem: "credenciais globais de Google Ads não configuradas nesta instalação." };
  }
  if (!customerId) {
    return { ok: false, mensagem: "este cliente ainda não tem uma conta de Google Ads vinculada — configure em Configurações → Google Ads." };
  }
  if (!campanha.urlDestino) {
    return { ok: false, mensagem: "preencha a URL de destino do anúncio antes de aplicar." };
  }
  if (!campanha.orcamentoSugeridoDia || campanha.orcamentoSugeridoDia <= 0) {
    return { ok: false, mensagem: "orçamento diário inválido — defina um valor em reais maior que zero." };
  }
  if (campanha.palavrasChave.length === 0) {
    return { ok: false, mensagem: "a campanha não tem nenhuma palavra-chave." };
  }
  if (!campanha.anuncios?.length && !campanha.headlines?.length) {
    return { ok: false, mensagem: "a campanha não tem nenhum anúncio (título/descrição)." };
  }

  // Pool de títulos/descrições: campanha nova já vem com headlines/descriptions
  // separados (pool, não par — é como a Rede de Pesquisa realmente funciona);
  // campanha antiga (antes dessa mudança) só tem `anuncios` pareado, então cai
  // no fallback pra continuar aplicável sem precisar editar tudo de novo.
  const headlines = campanha.headlines?.length ? campanha.headlines : (campanha.anuncios || []).map((a) => a.titulo);
  const descriptions = campanha.descriptions?.length ? campanha.descriptions : (campanha.anuncios || []).map((a) => a.descricao);

  if (headlines.length < 3) {
    return { ok: false, mensagem: "a Google Ads API exige pelo menos 3 títulos — gere mais antes de aplicar." };
  }
  if (descriptions.length < 2) {
    return { ok: false, mensagem: "a Google Ads API exige pelo menos 2 descrições — gere mais antes de aplicar." };
  }

  const foraDoLimite = [
    ...headlines.filter((t) => t.length > 30).map((t) => `título "${t}" tem ${t.length} caracteres (máximo 30)`),
    ...descriptions.filter((d) => d.length > 90).map((d) => `descrição "${d.slice(0, 40)}…" tem ${d.length} caracteres (máximo 90)`),
    ...(campanha.callouts || []).filter((c) => c.length > 25).map((c) => `callout "${c}" tem ${c.length} caracteres (máximo 25)`),
    ...(campanha.snippetsEstruturados || []).flatMap((s) => [
      ...(HEADERS_SNIPPET_VALIDOS as readonly string[]).includes(s.cabecalho)
        ? []
        : [`cabeçalho de snippet "${s.cabecalho}" não é um dos aceitos pela API (${HEADERS_SNIPPET_VALIDOS.join(", ")})`],
      ...s.valores.filter((v) => v.length > 25).map((v) => `valor de snippet "${v}" tem ${v.length} caracteres (máximo 25)`),
    ]),
  ];
  if (foraDoLimite.length > 0) {
    return {
      ok: false,
      mensagem: `a Google Ads API rejeita texto fora do limite — encurte antes de aplicar: ${foraDoLimite.join("; ")}.`,
    };
  }

  let geoResourceNames: string[] = [];
  if (campanha.localizacoes?.length) {
    const { encontrados, naoEncontrados } = await resolverLocalizacoes(campanha.localizacoes);
    if (naoEncontrados.length > 0) {
      return {
        ok: false,
        mensagem: `não achei essa(s) localização(ões) no Google: ${naoEncontrados.join(", ")} — corrija o nome (ex: "Santos, SP") antes de aplicar.`,
      };
    }
    geoResourceNames = encontrados;
  }

  try {
    const customer = criarClienteGoogleAds(customerId);
    const sharedSetRN = await garantirListaNegativasCompartilhada(customerId);
    try {
      await garantirConversaoPrincipal(customerId);
    } catch {
      /* não bloqueia a campanha por causa disso — fica sem conversão configurada, mas a campanha sobe */
    }

    const budgetRN = ResourceNames.campaignBudget(customerId, "-1");
    const campaignRN = ResourceNames.campaign(customerId, "-2");
    const adGroupRN = ResourceNames.adGroup(customerId, "-3");
    let proximoTempId = -10; // negativo = resource temporário dentro do próprio batch, mesmo padrão de budget/campaign/ad_group acima
    const assetRNs = {
      callouts: (campanha.callouts || []).map(() => ResourceNames.asset(customerId, String(proximoTempId--))),
      snippets: (campanha.snippetsEstruturados || []).map(() => ResourceNames.asset(customerId, String(proximoTempId--))),
    };

    const operations: MutateOperation<unknown>[] = [
      {
        entity: "campaign_budget",
        operation: "create",
        resource: {
          resource_name: budgetRN,
          name: `${campanha.titulo} — orçamento`,
          delivery_method: enums.BudgetDeliveryMethod.STANDARD,
          amount_micros: toMicros(campanha.orcamentoSugeridoDia),
        },
      },
      {
        entity: "campaign",
        operation: "create",
        resource: {
          resource_name: campaignRN,
          name: campanha.titulo,
          advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
          status: enums.CampaignStatus.PAUSED,
          campaign_budget: budgetRN,
          manual_cpc: { enhanced_cpc_enabled: false },
          network_settings: { target_google_search: true, target_search_network: true },
          // Campo obrigatório desde a exigência de transparência de anúncio
          // político da UE (DSA) — toda campanha precisa declarar isso,
          // mesmo fora da Europa. Este produto nunca cria anúncio político.
          contains_eu_political_advertising: enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
          // Sem isso, o Google usa o default "Presença ou interesse" — mostra
          // o anúncio pra gente que só DEMONSTROU interesse na região (ex:
          // pesquisou "encanador em Santos" morando em outro estado), não só
          // pra quem está fisicamente na área. Pra negócio local isso é
          // desperdício de orçamento; "Presença" é o certo por padrão aqui.
          geo_target_type_setting: { positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE },
        },
      },
      {
        entity: "ad_group",
        operation: "create",
        resource: {
          resource_name: adGroupRN,
          name: campanha.titulo,
          campaign: campaignRN,
          status: enums.AdGroupStatus.ENABLED,
          type: enums.AdGroupType.SEARCH_STANDARD,
        },
      },
      // Linka a campanha na lista de negativas compartilhada do cliente —
      // é isso que faz negativa de UMA campanha proteger todas as outras
      // automaticamente, dali em diante (ver garantirListaNegativasCompartilhada).
      {
        entity: "campaign_shared_set",
        operation: "create",
        resource: { campaign: campaignRN, shared_set: sharedSetRN },
      },
      // Frase (não ampla) é o começo recomendado — ampla de cara gasta
      // orçamento em busca fora de contexto sem dado nenhum de performance
      // ainda pra saber se vale a pena; a própria skill anuncio-google
      // documenta essa mesma regra ("começar com Phrase Match na maioria").
      ...campanha.palavrasChave.map(
        (kw): MutateOperation<unknown> => ({
          entity: "ad_group_criterion",
          operation: "create",
          resource: {
            ad_group: adGroupRN,
            status: enums.AdGroupCriterionStatus.ENABLED,
            keyword: { text: kw, match_type: enums.KeywordMatchType.PHRASE },
          },
        }),
      ),
      ...(campanha.palavrasNegativas || []).map(
        (kw): MutateOperation<unknown> => ({
          entity: "ad_group_criterion",
          operation: "create",
          resource: {
            ad_group: adGroupRN,
            negative: true,
            keyword: { text: kw, match_type: enums.KeywordMatchType.BROAD },
          },
        }),
      ),
      ...geoResourceNames.map(
        (geoRN): MutateOperation<unknown> => ({
          entity: "campaign_criterion",
          operation: "create",
          resource: {
            campaign: campaignRN,
            location: { geo_target_constant: geoRN },
          },
        }),
      ),
      {
        entity: "ad_group_ad",
        operation: "create",
        resource: {
          ad_group: adGroupRN,
          status: enums.AdGroupAdStatus.PAUSED,
          ad: {
            final_urls: [campanha.urlDestino],
            responsive_search_ad: {
              headlines: headlines.map((t) => ({ text: t })),
              descriptions: descriptions.map((d) => ({ text: d })),
            },
          },
        },
      },
      ...(campanha.callouts || []).flatMap((texto, i): MutateOperation<unknown>[] => [
        {
          entity: "asset",
          operation: "create",
          resource: { resource_name: assetRNs.callouts[i], callout_asset: { callout_text: texto } },
        },
        {
          entity: "campaign_asset",
          operation: "create",
          resource: { campaign: campaignRN, asset: assetRNs.callouts[i], field_type: enums.AssetFieldType.CALLOUT },
        },
      ]),
      ...(campanha.snippetsEstruturados || []).flatMap((s, i): MutateOperation<unknown>[] => [
        {
          entity: "asset",
          operation: "create",
          resource: { resource_name: assetRNs.snippets[i], structured_snippet_asset: { header: s.cabecalho, values: s.valores } },
        },
        {
          entity: "campaign_asset",
          operation: "create",
          resource: { campaign: campaignRN, asset: assetRNs.snippets[i], field_type: enums.AssetFieldType.STRUCTURED_SNIPPET },
        },
      ]),
    ];

    const resposta = await customer.mutateResources(operations);
    const resultados = resposta.mutate_operation_responses || [];
    const campaignResourceName = resultados.find((r) => r.campaign_result)?.campaign_result?.resource_name;
    const adGroupResourceName = resultados.find((r) => r.ad_group_result)?.ad_group_result?.resource_name;

    // Campanha já está criada — daqui pra frente é só enriquecer a lista
    // compartilhada. Nunca deixa isso reportar a aplicação inteira como
    // falha (a campanha existe de verdade mesmo se isso aqui der erro).
    try {
      await adicionarNegativasNaListaCompartilhada(customerId, sharedSetRN, campanha.palavrasNegativas || []);
    } catch {
      /* a campanha já foi criada com sucesso — não propaga erro daqui */
    }

    return {
      ok: true,
      mensagem: `Campanha criada com sucesso (pausada) na conta ${customerId}.`,
      googleCampaignId: extrairId(campaignResourceName),
      googleAdGroupId: extrairId(adGroupResourceName),
    };
  } catch (e) {
    return { ok: false, mensagem: `falha ao criar a campanha no Google Ads: ${mensagemErroGoogleAds(e)}` };
  }
}

/** Pausa ou reativa uma campanha JÁ CRIADA na conta — nunca cria nem apaga
 * nada. Ativar de verdade é decisão do operador (mesmo espírito de "sobe
 * sempre pausada": nada muda sozinho).
 *
 * Muda status em TRÊS níveis, não só campaign: campaign → ad_group_ad —
 * achado real (auditoria 2026-07-31): campaign.status sozinho NÃO faz o
 * anúncio servir. `ad_group_ad` nasce PAUSED em `aplicarCampanhaGoogleAds`
 * (regra de segurança) e, antes desta correção, nunca era tocado de novo —
 * clicar "Ativar campanha" mudava a campanha pra ENABLED mas o anúncio
 * dentro continuava pausado pra sempre, então nada era exibido de verdade
 * mesmo com a campanha "ativa". Busca o id do anúncio por GAQL (não fica
 * salvo no campanha.json local) porque campanha aplicada antes desta
 * correção não tem esse dado guardado. */
export async function pausarOuRetomarCampanhaGoogleAds(
  customerId: string | undefined,
  googleCampaignId: string | undefined,
  googleAdGroupId: string | undefined,
  pausar: boolean,
): Promise<ResultadoGoogleAds> {
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return { ok: false, mensagem: "credenciais globais de Google Ads não configuradas nesta instalação." };
  }
  if (!customerId || !googleCampaignId) {
    return { ok: false, mensagem: "esta campanha ainda não foi criada de verdade no Google Ads." };
  }
  try {
    const customer = criarClienteGoogleAds(customerId);
    const operations: MutateOperation<unknown>[] = [
      {
        entity: "campaign",
        operation: "update",
        resource: {
          resource_name: ResourceNames.campaign(customerId, googleCampaignId),
          status: pausar ? enums.CampaignStatus.PAUSED : enums.CampaignStatus.ENABLED,
        },
        update_mask: { paths: ["status"] },
      } as MutateOperation<unknown>,
    ];

    if (googleAdGroupId) {
      const [anuncioLinha] = await queryGoogleAdsRest(
        customerId,
        `SELECT ad_group_ad.ad.id FROM ad_group_ad WHERE ad_group.id = ${googleAdGroupId} AND ad_group_ad.status != 'REMOVED' LIMIT 1`,
      );
      const adId = anuncioLinha?.adGroupAd?.ad?.id;
      if (adId) {
        operations.push({
          entity: "ad_group_ad",
          operation: "update",
          resource: {
            resource_name: ResourceNames.adGroupAd(customerId, googleAdGroupId, adId),
            status: pausar ? enums.AdGroupAdStatus.PAUSED : enums.AdGroupAdStatus.ENABLED,
          },
          update_mask: { paths: ["status"] },
        } as MutateOperation<unknown>);
      }
    }

    await customer.mutateResources(operations);
    return { ok: true, mensagem: pausar ? "Campanha pausada." : "Campanha ativada — já está rodando de verdade." };
  } catch (e) {
    return { ok: false, mensagem: `falha ao ${pausar ? "pausar" : "ativar"} a campanha: ${mensagemErroGoogleAds(e)}` };
  }
}

/** Remove a campanha DE VERDADE da conta — Google Ads não tem um "excluir"
 * via update de status (a API rejeita "REMOVED" num update comum, testado e
 * confirmado: "Enum value 'REMOVED' cannot be used"); o jeito certo é uma
 * operação `remove` mesmo (só resource_name, sem mais nada) — é isso que a
 * API trata como exclusão terminal, sem como reverter pela UI depois.
 * Chamado pela rota DELETE antes de apagar o campanha.json local — sem
 * isso, apagar aqui deixava a campanha pausada só "esquecida" na conta,
 * sem ninguém rastreando ela. */
export async function removerCampanhaGoogleAds(
  customerId: string | undefined,
  googleCampaignId: string | undefined,
): Promise<ResultadoGoogleAds> {
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return { ok: false, mensagem: "credenciais globais de Google Ads não configuradas nesta instalação." };
  }
  if (!customerId || !googleCampaignId) {
    return { ok: false, mensagem: "esta campanha ainda não foi criada de verdade no Google Ads." };
  }
  try {
    const customer = criarClienteGoogleAds(customerId);
    const resourceName = ResourceNames.campaign(customerId, googleCampaignId);
    // "remove" é o único operation type cujo valor é a STRING do resource_name
    // direto (create/update levam o objeto do recurso) — testado e confirmado
    // ("Resource name '[object Object]' is malformed" foi o erro até achar isso).
    await customer.mutateResources([
      { entity: "campaign", operation: "remove", resource: resourceName } as unknown as MutateOperation<unknown>,
    ]);
    return { ok: true, mensagem: "Campanha removida da conta do Google Ads." };
  } catch (e) {
    return { ok: false, mensagem: `falha ao remover a campanha do Google Ads: ${mensagemErroGoogleAds(e)}` };
  }
}

/** Métricas de UMA campanha específica (drill-down) — mesma fonte real da
 * REST API usada em buscarMetricasCampanhas/buscarMetricasDiarias. */
export async function buscarMetricasDeUmaCampanha(
  customerId: string | undefined,
  googleCampaignId: string | undefined,
  diasAtras = 30,
): Promise<ResultadoMetricas<MetricasDiarias>> {
  const erro = semCredenciais(customerId);
  if (erro) return { ok: false, mensagem: erro, dados: [] };
  if (!googleCampaignId) return { ok: false, mensagem: "esta campanha ainda não foi criada de verdade no Google Ads.", dados: [] };
  try {
    const linhas = await queryGoogleAdsRest(
      customerId!,
      `SELECT
        segments.date,
        metrics.clicks,
        metrics.cost_micros,
        metrics.impressions
      FROM campaign
      WHERE campaign.id = ${googleCampaignId} AND ${clausulaPeriodo(diasAtras)}
      ORDER BY segments.date ASC`,
    );
    const dados: MetricasDiarias[] = linhas.map((r) => ({
      data: String(r.segments?.date ?? ""),
      cliques: Number(r.metrics?.clicks ?? 0),
      custoReais: microsParaReais(r.metrics?.costMicros),
      impressoes: Number(r.metrics?.impressions ?? 0),
    }));
    return { ok: true, mensagem: "", dados };
  } catch (e) {
    return { ok: false, mensagem: `falha ao buscar métricas da campanha: ${mensagemErroGoogleAds(e)}`, dados: [] };
  }
}
