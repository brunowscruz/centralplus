"use client";

export type TemaId = "preto" | "branco";

/** Amostras dos 2 temas de base (espelham lib/theme.ts → PRESET_THEMES). */
const TEMAS: { id: TemaId; nome: string; bg: string; card: string; accent: string; text: string }[] = [
  { id: "preto", nome: "Escuro", bg: "#0B0B0D", card: "#16161A", accent: "#E0A94A", text: "#EDEDED" },
  { id: "branco", nome: "Claro", bg: "#F4F4F6", card: "#FFFFFF", accent: "#2563EB", text: "#18181B" },
];

/**
 * Seletor visual dos 2 temas de base. Cada opção é uma mini-prévia do painel
 * do cliente naquele tema (fundo + card + botão accent) — o operador vê na
 * hora como vai ficar. Só 2 de propósito (ver nota em lib/theme.ts) — a
 * identidade do cliente entra pela cor de destaque, não por um 3º/4º tema.
 */
export default function TemaPicker({ value, onChange }: { value: TemaId; onChange: (t: TemaId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs">
      {TEMAS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-xl border p-2 text-left transition ${
            value === t.id ? "border-accent ring-1 ring-accent" : "border-app hover:border-app"
          }`}
        >
          <div className="rounded-lg overflow-hidden border border-app" style={{ background: t.bg }}>
            <div className="p-2 space-y-1.5">
              <div className="h-2 w-10 rounded-full" style={{ background: t.text, opacity: 0.4 }} />
              <div className="rounded-md p-1.5" style={{ background: t.card }}>
                <div className="h-1.5 w-8 rounded-full mb-1.5" style={{ background: t.text, opacity: 0.35 }} />
                <div className="h-3 w-12 rounded" style={{ background: t.accent }} />
              </div>
            </div>
          </div>
          <p className="text-[11px] font-medium mt-1.5 text-center">{t.nome}</p>
        </button>
      ))}
    </div>
  );
}
