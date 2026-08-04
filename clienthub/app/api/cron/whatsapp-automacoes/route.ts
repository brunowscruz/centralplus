import { NextRequest, NextResponse } from "next/server";
import { listTenants } from "@/lib/tenants";
import { readIntegrations } from "@/lib/integrations";
import { processarAutomacoesPendentes } from "@/lib/whatsapp";

/**
 * Disparo periódico das automações de WhatsApp por etapa (ver
 * docs/WHATSAPP-EVOLUTION-API.md). Não roda sozinho — precisa de um cron
 * externo batendo aqui (crontab da VPS, cron job do Dokploy/Coolify, etc.),
 * de tempos em tempos (15-30 min é um bom intervalo pra "depois de N dias"
 * não precisar de precisão de minuto). Protegido por um secret simples via
 * header, não por sessão de owner — quem chama é uma tarefa agendada, não
 * um navegador logado.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado nesta instalação" }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const resultados: Record<string, { enviadas: number; falhas: number }> = {};
  for (const tenant of listTenants()) {
    const wa = readIntegrations(tenant.slug).whatsapp;
    if (!wa?.instanceToken || wa.status !== "conectado") continue;
    try {
      resultados[tenant.slug] = await processarAutomacoesPendentes(tenant.slug);
    } catch (e) {
      resultados[tenant.slug] = { enviadas: 0, falhas: 0 };
      console.error(`[cron whatsapp-automacoes] falhou pra ${tenant.slug}:`, (e as Error).message);
    }
  }
  return NextResponse.json({ ok: true, resultados });
}
