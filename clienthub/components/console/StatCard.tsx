import type { LucideIcon } from "lucide-react";

/**
 * Card de estatística com ícone (padrão visual da referência): rótulo em
 * caps pequeno no topo, valor grande embaixo, ícone circular no canto.
 * Usado no Dashboard, Workspaces, Tokens etc. — qualquer tela com uma fileira
 * de números agregados.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "#4ade80" : tone === "warn" ? "var(--accent)" : tone === "bad" ? "#f87171" : undefined;
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="icon-badge h-7 w-7" style={color ? { color } : undefined}>
          <Icon size={14} />
        </span>
      </div>
      <span className="stat-card__value" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
