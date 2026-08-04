import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Card de status dos 4 pilares do workspace (Visão Geral): ícone, título,
 * badge de status no canto e uma linha de detalhe/link embaixo. */
export default function StatusCard({
  icon: Icon,
  title,
  badge,
  badgeTone = "muted",
  detail,
  href,
}: {
  icon: LucideIcon;
  title: string;
  badge: string;
  badgeTone?: "good" | "warn" | "bad" | "muted";
  detail: string;
  href?: string;
}) {
  const content = (
    <div className="card p-4 h-full">
      <div className="flex items-start justify-between">
        <span className="icon-badge h-9 w-9">
          <Icon size={16} />
        </span>
        <span
          className={`badge-pill ${badgeTone !== "muted" ? `badge-pill--${badgeTone}` : ""}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm font-semibold mt-3">{title}</p>
      <p className="text-xs text-muted mt-0.5 truncate">{detail}</p>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block hover:opacity-90 transition">
      {content}
    </Link>
  );
}
