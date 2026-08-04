import { NextRequest, NextResponse } from "next/server";
import { sanitizeSlug } from "@/lib/bos";
import { tenantExists } from "@/lib/tenants";
import { registrarMensagem, registrarChamadaWhatsapp, marcarMensagemFalhou } from "@/lib/whatsapp";
import { setWhatsApp } from "@/lib/integrations";
import { upsertLeadDoWhatsapp } from "@/lib/crm";
import { responderComAgente } from "@/lib/whatsappAgente";

/**
 * Webhook PÚBLICO do Evolution API — configurado por instância na criação
 * (ver `conectarInstancia` em lib/whatsapp.ts). Sem sessão — o Evolution
 * API só sabe chamar essa URL porque nós a demos na hora de criar a
 * instance; não tem segredo aqui pra validar (Evolution API não assina o
 * payload por padrão), então tratamos como entrada não confiável: só lemos
 * e persistimos texto, nunca executamos nada perigoso a partir do conteúdo.
 *
 * Eventos tratados (ver docs/WHATSAPP-EVOLUTION-API.md pro payload de cada um):
 * - messages.upsert  → mensagem recebida vira/atualiza lead no CRM + fica na conversa
 * - messages.update  → status de entrega de mensagem ENVIADA (ex.: "ERROR" quando o
 *                       WhatsApp rejeita a entrega — comum em sessão recém-conectada
 *                       mandando pra contato novo) — marca a mensagem como "falhou"
 * - call             → vira ligação no CRM (Ligações)
 * - connection.update→ atualiza o status guardado (conectado/desconectado)
 */

interface BaileysKey {
  remoteJid?: string;
  /** número de telefone de verdade quando "remoteJid" é um identificador @lid
   * (WhatsApp esconde o número em alguns grupos/contas business) */
  remoteJidAlt?: string;
  fromMe?: boolean;
  id?: string;
}

interface BaileysMessage {
  key?: BaileysKey;
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
  };
}

function extrairTexto(msg: BaileysMessage): string | null {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
}

/** Prefere "remoteJidAlt" quando o JID principal é um identificador @lid
 * (WhatsApp esconde o número de telefone em alguns grupos/contas business —
 * o número de verdade só vem no campo alternativo). Sem isso, o lead seria
 * criado com um "número" que na verdade é um id opaco, não um telefone. */
function numeroDoJid(jid?: string, jidAlt?: string): string | null {
  const efetivo = jid?.endsWith("@lid") && jidAlt ? jidAlt : jid;
  if (!efetivo || efetivo.includes("@g.us") || efetivo.endsWith("@lid")) return null;
  return efetivo.split("@")[0];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(raw);
  } catch {
    return NextResponse.json({ error: "cliente inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }

  let body: { event?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  try {
    switch (body.event) {
      case "messages.upsert": {
        const msgs = Array.isArray(body.data) ? body.data : [body.data];
        for (const msg of msgs as BaileysMessage[]) {
          if (!msg?.key || msg.key.fromMe) continue; // só mensagem recebida (não eco do que a gente manda)
          const numero = numeroDoJid(msg.key.remoteJid, msg.key.remoteJidAlt);
          const texto = extrairTexto(msg);
          if (!numero || !texto) continue;
          const lead = upsertLeadDoWhatsapp(slug, { numero, nome: msg.pushName, primeiraMensagem: texto });
          registrarMensagem(slug, { numero, direcao: "recebida", texto });
          // fire-and-forget: não atrasa o 200 de volta pro Evolution API
          responderComAgente(slug, lead, texto).catch((e) => console.error("[webhook] agente de IA falhou:", e));
        }
        break;
      }
      case "messages.update": {
        const atualizacoes = Array.isArray(body.data) ? body.data : [body.data];
        for (const u of atualizacoes as { keyId?: string; status?: string }[]) {
          if (u?.status === "ERROR" && u.keyId) {
            marcarMensagemFalhou(slug, `evo-${u.keyId}`);
          }
        }
        break;
      }
      case "call": {
        const chamadas = Array.isArray(body.data) ? body.data : [body.data];
        for (const c of chamadas as { from?: string; status?: string }[]) {
          const numero = numeroDoJid(c?.from);
          if (!numero) continue;
          const resultado = c?.status === "reject" || c?.status === "timeout" ? "perdida" : "atendida";
          registrarChamadaWhatsapp(slug, numero, resultado);
        }
        break;
      }
      case "connection.update": {
        const data = body.data as { state?: string } | undefined;
        const estado = data?.state;
        if (estado) {
          setWhatsApp(slug, {
            status: estado === "open" ? "conectado" : estado === "connecting" ? "conectando" : "desconectado",
            ...(estado === "open" ? { conectadoEm: new Date().toISOString() } : {}),
          });
        }
        break;
      }
      default:
        break; // outros eventos (qrcode.updated, contacts.upsert...) ignorados por ora
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // nunca derruba com 500 pro Evolution API não ficar retentando pra sempre por bug nosso
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 200 });
  }
}
