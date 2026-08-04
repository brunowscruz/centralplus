"use client";

import { LogOut } from "lucide-react";

/** Sai do MODO OWNER (volta ao Console). Ícone no header do workspace. */
export default function OwnerExitButton() {
  async function exit() {
    const res = await fetch("/api/owner/exit", { method: "POST" });
    const data = await res.json();
    window.location.href = data.redirect || "/console";
  }
  return (
    <button onClick={exit} className="icon-badge h-8 w-8" title="Voltar ao Console">
      <LogOut size={15} />
    </button>
  );
}
