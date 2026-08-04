"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Globe as GlobeIcon,
  FolderOpen,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  LogIn,
} from "lucide-react";
import type { Tenant, TenantStatus } from "@/lib/tenants";
import Avatar from "@/components/console/Avatar";
import ModalPortal from "@/components/console/ModalPortal";
import RowMenu from "@/components/console/RowMenu";
import EditarClienteModal from "../clientes/EditarClienteModal";
import ExcluirClienteModal from "../clientes/ExcluirClienteModal";

const STATUS_LABELS: Record<TenantStatus, string> = {
  ativo: "Ativo",
  em_configuracao: "Em configuração",
  experimental: "Experimental",
  arquivado: "Arquivado",
};

interface HubOption {
  id: string;
  nome: string;
}
interface ModuleOption {
  id: string;
  label: string;
  description: string;
}
interface AccountOption {
  id: string;
  nome: string;
  compartilhada: boolean;
}

export default function WorkspacesTable({
  tenants,
  hubs,
  modules,
  accounts,
}: {
  tenants: Tenant[];
  hubs: HubOption[];
  modules: ModuleOption[];
  accounts: AccountOption[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | TenantStatus>("todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "todos" && (t.status || "em_configuracao") !== statusFilter) return false;
      if (!q) return true;
      return (
        t.nome.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.presencaDigital?.dominio || "").toLowerCase().includes(q)
      );
    });
  }, [tenants, query, statusFilter]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input w-full pl-9 pr-3 py-2 text-sm"
            placeholder="Buscar por nome, slug, cliente ou domínio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative sm:w-52">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <select
            className="input w-full pl-8 pr-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "todos" | TenantStatus)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="em_configuracao">Em configuração</option>
            <option value="experimental">Experimental</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm table-clean">
          <thead>
            <tr className="text-left border-b border-app">
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Domínio</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Saúde</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <Row key={t.slug} tenant={t} hubs={hubs} modules={modules} accounts={accounts} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-10">Nenhum workspace encontrado.</p>
        )}
      </div>
    </>
  );
}

function Row({
  tenant,
  hubs,
  modules,
  accounts,
}: {
  tenant: Tenant;
  hubs: HubOption[];
  modules: ModuleOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const health = tenant.healthScore ?? tenant.contextStrength.score;
  const healthColor = health >= 75 ? "#ffffff" : health >= 50 ? "var(--accent)" : "#f87171";
  const status = (tenant.status as TenantStatus) || "em_configuracao";

  async function abrir() {
    setBusy(true);
    const res = await fetch("/api/owner/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: tenant.slug }),
    });
    const data = await res.json();
    if (res.ok) window.location.href = data.redirect;
    else setBusy(false);
  }

  async function toggleArquivado() {
    const next = status === "arquivado" ? "ativo" : "arquivado";
    await fetch(`/api/tenants/${tenant.slug}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  return (
    <tr className="border-b border-app last:border-0">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={tenant.nomeComercial || tenant.nome} size={32} />
          <div className="min-w-0">
            <p className="font-medium leading-tight">{tenant.nomeComercial || tenant.nome}</p>
            <p className="text-[11px] text-muted" style={{ fontFamily: "var(--mono)" }}>
              {tenant.slug}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm leading-tight">{tenant.nome}</p>
        <p className="text-[11px] text-muted">{tenant.responsavel?.nome || ""}</p>
      </td>
      <td className="px-4 py-3.5 text-muted text-xs">
        <span className="inline-flex items-center gap-1.5 opacity-70">
          <GlobeIcon size={13} /> {tenant.presencaDigital?.dominio || "—"}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`badge-pill ${status === "ativo" ? "badge-pill--good" : status === "arquivado" ? "" : "badge-pill--warn"}`}>
          {STATUS_LABELS[status]}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-20 rounded-full bg-app overflow-hidden inline-block">
            <span
              className="h-full block rounded-full"
              style={{ width: `${health}%`, background: health >= 75 ? "#e5e5e5" : healthColor }}
            />
          </span>
          <span className="text-xs font-semibold" style={{ color: health >= 75 ? "var(--text)" : healthColor }}>
            {health}%
          </span>
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button onClick={abrir} disabled={busy} className="icon-badge h-8 w-8 disabled:opacity-60" title="Abrir workspace (MODO OWNER)">
            <FolderOpen size={14} />
          </button>
          <RowMenu
            items={[
              { icon: LogIn, label: "Abrir (MODO OWNER)", onClick: abrir },
              { icon: Pencil, label: "Editar", onClick: () => setEditing(true) },
              {
                icon: status === "arquivado" ? ArchiveRestore : Archive,
                label: status === "arquivado" ? "Desarquivar" : "Arquivar",
                onClick: toggleArquivado,
              },
              { icon: Trash2, label: "Excluir", danger: true, onClick: () => setDeleting(true) },
            ]}
          />
        </div>
      </td>

      {editing && (
        <ModalPortal>
          <EditarClienteModal tenant={tenant} hubs={hubs} modules={modules} accounts={accounts} onClose={() => setEditing(false)} />
        </ModalPortal>
      )}
      {deleting && (
        <ModalPortal>
          <ExcluirClienteModal slug={tenant.slug} nome={tenant.nome} onClose={() => setDeleting(false)} />
        </ModalPortal>
      )}
    </tr>
  );
}
