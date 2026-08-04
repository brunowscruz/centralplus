"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type ToastKind = "good" | "bad";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastCtx {
  toasts: ToastItem[];
  show: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

/** Provider único, montado no layout raiz (app/layout.tsx) — cobre Console e
 * Hub do cliente com o mesmo hook. O que renderiza de fato (ToastViewport)
 * mora dentro do <ThemeScope> de cada layout, pra herdar a cor do tema; o
 * estado em si (este provider) fica fora, é só contexto React. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return <Ctx.Provider value={{ toasts, show, dismiss }}>{children}</Ctx.Provider>;
}

/** `toast.success("Campanha excluída.")` / `toast.error("Falha ao salvar.")` —
 * substitui alert() nativo em toda ação com feedback de sucesso/erro. */
export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return {
    success: (message: string) => ctx.show("good", message),
    error: (message: string) => ctx.show("bad", message),
  };
}

export function ToastViewport() {
  const ctx = useContext(Ctx);
  if (!ctx || ctx.toasts.length === 0) return null;
  return (
    <div className="toast-viewport">
      {ctx.toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`} role="status">
          {t.kind === "good" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{t.message}</span>
          <button onClick={() => ctx.dismiss(t.id)} className="toast__close" aria-label="Fechar aviso">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
