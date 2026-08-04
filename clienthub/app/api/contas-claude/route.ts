import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listAccounts, createAccount, CreateAccountInput } from "@/lib/claude-accounts";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  return NextResponse.json(listAccounts());
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }

  let body: CreateAccountInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (!body.nome?.trim()) {
    return NextResponse.json({ error: "informe um nome pra conta" }, { status: 400 });
  }
  if (body.tipo === "seat_token" && !body.token?.trim()) {
    return NextResponse.json(
      { error: "cole o token gerado por `claude setup-token`" },
      { status: 400 },
    );
  }

  const account = createAccount(body);
  logAudit({
    ator: session.email || "owner",
    acao: "conta_claude.criada",
    alvo: account.id,
    detalhe: `tipo: ${account.tipo}`,
  });
  return NextResponse.json(account, { status: 201 });
}
