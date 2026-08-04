"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClaudeAccount } from "@/lib/claude-accounts";
import { useConfirm } from "@/components/ConfirmProvider";

interface AccountView extends ClaudeAccount {
  clientes: number;
  valida: boolean;
}

export default function ContaCard({ account }: { account: AccountView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const confirmar = useConfirm();

  async function toggleCompartilhada() {
    setBusy(true);
    await fetch(`/api/contas-claude/${account.id}`, { method: "PATCH" });
    setBusy(false);
    router.refresh();
  }

  async function apagar() {
    const ok = await confirmar({
      title: `Apagar a conta "${account.nome}"?`,
      message: "Clientes vinculados voltam pra conta padrão.",
      variant: "danger",
      confirmText: "Apagar",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/contas-claude/${account.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const podeApagar = account.id !== "conta-padrao";

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">{account.nome}</h3>
          <p className="text-xs text-muted mt-0.5">{account.plano}</p>
        </div>
        {account.compartilhada && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-app text-accent shrink-0">
            Compartilhada
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <Stat label="Clientes" value={String(account.clientes)} />
        <Stat
          label={account.tipo === "api_key" ? "Cobrança" : "Tipo"}
          value={account.tipo === "api_key" ? "por uso (API)" : "assento Team"}
        />
      </div>

      {account.tipo === "seat_token" && account.token && (
        <p className="text-[11px] text-muted font-mono mt-2">Token: {account.token}</p>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <span className={`h-1.5 w-1.5 rounded-full ${account.valida ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-[11px] text-muted">{account.valida ? "Válida" : "Sem credencial"}</span>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-app">
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-3 py-1.5 text-xs flex-1">
          Gerenciar
        </button>
        <button
          onClick={toggleCompartilhada}
          disabled={busy}
          className={`px-3 py-1.5 text-xs flex-1 rounded-lg border ${
            account.compartilhada ? "border-accent text-accent" : "btn-ghost"
          } disabled:opacity-60`}
        >
          {account.compartilhada ? "Compartilhada" : "Tornar compartilhada"}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-app space-y-2 text-xs">
          <p className="text-muted">
            Criada em {new Date(account.criado_em).toLocaleDateString("pt-BR")}. Limite de tokens
            desta conta se controla na aba <span className="text-app">Tokens</span>.
          </p>
          {podeApagar ? (
            <button onClick={apagar} disabled={busy} className="text-red-400 hover:underline disabled:opacity-60">
              Apagar conta
            </button>
          ) : (
            <p className="text-muted italic">Conta padrão — não pode ser apagada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-app px-2.5 py-2">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
