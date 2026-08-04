"use client";

import { useEffect, useRef, useState } from "react";

/** Um "passo" da resposta do assistente: um bloco de texto contínuo, ou uma
 * ferramenta executada — renderizados em sequência (não tudo achatado numa
 * bolha só), pra dar a sensação de "trabalhando em etapas". */
export interface ChatSegment {
  type: "text" | "tool";
  text?: string;
  name?: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
  segments?: ChatSegment[];
  anexos?: string[]; // nomes de arquivo, só pra exibição na bolha
}

/** Lógica de streaming do chat com o agente — compartilhada entre o painel
 * do módulo Claude Code e o quick-chat da Visão Geral.
 *
 * Persiste a conversa (mensagens + id de sessão do Agent SDK) no
 * sessionStorage do navegador, por aba, chaveado por cliente+módulo — sem
 * isso, atualizar a página perdia o histórico visível E começava uma sessão
 * nova do agente do zero (sem memória do que já tinha sido feito), o que
 * parecia "o chat reiniciou o pedido antigo" pro usuário. */
export function useAgentChat(slug: string, module?: string, sessionScope?: string) {
  const storageKey = `centralplus:chat:${slug}:${module || "geral"}:${sessionScope || ""}`;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string | null>(null);
  const hidratado = useRef(false);

  // hidrata do sessionStorage só depois de montar (evita mismatch de SSR —
  // o primeiro render do servidor não tem acesso a sessionStorage)
  useEffect(() => {
    if (hidratado.current) return;
    hidratado.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const salvo = JSON.parse(raw) as { messages?: ChatMsg[]; sessionId?: string | null };
        if (salvo.messages?.length) setMessages(salvo.messages);
        if (salvo.sessionId) sessionId.current = salvo.sessionId;
      }
    } catch {
      /* sessionStorage indisponível ou corrompido — segue sem histórico */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persistir(msgs: ChatMsg[]) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ messages: msgs, sessionId: sessionId.current }));
    } catch {
      /* aba privada / storage cheio — não é crítico, só perde a persistência */
    }
  }

  function appendToLast(chunk: string) {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last?.role !== "assistant") return m;
      const segments = [...(last.segments || [])];
      const ultimo = segments[segments.length - 1];
      if (ultimo?.type === "text") {
        segments[segments.length - 1] = { ...ultimo, text: (ultimo.text || "") + chunk };
      } else {
        segments.push({ type: "text", text: chunk });
      }
      copy[copy.length - 1] = { ...last, text: last.text + chunk, segments };
      persistir(copy);
      return copy;
    });
  }

  function addTool(name: string) {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last?.role !== "assistant") return m;
      const segments = [...(last.segments || []), { type: "tool" as const, name }];
      copy[copy.length - 1] = { ...last, tools: [...(last.tools || []), name], segments };
      persistir(copy);
      return copy;
    });
  }

  function limparConversa() {
    sessionId.current = null;
    setMessages([]);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignora */
    }
  }

  async function send(
    text: string,
    onDone?: () => void,
    anexos?: { path: string; name: string }[],
    prefixoContexto?: string,
  ) {
    const temAnexo = !!anexos?.length;
    if ((!text.trim() && !temAnexo) || busy) return;
    setBusy(true);
    setMessages((m) => {
      const proximo = [
        ...m,
        { role: "user" as const, text, anexos: anexos?.map((a) => a.name) },
        { role: "assistant" as const, text: "", tools: [], segments: [] },
      ];
      persistir(proximo);
      return proximo;
    });

    // O agente já lê qualquer arquivo do workspace — só precisa saber onde
    // olhar. O caminho real vai junto do pedido, a UI mostra só o nome.
    const prefixoAnexos = temAnexo
      ? `[O usuário anexou ${anexos!.length > 1 ? "estes arquivos" : "este arquivo"}: ${anexos!
          .map((a) => a.path)
          .join(", ")} — leia com a ferramenta Read antes de responder.]\n\n`
      : "";
    // contexto de módulo (ex: "editando a página X dentro do rascunho Y") —
    // igual ao de anexos, some da bolha exibida mas vai pro agente
    const mensagemCompleta =
      (prefixoContexto ? prefixoContexto + "\n\n" : "") +
      prefixoAnexos +
      (text.trim() || "Descreva/analise o que anexei e sugira o que fazer.");

    try {
      const res = await fetch(`/api/tenants/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensagemCompleta, resume: sessionId.current, module }),
      });
      if (!res.body) throw new Error("sem resposta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as Record<string, unknown>;
            if (ev.type === "text" && typeof ev.text === "string") appendToLast(ev.text);
            else if (ev.type === "tool" && typeof ev.name === "string") addTool(ev.name);
            else if (ev.type === "done" && typeof ev.sessionId === "string") {
              sessionId.current = ev.sessionId;
              setMessages((m) => {
                persistir(m);
                return m;
              });
            } else if (ev.type === "error" && typeof ev.message === "string") appendToLast(`\n\n⚠️ ${ev.message}`);
          } catch {
            /* linha incompleta, ignora */
          }
        }
      }
    } catch (e) {
      appendToLast(`\n\n⚠️ ${(e as Error).message}`);
    } finally {
      setBusy(false);
      onDone?.();
    }
  }

  return { messages, busy, send, limparConversa };
}
