import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { tenantExists } from "./tenants";
import { sanitizeSlug } from "./bos";

/**
 * Guard de acesso para rotas de API do workspace.
 * Retorna { slug } saneado, ou { error: NextResponse } pronto pra devolver.
 *
 * Regra igual ao lib/access: owner acessa qualquer cliente; client só o próprio.
 * Isso é o que impede o cliente A de tocar em dado do cliente B via API.
 */
export async function requireWorkspaceApi(
  rawSlug: string,
): Promise<{ slug: string } | { error: NextResponse }> {
  const s = await getSession();
  if (!s) {
    return { error: NextResponse.json({ error: "não autenticado" }, { status: 401 }) };
  }
  let slug: string;
  try {
    slug = sanitizeSlug(rawSlug);
  } catch {
    return { error: NextResponse.json({ error: "slug inválido" }, { status: 400 }) };
  }
  if (s.role === "client" && s.slug !== slug) {
    return { error: NextResponse.json({ error: "acesso negado" }, { status: 403 }) };
  }
  if (!tenantExists(slug)) {
    return { error: NextResponse.json({ error: "cliente não existe" }, { status: 404 }) };
  }
  return { slug };
}
