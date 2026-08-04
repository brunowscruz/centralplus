import { NextRequest, NextResponse } from "next/server";
import { sanitizeSlug } from "@/lib/bos";
import { tenantExists } from "@/lib/tenants";
import { registrarCliqueLinkRastreio } from "@/lib/crm";

/**
 * Redirecionador público de Link de Rastreio (CRM → Integrações) — o link
 * que vai no anúncio/bio, tipo `hub.../r/<slug>/<codigo>`. Sem sessão (é
 * clicado por qualquer visitante). Conta o clique e manda pro destino
 * configurado: WhatsApp (com texto pré-preenchido, que depois o webhook usa
 * pra gravar a origem certa do lead) ou uma URL qualquer (página de vendas).
 */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; codigo: string }> }) {
  const { slug: raw, codigo } = await params;

  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return new NextResponse("link inválido", { status: 404 });
  }
  if (!tenantExists(slug)) return new NextResponse("link inválido", { status: 404 });

  const link = registrarCliqueLinkRastreio(slug, codigo);
  if (!link) return new NextResponse("link não encontrado", { status: 404 });

  const destino =
    link.destino === "whatsapp"
      ? `https://wa.me/${link.numeroWhatsapp}${link.mensagem ? `?text=${encodeURIComponent(link.mensagem)}` : ""}`
      : link.url!;

  return NextResponse.redirect(destino, { status: 302 });
}
