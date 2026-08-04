import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { readIntegrations, evolutionConfigurado, setWhatsApp } from "@/lib/integrations";
import {
  conectarInstancia,
  obterNovoQrCode,
  statusConexao,
  desconectar,
  excluirInstancia,
  enviarERegistrar,
  listarContatosWhatsapp,
  listarConversa,
  importarHistoricoConversa,
} from "@/lib/whatsapp";
import { addLead } from "@/lib/crm";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

// Administração da conexão WhatsApp (Evolution API) do cliente — owner-only,
// token da instância nunca sai em texto puro.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const numero = req.nextUrl.searchParams.get("numero") || undefined;
  const { whatsapp } = readIntegrations(slug);
  return NextResponse.json({
    configuradoNaInstalacao: evolutionConfigurado(),
    whatsapp: whatsapp
      ? {
          instanceName: whatsapp.instanceName,
          status: whatsapp.status,
          numero: whatsapp.numero,
          conectadoEm: whatsapp.conectadoEm,
          temToken: !!whatsapp.instanceToken,
          agenteIA: whatsapp.agenteIA,
        }
      : undefined,
    agenteDisponivel: !!process.env.ANTHROPIC_API_KEY,
    // com "numero", devolve a conversa inteira daquele contato (sem teto de 200
    // misturado com outras conversas) — usado pela thread de chat ao vivo.
    conversas: numero ? listarConversa(slug, numero) : listarConversa(slug).slice(-200),
  });
}

interface Body {
  acao?: string;
  numero?: string;
  texto?: string;
  faseId?: string;
  contatos?: { numero: string; nome?: string }[];
  importarHistorico?: boolean;
  ativo?: boolean;
  personalidade?: string;
  faseIds?: string[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente operador" }, { status: 403 });
  }
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
      case "conectar": {
        const qr = await conectarInstancia(slug);
        logAudit({ ator: session.email || "owner", acao: "whatsapp.conectar", alvo: slug });
        return NextResponse.json({ qr });
      }
      case "qr.novo": {
        const qr = await obterNovoQrCode(slug);
        return NextResponse.json({ qr });
      }
      case "status": {
        const estado = await statusConexao(slug);
        return NextResponse.json({ estado });
      }
      case "desconectar": {
        await desconectar(slug);
        logAudit({ ator: session.email || "owner", acao: "whatsapp.desconectar", alvo: slug });
        return NextResponse.json({ ok: true });
      }
      case "excluir": {
        await excluirInstancia(slug);
        logAudit({ ator: session.email || "owner", acao: "whatsapp.excluir_instancia", alvo: slug });
        return NextResponse.json({ ok: true });
      }
      case "teste": {
        if (!body.numero) throw new Error("informe o número de teste");
        const ok = await enviarERegistrar(slug, body.numero, body.texto || "Teste de conexão do CentralPlus 👋");
        if (!ok) throw new Error("não foi possível enviar — confira se a conexão está ativa");
        return NextResponse.json({ ok: true });
      }
      case "mensagem.enviar": {
        if (!body.numero || !body.texto?.trim()) throw new Error("informe número e texto");
        const ok = await enviarERegistrar(slug, body.numero, body.texto.trim());
        if (!ok) throw new Error("não foi possível enviar — confira se a conexão está ativa");
        return NextResponse.json({ ok: true });
      }
      case "conversa.importar": {
        if (!body.numero) throw new Error("informe o número");
        const importadas = await importarHistoricoConversa(slug, body.numero);
        logAudit({ ator: session.email || "owner", acao: "whatsapp.conversa_importada", alvo: slug });
        return NextResponse.json({ ok: true, importadas });
      }
      case "agenteIA.definir": {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada nesta instalação");
        setWhatsApp(slug, {
          agenteIA: {
            ativo: !!body.ativo,
            personalidade: String(body.personalidade || ""),
            faseIds: body.faseIds?.length ? body.faseIds : undefined,
          },
        });
        logAudit({ ator: session.email || "owner", acao: "whatsapp.agente_ia_definido", alvo: slug });
        return NextResponse.json({ ok: true });
      }
      case "contatos.listar": {
        const contatos = await listarContatosWhatsapp(slug);
        return NextResponse.json({ contatos });
      }
      case "contatos.importar": {
        if (!body.contatos?.length) throw new Error("selecione pelo menos um contato");
        let importados = 0;
        for (const c of body.contatos) {
          addLead(slug, { nome: c.nome || c.numero, whatsapp: c.numero, origem: "WhatsApp (importado)", faseId: body.faseId });
          importados++;
          if (body.importarHistorico) {
            await importarHistoricoConversa(slug, c.numero).catch(() => {});
          }
        }
        logAudit({ ator: session.email || "owner", acao: "whatsapp.contatos_importados", alvo: slug });
        return NextResponse.json({ ok: true, importados });
      }
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
