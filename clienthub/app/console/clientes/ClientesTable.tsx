"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  LogIn,
  Search,
  Filter,
  FileText,
  Activity,
} from "lucide-react";
import type { Tenant, TenantStatus } from "@/lib/tenants";
import Avatar from "@/components/console/Avatar";
import ModalPortal from "@/components/console/ModalPortal";
import RowMenu from "@/components/console/RowMenu";
import EditarClienteModal from "./EditarClienteModal";
import ExcluirClienteModal from "./ExcluirClienteModal";
import EmptyState from "@/components/EmptyState";
import BulkActionBar from "@/components/BulkActionBar";

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

/**
 * Tabela de Clientes (painel admin, paridade com a referência): busca +
 * filtro por status, colunas Empresa (avatar + badges) / Responsável (nome +
 * e-mail) / Segmento / Status / Workspace (/slug) / Saúde (⚡%) / Ações
 * (menu ⋯ com Entrar, Editar, Arquivar, Excluir).
 */
export default function ClientesTable({
  tenants,
  hubLabels,
  hubs,
  modules,
  accounts,
}: {
  tenants: Tenant[];
  hubLabels: Record<string, string>;
  hubs: HubOption[];
  modules: ModuleOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | TenantStatus>("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [arquivando, setArquivando] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter !== "todos" && (t.status || "em_configuracao") !== statusFilter) return false;
      if (!q) return true;
      return (
        t.nome.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.acesso?.login || "").toLowerCase().includes(q) ||
        (t.responsavel?.nome || "").toLowerCase().includes(q) ||
        (t.responsavel?.email || "").toLowerCase().includes(q) ||
        (t.presencaDigital?.dominio || "").toLowerCase().includes(q)
      );
    });
  }, [tenants, query, statusFilter]);

  function alternarSelecao(slug: string) {
    setSelecionados((s) => {
      const novo = new Set(s);
      novo.has(slug) ? novo.delete(slug) : novo.add(slug);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.slug))));
  }

  /** Só arquivar em massa (reversível, efeito único e previsível) — excluir
   * cliente continua exigindo digitar o slug (ExcluirClienteModal), ação
   * grande demais pra entrar num botão de seleção em massa. */
  async function arquivarSelecionados() {
    setArquivando(true);
    for (const slug of selecionados) {
      await fetch(`/api/tenants/${slug}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "arquivado" }),
      });
    }
    setArquivando(false);
    setSelecionados(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input w-full pl-9 pr-3 py-2 text-sm"
            placeholder="Buscar por empresa, responsável, e-mail ou domínio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative sm:w-56">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <select
            className="input w-full pl-8 pr-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "todos" | TenantStatus)}
          >
            <option value="todos">Filtrar por Status</option>
            <option value="ativo">Ativo</option>
            <option value="em_configuracao">Em configuração</option>
            <option value="experimental">Experimental</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>

      {selecionados.size > 0 && (
        <BulkActionBar count={selecionados.size} onClear={() => setSelecionados(new Set())}>
          <button onClick={arquivarSelecionados} disabled={arquivando} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-60">
            {arquivando ? "Arquivando…" : "Arquivar selecionados"}
          </button>
        </BulkActionBar>
      )}

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState
            mood="curious"
            title="Nenhum cliente encontrado"
            subtitle={query || statusFilter !== "todos" ? "Tente ajustar a busca ou o filtro de status." : "Use “+ Novo Cliente” para cadastrar o primeiro."}
          />
        ) : (
          <table className="w-full text-sm table-clean">
            <thead>
              <tr className="text-left border-b border-app">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selecionados.size === filtered.length} onChange={alternarTodos} aria-label="Selecionar todos" />
                </th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Saúde</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <Row
                  key={t.slug}
                  tenant={t}
                  hubLabel={t.hub ? hubLabels[t.hub] : undefined}
                  hubs={hubs}
                  modules={modules}
                  accounts={accounts}
                  selecionado={selecionados.has(t.slug)}
                  onSelecionar={() => alternarSelecao(t.slug)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({
  tenant,
  hubLabel,
  hubs,
  modules,
  accounts,
  selecionado,
  onSelecionar,
}: {
  tenant: Tenant;
  hubLabel?: string;
  hubs: HubOption[];
  modules: ModuleOption[];
  accounts: AccountOption[];
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const health = tenant.healthScore ?? tenant.contextStrength.score;
  const healthColor = health >= 75 ? "#4ade80" : health >= 50 ? "var(--accent)" : "#f87171";
  const status = (tenant.status as TenantStatus) || "em_configuracao";

  async function impersonate() {
    const res = await fetch("/api/owner/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: tenant.slug }),
    });
    const data = await res.json();
    if (res.ok) window.location.href = data.redirect;
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
        <input type="checkbox" checked={selecionado} onChange={onSelecionar} aria-label={`Selecionar ${tenant.nome}`} />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={tenant.nome} size={32} />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium leading-tight">{tenant.nomeComercial || tenant.nome}</p>
              {hubLabel && <span className="badge-pill badge-pill--accent">{hubLabel}</span>}
              {tenant.experimental && <span className="badge-pill badge-pill--warn">Experimental</span>}
            </span>
            <p className="text-[11px] text-muted truncate max-w-45">{tenant.nome}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm leading-tight">{tenant.responsavel?.nome || tenant.nome}</p>
        <p className="text-[11px] text-muted">{tenant.responsavel?.email || tenant.acesso?.login || ""}</p>
      </td>
      <td className="px-4 py-3.5 text-muted">{tenant.tipo || "—"}</td>
      <td className="px-4 py-3.5">
        <span className={`badge-pill ${status === "ativo" ? "badge-pill--good" : status === "arquivado" ? "" : "badge-pill--warn"}`}>
          {STATUS_LABELS[status].toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted" style={{ fontFamily: "var(--mono)" }}>
          <FileText size={13} /> /{tenant.slug}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: healthColor }}>
          <Activity size={13} /> {health}%
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end">
          <RowMenu
            items={[
              { icon: LogIn, label: "Entrar (MODO OWNER)", onClick: impersonate },
              { icon: Pencil, label: "Editar cliente", onClick: () => setEditing(true) },
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
