"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { TenantSummary } from "./types";

export default function PrivacidadeTab({
  slug,
  isOwner,
  tenant,
}: {
  slug: string;
  isOwner: boolean;
  tenant: TenantSummary;
}) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function atualizarCredencial() {
    setErr(null);
    setMsg(null);
    if (senha.length < 8) {
      setErr("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErr("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/credenciais`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error || "Falha ao atualizar.");
        return;
      }
      setMsg("Senha atualizada.");
      setSenha("");
      setConfirmacao("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold">Perfil Corporativo</h2>
          {isOwner && <span className="badge-pill">Owner access</span>}
        </div>
        <p className="text-xs text-muted mb-4">Gerencie seu acesso e dados corporativos.</p>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <ReadField label="Razão social" value={tenant.nome} />
          <ReadField label="Identidade web" value={tenant.presencaDigital?.dominio || "Pendente"} />
          <ReadField label="Instagram" value={tenant.presencaDigital?.instagram || "Não vinculado"} />
          <ReadField label="Nome comercial" value={tenant.nomeComercial || "—"} />
        </div>
        <p className="text-[11px] text-muted mt-3 pt-3 border-t border-app">
          Dados estruturais — para alterações, fale com a agência (aba Configurações do Hub, se
          você for o operador).
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Lock size={15} /> Acesso & Segurança
        </h2>
        <p className="text-xs text-muted mb-4">Troque a senha de acesso a este workspace.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nova senha">
            <input
              type="password"
              className="input w-full px-3 py-2 text-sm"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 8 dígitos"
            />
          </Field>
          <Field label="Confirmação">
            <input
              type="password"
              className="input w-full px-3 py-2 text-sm"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="Repita a senha"
            />
          </Field>
        </div>
        {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
        {msg && <p className="text-xs text-green-400 mt-2">{msg}</p>}
        <button
          onClick={atualizarCredencial}
          disabled={saving || !senha}
          className="btn-accent px-4 py-2 text-sm mt-4 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Atualizar credencial"}
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted uppercase tracking-wide">{label}</p>
      <p className="input px-3 py-2 opacity-70">{value}</p>
    </div>
  );
}
