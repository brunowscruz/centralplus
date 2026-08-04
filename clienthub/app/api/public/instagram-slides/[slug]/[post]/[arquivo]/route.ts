import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { resolveSlidePublico } from "@/lib/instagram";
import { mimeFor } from "@/lib/site";

/**
 * Serve um slide FINAL (PNG já renderizado) de um post SEM autenticação —
 * de propósito: a Graph API da Meta busca `image_url` diretamente por HTTP
 * anônimo (não manda cookie de sessão nem aceita header custom), então essa
 * é a única forma de ela conseguir baixar a imagem pra publicar de verdade
 * (ver lib/instagramPublish.ts e docs/PUBLICACAO-INSTAGRAM.md).
 *
 * Segurança: `resolveSlidePublico` restringe isso ao MÍNIMO necessário —
 * só um arquivo direto dentro de <post>/instagram/ (nunca outra pasta do
 * tenant) e só quando o post já tem o marker `.aprovado` (conteúdo não
 * aprovado nunca fica alcançável aqui, mesmo sabendo a URL exata). Mesmo
 * padrão de rota pública já usado no projeto pra webhook/lead-capture
 * (app/api/whatsapp/webhook/[slug], app/api/crm/lead-capture/[slug]).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; post: string; arquivo: string }> },
) {
  const { slug, post, arquivo } = await params;

  let abs: string;
  try {
    abs = resolveSlidePublico(slug, decodeURIComponent(post), decodeURIComponent(arquivo));
  } catch {
    return new NextResponse("não encontrado", { status: 404 });
  }

  if (!fs.existsSync(abs)) {
    return new NextResponse("não encontrado", { status: 404 });
  }

  const data = fs.readFileSync(abs);
  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type": mimeFor(abs),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
