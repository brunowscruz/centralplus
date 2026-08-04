"use client";

import { LogOut } from "lucide-react";

/** Sai da sessão do cliente (botão no header do workspace). */
export default function WorkspaceLogout() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className="icon-badge h-8 w-8" title="Sair">
      <LogOut size={15} />
    </button>
  );
}
