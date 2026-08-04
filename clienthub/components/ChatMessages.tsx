"use client";

import type { ChatMsg } from "@/hooks/useAgentChat";
import { MarkdownLeve } from "./MarkdownLeve";

/**
 * Renderiza mensagens de `useAgentChat` como conversa de verdade — NUNCA
 * jogar `mensagem.texto` (a string já achatada) direto na tela: isso junta
 * vários "pensamentos" separados do agente num parágrafo só, sem quebra, e
 * esconde toda ferramenta que ele usou no meio (usuário fica sem noção do
 * que está acontecendo). Mesmo padrão de agrupamento que já existia (e
 * funcionava certo) em `app/c/[slug]/claude/ChatPanel.tsx` — extraído aqui
 * pra virar o componente único reaproveitado em qualquer chat novo (Studio
 * do Instagram, assistente flutuante do MKT Online etc; ver memória
 * "sempre mostrar carregamento" — bug real 28/07/2026: componentes novos
 * ignoravam esse padrão já provado e mostravam tudo achatado).
 */

interface Bloco {
  tipo: "texto" | "ferramentas";
  texto?: string;
  nomes?: string[];
}

/** Agrupa os segmentos (texto/ferramenta) da resposta em blocos visuais —
 * ferramentas consecutivas viram UMA linha de "pills", cada bloco de texto
 * vira seu próprio balão. */
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

const TOOL_LABEL: Record<string, string> = {
  Read: "Lendo arquivo",
  Write: "Escrevendo arquivo",
  Edit: "Editando arquivo",
  Bash: "Rodando comando",
  Glob: "Procurando arquivo",
  Grep: "Procurando conteúdo",
  WebSearch: "Pesquisando",
  WebFetch: "Lendo uma página",
  Skill: "Usando uma skill",
  Task: "Delegando uma tarefa",
};

export function ChatThinking({ label = "Trabalhando" }: { label?: string }) {
  return (
    <div className="ai-msg bot flex items-center gap-2 w-fit">
      {label}
      <span className="thinking-dots"><span /><span /><span /></span>
    </div>
  );
}

function AssistantMessage({ m, mostrarPensando }: { m: ChatMsg; mostrarPensando: boolean }) {
  const blocos = agruparSegmentos(m);
  if (blocos.length === 0) return mostrarPensando ? <ChatThinking /> : null;

  return (
    <div className="flex flex-col gap-1.5">
      {blocos.map((b, i) =>
        b.tipo === "ferramentas" ? (
          <div key={i} className="flex flex-wrap gap-1">
            {b.nomes!.map((n, j) => (
              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded border border-app text-muted inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-accent shrink-0" /> {TOOL_LABEL[n] || n}
              </span>
            ))}
          </div>
        ) : (
          <div key={i} className="ai-msg bot">
            <MarkdownLeve texto={b.texto!} />
          </div>
        ),
      )}
      {mostrarPensando && <ChatThinking />}
    </div>
  );
}

export function ChatMessages({ messages, busy }: { messages: ChatMsg[]; busy: boolean }) {
  return (
    <>
      {messages.map((m, i) => {
        if (m.role === "user") {
          return (
            <div key={i} className="ai-msg user">
              {m.text}
              {m.anexos && m.anexos.length > 0 && (
                <div className="mt-1 text-[10.5px] opacity-75">📎 {m.anexos.join(", ")}</div>
              )}
            </div>
          );
        }
        return <AssistantMessage key={i} m={m} mostrarPensando={busy && i === messages.length - 1} />;
      })}
    </>
  );
}
