"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** "danger" = botão vermelho + ícone de alerta (exclusão, ação irreversível).
   * "neutral" = botão normal (confirmação sem risco de perda de dado). */
  variant?: "danger" | "neutral";
}
interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}
interface ConfirmCtx {
  ask: (options: ConfirmOptions) => Promise<boolean>;
  pending: PendingConfirm | null;
  close: (result: boolean) => void;
}

const Ctx = createContext<ConfirmCtx | null>(null);

/** Provider único no layout raiz — só estado, não renderiza nada (mesma
 * lógica do ToastProvider). Quem desenha o modal de verdade é
 * <ConfirmViewport />, montado dentro do <ThemeScope> de cada layout pra
 * herdar a cor certa do cliente/agência. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    setPending((p) => {
      p?.resolve(result);
      return null;
    });
  }

  return <Ctx.Provider value={{ ask, pending, close }}>{children}</Ctx.Provider>;
}

/** await confirmar({ title, message, variant: "danger" }) — substitui
 * confirm() nativo. Retorna true/false como o confirm() nativo, mas com a
 * cara do produto (nada de caixa cinza do navegador quebrando o tema). */
export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return ctx.ask;
}

/** Monta uma vez dentro de cada <ThemeScope> (client layout + console
 * layout) — não confundir com o hook useConfirm, que pode ser chamado de
 * qualquer componente. */
export function ConfirmViewport() {
  const ctx = useContext(Ctx);
  if (!ctx || !ctx.pending) return null;
  return <ConfirmModal pending={ctx.pending} onClose={ctx.close} />;
}

function ConfirmModal({ pending, onClose }: { pending: PendingConfirm; onClose: (v: boolean) => void }) {
  const danger = pending.variant === "danger";
  return (
    <div className="confirm-scrim" onClick={() => onClose(false)}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-card__icon ${danger ? "danger" : ""}`}>
          {danger ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
        </div>
        <h3>{pending.title}</h3>
        <p>{pending.message}</p>
        <div className="confirm-card__actions">
          <button className="btn-ghost px-4 py-2 text-sm" onClick={() => onClose(false)}>
            {pending.cancelText || "Cancelar"}
          </button>
          <button
            className={danger ? "btn-danger px-4 py-2 text-sm" : "btn-accent px-4 py-2 text-sm"}
            onClick={() => onClose(true)}
            autoFocus
          >
            {pending.confirmText || (danger ? "Excluir" : "Confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}
