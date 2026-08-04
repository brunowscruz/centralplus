import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addIdeia } from "@/lib/ideias";
import { logAudit } from "@/lib/audit";

// Registrar uma ideia nova no Banco de Ideias (seção 18/23 do spec).
// Só o operador registra — o backlog vive dentro do Console.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }

  let body: { titulo?: string; descricao?: string; contexto?: string; vertical?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const titulo = (body.titulo || "").trim();
  const descricao = (body.descricao || "").trim();
  if (!titulo || !descricao) {
    return NextResponse.json(
      { error: "informe título e descrição" },
      { status: 400 },
    );
  }

  const ideia = addIdeia({
    titulo,
    descricao,
    contexto: body.contexto,
    vertical: body.vertical,
  });

  logAudit({
    ator: session.email || "owner",
    acao: "ideia.registrada",
    alvo: ideia.id,
  });

  return NextResponse.json(ideia, { status: 201 });
}
