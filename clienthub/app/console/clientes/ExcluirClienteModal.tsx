"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

/**
 * Exclusão de cliente — irreversível (apaga a pasta inteira). Exige digitar
 * o slug pra confirmar, igual a qualquer ação destrutiva séria.
 */
export default function ExcluirClienteModal({
  slug,
  nome,
  onClose,
}: {
  slug: string;
  nome: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function excluir() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: confirm }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Falha ao excluir.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-2">
          <span className="icon-badge h-10 w-10 text-red-400">
            <AlertTriangle size={18} />
          </span>
          <button onClick={onClose} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <h2 className="text-base font-semibold">Excluir {nome}?</h2>
        <p className="text-xs text-muted mt-1.5">
          Isso apaga a pasta inteira do cliente (arquivos, posts, memória, config) permanentemente.
          Não tem como desfazer. Se só quer pausar, use <strong className="text-app">Arquivar</strong> em vez disso.
        </p>
        <p className="text-xs mt-3">
          Digite <code className="text-app font-mono">{slug}</code> pra confirmar:
        </p>
        <input
          className="input w-full px-3 py-2 text-sm font-mono mt-1.5"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={slug}
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={excluir}
            disabled={busy || confirm !== slug}
            className="px-4 py-2 text-sm rounded-lg font-semibold disabled:opacity-40"
            style={{ background: "#dc2626", color: "#fff" }}
          >
            {busy ? "Excluindo…" : "Excluir permanentemente"}
          </button>
        </div>
      </div>
    </div>
  );
}
