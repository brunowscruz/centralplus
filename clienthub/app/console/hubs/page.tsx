import Link from "next/link";
import { Plus } from "lucide-react";
import { listHubs } from "@/lib/hubs";
import { optionalModules, moduleById } from "@/lib/modules";
import { listTenants } from "@/lib/tenants";
import CriarHubModal from "./CriarHubModal";

export const dynamic = "force-dynamic";

// Hubs (seção 3, grupo PLATFORM): cada hub é uma marca white-label completa —
// identidade, tema, domínio e módulos próprios — com seus próprios clientes e
// workspaces. "Criar Hub" (wizard) grava em lib/catalog/hubs.json via
// POST /api/hubs; "Usar como base" leva pro cadastro de cliente já com este
// hub pré-selecionado.
export default async function HubsPage() {
  const hubs = listHubs();
  const modules = optionalModules().map((m) => ({ id: m.id, label: m.label }));
  const tenants = listTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Hubs da plataforma</h1>
          <p className="text-muted text-sm mt-0.5">
            Cada hub é uma marca white-label completa — identidade, tema, módulos e domínio
            próprios, com seus próprios clientes e workspaces. Crie um hub novo pra cada nicho
            ou empresa.
          </p>
        </div>
        <CriarHubModal modules={modules} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((h) => {
          const workspaces = tenants.filter((t) => t.hub === h.id).length;
          return (
            <div key={h.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <span
                  className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold"
                  style={{ background: h.cor_destaque || "var(--accent)", color: "#111" }}
                >
                  {h.nome.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{h.nome}</h3>
                  <p className="text-xs text-muted truncate">
                    {h.dominio || `${h.id}.seudominio.com.br`}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted mt-3 flex-1">{h.descricao}</p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="badge-pill">{h.origem === "personalizado" ? "Personalizado" : "Nativo"}</span>
                <span className="badge-pill">Tema {h.tema === "escuro" ? "Escuro" : "Claro"}</span>
                <span className="badge-pill">
                  {workspaces} workspace{workspaces === 1 ? "" : "s"}
                </span>
              </div>

              {h.modulos_padrao.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {h.modulos_padrao.map((id) => {
                    const m = moduleById(id);
                    return (
                      <span key={id} className="text-[11px] text-muted px-2 py-0.5 rounded border border-app">
                        {m?.label || id}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-app">
                <Link
                  href="/console/modulos"
                  className="btn-ghost px-3 py-1.5 text-xs flex-1 text-center"
                >
                  Módulos
                </Link>
                <Link
                  href={`/console/novo?hub=${h.id}`}
                  className="btn-accent px-3 py-1.5 text-xs flex-1 text-center"
                >
                  Usar como base
                </Link>
              </div>
            </div>
          );
        })}

        <div className="card p-5 border-dashed flex flex-col items-center justify-center text-center gap-1 min-h-[200px] opacity-70">
          <Plus size={22} />
          <span className="text-sm font-medium">Criar um novo hub</span>
          <span className="text-[11px] text-muted">Nicho novo, marca nova — em minutos. Use o botão acima.</span>
        </div>
      </div>
    </div>
  );
}
