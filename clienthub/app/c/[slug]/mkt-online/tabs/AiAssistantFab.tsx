"use client";

import { useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { ChatMessages } from "@/components/ChatMessages";

/** Assistente de IA flutuante — presente em qualquer tela do módulo, pra
 * pedir uma mudança sem precisar caçar onde fazer isso. Sem nome fixo tipo
 * "B-O-Sbot": o Hub é white-label por cliente, então fica só o ícone. */
export default function AiAssistantFab({ slug, contexto }: { slug: string; contexto: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const { messages, busy, send } = useAgentChat(slug, "mkt-online", "mkt-online-geral");

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || busy) return;
    setTexto("");
    await send(mensagem, undefined, undefined, `[Contexto: ${contexto}]`);
  }

  return (
    <>
      <button className="ai-fab" onClick={() => setAberto((a) => !a)} aria-label="Assistente de IA">
        <Sparkles size={22} />
      </button>

      <div className={`ai-drawer ${aberto ? "open" : ""}`}>
        <div className="ai-drawer__scrim" onClick={() => setAberto(false)} />
        <div className="ai-drawer__panel">
          <div className="ai-drawer__head">
            <div className="badge"><Sparkles size={16} /></div>
            <div>
              <h4>Peça uma mudança</h4>
              <p>Fala com a IA sobre o que está vendo na tela</p>
            </div>
            <button className="icon-btn ml-auto" onClick={() => setAberto(false)}><X size={16} /></button>
          </div>

          <div className="ai-drawer__body">
            {messages.length === 0 && (
              <div className="ai-msg bot">
                Oi! Pode me pedir qualquer mudança no que está vendo na tela — texto, palavras-chave, público, imagem…
              </div>
            )}
            <ChatMessages messages={messages} busy={busy} />
          </div>

          <div className="ai-drawer__foot">
            <input
              type="text"
              placeholder="Descreva o que quer mudar…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
            />
            <button className="ai-drawer__send" onClick={enviar} disabled={busy || !texto.trim()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
