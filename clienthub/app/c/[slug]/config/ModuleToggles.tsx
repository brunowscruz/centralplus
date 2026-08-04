"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Opt {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function ModuleToggles({
  slug,
  options,
}: {
  slug: string;
  options: Opt[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(options.map((o) => [o.id, o.enabled])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string) {
    const next = !state[id];
    setBusy(id);
    setState((s) => ({ ...s, [id]: next }));
    const res = await fetch(`/api/tenants/${slug}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: id, enabled: next }),
    });
    if (!res.ok) {
      setState((s) => ({ ...s, [id]: !next })); // rollback
    } else {
      router.refresh(); // menu do workspace se atualiza
    }
    setBusy(null);
  }

  return (
    <ul className="space-y-3">
      {options.map((o) => (
        <li key={o.id} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm">{o.label}</p>
            <p className="text-xs text-muted">{o.description}</p>
          </div>
          <button
            role="switch"
            aria-checked={state[o.id]}
            disabled={busy === o.id}
            onClick={() => toggle(o.id)}
            className="shrink-0 w-11 h-6 rounded-full transition relative disabled:opacity-60"
            style={{
              background: state[o.id] ? "var(--accent)" : "var(--border)",
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: state[o.id] ? "22px" : "2px" }}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
