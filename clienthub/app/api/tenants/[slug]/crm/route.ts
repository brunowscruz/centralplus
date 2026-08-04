import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import {
  readCrm,
  addLead,
  updateLead,
  deleteLead,
  addTarefa,
  toggleTarefa,
  deleteTarefa,
  addAnotacao,
  addLigacao,
  addFase,
  editarFase,
  excluirFase,
  deleteAnotacao,
  regenerarToken,
  definirAutomacaoFase,
  criarLinkRastreio,
  excluirLinkRastreio,
} from "@/lib/crm";

// CRM do workspace: GET devolve o estado inteiro; POST aplica uma ação.
// Mesmo guard de sempre: owner acessa qualquer cliente, cliente só o próprio.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  return NextResponse.json(readCrm(auth.slug));
}

interface Body {
  acao?: string;
  id?: string;
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
      case "lead.criar":
        return NextResponse.json(addLead(slug, body as never));
      case "lead.editar":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(updateLead(slug, body.id, body as never));
      case "lead.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteLead(slug, body.id));
      case "tarefa.criar":
        return NextResponse.json(addTarefa(slug, body as never));
      case "tarefa.toggle":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(toggleTarefa(slug, body.id));
      case "tarefa.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteTarefa(slug, body.id));
      case "anotacao.criar":
        return NextResponse.json(addAnotacao(slug, body as never));
      case "anotacao.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(deleteAnotacao(slug, body.id));
      case "ligacao.criar":
        return NextResponse.json(addLigacao(slug, body as never));
      case "fase.criar":
        return NextResponse.json(addFase(slug, body as never));
      case "fase.editar":
        if (!body.faseId) throw new Error("faseId obrigatório");
        return NextResponse.json(editarFase(slug, body.faseId as string, body as never));
      case "fase.excluir":
        if (!body.faseId) throw new Error("faseId obrigatório");
        return NextResponse.json(excluirFase(slug, body.faseId as string));
      case "token.regenerar":
        return NextResponse.json(regenerarToken(slug));
      case "linkRastreio.criar":
        return NextResponse.json(criarLinkRastreio(slug, body as never));
      case "linkRastreio.excluir":
        if (!body.id) throw new Error("id obrigatório");
        return NextResponse.json(excluirLinkRastreio(slug, body.id));
      case "automacao.definir":
        if (!body.faseId) throw new Error("faseId obrigatório");
        return NextResponse.json(
          definirAutomacaoFase(slug, body.faseId as string, {
            ativo: !!body.ativo,
            atrasoDias: Number(body.atrasoDias) || 1,
            mensagem: String(body.mensagem || ""),
          }),
        );
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
