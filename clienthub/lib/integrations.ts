import fs from "node:fs";
import path from "node:path";
import { bosRoot, sanitizeSlug } from "./bos";

/**
 * Segredos de integração por cliente (seção 6 do spec — Instagram API).
 *
 * Fica FORA de `clientes/<slug>/` de propósito: essa pasta é sandboxed e
 * exposta ao próprio cliente pelo navegador de arquivos (módulo Claude Code).
 * Um token de página do Facebook/Instagram é credencial de negócio da
 * agência, não algo que o cliente deveria conseguir ler no próprio
 * workspace — por isso vive em `<BOS_ROOT>/_integracoes/<slug>.json`,
 * alcançável só por rotas owner-only.
 */

export interface MetaInstagramConfig {
  pageAccessToken?: string;
  igUserId?: string;
  obtidoEm?: string; // ISO
  observacao?: string; // ex: "token de curta duração, trocar por versão longa"
}

/** Chave própria da OpenAI do cliente (geração de imagem via scripts/gerar-imagem.js
 * no chat) — quando ausente, o Claude Code do workspace usa a chave padrão
 * compartilhada da instalação (OPENAI_API_KEY do .env.local). */
export interface OpenAIConfig {
  apiKey?: string;
  obtidoEm?: string;
}

export type MetodoPublicacao = "nenhum" | "ftp" | "git";

export interface PublicacaoFtpConfig {
  host?: string;
  porta?: number;
  usuario?: string;
  senha?: string;
  diretorioRemoto?: string;
  seguro?: boolean; // FTPS
}

export interface PublicacaoGitConfig {
  repoUrl?: string;
  branch?: string;
}

/** Pra onde a versão aprovada do site é publicada (seção "Meu Site"). Ver
 * docs/PUBLICACAO-DE-SITE.md pro contrato completo de cada método. */
export interface PublicacaoConfig {
  metodo: MetodoPublicacao;
  ftp?: PublicacaoFtpConfig;
  git?: PublicacaoGitConfig;
  ultimaPublicacao?: { em: string; ok: boolean; mensagem: string };
}

/** Uma "instance" do Evolution API por cliente (mesmo servidor Evolution
 * compartilhado por toda a instalação, isolamento por instância — ver
 * docs/WHATSAPP-EVOLUTION-API.md). Token é gerado pelo próprio Evolution API
 * na criação da instância, não escolhido por nós. */
/** Agente de IA que responde sozinho no WhatsApp — inspirado no wa-agent
 * (ver docs/WHATSAPP-EVOLUTION-API.md), mas plugado no webhook do Evolution
 * API que já temos (não usa a conexão WhatsApp própria do wa-agent). */
export interface AgenteIAConfig {
  ativo: boolean;
  personalidade: string;
  /** vazio/ausente = responde em qualquer etapa do funil */
  faseIds?: string[];
}

export interface WhatsAppInstanceConfig {
  instanceName?: string; // = slug do cliente, por convenção
  instanceToken?: string;
  status?: "desconectado" | "conectando" | "conectado";
  numero?: string; // número de verdade, só depois de parear
  conectadoEm?: string;
  desconectadoEm?: string;
  agenteIA?: AgenteIAConfig;
}

/** Credenciais pra publicar páginas locais (SEO Local, Agente 6) direto no
 * WordPress do cliente via REST API — usa Application Password (recurso
 * nativo do WordPress desde a 5.6, não depende de plugin nem de OAuth). */
export interface WordPressConfig {
  baseUrl?: string;
  usuario?: string;
  applicationPassword?: string;
  obtidoEm?: string;
}

/** Vínculo da conta de Google Ads deste cliente à Manager Account (MCC) da
 * agência. Não é segredo (é só um número de conta), mas mora aqui junto do
 * resto porque é dado de integração da agência, não do cliente (mesmo
 * raciocínio de `WordPressConfig.baseUrl`) — ver docs/GOOGLE-ADS-API.md. As
 * credenciais de verdade (developer token, OAuth client, refresh token) são
 * globais da instalação (`GOOGLE_ADS_*` no .env.local), nunca por-tenant:
 * um único Developer Token serve a MCC inteira. */
export interface GoogleAdsConfig {
  customerId?: string; // 10 dígitos, sem hífen — a conta de Ads real do cliente
  vinculadoEm?: string;
}

export interface TenantIntegrations {
  metaInstagram?: MetaInstagramConfig;
  openai?: OpenAIConfig;
  publicacao?: PublicacaoConfig;
  whatsapp?: WhatsAppInstanceConfig;
  wordpress?: WordPressConfig;
  googleAds?: GoogleAdsConfig;
}

function storeDir(): string {
  return path.join(bosRoot(), "_integracoes");
}

function storePath(slug: string): string {
  return path.join(storeDir(), `${sanitizeSlug(slug)}.json`);
}

export function readIntegrations(slug: string): TenantIntegrations {
  const p = storePath(slug);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as TenantIntegrations;
  } catch {
    return {};
  }
}

export function writeIntegrations(slug: string, data: TenantIntegrations): void {
  fs.mkdirSync(storeDir(), { recursive: true });
  fs.writeFileSync(storePath(slug), JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function setMetaInstagram(slug: string, config: MetaInstagramConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, metaInstagram: config };
  writeIntegrations(slug, next);
  return next;
}

export function setOpenAI(slug: string, config: OpenAIConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, openai: config };
  writeIntegrations(slug, next);
  return next;
}

export function setPublicacao(slug: string, config: PublicacaoConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, publicacao: config };
  writeIntegrations(slug, next);
  return next;
}

export function setWordPress(slug: string, config: WordPressConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, wordpress: config };
  writeIntegrations(slug, next);
  return next;
}

export function setGoogleAds(slug: string, config: GoogleAdsConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, googleAds: config };
  writeIntegrations(slug, next);
  return next;
}

export function setWhatsApp(slug: string, config: WhatsAppInstanceConfig): TenantIntegrations {
  const current = readIntegrations(slug);
  const next: TenantIntegrations = { ...current, whatsapp: { ...current.whatsapp, ...config } };
  writeIntegrations(slug, next);
  return next;
}

/** Config global do Evolution API (uma instalação, uma URL, uma api key
 * admin — usada só pra criar/gerenciar instâncias; cada cliente ganha um
 * token de instância próprio depois de criada). */
export function evolutionConfigurado(): boolean {
  return !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

/** Credenciais globais da Google Ads API (uma instalação, uma MCC, um
 * Developer Token — ver docs/GOOGLE-ADS-API.md). Sem isso configurado no
 * .env.local, a aplicação real de campanha fica indisponível pra todo
 * cliente (a UI mostra aviso claro em vez de fingir que funciona). */
export function googleAdsConfigurado(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  );
}

export function googleAdsCustomerId(slug: string): string | undefined {
  return readIntegrations(slug).googleAds?.customerId;
}

/** Registra o resultado da última tentativa de publicação (mostrado na UI). */
export function registrarResultadoPublicacao(slug: string, ok: boolean, mensagem: string): void {
  const current = readIntegrations(slug);
  if (!current.publicacao) return;
  writeIntegrations(slug, {
    ...current,
    publicacao: { ...current.publicacao, ultimaPublicacao: { em: new Date().toISOString(), ok, mensagem } },
  });
}

/** Chave da OpenAI efetiva pro chat deste cliente: a dele, se configurada,
 * senão a padrão compartilhada da instalação (OPENAI_API_KEY do .env.local). */
export function openaiApiKeyEfetiva(slug: string): string | undefined {
  return readIntegrations(slug).openai?.apiKey || process.env.OPENAI_API_KEY || undefined;
}

/** Mascara o token pra exibição — só os últimos 4 caracteres. */
export function maskToken(token?: string): string | undefined {
  if (!token) return undefined;
  return `••••••••${token.slice(-4)}`;
}

export function deleteIntegrations(slug: string): void {
  const p = storePath(slug);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

/**
 * Renovação automática do token de longa duração (seção 6 — Instagram API).
 *
 * A Meta nunca dá token "permanente" pra Página/Instagram: o de longa
 * duração dura ~60 dias e precisa ser trocado por um novo ANTES de expirar
 * (`fb_exchange_token`). Isso só é possível com um App próprio no Meta for
 * Developers (App ID + App Secret) — o app padrão do Graph API Explorer não
 * expõe Secret nenhum, por isso sem configurar isso aqui a renovação é
 * sempre manual. Configurando META_APP_ID/META_APP_SECRET no .env, o token
 * se renova sozinho (chamado antes de cada uso real da API — ver
 * app/api/tenants/[slug]/instagram/profile/route.ts) e o cliente nunca mais
 * vê "token expirado".
 */
const GRAPH_VERSION = "v21.0";
const DIAS_VALIDADE_TOKEN = 60;
const DIAS_ANTES_DE_RENOVAR = 45; // renova com folga, nunca deixa chegar nos 60

export function metaAppConfigurado(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/** Dias restantes até o token (estimado) expirar, ou null se não há registro de quando foi obtido. */
export function diasParaExpirar(config: MetaInstagramConfig): number | null {
  if (!config.obtidoEm) return null;
  const obtido = new Date(config.obtidoEm).getTime();
  if (Number.isNaN(obtido)) return null;
  const diasDesde = (Date.now() - obtido) / (1000 * 60 * 60 * 24);
  return Math.round(DIAS_VALIDADE_TOKEN - diasDesde);
}

/**
 * Se o token estiver perto de expirar (ou já vencido) e houver App próprio
 * configurado, troca por um novo token de 60 dias e persiste. Não faz nada
 * (silenciosamente) se não houver App configurado ou o token ainda for novo
 * — seguro de chamar antes de toda requisição real à Graph API.
 */
export async function renovarTokenSeNecessario(slug: string, forcar = false): Promise<MetaInstagramConfig | null> {
  const { metaInstagram } = readIntegrations(slug);
  if (!metaInstagram?.pageAccessToken) return null;
  if (!metaAppConfigurado()) return metaInstagram;

  const dias = diasParaExpirar(metaInstagram);
  if (!forcar && dias !== null && dias > DIAS_ANTES_DE_RENOVAR) return metaInstagram; // ainda novo, não mexe

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(process.env.META_APP_ID!)}&client_secret=${encodeURIComponent(process.env.META_APP_SECRET!)}&fb_exchange_token=${encodeURIComponent(metaInstagram.pageAccessToken)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
    if (!res.ok || !data.access_token) {
      // token pode já ter expirado de vez (ex: passou muito tempo sem uso) — não derruba a
      // requisição original, só deixa o token como está pra dar o erro claro de sempre.
      return metaInstagram;
    }
    return setMetaInstagram(slug, {
      ...metaInstagram,
      pageAccessToken: data.access_token,
      obtidoEm: new Date().toISOString(),
      observacao: "renovado automaticamente",
    }).metaInstagram!;
  } catch {
    return metaInstagram;
  }
}
