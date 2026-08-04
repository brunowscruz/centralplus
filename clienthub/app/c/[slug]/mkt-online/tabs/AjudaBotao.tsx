"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import ModalPortal from "@/components/console/ModalPortal";

/** Botão "?" + popup "for dummies" — passo a passo simples, letra grande,
 * pra qualquer área do MKT Online explicar como configurar a conta do
 * cliente (token, vínculo de conta, etc). Conteúdo por área fica em
 * AJUDA_TOPICOS abaixo, não aqui — este componente só renderiza. */
export default function AjudaBotao({ titulo, passos, rodape }: { titulo: string; passos: string[]; rodape?: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost h-7 w-7 !p-0 flex items-center justify-center rounded-full shrink-0"
        title="Como configurar isso?"
        aria-label="Ajuda"
      >
        <HelpCircle size={16} />
      </button>

      {aberto && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => setAberto(false)}
                className="btn-ghost h-8 w-8 !p-0 flex items-center justify-center rounded-full absolute top-4 right-4"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>

              <h3 className="text-lg font-semibold pr-8 mb-1">{titulo}</h3>
              <p className="text-xs text-muted mb-5">Passo a passo simples — sem termo técnico.</p>

              <ol className="space-y-4">
                {passos.map((passo, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 h-7 w-7 rounded-full bg-accent/15 text-accent font-semibold text-sm flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed pt-0.5">{passo}</p>
                  </li>
                ))}
              </ol>

              {rodape && <p className="text-xs text-muted mt-5 pt-4 border-t border-app">{rodape}</p>}
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
