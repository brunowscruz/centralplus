import { NextRequest, NextResponse } from "next/server";
import { listTenants } from "@/lib/tenants";
import { readIntegrations } from "@/lib/integrations";
import { listPosts, salvarAgendamento } from "@/lib/instagram";
import { publicarPost } from "@/lib/instagramPublish";

/**
 * Publica no horário os posts agendados (agendamento.json com status
 * "pendente" e dataHoraISO <= agora) — ver docs/PUBLICACAO-INSTAGRAM.md.
 * Mesmo padrão de app/api/cron/whatsapp-automacoes/route.ts: não roda
 * sozinho, precisa de um cron externo (crontab da VPS, Dokploy/Coolify)
 * batendo aqui de tempos em tempos (5-15 min é um intervalo razoável pra
 * agendamento de post não perder precisão de mais que isso). Protegido por
 * secret via header, não por sessão — quem chama é uma tarefa agendada.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado nesta instalação" }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const agora = Date.now();
  const resultados: Record<string, { publicadas: number; falhas: number }> = {};

  for (const tenant of listTenants()) {
    const meta = readIntegrations(tenant.slug).metaInstagram;
    if (!meta?.pageAccessToken || !meta?.igUserId) continue;

    const pendentes = listPosts(tenant.slug).filter(
      (p) => p.agendamento?.status === "pendente" && new Date(p.agendamento.dataHoraISO).getTime() <= agora,
    );
    if (pendentes.length === 0) continue;

    let publicadas = 0;
    let falhas = 0;
    for (const post of pendentes) {
      const agendamento = post.agendamento!;
      try {
        const resultado = await publicarPost(tenant.slug, post.name);
        if (resultado.ok) {
          publicadas++;
          salvarAgendamento(tenant.slug, post.name, { ...agendamento, status: "publicado" });
        } else {
          falhas++;
          salvarAgendamento(tenant.slug, post.name, {
            ...agendamento,
            status: "falhou",
            tentativas: agendamento.tentativas + 1,
            erro: resultado.mensagem,
          });
        }
      } catch (e) {
        falhas++;
        salvarAgendamento(tenant.slug, post.name, {
          ...agendamento,
          status: "falhou",
          tentativas: agendamento.tentativas + 1,
          erro: (e as Error).message,
        });
        console.error(`[cron instagram-publicacoes] falhou pra ${tenant.slug}/${post.name}:`, (e as Error).message);
      }
    }
    resultados[tenant.slug] = { publicadas, falhas };
  }

  return NextResponse.json({ ok: true, resultados });
}
