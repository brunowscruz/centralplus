import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createHub, CreateHubInput } from "@/lib/hubs";
import { logAudit } from "@/lib/audit";

// Criar Hub (seção 3 do spec): uma marca white-label completa — identidade,
// tema, módulos e domínio próprios. Owner-only, com log de auditoria.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }

  let body: CreateHubInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  if (!body.nome || !body.nome.trim()) {
    return NextResponse.json({ error: "informe o nome do hub" }, { status: 400 });
  }

  try {
    const hub = createHub(body);
    logAudit({
      ator: session.email || "owner",
      acao: "hub.criado",
      alvo: hub.id,
      detalhe: `nome: ${hub.nome}`,
    });
    return NextResponse.json(hub, { status: 201 });
  } catch (e) {
    console.error("criação de hub falhou:", e);
    return NextResponse.json({ error: "falha ao criar o hub" }, { status: 500 });
  }
}
