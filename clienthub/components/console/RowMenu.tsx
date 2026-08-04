"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export interface RowMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Menu de ações de linha (⋯) que renderiza via PORTAL em coordenadas fixas —
 * necessário porque a tabela vive dentro de um container com `overflow`, que
 * cortaria um dropdown posicionado normalmente (era esse o bug de "não abre").
 */
export default function RowMenu({ items, label = "Ações" }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const MENU_W = 208;
      setCoords({ top: r.bottom + 6, left: Math.max(8, r.right - MENU_W) });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="icon-badge h-8 w-8" title={label}>
        <MoreHorizontal size={15} />
      </button>

      {open && mounted && coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[61] card p-1 w-52 shadow-2xl"
              style={{ top: coords.top, left: coords.left }}
            >
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <button
                    key={i}
                    disabled={it.disabled}
                    onClick={() => {
                      setOpen(false);
                      it.onClick();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left disabled:opacity-50 ${
                      it.danger ? "text-red-400 hover:bg-red-500/10" : "text-app hover:bg-app"
                    }`}
                  >
                    <Icon size={13} />
                    {it.label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
