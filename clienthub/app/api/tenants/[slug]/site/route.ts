import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { getSession } from "@/lib/auth";
import { siteStatus, listarPaginas, criarRascunhoAPartirDoSite, gravarTipoVersao, assertVersionName, type SitePage } from "@/lib/site";

// Status do módulo Meu Site: site aprovado + rascunhos disponíveis + páginas
// da versão pedida (?v=<rascunho>, vazio/ausente = site aprovado).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const v = req.nextUrl.searchParams.get("v") || null;
  const status = siteStatus(slug);
  let paginas: SitePage[];
  try {
    paginas = listarPaginas(slug, v);
  } catch {
    paginas = [];
  }
  return NextResponse.json({ ...status, paginas });
}

/** Cria um rascunho novo copiando o site aprovado inteiro — usado quando o
 * operador quer editar uma página do site que já está no ar (não dá pra
 * editar `site/` direto). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador prepara rascunho de edição" }, { status: 403 });
  }
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  let body: { acao?: string; paginaAlvo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (body.acao !== "rascunho-do-site-atual") {
    return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  }

  try {
    const rascunho = criarRascunhoAPartirDoSite(slug, body.paginaAlvo);
    return NextResponse.json({ ...siteStatus(slug), rascunho });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Marca o tipo (site/lp) de um rascunho — chamado pela UI depois que o
 * agente termina de gerar, com o tipo que o operador já tinha escolhido no
 * briefing (não confia só no que a IA gravou sozinha: isso decide se a
 * aprovação vai substituir a home ou virar uma subpágina, é dado demais
 * importante pra depender só do agente lembrar). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador define o tipo do rascunho" }, { status: 403 });
  }
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  let body: { version?: string; tipo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  if (body.tipo !== "site" && body.tipo !== "lp") {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  }
  if (!body.version) {
    return NextResponse.json({ error: "informe a versão" }, { status: 400 });
  }

  try {
    assertVersionName(body.version);
    gravarTipoVersao(slug, body.version, body.tipo);
    return NextResponse.json(siteStatus(slug));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
