"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function ConectarContaModal({
  buttonLabel = "+ Conectar conta",
  titulo = "Conectar conta Claude",
}: {
  buttonLabel?: string;
  titulo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [token, setToken] = useState("");
  const [compartilhada, setCompartilhada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNome("");
    setToken("");
    setCompartilhada(false);
    setError(null);
  }

  async function conectar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contas-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          tipo: "seat_token",
          plano: "Team — assento padrão",
          compartilhada,
          token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao conectar a conta.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-accent px-4 py-2 text-sm whitespace-nowrap inline-flex items-center gap-1.5">
        <Plus size={15} /> {buttonLabel.replace(/^\+\s*/, "")}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <p className="text-xs text-muted mt-0.5">
              Assento do plano Team — gerado com{" "}
              <code className="text-app">claude setup-token</code>. Hoje esse pool ainda não é
              usado pra atender clientes de verdade (a agência opera com a chave de API padrão);
              conectar aqui já deixa o assento pronto pra vincular a um cliente assim que fizer
              sentido.
            </p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="text-muted hover:text-app"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome da conta</label>
            <input
              className="input w-full px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Assento — Cliente Tuba Lyra"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Token do assento</label>
            <textarea
              className="input w-full px-3 py-2 text-sm font-mono min-h-20"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="cole aqui a saída de `claude setup-token`"
            />
            <p className="text-[11px] text-muted">
              Fica salvo mascarado — só os últimos 4 caracteres aparecem depois de conectado.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={compartilhada}
              onChange={(e) => setCompartilhada(e.target.checked)}
            />
            Deixar disponível como compartilhada (qualquer cliente pode usar)
          </label>
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-app">
          <button
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={conectar}
            disabled={loading || !nome.trim() || !token.trim()}
            className="btn-accent px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading ? "Conectando…" : "Conectar"}
          </button>
        </div>
      </div>
    </div>
  );
}
