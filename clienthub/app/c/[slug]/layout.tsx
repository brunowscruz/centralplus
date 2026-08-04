import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { requireWorkspace } from "@/lib/access";
import { getTenant } from "@/lib/tenants";
import { tenantTheme } from "@/lib/theme";
import { hasLogo } from "@/lib/identidade";
import ThemeScope from "@/components/ThemeScope";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import WorkspaceNav from "@/components/WorkspaceNav";
import OwnerBar from "@/components/OwnerBar";
import WorkspaceLogout from "@/components/WorkspaceLogout";
import OwnerExitButton from "@/components/OwnerExitButton";
import { ToastViewport } from "@/components/ToastProvider";
import { ConfirmViewport } from "@/components/ConfirmProvider";
import { CelebrationViewport } from "@/components/Celebration";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { session } = await requireWorkspace(slug);
  const tenant = getTenant(slug);
  const theme = tenantTheme(slug);
  const isOwner = session.role === "owner";
  const logo = hasLogo(slug);
  const marca = tenant.nomeComercial || tenant.nome;

  return (
    <ThemeScope theme={theme} className="min-h-screen flex flex-col">
      {isOwner && <OwnerBar nome={marca} />}

      <header className="border-b border-app sticky top-0 z-30" style={{ background: "var(--bg)" }}>
        <div className="px-6 h-14 flex items-center gap-5">
          {/* logo + marca do cliente */}
          <div className="flex items-center gap-2.5 shrink-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/tenants/${slug}/logo`}
                alt={marca}
                className="h-8 w-8 rounded-lg object-contain border border-app"
              />
            ) : (
              <span
                className="h-8 w-8 rounded-lg grid place-items-center text-sm font-bold shrink-0"
                style={{ background: "var(--accent)", color: "var(--accent-text)" }}
              >
                {marca.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="font-semibold text-sm leading-none hidden sm:block">{marca}</span>
          </div>

          {/* menu */}
          <div className="flex-1 min-w-0">
            <WorkspaceNav slug={slug} menu={tenant.menu} />
          </div>

          {/* ações */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggleButton />
            <Link
              href={`/c/${slug}/config`}
              className="icon-badge h-8 w-8"
              title="Ajuda / Configurações"
            >
              <HelpCircle size={15} />
            </Link>
            {isOwner ? <OwnerExitButton /> : <WorkspaceLogout />}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-6 py-6">{children}</main>

      <ToastViewport />
      <ConfirmViewport />
      <CelebrationViewport />
    </ThemeScope>
  );
}
