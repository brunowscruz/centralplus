import { NextRequest, NextResponse } from "next/server";
import {
  verifyOwner,
  verifyClient,
  setSession,
  newExp,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { mode?: string; id?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  const { mode, id, password } = body;
  if (!id || !password) {
    return NextResponse.json(
      { error: "informe login e senha" },
      { status: 400 },
    );
  }

  if (mode === "owner") {
    if (!verifyOwner(id, password)) {
      return NextResponse.json({ error: "credenciais inválidas" }, { status: 401 });
    }
    await setSession({ role: "owner", email: id, exp: newExp() });
    return NextResponse.json({ redirect: "/console" });
  }

  const client = verifyClient(id, password);
  if (!client) {
    return NextResponse.json({ error: "credenciais inválidas" }, { status: 401 });
  }
  await setSession({ role: "client", slug: client.slug, exp: newExp() });
  return NextResponse.json({ redirect: `/c/${client.slug}` });
}
