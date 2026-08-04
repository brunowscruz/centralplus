"use client";

import { Eye, ArrowLeft } from "lucide-react";

/**
 * Barra fixa "MODO OWNER" (regra de ouro do spec): aparece quando a agência
 * está dentro do workspace de um cliente (impersonate). Paridade com a
 * referência: barra escura discreta, badge à esquerda, "← Voltar ao Console"
 * à direita.
 */
export default function OwnerBar({ nome }: { nome: string }) {
  async function exit() {
    const res = await fetch("/api/owner/exit", { method: "POST" });
    const data = await res.json();
    window.location.href = data.redirect || "/console"; // sessão mudou
  }

  return (
    <div
      className="w-full text-xs px-4 py-1.5 flex items-center gap-2 border-b"
      style={{ background: "#101012", borderColor: "#26262a", color: "#d4d4d8" }}
    >
      <span
        className="inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded"
        style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)" }}
      >
        <Eye size={12} /> MODO OWNER
      </span>
      <span className="opacity-80">
        Editando workspace de <strong className="font-semibold">{nome}</strong>
        <span className="opacity-50"> · {nome}</span>
      </span>
      <button onClick={exit} className="ml-auto inline-flex items-center gap-1 font-medium hover:underline underline-offset-2">
        <ArrowLeft size={12} /> Voltar ao Console
      </button>
    </div>
  );
}
