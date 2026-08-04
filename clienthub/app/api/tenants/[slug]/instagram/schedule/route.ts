import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug } from "@/lib/bos";
import { obterPost, salvarAgendamento, listPosts } from "@/lib/instagram";

/**
 * Agendar/cancelar a publicação de um post — grava agendamento.json (ver
 * lib/instagram.ts). Quem PUBLICA de verdade no horário é o cron externo em
 * app/api/cron/instagram-publicacoes/route.ts; esta rota só registra a
 * intenção. Mesma regra da publicação manual: só post já aprovado.
 */

async function auth(raw: string) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return { error: NextResponse.json({ error: "somente o operador agenda" }, { status: 403 }) };
  }
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return { error: NextResponse.json({ error: "slug inválido" }, { status: 400 }) };
  }
  if (!tenantExists(slug)) {
    return { error: NextResponse.json({ error: "cliente não existe" }, { status: 404 }) };
  }
  return { slug };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const a = await auth(raw);
  if ("error" in a) return a.error;

  let body: { post?: string; dataHoraISO?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.post || !body.dataHoraISO) {
    return NextResponse.json({ error: "informe post e dataHoraISO" }, { status: 400 });
  }
  const dataValida = !Number.isNaN(new Date(body.dataHoraISO).getTime());
  if (!dataValida) {
    return NextResponse.json({ error: "dataHoraISO inválida" }, { status: 400 });
  }

  const post = obterPost(a.slug, body.post);
  if (!post) {
    return NextResponse.json({ error: "post não encontrado" }, { status: 404 });
  }
  if (!post.aprovado) {
    return NextResponse.json({ error: "aprove o post antes de agendar" }, { status: 400 });
  }

  salvarAgendamento(a.slug, body.post, {
    dataHoraISO: body.dataHoraISO,
    status: "pendente",
    tentativas: 0,
  });
  return NextResponse.json({ posts: listPosts(a.slug) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const a = await auth(raw);
  if ("error" in a) return a.error;

  let body: { post?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (!body.post) {
    return NextResponse.json({ error: "informe o post" }, { status: 400 });
  }

  salvarAgendamento(a.slug, body.post, null);
  return NextResponse.json({ posts: listPosts(a.slug) });
}
