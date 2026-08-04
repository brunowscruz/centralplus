import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { lerPaginasLocais, atualizarPaginaLocal } from "@/lib/seoLocal";
import { publicarPaginaNoWordpress } from "@/lib/wordpress";

/**
 * Publica uma página local no WordPress do cliente. REGRA DE OURO do
 * projeto: só o operador da agência publica de verdade (mesmo padrão de
 * app/api/tenants/[slug]/site/approve/route.ts) — o cliente nunca dispara
 * isso sozinho.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador publica páginas no WordPress" }, { status: 403 });
  }

  const { slug: raw, id } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  const pagina = lerPaginasLocais(slug).paginas.find((p) => p.id === id);
  if (!pagina) {
    return NextResponse.json({ error: "página não encontrada" }, { status: 404 });
  }

  const resultado = await publicarPaginaNoWordpress(slug, pagina.pastaRascunho);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.mensagem }, { status: 400 });
  }

  const paginas = atualizarPaginaLocal(slug, id, {
    status: "publicada",
    urlPublicada: resultado.url,
    wpPostId: resultado.wpPostId,
  });
  return NextResponse.json({ ...paginas, mensagem: resultado.mensagem });
}
