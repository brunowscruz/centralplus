import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { approveVersion, siteStatus } from "@/lib/site";
import { publicarSeConfigurado } from "@/lib/publish";

/**
 * Aprovar uma versão de rascunho como site oficial (copia para site/).
 * REGRA DE OURO do spec: o cliente final nunca faz deploy — somente o
 * operador da agência aprova mudanças de site.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json(
      { error: "somente o operador aprova versões do site" },
      { status: 403 },
    );
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

  let body: { version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.version) {
    return NextResponse.json({ error: "informe a versão" }, { status: 400 });
  }

  let resultado: { tipo: string; subpasta: string };
  try {
    resultado = approveVersion(slug, body.version);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Publicação (FTP/git) é best-effort — aprovação local já aconteceu e vale
  // mesmo se a publicação externa falhar (fica registrado o motivo). Como a
  // LP agora fica DENTRO de site/ (subpasta), sobe junto na mesma publicação
  // sem precisar de lógica extra aqui.
  const publicacao = await publicarSeConfigurado(slug);

  return NextResponse.json({ ...siteStatus(slug), publicacao, aprovacao: resultado });
}
