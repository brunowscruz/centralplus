import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists, readConfig } from "@/lib/tenants";
import { sanitizeSlug, tenantRoot } from "@/lib/bos";
import { deleteIntegrations } from "@/lib/integrations";
import { logAudit } from "@/lib/audit";

// Excluir cliente (painel admin — Console → Clientes). Irreversível: apaga a
// pasta inteira do tenant. Owner-only; exige `confirmar: <slug>` no corpo
// como confirmação explícita (a UI já faz o usuário digitar o nome).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

  let body: { confirmar?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.confirmar !== slug) {
    return NextResponse.json({ error: "confirmação não bate com o slug do cliente" }, { status: 400 });
  }

  const nome = readConfig(slug).nome;
  fs.rmSync(tenantRoot(slug), { recursive: true, force: true });
  deleteIntegrations(slug);

  logAudit({ ator: session.email || "owner", acao: "cliente.excluido", alvo: slug, detalhe: nome });

  return NextResponse.json({ ok: true });
}
