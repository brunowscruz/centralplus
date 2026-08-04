"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Calendar } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import SessaoAssistidaCTA from "./SessaoAssistidaCTA";

type StatusPostGmb = "rascunho" | "aprovado" | "aplicado" | "falhou";
interface PostGmb {
  id: string;
  dataPrevista: string;
  objetivo: string;
  palavraChave: string;
  tipo: "evento" | "chamada-para-acao" | "oferta";
  titulo: string;
  texto: string;
  status: StatusPostGmb;
}

const TIPO_LABEL: Record<PostGmb["tipo"], string> = {
  evento: "Evento",
  "chamada-para-acao": "Chamada para ação",
  oferta: "Oferta",
};
const STATUS_CLASSE: Record<StatusPostGmb, string> = {
  rascunho: "badge-pill--warn",
  aprovado: "badge-pill--good",
  aplicado: "badge-pill--accent",
  falhou: "badge-pill",
};

export default function CalendarioPostsTab({
  slug,
  posts,
  onAtualizado,
  isOwner,
}: {
  slug: string;
  posts: PostGmb[];
  onAtualizado: () => void;
  isOwner: boolean;
}) {
  const [processando, setProcessando] = useState<string | null>(null);
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-calendario");

  async function marcarAplicado(id: string) {
    await fetch(`/api/tenants/${slug}/mkt-online/seo-local/calendario/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "aplicado" }),
    });
    onAtualizado();
  }

  async function gerar() {
    const contexto =
      "[Contexto: o usuário está na aba SEO Local → Calendário de posts. Gere o calendário seguindo a seção 5 (marketing/mkt-online/seo-local/calendario-posts.json) — use as oportunidades/palavras-chave já identificadas, se existirem.]";
    await send("Gera o calendário de posts do GMB.", onAtualizado, undefined, contexto);
  }

  async function aprovar(id: string) {
    setProcessando(id);
    try {
      await fetch(`/api/tenants/${slug}/mkt-online/seo-local/calendario/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aprovado" }),
      });
      onAtualizado();
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Calendário de posts</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            Posts programados pro seu perfil do Google — aprove um por um antes de aplicar.
          </p>
        </div>
        <button onClick={gerar} disabled={busy} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "Gerando…" : posts.length > 0 ? "Gerar mais posts" : "Gerar calendário"}
        </button>
      </div>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está montando o calendário</strong>
            <p className="text-xs text-muted mt-1">Só um instante — não feche esta tela.</p>
          </div>
        </div>
      )}

      {!busy && posts.length === 0 && (
        <div className="card p-10 text-center text-muted text-sm">
          Nenhum post ainda. Clique em &quot;Gerar calendário&quot; acima.
        </div>
      )}

      {!busy && posts.length > 0 && (
        <div className="space-y-2.5">
          {posts.map((p) => (
            <div key={p.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Calendar size={13} /> {new Date(p.dataPrevista).toLocaleDateString("pt-BR")}
                  <span className="badge-pill badge-pill--accent">{TIPO_LABEL[p.tipo]}</span>
                </div>
                <span className={`badge-pill ${STATUS_CLASSE[p.status]}`}>{p.status}</span>
              </div>
              <h4 className="text-sm font-medium">{p.titulo}</h4>
              <p className="text-sm text-muted">{p.texto}</p>
              <div className="text-[11px] text-muted">objetivo: {p.objetivo} · palavra-chave: {p.palavraChave}</div>
              {p.status === "rascunho" && (
                <button onClick={() => aprovar(p.id)} disabled={processando === p.id} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
                  {processando === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aprovar
                </button>
              )}
              {p.status === "aprovado" && isOwner && (
                <SessaoAssistidaCTA slug={slug} tipo="calendario-post" id={p.id} onMarcarAplicado={() => marcarAplicado(p.id)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
