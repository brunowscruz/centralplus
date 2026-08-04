import fs from "node:fs";
import path from "node:path";
import { Globe, Camera, Wallet, FolderGit2 } from "lucide-react";
import { requireWorkspace } from "@/lib/access";
import { getTenant } from "@/lib/tenants";
import { tenantRoot } from "@/lib/bos";
import { siteStatus } from "@/lib/site";
import { readFinanceiro, resumoFinanceiro } from "@/lib/financeiro";
import { readIntegrations } from "@/lib/integrations";
import { anthropicApiKey } from "@/lib/agent";
import StatusCard from "@/components/workspace/StatusCard";
import LiveClock from "@/components/workspace/LiveClock";
import VisaoGeralChat from "@/components/workspace/VisaoGeralChat";

export const dynamic = "force-dynamic";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Conta arquivos reais do workspace (raso o bastante pra não pesar). Ignora
 * pastas de sistema — não é telemetria, é só "quanto conteúdo já existe". */
function countFiles(root: string, depth = 0): number {
  if (depth > 6) return 0;
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    if (e.isDirectory()) total += countFiles(path.join(root, e.name), depth + 1);
    else total += 1;
  }
  return total;
}

export default async function VisaoGeral({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireWorkspace(slug);
  const tenant = getTenant(slug);
  const cs = tenant.contextStrength;
  const chatEnabled = !!anthropicApiKey() && tenant.claude?.habilitado !== false;

  const temSite = tenant.modulos_ativos.includes("site");
  const temInstagram = tenant.modulos_ativos.includes("instagram");
  const temFinanceiro = tenant.modulos_ativos.includes("financeiro");

  const site = temSite ? siteStatus(slug) : null;
  const siteExterno = tenant.presencaDigital?.site || null;
  const finResumo = temFinanceiro ? resumoFinanceiro(readFinanceiro(slug)) : null;
  const integrations = temInstagram ? readIntegrations(slug) : {};
  const igConectado = !!integrations.metaInstagram?.pageAccessToken;

  const arquivos = countFiles(tenantRoot(slug));
  const qualidade =
    cs.score >= 75 ? "Ótimo" : cs.score >= 50 ? "Bom" : cs.score >= 25 ? "Fraco" : "Vazio";
  const qualidadeTone: "good" | "warn" | "bad" =
    cs.score >= 75 ? "good" : cs.score >= 25 ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted">{saudacao()}</p>
        <h1 className="text-2xl font-semibold mt-0.5">{tenant.nome}</h1>
        <p className="text-sm text-muted mt-0.5">Tudo do seu negócio digital, em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={Globe}
          title="Meu Site"
          badge={
            !temSite ? "Não incluído" : site?.current ? "Ativo" : siteExterno ? "Vinculado" : "Não configurado"
          }
          badgeTone={!temSite ? "muted" : site?.current || siteExterno ? "good" : "warn"}
          detail={
            !temSite
              ? "Módulo não incluído no plano"
              : site?.current
                ? "Site ativo"
                : siteExterno
                  ? siteExterno.replace(/^https?:\/\//, "")
                  : "Vinculado a este workspace"
          }
          href={temSite ? `/c/${slug}/site` : undefined}
        />
        <StatusCard
          icon={Camera}
          title="Instagram"
          badge={!temInstagram ? "Não incluído" : igConectado ? "Conectado" : "Não configurado"}
          badgeTone={!temInstagram ? "muted" : igConectado ? "good" : "warn"}
          detail={!temInstagram ? "Módulo não incluído no plano" : igConectado ? "API conectada" : "Conecte em Configurações"}
          href={temInstagram ? `/c/${slug}/instagram` : undefined}
        />
        <StatusCard
          icon={Wallet}
          title="Financeiro"
          badge={!temFinanceiro ? "Não incluído" : finResumo!.saldo >= 0 ? "Em dia" : "Saldo negativo"}
          badgeTone={!temFinanceiro ? "muted" : finResumo!.saldo >= 0 ? "good" : "bad"}
          detail={!temFinanceiro ? "Módulo não incluído no plano" : `Saldo: ${BRL.format(finResumo!.saldo)}`}
          href={temFinanceiro ? `/c/${slug}/financeiro` : undefined}
        />
        <StatusCard
          icon={FolderGit2}
          title="Arquivos · Claude"
          badge={qualidade}
          badgeTone={qualidadeTone}
          detail={`${arquivos} arquivo${arquivos === 1 ? "" : "s"}`}
          href={`/c/${slug}/claude`}
        />
      </div>

      <LiveClock />

      <VisaoGeralChat slug={slug} enabled={chatEnabled} />
    </div>
  );
}
