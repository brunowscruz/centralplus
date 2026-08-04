"use client";

import { Check, X, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type StatusCampo = "proposta" | "aprovada" | "rejeitada" | "aplicada";

const STATUS_LABEL: Record<StatusCampo, string> = {
  proposta: "aguardando revisão",
  aprovada: "aprovado",
  rejeitada: "rejeitado",
  aplicada: "aplicado",
};
const STATUS_CLASSE: Record<StatusCampo, string> = {
  proposta: "badge-pill--warn",
  aprovada: "badge-pill--good",
  rejeitada: "badge-pill",
  aplicada: "badge-pill--accent",
};

/** Linha genérica de aprovação campo-a-campo — usada pela proposta de
 * otimização do GMB (cada campo do PropostaOtimizacaoGmb) e reaproveitável
 * por qualquer outra tela com o mesmo padrão de "IA propõe, humano aprova".
 * O valor em si é responsabilidade do caller (children) — este componente
 * só cuida do rótulo, status e ações. */
export default function PropostaAprovacaoField({
  label,
  status,
  onAprovar,
  onRejeitar,
  busy,
  children,
}: {
  label: string;
  status: StatusCampo;
  onAprovar: () => void;
  onRejeitar: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-medium">{label}</h4>
        <span className={`badge-pill ${STATUS_CLASSE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="text-sm text-muted">{children}</div>
      {status === "proposta" && (
        <div className="flex items-center gap-2 pt-1">
          <button onClick={onAprovar} disabled={busy} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aprovar
          </button>
          <button onClick={onRejeitar} disabled={busy} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
            <X size={12} /> Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}
