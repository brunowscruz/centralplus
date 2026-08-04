"use client";

/** Barra flutuante acima da tabela quando há linhas selecionadas —
 * substitui exigir ação linha a linha. Ver docs/DESIGN-GUIDE.md seção 3.5. */
export default function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="bulk-bar">
      <span>
        <strong>{count}</strong> {count === 1 ? "item selecionado" : "itens selecionados"}
      </span>
      <div className="bulk-bar__actions">
        {children}
        <button onClick={onClear} className="btn-ghost text-xs px-2.5 py-1.5">
          Limpar seleção
        </button>
      </div>
    </div>
  );
}
