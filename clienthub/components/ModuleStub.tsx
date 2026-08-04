import Link from "next/link";
import { moduleById, ModuleId } from "@/lib/modules";

export default function ModuleStub({
  slug,
  moduleId,
  phase,
  bullets,
}: {
  slug: string;
  moduleId: ModuleId;
  phase: string;
  bullets: string[];
}) {
  const m = moduleById(moduleId);
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-semibold">{m?.label}</h1>
        <span className="text-[11px] text-muted px-2 py-0.5 rounded-full border border-app">
          {phase}
        </span>
      </div>
      <p className="text-sm text-muted">{m?.description}</p>
      <div className="card p-6 mt-6">
        <p className="text-sm text-app font-medium mb-3">O que este módulo fará:</p>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted">
              <span className="text-accent">→</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-5 border-t border-app text-xs text-muted">
          Por trás, este módulo é uma cara de produto para skills do B-O-S que já
          existem. Enquanto a UI não chega, tudo já pode ser feito pelo módulo{" "}
          <Link href={`/c/${slug}/claude`} className="text-accent">
            Claude Code
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
