"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Boxes,
  Building2,
  Globe,
  LayoutTemplate,
  KeyRound,
  UserCog,
  Gauge,
  LifeBuoy,
  Package,
  Lightbulb,
  ScrollText,
  ShieldCheck,
  Bell,
  Flag,
  Settings,
  LogOut,
  Search,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Operation",
    items: [{ href: "/console", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Users",
    items: [
      { href: "/console/clientes", label: "Clientes", icon: Users },
      { href: "/console/workspaces", label: "Workspaces", icon: Boxes },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/console/hubs", label: "Hubs", icon: Building2 },
      { href: "/console/sites", label: "Sites", icon: Globe },
      { href: "/console/modelos", label: "Modelos", icon: LayoutTemplate },
      { href: "/console/contas-claude", label: "Contas Claude", icon: KeyRound },
      { href: "/console/assentos", label: "Assentos Claude", icon: UserCog },
      { href: "/console/tokens", label: "Tokens", icon: Gauge },
      { href: "/console/suporte", label: "Suporte", icon: LifeBuoy },
      { href: "/console/modulos", label: "Módulos", icon: Package },
      { href: "/console/banco-de-ideias", label: "Banco de Ideias", icon: Lightbulb },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/console/auditoria", label: "Auditoria", icon: ScrollText },
      { href: "/console/seguranca", label: "Segurança", icon: ShieldCheck },
      { href: "/console/alertas", label: "Alertas", icon: Bell },
      { href: "/console/feature-flags", label: "Feature Flags", icon: Flag },
      { href: "/console/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button onClick={logout} className="nav-item w-full">
      <LogOut size={16} className="nav-item__icon" />
      Log out
    </button>
  );
}

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/console") return pathname === "/console";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const current =
    ALL_ITEMS.filter((it) => isActive(it.href)).sort((a, b) => b.href.length - a.href.length)[0]
      ?.label || "Dashboard";

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-app flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2.5">
          <span
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "var(--accent)", color: "#111" }}
          >
            C+
          </span>
          <span className="text-base font-bold tracking-tight leading-none">
            Central<span className="text-accent">Plus</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p
                className="text-[10px] font-semibold tracking-wider text-muted uppercase px-2 mb-1.5"
                style={{ fontFamily: "var(--mono)" }}
              >
                {g.title}
              </p>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`nav-item ${active ? "nav-item--active" : ""}`}
                    >
                      <Icon size={16} className="nav-item__icon" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-app">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* top bar: breadcrumb + busca + avatar */}
        <div className="border-b border-app px-6 py-2.5 flex items-center gap-4">
          <p className="text-xs text-muted" style={{ fontFamily: "var(--mono)" }}>
            CentralPlus <span className="opacity-50">/</span>{" "}
            <span className="text-app">{current}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                className="input pl-8 pr-3 py-1.5 text-xs w-52"
                placeholder="Buscar recursos..."
              />
            </div>
            <span
              className="h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold border border-app text-muted"
              title="Operador da agência"
            >
              AD
            </span>
          </div>
        </div>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>

        <footer className="border-t border-app px-6 py-3 flex items-center justify-between text-[11px] text-muted">
          <span style={{ fontFamily: "var(--mono)" }}>
            © 2026 CentralPlus Platform · v1.0.0-local
          </span>
          <span className="flex items-center gap-4">
            <span>Documentação</span>
            <span>API Status</span>
            <span>Suporte Técnico</span>
            <span className="badge-pill badge-pill--good">● Sistemas Operacionais</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
