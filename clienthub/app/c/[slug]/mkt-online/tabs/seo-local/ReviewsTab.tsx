"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check, Star, AlertTriangle, RefreshCw, Link2, Search, MapPin } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import SessaoAssistidaCTA from "./SessaoAssistidaCTA";

type StatusReview = "rascunho" | "aprovada" | "aplicada";
interface RespostaReview {
  id: string;
  avaliacaoTexto: string;
  avaliacaoAutor?: string;
  notaEstrelas: number;
  sentimento: "positiva" | "neutra" | "negativa";
  respostaSugerida: string;
  exigeAprovacao: boolean;
  status: StatusReview;
}

export default function ReviewsTab({
  slug,
  reviews,
  onAtualizado,
  isOwner,
}: {
  slug: string;
  reviews: RespostaReview[];
  onAtualizado: () => void;
  isOwner: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [autor, setAutor] = useState("");
  const [nota, setNota] = useState(5);
  const [processando, setProcessando] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeIdInput, setPlaceIdInput] = useState("");
  const [salvandoPlaceId, setSalvandoPlaceId] = useState(false);
  const [buscaNome, setBuscaNome] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [candidatos, setCandidatos] = useState<{ placeId: string; nome: string; endereco: string }[] | null>(null);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [msgSync, setMsgSync] = useState<string | null>(null);
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-reviews");

  useEffect(() => {
    fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil`)
      .then((r) => r.json())
      .then((d) => setPlaceId(d.perfil?.placeId || ""))
      .catch(() => setPlaceId(""));
  }, [slug]);

  async function salvarPlaceId(valor: string) {
    if (!valor.trim()) return;
    setSalvandoPlaceId(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil/place-id`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: valor.trim() }),
      });
      if (res.ok) {
        setPlaceId(valor.trim());
        setCandidatos(null);
      }
    } finally {
      setSalvandoPlaceId(false);
    }
  }

  async function buscarPorNome() {
    if (!buscaNome.trim() || buscando) return;
    setBuscando(true);
    setErroBusca(null);
    setCandidatos(null);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil/place-id/buscar?q=${encodeURIComponent(buscaNome.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setErroBusca(data.error || "não consegui buscar");
        return;
      }
      setCandidatos(data.candidatos);
    } finally {
      setBuscando(false);
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    setMsgSync(null);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/reviews/sincronizar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsgSync(data.error || "não consegui buscar as avaliações");
        return;
      }
      setMsgSync(data.novas > 0 ? `${data.novas} avaliação${data.novas === 1 ? "" : "ões"} nova${data.novas === 1 ? "" : "s"} encontrada${data.novas === 1 ? "" : "s"}.` : "Nenhuma avaliação nova (últimas 5 já conhecidas).");
      onAtualizado();
    } finally {
      setSincronizando(false);
    }
  }

  async function sugerir() {
    if (!texto.trim() || busy) return;
    const contexto = `[Contexto: o usuário está na aba SEO Local → Reviews. Sugira uma resposta pra esta avaliação seguindo a seção 7: autor "${autor.trim() || "não informado"}", nota ${nota} estrelas, texto: "${texto.trim()}". Grave em reviews/respostas.json.]`;
    await send(`Sugere uma resposta pra essa avaliação de ${nota} estrelas.`, () => {
      setTexto("");
      setAutor("");
      onAtualizado();
    }, undefined, contexto);
  }

  async function gerarRespostaPara(r: RespostaReview) {
    const contexto = `[Contexto: o usuário está na aba SEO Local → Reviews. Esta avaliação já foi buscada automaticamente e está registrada em reviews/respostas.json com id "${r.id}" — NÃO crie uma entrada nova, EDITE a existente: preencha o campo respostaSugerida dela seguindo a seção 7. Autor: "${r.avaliacaoAutor || "não informado"}", nota ${r.notaEstrelas} estrelas, texto: "${r.avaliacaoTexto}".]`;
    await send(`Gera a resposta pra avaliação de ${r.avaliacaoAutor || "cliente"}.`, onAtualizado, undefined, contexto);
  }

  async function aprovar(id: string) {
    setProcessando(id);
    try {
      await fetch(`/api/tenants/${slug}/mkt-online/seo-local/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aprovada" }),
      });
      onAtualizado();
    } finally {
      setProcessando(null);
    }
  }

  async function marcarAplicada(id: string) {
    await fetch(`/api/tenants/${slug}/mkt-online/seo-local/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "aplicada" }),
    });
    onAtualizado();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="text-xs text-muted mt-1 max-w-md">
          Busca as avaliações reais do Google automaticamente (oficial, já funciona hoje) e sugere resposta pra cada uma.
        </p>
      </div>

      <div className="card p-4 space-y-2.5">
        {placeId === "" ? (
          <>
            <p className="text-xs text-muted">
              Busque o negócio pelo nome pra achar o perfil certo no Google (uma vez só, fica salvo).
            </p>
            <div className="flex items-center gap-2">
              <input
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") buscarPorNome(); }}
                placeholder="Nome do negócio + cidade..."
                className="input flex-1 px-3 py-2 text-sm"
                disabled={buscando}
              />
              <button onClick={buscarPorNome} disabled={buscando || !buscaNome.trim()} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
                {buscando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Buscar
              </button>
            </div>
            {erroBusca && <p className="text-xs text-red-400">{erroBusca}</p>}
            {candidatos && candidatos.length === 0 && <p className="text-xs text-muted">Nenhum resultado — tente incluir a cidade no nome.</p>}
            {candidatos && candidatos.length > 0 && (
              <div className="space-y-1.5">
                {candidatos.map((c) => (
                  <button
                    key={c.placeId}
                    onClick={() => salvarPlaceId(c.placeId)}
                    disabled={salvandoPlaceId}
                    className="w-full text-left flex items-start gap-2 p-2.5 rounded-lg border border-app hover:border-accent transition-colors disabled:opacity-60"
                  >
                    <MapPin size={13} className="shrink-0 mt-0.5 text-muted" />
                    <span>
                      <span className="block text-sm font-medium">{c.nome}</span>
                      <span className="block text-xs text-muted">{c.endereco}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <details>
              <summary className="text-[11px] text-muted cursor-pointer select-none">Já sei o Place ID, quero colar direto</summary>
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={placeIdInput}
                  onChange={(e) => setPlaceIdInput(e.target.value)}
                  placeholder="ChIJ..."
                  className="input flex-1 px-3 py-2 text-sm font-mono"
                />
                <button onClick={() => salvarPlaceId(placeIdInput)} disabled={salvandoPlaceId || !placeIdInput.trim()} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 disabled:opacity-60">
                  {salvandoPlaceId ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Salvar
                </button>
              </div>
            </details>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={sincronizar} disabled={sincronizando} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
              {sincronizando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {sincronizando ? "Buscando…" : "Buscar avaliações novas"}
            </button>
            {msgSync && <span className="text-xs text-muted">{msgSync}</span>}
          </div>
        )}
      </div>

      <details className="card p-4">
        <summary className="text-xs text-muted cursor-pointer select-none">Ou cole uma avaliação manualmente</summary>
        <div className="space-y-2.5 mt-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui o texto da avaliação recebida…"
            rows={3}
            className="input w-full px-3 py-2 text-sm resize-none"
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Nome do avaliador (opcional)" className="input px-3 py-2 text-sm flex-1 min-w-[160px]" disabled={busy} />
            <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="input px-3 py-2 text-sm" disabled={busy}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n === 1 ? "" : "s"}</option>)}
            </select>
            <button onClick={sugerir} disabled={busy || !texto.trim()} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {busy ? "Pensando…" : "Sugerir resposta"}
            </button>
          </div>
        </div>
      </details>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está lendo a avaliação e pensando numa resposta</strong>
          </div>
        </div>
      )}

      {reviews.length === 0 && !busy && (
        <div className="card p-10 text-center text-muted text-sm">Nenhuma avaliação registrada ainda.</div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-2.5">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  {Array.from({ length: r.notaEstrelas }).map((_, i) => <Star key={i} size={12} className="text-accent" fill="currentColor" />)}
                  {r.avaliacaoAutor && <span>· {r.avaliacaoAutor}</span>}
                </div>
                {r.exigeAprovacao && r.status === "rascunho" && r.respostaSugerida && (
                  <span className="badge-pill badge-pill--warn flex items-center gap-1"><AlertTriangle size={11} /> requer aprovação</span>
                )}
              </div>
              <p className="text-xs text-muted italic">&quot;{r.avaliacaoTexto}&quot;</p>
              {r.respostaSugerida ? (
                <div className="text-sm border-t border-app pt-2">{r.respostaSugerida}</div>
              ) : (
                <button onClick={() => gerarRespostaPara(r)} disabled={busy} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Gerar resposta com IA
                </button>
              )}
              {r.status === "rascunho" && r.respostaSugerida && (
                <button onClick={() => aprovar(r.id)} disabled={processando === r.id} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
                  {processando === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aprovar resposta
                </button>
              )}
              {r.status === "aprovada" && isOwner && (
                <SessaoAssistidaCTA slug={slug} tipo="review" id={r.id} onMarcarAplicado={() => marcarAplicada(r.id)} />
              )}
              {r.status === "aplicada" && <span className="badge-pill badge-pill--good">{r.status}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
