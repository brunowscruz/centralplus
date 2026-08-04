"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Camera, Wallet, Filter, Bot, Settings, Megaphone, type LucideIcon } from "lucide-react";
import type { ModuleDef } from "@/lib/modules";

const MODULE_ICONS: Record<string, LucideIcon> = {
  "visao-geral": LayoutDashboard,
  site: Globe,
  instagram: Camera,
  financeiro: Wallet,
  crm: Filter,
  claude: Bot,
  config: Settings,
  "mkt-online": Megaphone,
};

/** Menu do workspace (padrão da referência): abas em pill com ícone, inline
 * no header. Gerado dinamicamente de `tenant.menu` (catálogo × modulos_ativos). */
export default function WorkspaceNav({ slug, menu }: { slug: string; menu: ModuleDef[] }) {
  const pathname = usePathname();
  const base = `/c/${slug}`;

  function hrefFor(m: ModuleDef) {
    return m.path ? `${base}/${m.path}` : base;
  }
  function isActive(m: ModuleDef) {
    const href = hrefFor(m);
    if (m.path === "") return pathname === base;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {menu.map((m) => {
        const Icon = MODULE_ICONS[m.id] || LayoutDashboard;
        const active = isActive(m);
        return (
          <Link key={m.id} href={hrefFor(m)} className={`ws-tab ${active ? "ws-tab--active" : ""}`}>
            <Icon size={15} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
