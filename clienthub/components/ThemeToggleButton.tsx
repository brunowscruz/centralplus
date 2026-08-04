"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeToggle } from "./ThemeScope";

/** Botão do header pro cliente escolher claro/escuro na hora — vive dentro
 * do <ThemeScope> (ver app/c/[slug]/layout.tsx e app/console/layout.tsx). */
export default function ThemeToggleButton() {
  const { scheme, toggle } = useThemeToggle();
  return (
    <button
      onClick={toggle}
      className="icon-badge h-8 w-8"
      title={scheme === "dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"}
    >
      {scheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
