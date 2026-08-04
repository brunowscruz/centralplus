import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import {
  readFinanceiro,
  addLancamento,
  deleteLancamento,
  addConta,
  marcarConta,
  deleteConta,
  addAssinatura,
  toggleAssinatura,
  addCarteira,
  deleteCarteira,
  definirMeta,
  addCategoria,
  editCategoria,
  deleteCategoria,
  addFuncionario,
  editFuncionario,
  toggleFuncionario,
  deleteFuncionario,
  lancarFolhaDoMes,
} from "@/lib/financeiro";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json(readFinanceiro(auth.slug));
}

interface Body {
  acao?: string;
  id?: string;
  status?: "pendente" | "pago" | "atrasado";
  [k: string]: unknown;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  try {
    switch (body.acao) {
      case "lancamento.criar":
        return NextResponse.json(addLancamento(slug, body as never));
      case "lancamento.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteLancamento(slug, body.id));
      case "conta.criar":
        return NextResponse.json(addConta(slug, body as never));
      case "conta.marcar":
        if (!body.id || !body.status) throw new Error("id e status obrigatórios");
        return NextResponse.json(marcarConta(slug, body.id, body.status));
      case "conta.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteConta(slug, body.id));
      case "assinatura.criar":
        return NextResponse.json(addAssinatura(slug, body as never));
      case "assinatura.toggle":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(toggleAssinatura(slug, body.id));
      case "carteira.criar":
        return NextResponse.json(addCarteira(slug, body as never));
      case "carteira.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteCarteira(slug, body.id));
      case "meta.definir":
        return NextResponse.json(definirMeta(slug, body as never));
      case "categoria.criar":
        return NextResponse.json(addCategoria(slug, body as never));
      case "categoria.editar":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(editCategoria(slug, body.id, body as never));
      case "categoria.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteCategoria(slug, body.id));
      case "funcionario.criar":
        return NextResponse.json(addFuncionario(slug, body as never));
      case "funcionario.editar":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(editFuncionario(slug, body.id, body as never));
      case "funcionario.toggle":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(toggleFuncionario(slug, body.id));
      case "funcionario.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteFuncionario(slug, body.id));
      case "folha.lancar":
        return NextResponse.json(lancarFolhaDoMes(slug, body.mes as string | undefined));
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
