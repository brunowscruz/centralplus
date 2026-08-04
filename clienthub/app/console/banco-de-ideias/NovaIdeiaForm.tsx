"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovaIdeiaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [vertical, setVertical] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/ideias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descricao, vertical }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "falha ao registrar ideia");
      return;
    }
    setTitulo("");
    setDescricao("");
    setVertical("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-accent px-4 py-2 text-sm">
        + Registrar ideia
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-3">
      <input
        className="input w-full px-3 py-2 text-sm"
        placeholder="Título da ideia"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
      />
      <textarea
        className="input w-full px-3 py-2 text-sm min-h-24"
        placeholder="Descrição — o que o módulo/melhoria resolveria"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <input
        className="input w-full px-3 py-2 text-sm"
        placeholder="Vertical/nicho relacionado (opcional)"
        value={vertical}
        onChange={(e) => setVertical(e.target.value)}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading || !titulo.trim() || !descricao.trim()}
          className="btn-accent px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Salvando…" : "Salvar ideia"}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost px-4 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
