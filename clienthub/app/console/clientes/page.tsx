import Link from "next/link";
import { Plus } from "lucide-react";
import { listTenants } from "@/lib/tenants";
import { listHubs } from "@/lib/hubs";
import { optionalModules } from "@/lib/modules";
import { listAccounts } from "@/lib/claude-accounts";
import ClientesTable from "./ClientesTable";

export const dynamic = "force-dynamic";

// Clientes (seção 3, grupo USERS): visão comercial — Empresa (com badge do
// Hub + badge Experimental), Responsável, Segmento, Status, Workspace,
// Saúde, Ações (Editar/Entrar/Arquivar/Excluir). Mesma fonte de dados que
// Workspaces (config.json de cada clientes/<slug>/), lente diferente.
export default async function ClientesPage() {
  const tenants = listTenants();
  const hubs = listHubs();
  const hubLabels = Object.fromEntries(hubs.map((h) => [h.id, h.nome]));
  const modules = optionalModules().map((m) => ({ id: m.id as string, label: m.label, description: m.description }));
  const accounts = listAccounts().map((a) => ({ id: a.id, nome: a.nome, compartilhada: a.compartilhada }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-muted text-sm mt-0.5">
            Gestão de CRM operacional e ecossistema de organizações.
          </p>
        </div>
        <Link href="/console/novo" className="btn-accent px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} /> Novo Cliente
        </Link>
      </div>

      <ClientesTable
        tenants={tenants}
        hubLabels={hubLabels}
        hubs={hubs.map((h) => ({ id: h.id, nome: h.nome }))}
        modules={modules}
        accounts={accounts}
      />
    </div>
  );
}
