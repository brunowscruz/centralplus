import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { agencyTheme } from "@/lib/theme";
import ThemeScope from "@/components/ThemeScope";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const s = await getSession();
  if (s?.role === "owner") redirect("/console");
  if (s?.role === "client") redirect(`/c/${s.slug}`);

  return (
    <ThemeScope
      theme={agencyTheme()}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight">
            Central<span className="text-accent">Plus</span>
          </div>
          <p className="text-muted text-sm mt-1">
            Entre como operador da agência ou como cliente.
          </p>
        </div>
        <LoginForm />
      </div>
    </ThemeScope>
  );
}
