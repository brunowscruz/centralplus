import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

// Credenciais de acesso do cliente: o operador pode trocar login+senha de
// qualquer cliente; o próprio cliente só pode trocar a própria senha.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { slug: raw } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }
  if (session.role === "client" && session.slug !== slug) {
    return NextResponse.json({ error: "acesso negado" }, { status: 403 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  let body: { login?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const isOwner = session.role === "owner";
  if (!isOwner && body.login) {
    return NextResponse.json({ error: "só o operador troca o e-mail de login" }, { status: 403 });
  }
  if (body.senha && body.senha.length < 8) {
    return NextResponse.json({ error: "a senha precisa de pelo menos 8 caracteres" }, { status: 400 });
  }

  const cfg = readConfig(slug);
  cfg.acesso = {
    login: body.login?.trim() || cfg.acesso?.login,
    senha_hash: body.senha ? hashPassword(body.senha) : cfg.acesso?.senha_hash,
  };
  writeConfig(slug, cfg);

  logAudit({
    ator: session.role === "owner" ? session.email || "owner" : `cliente:${slug}`,
    acao: "credenciais.alteradas",
    alvo: slug,
    detalhe: body.login ? "login e senha" : "senha",
  });

  return NextResponse.json({ login: cfg.acesso.login });
}
