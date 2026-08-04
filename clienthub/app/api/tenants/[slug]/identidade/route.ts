import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { readConfig, writeConfig, tenantExists } from "@/lib/tenants";
import { sanitizeSlug, tenantRoot } from "@/lib/bos";
import { logAudit } from "@/lib/audit";

const HEX6 = /^#?[0-9a-fA-F]{6}$/;

function writeLogo(root: string, dataUrl: string): string | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1].split("/")[1]?.replace("svg+xml", "svg") || "png";
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 5 * 1024 * 1024) return null;
  const dir = path.join(root, "identidade");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `logo.${ext}`), buf);
  return `logo.${ext}`;
}

// Identidade visual do cliente (logo + cor principal) — owner-only.
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

  let body: { corPrincipal?: string; logoDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const cfg = readConfig(slug);
  if (body.corPrincipal !== undefined) {
    const v = body.corPrincipal.trim();
    if (v && !HEX6.test(v)) {
      return NextResponse.json({ error: "cor inválida — use #RRGGBB" }, { status: 400 });
    }
    cfg.corPrincipal = v ? (v.startsWith("#") ? v.toUpperCase() : `#${v.toUpperCase()}`) : undefined;
  }
  if (body.logoDataUrl) {
    writeLogo(tenantRoot(slug), body.logoDataUrl);
  }
  writeConfig(slug, cfg);

  logAudit({ ator: session.email || "owner", acao: "identidade.alterada", alvo: slug });
  return NextResponse.json({ corPrincipal: cfg.corPrincipal });
}
