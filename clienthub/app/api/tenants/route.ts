import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { provisionTenant, ProvisionError, ProvisionInput } from "@/lib/provision";
import { logAudit } from "@/lib/audit";

// Cadastrar cliente novo = provisionamento (seção 1 do spec), nunca deploy novo.
// Cria `clientes/<slug>/` com memória, identidade, módulos ativos e credencial.
// Somente o operador da agência pode provisionar.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }

  let body: ProvisionInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  try {
    const result = provisionTenant(body);
    logAudit({
      ator: session.email || "owner",
      acao: "cliente.criado",
      alvo: result.slug,
      detalhe: `módulos: ${result.modulos_ativos.join(", ") || "nenhum"}`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ProvisionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("provisionamento falhou:", e);
    return NextResponse.json(
      { error: "falha ao provisionar o cliente" },
      { status: 500 },
    );
  }
}
