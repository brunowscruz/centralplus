import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists, TenantStatus, CLAUDE_DEFAULT } from "@/lib/tenants";
import { optionalModules } from "@/lib/modules";
import { sanitizeSlug } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

const VALID_STATUS: TenantStatus[] = ["ativo", "em_configuracao", "experimental", "arquivado"];
const VALID_MODELOS = ["haiku", "sonnet", "opus"];
const HEX6 = /^#?[0-9a-fA-F]{6}$/;

export interface EditarClienteBody {
  nome?: string;
  nomeComercial?: string;
  tipo?: string;
  hub?: string;
  tema?: "preto" | "branco";
  corPrincipal?: string;
  status?: TenantStatus;
  healthScore?: number;
  observacoesInternas?: string;
  responsavel?: { nome?: string; cargo?: string; email?: string; whatsapp?: string };
  presencaDigital?: { dominio?: string; site?: string; instagram?: string; whatsapp?: string };
  modulos_ativos?: string[];
  claude?: {
    habilitado?: boolean;
    contaId?: string;
    modelosLiberados?: string[];
    modeloChat?: string;
    modeloGerador?: string;
    limiteTokens?: number;
    importarArquivos?: boolean;
    exportarArquivos?: boolean;
    acessoInternet?: boolean;
  };
}

/**
 * Edição geral do cliente (painel admin — Console → Clientes → Editar
 * cliente): dados básicos, módulos ativos e config de IA num único PATCH.
 * Owner-only. É deliberadamente separado de /credenciais (login/senha) e
 * /identidade (logo) porque aquelas têm regras de permissão diferentes
 * (cliente pode trocar a própria senha; aqui é só o operador).
 */
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

  let body: EditarClienteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const cfg = readConfig(slug);

  if (body.nome !== undefined) {
    const v = body.nome.trim();
    if (!v) return NextResponse.json({ error: "nome não pode ficar vazio" }, { status: 400 });
    cfg.nome = v;
  }
  if (body.nomeComercial !== undefined) cfg.nomeComercial = body.nomeComercial.trim() || undefined;
  if (body.tipo !== undefined) cfg.tipo = body.tipo.trim() || undefined;
  if (body.hub !== undefined) cfg.hub = body.hub.trim() || undefined;
  if (body.tema && ["preto", "branco"].includes(body.tema)) cfg.tema = body.tema;
  if (body.corPrincipal !== undefined) {
    const v = body.corPrincipal.trim();
    if (v && !HEX6.test(v)) return NextResponse.json({ error: "cor inválida" }, { status: 400 });
    cfg.corPrincipal = v ? (v.startsWith("#") ? v.toUpperCase() : `#${v.toUpperCase()}`) : undefined;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 });
    }
    cfg.status = body.status;
  }
  if (body.healthScore !== undefined) {
    cfg.healthScore = Math.max(0, Math.min(100, Number(body.healthScore) || 0));
  }
  if (body.observacoesInternas !== undefined) cfg.observacoes_internas = body.observacoesInternas;

  if (body.responsavel !== undefined) {
    cfg.responsavel = {
      nome: body.responsavel.nome?.trim() || undefined,
      cargo: body.responsavel.cargo?.trim() || undefined,
      email: body.responsavel.email?.trim() || undefined,
      whatsapp: body.responsavel.whatsapp?.trim() || undefined,
    };
  }
  if (body.presencaDigital !== undefined) {
    cfg.presencaDigital = {
      dominio: body.presencaDigital.dominio?.trim() || undefined,
      site: body.presencaDigital.site?.trim() || undefined,
      instagram: body.presencaDigital.instagram?.trim() || undefined,
      whatsapp: body.presencaDigital.whatsapp?.trim() || undefined,
    };
  }

  if (body.modulos_ativos !== undefined) {
    const optionalIds = new Set(optionalModules().map((m) => m.id as string));
    cfg.modulos_ativos = body.modulos_ativos.filter((m) => optionalIds.has(m));
  }

  if (body.claude !== undefined) {
    const atual = cfg.claude || { ...CLAUDE_DEFAULT };
    cfg.claude = {
      habilitado: body.claude.habilitado ?? atual.habilitado,
      contaId: body.claude.contaId !== undefined ? body.claude.contaId || undefined : atual.contaId,
      modelosLiberados: Array.isArray(body.claude.modelosLiberados)
        ? body.claude.modelosLiberados.filter((m) => VALID_MODELOS.includes(m))
        : atual.modelosLiberados,
      modeloChat: body.claude.modeloChat && VALID_MODELOS.includes(body.claude.modeloChat) ? body.claude.modeloChat : atual.modeloChat,
      modeloGerador:
        body.claude.modeloGerador && VALID_MODELOS.includes(body.claude.modeloGerador) ? body.claude.modeloGerador : atual.modeloGerador,
      limiteTokens: typeof body.claude.limiteTokens === "number" ? Math.max(0, body.claude.limiteTokens) : atual.limiteTokens,
      importarArquivos: body.claude.importarArquivos ?? atual.importarArquivos,
      exportarArquivos: body.claude.exportarArquivos ?? atual.exportarArquivos,
      acessoInternet: body.claude.acessoInternet ?? atual.acessoInternet,
    };
  }

  writeConfig(slug, cfg);

  logAudit({ ator: session.email || "owner", acao: "cliente.editado", alvo: slug });

  return NextResponse.json({ ok: true });
}
