"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { useAgentChat, type ChatMsg } from "@/hooks/useAgentChat";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { MarkdownLeve } from "@/components/MarkdownLeve";

const DEFAULT_SUGGESTIONS = [
  "Resuma os arquivos desta pasta",
  "Organize meus arquivos por tipo",
  "O que falta preencher na minha memória?",
];

const IMG_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export default function ChatPanel({
  slug,
  enabled,
  onActivity,
  module,
  suggestions = DEFAULT_SUGGESTIONS,
  emptyHint = "Peça qualquer coisa sobre os arquivos e o contexto deste cliente. O Claude age direto na pasta.",
  initialPrompt,
  onInitialPromptSent,
  contextPrefix,
  contextLabel,
  sessionScope,
}: {
  slug: string;
  enabled: boolean;
  onActivity: () => void;
  /** enquadra o pedido num módulo do Hub (ex: "site") — mapeado no servidor */
  module?: string;
  suggestions?: string[];
  emptyHint?: string;
  /** separa a conversa persistida por sub-contexto dentro do módulo (ex: qual
   * página está sendo editada) — sem isso, trocar de página no meio da edição
   * misturaria o histórico de uma página com o de outra */
  sessionScope?: string;
  /** dispara esse pedido sozinho assim que o painel aparece (ex: briefing de nova página) */
  initialPrompt?: string;
  /** chamado logo depois de disparar o initialPrompt — quem passou o prop deve
   * limpar o próprio estado aqui, senão um remount futuro do painel (ex: sair
   * e voltar do modo edição) reenvia o MESMO pedido antigo de novo */
  onInitialPromptSent?: () => void;
  /** vai junto de TODA mensagem enquanto estiver setado (ex: "editando a página X
   * dentro do rascunho Y") — não aparece na bolha, só o agente vê */
  contextPrefix?: string;
  /** texto curto mostrado numa barra fixa acima do input quando contextPrefix está ativo */
  contextLabel?: string;
}) {
  const { messages, busy, send: sendRaw, limparConversa } = useAgentChat(slug, module, sessionScope);
  const { items, addFiles, remove, clear, prontos, subindo } = useChatAttachments(slug);
  const [input, setInput] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disparado = useRef<string | null>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  useEffect(scrollToEnd, [messages]);

  useEffect(() => {
    if (initialPrompt && disparado.current !== initialPrompt) {
      disparado.current = initialPrompt;
      send(initialPrompt);
      onInitialPromptSent?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  function send(text: string) {
    setInput("");
    const anexos = prontos.map((a) => ({ path: a.path, name: a.name }));
    clear();
    sendRaw(text, () => {
      onActivity(); // arquivos podem ter mudado -> refresh
    }, anexos, contextPrefix);
  }

  return (
    <div
      className="flex flex-col h-full relative"
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

      <div className="px-3 py-2 border-b border-app flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">
          Converse com o Claude
        </span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && <span className="text-[10px] text-muted">sessão ativa</span>}
          {messages.length > 0 && !busy && (
            <button
              onClick={limparConversa}
              className="text-[10px] text-muted hover:text-app underline underline-offset-2"
              type="button"
              title="Apaga o histórico desta conversa e começa uma sessão nova do agente"
            >
              Nova conversa
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-muted">
            {enabled ? (
              <p>{emptyHint}</p>
            ) : (
              <p className="text-red-400">
                Chat desativado: falta a chave <code>ANTHROPIC_API_KEY</code>. O
                navegador de arquivos continua funcionando.
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => {
          const ultima = i === messages.length - 1;
          if (m.role === "user") {
            return (
              <div key={i} className="text-right">
                {m.anexos && m.anexos.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1 justify-end">
                    {m.anexos.map((nome, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded border border-app text-muted inline-flex items-center gap-1">
                        {IMG_EXT.test(nome) ? <ImageIcon size={10} /> : <FileText size={10} />} {nome}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="inline-block max-w-full text-sm whitespace-pre-wrap rounded-xl px-3 py-2 text-left bg-accent"
                  style={{ color: "var(--accent-text)" }}
                >
                  {m.text}
                </div>
              </div>
            );
          }
          return <AssistantMessage key={i} m={m} />;
        })}

        {busy && (
          <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-card border border-app">
            <TypingDots />
            <span className="text-xs text-muted">Claude está trabalhando…</span>
          </div>
        )}
      </div>

      {messages.length === 0 && enabled && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="btn-ghost text-xs px-2 py-1"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5">
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

      {contextLabel && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-[11px] text-accent flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
          {contextLabel}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 border-t border-app flex gap-2 items-end"
      >
        <input ref={fileInputRef} type="file" multiple hidden disabled={!enabled} onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!enabled || busy}
          className="icon-badge h-9 w-9 shrink-0 disabled:opacity-50"
          title="Anexar arquivo"
        >
          <Paperclip size={15} />
        </button>
        <AutoGrowTextarea
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          placeholder={enabled ? "Escreva uma mensagem… (Shift+Enter pra quebrar linha, ou arraste um arquivo)" : "Chat desativado"}
          disabled={!enabled || busy}
        />
        <button
          type="submit"
          disabled={!enabled || busy || subindo || (!input.trim() && prontos.length === 0)}
          className="btn-accent px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center justify-center min-w-16 h-9 shrink-0"
        >
          {busy ? <TypingDots tone="onAccent" /> : "Enviar"}
        </button>
      </form>
    </div>
  );
}

/** Caixa de texto que cresce junto com o que o usuário escreve (até um
 * teto) em vez do `<input>` de uma linha só de antes — mensagem longa
 * ficava cortada/rolando na horizontal, sem jeito de ver o que já foi
 * escrito. Enter envia, Shift+Enter quebra linha (padrão de qualquer chat). */
function AutoGrowTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className="input flex-1 px-3 py-2 text-sm disabled:opacity-60 resize-none leading-normal"
      style={{ height: "36px", maxHeight: "160px" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

/** 3 pontinhos pulsando, indicando "o agente está trabalhando" — visível
 * enquanto tem passo em andamento (texto sendo escrito ou ferramenta rodando),
 * não só quando ainda não chegou nenhum texto. */
function TypingDots({ tone = "muted" }: { tone?: "muted" | "onAccent" }) {
  const cor = tone === "onAccent" ? "bg-[var(--accent-text)]" : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1 align-middle" aria-label="Trabalhando…">
      <span className={`h-1.5 w-1.5 rounded-full ${cor} animate-bounce`} style={{ animationDelay: "0ms" }} />
      <span className={`h-1.5 w-1.5 rounded-full ${cor} animate-bounce`} style={{ animationDelay: "150ms" }} />
      <span className={`h-1.5 w-1.5 rounded-full ${cor} animate-bounce`} style={{ animationDelay: "300ms" }} />
    </span>
  );
}

interface Bloco {
  tipo: "texto" | "ferramentas";
  texto?: string;
  nomes?: string[];
}

/** Agrupa os segmentos (texto/ferramenta) da resposta em blocos visuais
 * separados — cada "passo" do agente vira seu próprio bloco, em vez de tudo
 * amontoado numa bolha só. */
function agruparSegmentos(m: ChatMsg): Bloco[] {
  const segments = m.segments && m.segments.length > 0 ? m.segments : m.text ? [{ type: "text" as const, text: m.text }] : [];
  const blocos: Bloco[] = [];
  for (const seg of segments) {
    const ultimo = blocos[blocos.length - 1];
    if (seg.type === "tool") {
      if (ultimo?.tipo === "ferramentas") ultimo.nomes!.push(seg.name || "");
      else blocos.push({ tipo: "ferramentas", nomes: [seg.name || ""] });
    } else if (seg.text) {
      blocos.push({ tipo: "texto", texto: seg.text });
    }
  }
  return blocos;
}

function AssistantMessage({ m }: { m: ChatMsg }) {
  const blocos = agruparSegmentos(m);
  if (blocos.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {blocos.map((b, i) => {
        if (b.tipo === "ferramentas") {
          return (
            <div key={i} className="flex flex-wrap gap-1">
              {b.nomes!.map((n, j) => (
                <span key={j} className="text-[10px] px-1.5 py-0.5 rounded border border-app text-muted inline-flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-accent shrink-0" /> {n}
                </span>
              ))}
            </div>
          );
        }
        return (
          <div key={i} className="inline-block max-w-full rounded-xl px-3 py-2 text-left bg-card border border-app text-app">
            <MarkdownLeve texto={b.texto!} />
          </div>
        );
      })}
    </div>
  );
}
