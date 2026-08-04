"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Chip de filtro composável — abre um popover ancorado (não modal) com
 * busca + checkbox, multi-seleção. Ver docs/DESIGN-GUIDE.md seção 3.4. */
export default function FilterChip({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`filter-chip ${selected.length ? "filter-chip--active" : ""}`}>
        {label}
        {selected.length > 0 && <span className="filter-chip__count">{selected.length}</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="filter-popover">
          {options.length > 6 && (
            <input
              type="text"
              placeholder={`Buscar ${label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          )}
          <div className="filter-popover__list">
            {filtered.length === 0 && <p className="text-[11px] text-muted px-2 py-2">Nada encontrado.</p>}
            {filtered.map((opt) => (
              <label key={opt} className="filter-popover__item">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="btn-ghost text-[11px] px-2 py-1.5 mt-1">
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
