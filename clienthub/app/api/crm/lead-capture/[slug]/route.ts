import { NextRequest, NextResponse } from "next/server";
import { sanitizeSlug } from "@/lib/bos";
import { tenantExists } from "@/lib/tenants";
import { addLeadPublico } from "@/lib/crm";

/**
 * Webhook PÚBLICO de captação de lead (seção 13 do spec — formulário do
 * site / Zapier / Make / RD Station apontam pra cá). Sem sessão — protegido
 * só pelo token do CRM daquele cliente (não é a senha de login, é uma
 * credencial de escrita mínima: só cria lead, não lê nada).
 *
 * CORS liberado (qualquer origem pode POSTar — é assim que um <form> de site
 * externo funciona) mas o corpo tem que trazer o token certo.
 */
function cors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return cors(NextResponse.json({ error: "cliente inválido" }, { status: 400 }));
  }
  if (!tenantExists(slug)) {
    return cors(NextResponse.json({ error: "cliente não existe" }, { status: 404 }));
  }

  let body: {
    token?: string;
    nome?: string;
    telefone?: string;
    email?: string;
    empresa?: string;
    mensagem?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return cors(NextResponse.json({ error: "payload inválido" }, { status: 400 }));
  }

  const token = (req.nextUrl.searchParams.get("token") || body.token || "").trim();
  if (!token) return cors(NextResponse.json({ error: "token obrigatório" }, { status: 401 }));

  try {
    addLeadPublico(slug, token, {
      nome: body.nome || body.telefone || "Lead sem nome",
      empresa: body.empresa,
      email: body.email,
      whatsapp: body.telefone,
      origem: body.source || "Formulário do site",
    });
    return cors(NextResponse.json({ ok: true }));
  } catch (e) {
    const msg = (e as Error).message;
    return cors(NextResponse.json({ error: msg }, { status: msg === "token inválido" ? 401 : 400 }));
  }
}
