import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  readIntegrations,
  setMetaInstagram,
  setOpenAI,
  setPublicacao,
  setWordPress,
  setGoogleAds,
  maskToken,
  MetaInstagramConfig,
  OpenAIConfig,
  PublicacaoConfig,
  WordPressConfig,
  GoogleAdsConfig,
  renovarTokenSeNecessario,
  metaAppConfigurado,
  googleAdsConfigurado,
} from "@/lib/integrations";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

// Integrações do cliente (Instagram/Meta, OpenAI, Publicação do site):
// owner-only, segredo nunca sai em texto puro (GET sempre mascara).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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
  const data = readIntegrations(slug);
  return NextResponse.json({
    metaInstagram: data.metaInstagram
      ? { ...data.metaInstagram, pageAccessToken: maskToken(data.metaInstagram.pageAccessToken) }
      : undefined,
    renovacaoAutomatica: metaAppConfigurado(),
    openai: data.openai ? { apiKeyMasked: maskToken(data.openai.apiKey), obtidoEm: data.openai.obtidoEm } : undefined,
    publicacao: data.publicacao
      ? { ...data.publicacao, ftp: data.publicacao.ftp ? { ...data.publicacao.ftp, senha: undefined, temSenha: !!data.publicacao.ftp.senha } : undefined }
      : undefined,
    wordpress: data.wordpress
      ? { baseUrl: data.wordpress.baseUrl, usuario: data.wordpress.usuario, temSenha: !!data.wordpress.applicationPassword, obtidoEm: data.wordpress.obtidoEm }
      : undefined,
    // customerId não é segredo (é só o número da conta), não precisa mascarar
    googleAds: data.googleAds,
    googleAdsInstalado: googleAdsConfigurado(),
  });
}

/** Renovação manual do token (owner pode forçar a qualquer momento, ex: logo após configurar o App). */
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
  if (!metaAppConfigurado()) {
    return NextResponse.json({ error: "META_APP_ID/META_APP_SECRET não configurados nesta instalação" }, { status: 400 });
  }
  const result = await renovarTokenSeNecessario(slug, true);
  if (!result?.pageAccessToken) {
    return NextResponse.json({ error: "sem token salvo pra renovar" }, { status: 400 });
  }
  logAudit({ ator: session.email || "owner", acao: "instagram.token_renovado", alvo: slug });
  return NextResponse.json({ metaInstagram: { ...result, pageAccessToken: maskToken(result.pageAccessToken) } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  let body: { tipo?: "openai" | "publicacao" | "wordpress" | "google-ads" } & MetaInstagramConfig & {
    openai?: OpenAIConfig;
    publicacao?: PublicacaoConfig;
    wordpress?: WordPressConfig;
    googleAds?: GoogleAdsConfig;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (body.tipo === "openai") {
    const result = setOpenAI(slug, {
      apiKey: (body.openai?.apiKey || "").trim() || undefined,
      obtidoEm: new Date().toISOString(),
    });
    logAudit({ ator: session.email || "owner", acao: "openai.chave_atualizada", alvo: slug });
    return NextResponse.json({
      openai: result.openai ? { apiKeyMasked: maskToken(result.openai.apiKey), obtidoEm: result.openai.obtidoEm } : undefined,
    });
  }

  if (body.tipo === "publicacao") {
    const p = body.publicacao;
    if (!p?.metodo) return NextResponse.json({ error: "método obrigatório" }, { status: 400 });
    // Se a senha do FTP vier vazia na edição, mantém a já salva (não apaga sem querer).
    const atual = readIntegrations(slug).publicacao;
    const ftp = p.metodo === "ftp"
      ? { ...p.ftp, senha: p.ftp?.senha || atual?.ftp?.senha }
      : undefined;
    const result = setPublicacao(slug, { metodo: p.metodo, ftp, git: p.git, ultimaPublicacao: atual?.ultimaPublicacao });
    logAudit({ ator: session.email || "owner", acao: "publicacao.config_atualizada", alvo: slug });
    return NextResponse.json({
      publicacao: result.publicacao
        ? { ...result.publicacao, ftp: result.publicacao.ftp ? { ...result.publicacao.ftp, senha: undefined, temSenha: !!result.publicacao.ftp.senha } : undefined }
        : undefined,
    });
  }

  if (body.tipo === "wordpress") {
    const w = body.wordpress;
    if (!w?.baseUrl || !w?.usuario) return NextResponse.json({ error: "URL e usuário obrigatórios" }, { status: 400 });
    // Se o Application Password vier vazio na edição, mantém o já salvo (não apaga sem querer).
    const atual = readIntegrations(slug).wordpress;
    const result = setWordPress(slug, {
      baseUrl: w.baseUrl.trim(),
      usuario: w.usuario.trim(),
      applicationPassword: w.applicationPassword?.trim() || atual?.applicationPassword,
      obtidoEm: new Date().toISOString(),
    });
    logAudit({ ator: session.email || "owner", acao: "wordpress.config_atualizada", alvo: slug });
    return NextResponse.json({
      wordpress: result.wordpress
        ? { baseUrl: result.wordpress.baseUrl, usuario: result.wordpress.usuario, temSenha: !!result.wordpress.applicationPassword, obtidoEm: result.wordpress.obtidoEm }
        : undefined,
    });
  }

  if (body.tipo === "google-ads") {
    const customerId = (body.googleAds?.customerId || "").replace(/[^0-9]/g, "");
    if (!customerId) return NextResponse.json({ error: "informe o Customer ID (número da conta de Google Ads)" }, { status: 400 });
    const result = setGoogleAds(slug, { customerId, vinculadoEm: new Date().toISOString() });
    logAudit({ ator: session.email || "owner", acao: "google_ads.conta_vinculada", alvo: slug, detalhe: customerId });
    return NextResponse.json({ googleAds: result.googleAds, googleAdsInstalado: googleAdsConfigurado() });
  }

  // sem `tipo` = fluxo legado do Instagram (mantém compatibilidade)
  let { metaInstagram } = setMetaInstagram(slug, {
    pageAccessToken: (body.pageAccessToken || "").trim() || undefined,
    igUserId: (body.igUserId || "").trim() || undefined,
    obtidoEm: new Date().toISOString(),
    observacao: (body.observacao || "").trim() || undefined,
  });

  // Token recém-colado pode ser de curta duração (1-2h, o padrão do Graph API
  // Explorer) — se tiver App próprio configurado, já troca na hora pelo de
  // longa duração (60 dias), pra nunca depender do operador lembrar de
  // "extender" manualmente.
  if (metaInstagram?.pageAccessToken && metaAppConfigurado()) {
    metaInstagram = (await renovarTokenSeNecessario(slug, true)) || metaInstagram;
  }

  logAudit({ ator: session.email || "owner", acao: "instagram.token_atualizado", alvo: slug });
  return NextResponse.json({
    metaInstagram: metaInstagram
      ? { ...metaInstagram, pageAccessToken: maskToken(metaInstagram.pageAccessToken) }
      : undefined,
  });
}
