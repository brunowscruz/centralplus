"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ThemeTokens } from "@/lib/theme";
import { BASE_ESCURO, BASE_CLARO } from "@/lib/themePresetsBase";

interface ThemeCtx {
  scheme: "dark" | "light";
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** Usado pelo botão de alternância (ver ThemeToggleButton) — precisa estar
 * dentro de um <ThemeScope>. */
export function useThemeToggle(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeToggle precisa estar dentro de <ThemeScope>");
  return ctx;
}

const STORAGE_KEY = "ch-scheme";

/**
 * Aplica os tokens de tema (agência ou cliente) como CSS variables num
 * wrapper. O tema BASE (bg/card/border/text) é resolvido no servidor a
 * partir do design-guide.md/preset do tenant — mas o CLIENTE pode alternar
 * claro/escuro na hora (ícone no header), sem perder a cor de marca dele: só
 * a base (bg/card/border/text) troca, o accent continua sendo sempre o
 * configurado pelo tenant. Preferência salva em localStorage.
 */
export default function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: ThemeTokens;
  className?: string;
  children: React.ReactNode;
}) {
  const [scheme, setScheme] = useState<"dark" | "light">(theme.scheme || "dark");

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "dark" || salvo === "light") setScheme(salvo);
  }, []);

  function toggle() {
    setScheme((atual) => {
      const novo = atual === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, novo);
      return novo;
    });
  }

  const base = scheme === "dark" ? BASE_ESCURO : BASE_CLARO;
  const style: Record<string, string> = {
    "--bg": base.bg,
    "--card": base.card,
    "--border": base.border,
    "--text": base.text,
    "--accent": theme.accent,
    "--accent-text": theme.accentText || "#111111",
    "--muted": "color-mix(in srgb, var(--text) 58%, transparent)",
    colorScheme: scheme,
  };
  if (theme.titleFont) {
    style["--title-font"] = `"${theme.titleFont}", ui-sans-serif, system-ui, sans-serif`;
  }

  return (
    <Ctx.Provider value={{ scheme, toggle }}>
      <div style={style as React.CSSProperties} className={`bg-app text-app ${className || ""}`}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
