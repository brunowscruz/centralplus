"use client";

import { useState } from "react";

type Mode = "owner" | "client";

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("owner");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, id, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha no login.");
        return;
      }
      window.location.href = data.redirect;
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-app border border-app">
        {(["owner", "client"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`py-2 rounded-lg text-sm transition ${
              mode === m ? "bg-accent text-black font-semibold" : "text-muted"
            }`}
          >
            {m === "owner" ? "Agência" : "Cliente"}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted">
          {mode === "owner" ? "E-mail" : "Login do cliente"}
        </label>
        <input
          className="input w-full px-3 py-2 text-sm"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder={mode === "owner" ? "admin@agencia.com" : "slug do cliente"}
          autoComplete="username"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted">Senha</label>
        <input
          type="password"
          className="input w-full px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full py-2.5 text-sm disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
