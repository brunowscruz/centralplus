"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Mic, ArrowUp, History, Plus, X, FileText, ImageIcon } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { ChatMessages } from "@/components/ChatMessages";

const SUGGESTIONS = [
  "O que você sabe sobre a minha empresa?",
  "Resuma minha presença digital atual",
  "Que conteúdo devo postar essa semana?",
];

const IMG_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export default function VisaoGeralChat({ slug, enabled }: { slug: string; enabled: boolean }) {
  const { messages, busy, send: sendRaw } = useAgentChat(slug, "visao-geral");
  const { items, addFiles, remove, clear, prontos, subindo } = useChatAttachments(slug);
  const [input, setInput] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [messages]);

  function send(text: string) {
    if ((!text.trim() && prontos.length === 0) || busy) return;
    setInput("");
    const anexos = prontos.map((a) => ({ path: a.path, name: a.name }));
    clear();
    sendRaw(text, undefined, anexos);
  }

  return (
    <div
      className="card overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {arrastando && (
        <div className="absolute inset-0 z-10 bg-accent/10 border-2 border-dashed border-accent rounded-xl grid place-items-center pointer-events-none">
          <p className="text-sm font-medium text-accent">Solte pra anexar</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 px-3 pt-3">
        <input ref={fileInputRef} type="file" multiple hidden disabled={!enabled} onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <button className="icon-badge h-7 w-7" title="Anexar arquivo" type="button" disabled={!enabled} onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={13} />
        </button>
        <button className="icon-badge h-7 w-7" title="Histórico (em breve)" type="button" disabled>
          <History size={13} />
        </button>
        <button className="icon-badge h-7 w-7" title="Nova conversa (em breve)" type="button" disabled>
          <Plus size={13} />
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="px-6 pb-4 pt-1 text-center">
          <p className="text-sm font-medium">Converse com o Claude</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            Ela conhece os arquivos e os dados da sua empresa. Pergunte o que quiser — e arraste
            arquivos aqui pra incluir.
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="px-4 pt-2 pb-1 max-h-72 overflow-y-auto flex flex-col gap-2">
          <ChatMessages messages={messages} busy={busy} />
        </div>
      )}

      {messages.length === 0 && enabled && (
        <div className="flex flex-wrap justify-center gap-2 px-4 pb-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="btn-ghost text-xs px-3 py-1.5">
              {s}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it.id} className="text-[11px] pl-2 pr-1 py-1 rounded-full border border-app text-muted inline-flex items-center gap-1.5 bg-app">
              {IMG_EXT.test(it.name) ? <ImageIcon size={11} /> : <FileText size={11} />}
              {it.name}
              {it.uploading && "…"}
              {it.error && <span className="text-red-400">falhou</span>}
              <button onClick={() => remove(it.id)} className="hover:text-red-400" type="button">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-app p-3"
      >
        <div className="flex items-center gap-2">
          <input
            className="input flex-1 px-3 py-2.5 text-sm disabled:opacity-60"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={enabled ? "Peça algo ao Claude… (cole prints aqui)" : "Chat desativado"}
            disabled={!enabled || busy}
          />
          <button className="icon-badge h-9 w-9 shrink-0" type="button" title="Gravar áudio (em breve)" disabled>
            <Mic size={15} />
          </button>
          <button
            type="submit"
            disabled={!enabled || busy || subindo || (!input.trim() && prontos.length === 0)}
            className="btn-accent h-9 w-9 rounded-lg grid place-items-center shrink-0 disabled:opacity-50"
            title="Enviar"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <p className="text-[10px] text-muted mt-2 text-center">
          Anexe ou cole arquivos · Enter envia · Shift+Enter quebra linha
        </p>
      </form>
    </div>
  );
}
