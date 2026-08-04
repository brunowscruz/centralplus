import { NextResponse } from "next/server";
import { getSession, setSession, newExp } from "@/lib/auth";

// "Voltar ao Console": remove o slug da sessão do owner.
export async function POST() {
  const s = await getSession();
  if (s?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
  await setSession({ role: "owner", email: s.email, exp: newExp() });
  return NextResponse.json({ redirect: "/console" });
}
