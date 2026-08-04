import { requireOwner } from "@/lib/access";
import { agencyTheme } from "@/lib/theme";
import ThemeScope from "@/components/ThemeScope";
import ConsoleShell from "@/components/console/ConsoleShell";
import { ToastViewport } from "@/components/ToastProvider";
import { ConfirmViewport } from "@/components/ConfirmProvider";
import { CelebrationViewport } from "@/components/Celebration";

export const dynamic = "force-dynamic";

// Layout compartilhado por toda a navegação do Console do Owner (seção 3):
// sidebar OPERATION/USERS/PLATFORM/SYSTEM + tema da agência.
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  const theme = agencyTheme();

  return (
    <ThemeScope theme={theme} className="min-h-screen">
      <ConsoleShell>{children}</ConsoleShell>
      <ToastViewport />
      <ConfirmViewport />
      <CelebrationViewport />
    </ThemeScope>
  );
}
