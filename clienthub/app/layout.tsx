import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { CelebrationProvider } from "@/components/Celebration";

export const metadata: Metadata = {
  title: "CentralPlus",
  description: "Painel multi-tenant que envelopa o motor B-O-S.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      {/* Providers de toast/confirmação/celebração ficam aqui (fora do tema) —
         o que cada um RENDERIZA de fato mora dentro do <ThemeScope> de cada
         layout (Console/Hub do cliente), pra herdar a cor certa. Ver
         components/ToastProvider.tsx. */}
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <CelebrationProvider>{children}</CelebrationProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
