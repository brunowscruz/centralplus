import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists, TenantStatus } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

const VALID: TenantStatus[] = ["ativo", "em_configuracao", "experimental", "arquivado"];

// Editar o status/observações internas de um cliente já existente
// (seção 4, item 6 do spec: "Status inicial... editável depois").
// Só o operador da agência edita — nunca o cliente.
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

  let body: { status?: string; observacoesInternas?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const cfg = readConfig(slug);
  if (body.status !== undefined) {
    if (!VALID.includes(body.status as TenantStatus)) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 });
    }
    cfg.status = body.status as TenantStatus;
  }
  if (body.observacoesInternas !== undefined) {
    cfg.observacoes_internas = body.observacoesInternas;
  }
  writeConfig(slug, cfg);

  logAudit({
    ator: session.email || "owner",
    acao: "cliente.status_alterado",
    alvo: slug,
    detalhe: cfg.status,
  });

  return NextResponse.json({ status: cfg.status });
}
