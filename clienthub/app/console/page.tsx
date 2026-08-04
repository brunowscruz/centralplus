import Link from "next/link";
import { CheckCircle2, Clock, FlaskConical, HeartPulse, Plus } from "lucide-react";
import { listTenants } from "@/lib/tenants";
import { loadCatalog } from "@/lib/modules";
import StatCard from "@/components/console/StatCard";

export const dynamic = "force-dynamic";

// Dashboard (seção 3, grupo OPERATION): visão geral agregada de todos os
// workspaces — não é enfeite, é derivado dos mesmos dados que alimentam
// Clientes/Workspaces (config.json de cada cliente).
export default async function DashboardPage() {
  const tenants = listTenants();
  const catalog = loadCatalog();

  const ativos = tenants.filter((t) => t.status === "ativo").length;
  const emConfig = tenants.filter((t) => t.status === "em_configuracao").length;
  const experimentais = tenants.filter((t) => t.status === "experimental").length;
  const saudeMedia = tenants.length
    ? Math.round(
        tenants.reduce((sum, t) => sum + t.contextStrength.score, 0) / tenants.length,
      )
    : 0;
  const comAlerta = tenants.filter((t) => t.contextStrength.score < 50).length;

  const usoModulos = catalog
    .filter((m) => !m.always)
    .map((m) => ({
      modulo: m,
      clientes: tenants.filter((t) => t.modulos_ativos.includes(m.id)).length,
    }))
    .sort((a, b) => b.clientes - a.clientes);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted mt-0.5">
          Visão geral de {tenants.length} workspace{tenants.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Workspaces ativos" value={ativos} icon={CheckCircle2} />
        <StatCard label="Em configuração" value={emConfig} icon={Clock} />
        <StatCard label="Experimentais" value={experimentais} icon={FlaskConical} />
        <StatCard
          label="Saúde média (contexto)"
          value={`${saudeMedia}%`}
          icon={HeartPulse}
          tone={saudeMedia >= 75 ? "good" : saudeMedia >= 50 ? "warn" : "bad"}
        />
      </div>

      {comAlerta > 0 && (
        <div className="card p-4 text-sm border-l-4" style={{ borderLeftColor: "#f87171" }}>
          <span className="font-medium">{comAlerta}</span> workspace
          {comAlerta === 1 ? "" : "s"} com força de contexto abaixo de 50% —
          vale revisar em{" "}
          <Link href="/console/clientes" className="text-accent underline underline-offset-2">
            Clientes
          </Link>
          .
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          Adoção de módulos opcionais
        </h2>
        <div className="card divide-y divide-[var(--border)]">
          {usoModulos.map(({ modulo, clientes }) => (
            <div key={modulo.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="flex items-center gap-2">
                <span>{modulo.icon}</span>
                {modulo.label}
                <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app">
                  {modulo.status}
                </span>
              </span>
              <span className="text-muted">
                {clientes} cliente{clientes === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/console/novo" className="btn-accent px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} /> Novo Cliente
        </Link>
        <Link href="/console/clientes" className="btn-ghost px-4 py-2 text-sm">
          Ver todos os clientes
        </Link>
      </div>
    </div>
  );
}
