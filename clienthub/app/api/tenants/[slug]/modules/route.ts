import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists } from "@/lib/tenants";
import { optionalModules } from "@/lib/modules";
import { sanitizeSlug } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

// Ativar/desativar um módulo do catálogo para um cliente = editar modulos_ativos.
// Isso NÃO é deploy nem código novo — é o menu dinâmico do spec (seção 2.5).
// Apenas o operador da agência controla quais módulos o cliente vê.
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

  let body: { moduleId?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const optionalIds = optionalModules().map((m) => m.id);
  if (!body.moduleId || !optionalIds.includes(body.moduleId as never)) {
    return NextResponse.json(
      { error: "módulo não é opcional ou não existe" },
      { status: 400 },
    );
  }

  const cfg = readConfig(slug);
  const set = new Set(cfg.modulos_ativos);
  if (body.enabled) set.add(body.moduleId);
  else set.delete(body.moduleId);
  cfg.modulos_ativos = [...set];
  writeConfig(slug, cfg);

  logAudit({
    ator: session.email || "owner",
    acao: body.enabled ? "modulo.ativado" : "modulo.desativado",
    alvo: slug,
    detalhe: body.moduleId,
  });

  return NextResponse.json({ modulos_ativos: cfg.modulos_ativos });
}
