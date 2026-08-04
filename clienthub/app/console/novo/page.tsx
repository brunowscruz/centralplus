import Link from "next/link";
import { optionalModules } from "@/lib/modules";
import { listHubs } from "@/lib/hubs";
import { listAccounts } from "@/lib/claude-accounts";
import NovoClienteForm from "./NovoClienteForm";

// Provisionamento web (Fase 3): o formulário abaixo gera clientes/<slug>/ com
// a mesma estrutura que /instalar + /novo-projeto gerariam via terminal.
// Cliente novo = registro novo no sistema que já roda — nunca deploy novo.
// Campos e ordem seguem o "Cadastrar novo cliente" de referência: Plataforma
// → Identidade → Responsável → Presença digital → Módulos → CRM (se ligado)
// → Operacional → Claude → Acesso — com o contexto extra do CentralPlus
// (que alimenta a memória do B-O-S) como seção opcional ao final.
export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ hub?: string }>;
}) {
  const { hub: hubPreselecionado } = await searchParams;
  const modules = optionalModules().map((m) => ({
    id: m.id as string,
    label: m.label,
    description: m.description,
    status: m.status,
  }));
  const hubs = listHubs();
  const accounts = listAccounts();

  return (
    <div className="max-w-2xl">
      <Link href="/console/clientes" className="text-sm text-muted hover:text-app">
        ← Voltar aos Clientes
      </Link>
      <h1 className="text-2xl font-semibold mt-4">Cadastrar novo cliente</h1>
      <p className="text-sm text-muted mt-1">
        Preencha os dados para criar o cliente e o workspace no CentralPlus.
      </p>
      <NovoClienteForm
        modules={modules}
        hubs={hubs}
        accounts={accounts}
        hubPreselecionado={hubPreselecionado}
      />
    </div>
  );
}
