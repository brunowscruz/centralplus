import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleCompartilhada, deleteAccount } from "@/lib/claude-accounts";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  const { id } = await params;
  const account = toggleCompartilhada(id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  logAudit({
    ator: session.email || "owner",
    acao: "conta_claude.compartilhamento_alterado",
    alvo: id,
    detalhe: account.compartilhada ? "compartilhada" : "dedicada",
  });
  return NextResponse.json(account);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  const { id } = await params;
  const ok = deleteAccount(id);
  if (!ok) {
    return NextResponse.json({ error: "não foi possível apagar essa conta" }, { status: 400 });
  }
  logAudit({ ator: session.email || "owner", acao: "conta_claude.apagada", alvo: id });
  return NextResponse.json({ ok: true });
}
