import { listAccounts, accountIsUsable, getAccountRaw } from "@/lib/claude-accounts";
import { listTenants } from "@/lib/tenants";
import ConectarContaModal from "./ConectarContaModal";
import ContaCard from "./ContaCard";

export const dynamic = "force-dynamic";

// Contas Claude (seção 6 do spec): contas conectadas — hoje só a chave de API
// padrão (usada por todo cliente sem conta dedicada); quando o operador
// comprar assentos do plano Team, cada assento criado em "Assentos Claude"
// aparece aqui também e pode ser marcado como compartilhado ou dedicado a um
// cliente específico.
export default async function ContasClaudePage() {
  const tenants = listTenants();
  const accounts = listAccounts().map((a) => {
    const raw = getAccountRaw(a.id);
    const clientes = tenants.filter((t) => (t.claude?.contaId || "conta-padrao") === a.id).length;
    return { ...a, clientes, valida: raw ? accountIsUsable(raw) : false };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Contas Claude</h1>
          <p className="text-muted text-sm mt-0.5">
            Contas Claude conectadas — use uma compartilhada ou dedique a um cliente.
          </p>
        </div>
        <ConectarContaModal />
      </div>

      <div className="card p-4 text-xs text-muted leading-relaxed">
        Conecte cada conta com o <strong className="text-app">token da assinatura</strong> (gerado
        por <code className="text-app">claude setup-token</code> — NÃO é a chave de API da
        Anthropic). O token fica guardado aqui (visível só pro owner, sempre mascarado) e a bridge
        usa por cliente. Marque quantas quiser como{" "}
        <strong className="text-app">compartilhadas</strong> (ficam disponíveis pra vincular a
        qualquer cliente); pode editar e apagar todas, exceto a conta padrão de API (é o fallback
        de quem ainda não tem conta dedicada).
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <ContaCard key={a.id} account={a} />
        ))}
      </div>
    </div>
  );
}
