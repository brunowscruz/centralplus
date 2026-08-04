import Link from "next/link";
import { Plus, CheckCircle2, Clock, AlertTriangle, Zap, HeartPulse } from "lucide-react";
import { listTenants } from "@/lib/tenants";
import { optionalModules } from "@/lib/modules";
import { listHubs } from "@/lib/hubs";
import { listAccounts } from "@/lib/claude-accounts";
import StatCard from "@/components/console/StatCard";
import WorkspacesTable from "./WorkspacesTable";

export const dynamic = "force-dynamic";

// Workspaces (seção 3, grupo USERS): lente de infraestrutura — cards
// agregados + busca + filtro + tabela com Abrir (MODO OWNER) e menu de ações.
export default async function WorkspacesPage() {
  const tenants = listTenants();
  const optional = optionalModules();
  const hubs = listHubs().map((h) => ({ id: h.id, nome: h.nome }));
  const modules = optional.map((m) => ({ id: m.id as string, label: m.label, description: m.description }));
  const accounts = listAccounts().map((a) => ({ id: a.id, nome: a.nome, compartilhada: a.compartilhada }));

  const ativos = tenants.filter((t) => t.status === "ativo").length;
  const emConfig = tenants.filter((t) => t.status === "em_configuracao").length;
  const comAlertas = tenants.filter((t) => (t.healthScore ?? t.contextStrength.score) < 50).length;
  const integracoesAtivas = tenants.reduce(
    (sum, t) => sum + optional.filter((m) => t.modulos_ativos.includes(m.id)).length,
    0,
  );
  const saudeMedia = tenants.length
    ? Math.round(
        tenants.reduce((sum, t) => sum + (t.healthScore ?? t.contextStrength.score), 0) / tenants.length,
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-muted text-sm mt-0.5 max-w-lg">
            Gerencie os ambientes operacionais de cada cliente, seus módulos, integrações,
            acessos e status de operação.
          </p>
        </div>
        <Link href="/console/novo" className="btn-accent px-4 py-2 text-sm whitespace-nowrap inline-flex items-center gap-1.5">
          <Plus size={15} /> Novo Workspace
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Workspaces ativos" value={ativos} icon={CheckCircle2} />
        <StatCard label="Em configuração" value={emConfig} icon={Clock} />
        <StatCard label="Com alertas" value={comAlertas} icon={AlertTriangle} tone={comAlertas > 0 ? "bad" : undefined} />
        <StatCard label="Integrações ativas" value={integracoesAtivas} icon={Zap} />
        <StatCard
          label="Saúde média"
          value={`${saudeMedia}%`}
          icon={HeartPulse}
          tone={saudeMedia >= 75 ? "good" : saudeMedia >= 50 ? "warn" : "bad"}
        />
      </div>

      <WorkspacesTable tenants={tenants} hubs={hubs} modules={modules} accounts={accounts} />
    </div>
  );
}
