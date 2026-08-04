import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists, CLAUDE_DEFAULT, TenantClaudeConfig } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

const MODELOS_VALIDOS = ["haiku", "sonnet", "opus"];

// Configuração de IA do cliente (seção 6): conta vinculada, modelos
// liberados, modelo do chat/gerador e limite de tokens. Owner-only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
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

  let body: Partial<TenantClaudeConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const cfg = readConfig(slug);
  const atual = cfg.claude || { ...CLAUDE_DEFAULT };

  const modelosLiberados = Array.isArray(body.modelosLiberados)
    ? body.modelosLiberados.filter((m) => MODELOS_VALIDOS.includes(m))
    : atual.modelosLiberados;

  const next: TenantClaudeConfig = {
    habilitado: typeof body.habilitado === "boolean" ? body.habilitado : atual.habilitado,
    contaId: body.contaId !== undefined ? body.contaId || undefined : atual.contaId,
    modelosLiberados,
    modeloChat: MODELOS_VALIDOS.includes(body.modeloChat || "") ? body.modeloChat! : atual.modeloChat,
    modeloGerador: MODELOS_VALIDOS.includes(body.modeloGerador || "")
      ? body.modeloGerador!
      : atual.modeloGerador,
    limiteTokens:
      typeof body.limiteTokens === "number" && body.limiteTokens >= 0
        ? body.limiteTokens
        : atual.limiteTokens,
  };

  cfg.claude = next;
  writeConfig(slug, cfg);

  logAudit({
    ator: session.email || "owner",
    acao: "claude.config_alterada",
    alvo: slug,
    detalhe: `habilitado: ${next.habilitado}, conta: ${next.contaId || "padrão"}`,
  });

  return NextResponse.json(next);
}
