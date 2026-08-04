"use client";

import { useState } from "react";
import { Sparkles, Loader2, Globe, FileEdit, ExternalLink } from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import type { PerfilNegocioSeo } from "./PerfilNegocioSeoTab";

type StatusPaginaLocal = "rascunho" | "aprovada" | "publicada";
interface PaginaLocal {
  id: string;
  servicoSlug: string;
  localizacaoSlug: string;
  palavraChaveAlvo: string;
  pastaRascunho: string;
  destino: "site" | "wordpress";
  status: StatusPaginaLocal;
  urlPublicada?: string;
}

const STATUS_CLASSE: Record<StatusPaginaLocal, string> = {
  rascunho: "badge-pill--warn",
  aprovada: "badge-pill--accent",
  publicada: "badge-pill--good",
};

export default function PaginasLocaisTab({
  slug,
  perfil,
  paginas,
  onAtualizado,
  isOwner,
  wordpressConfigurado,
}: {
  slug: string;
  perfil: PerfilNegocioSeo | null;
  paginas: PaginaLocal[];
  onAtualizado: () => void;
  isOwner: boolean;
  wordpressConfigurado: boolean;
}) {
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>([]);
  const [destino, setDestino] = useState<"site" | "wordpress">("site");
  const [publicando, setPublicando] = useState<string | null>(null);
  const { busy, send } = useAgentChat(slug, "mkt-online", "seo-local-paginas");

  function toggle(lista: string[], setLista: (v: string[]) => void, valor: string) {
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  }

  async function planejar() {
    if (servicosSelecionados.length === 0 || areasSelecionadas.length === 0 || busy) return;
    const combos = servicosSelecionados.flatMap((s) => areasSelecionadas.map((a) => `${s} × ${a}`));
    const contexto = `[Contexto: o usuário está na aba SEO Local → Páginas locais. Gere as páginas seguindo a seção 6, para as combinações: ${combos.join(", ")}. Destino: "${destino === "site" ? "site do CentralPlus" : "WordPress do cliente"}" (grave o campo destino como "${destino}" em cada entrada de paginas-locais.json).]`;
    await send(`Planeja e gera as páginas locais pras combinações: ${combos.join(", ")}.`, onAtualizado, undefined, contexto);
  }

  async function publicarWordpress(id: string) {
    setPublicando(id);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/paginas-locais/${id}/publicar-wordpress`, { method: "POST" });
      if (res.ok) onAtualizado();
    } finally {
      setPublicando(null);
    }
  }

  if (!perfil || perfil.servicos.length === 0 || perfil.areasAtuacao.length === 0) {
    return (
      <div className="card p-10 text-center text-muted text-sm">
        Preencha o perfil de negócio (serviços e áreas de atuação) antes de planejar páginas locais.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Páginas locais</h2>
        <p className="text-xs text-muted mt-1 max-w-md">
          Uma página dedicada por combinação de serviço e cidade — o fator #1 pra aparecer nas buscas orgânicas locais.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <h4 className="text-xs font-medium text-muted mb-1.5">Serviços</h4>
          <div className="flex flex-wrap gap-1.5">
            {perfil.servicos.map((s) => (
              <button
                key={s.slug}
                onClick={() => toggle(servicosSelecionados, setServicosSelecionados, s.nome)}
                className="kw-tag"
                style={servicosSelecionados.includes(s.nome) ? { background: "color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent)" } : undefined}
                disabled={busy}
              >
                {s.nome}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted mb-1.5">Áreas de atuação</h4>
          <div className="flex flex-wrap gap-1.5">
            {perfil.areasAtuacao.map((a) => (
              <button
                key={a.slug}
                onClick={() => toggle(areasSelecionadas, setAreasSelecionadas, a.cidade)}
                className="kw-tag"
                style={areasSelecionadas.includes(a.cidade) ? { background: "color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent)" } : undefined}
                disabled={busy}
              >
                {a.cidade}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {(["site", "wordpress"] as const).map((d) => (
              <button key={d} onClick={() => setDestino(d)} className={`ws-tab ${destino === d ? "ws-tab--active" : ""}`} disabled={busy}>
                {d === "site" ? "Site do CentralPlus" : "WordPress do cliente"}
              </button>
            ))}
          </div>
          {destino === "wordpress" && !wordpressConfigurado && (
            <span className="text-[11px] text-amber-400/90">WordPress ainda não configurado em Configurações → WordPress.</span>
          )}
        </div>
        <button
          onClick={planejar}
          disabled={busy || servicosSelecionados.length === 0 || areasSelecionadas.length === 0}
          className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "Gerando…" : `Planejar ${servicosSelecionados.length * areasSelecionadas.length || ""} página${servicosSelecionados.length * areasSelecionadas.length === 1 ? "" : "s"}`}
        </button>
      </div>

      {busy && (
        <div className="card thinking-wrap">
          <div className="thinking-orb" />
          <div>
            <strong className="text-sm">A IA está criando as páginas</strong>
            <p className="text-xs text-muted mt-1">Isso pode levar um pouco mais de tempo — não feche esta tela.</p>
          </div>
        </div>
      )}

      {!busy && paginas.length === 0 && (
        <div className="card p-10 text-center text-muted text-sm">Nenhuma página local ainda.</div>
      )}

      {!busy && paginas.length > 0 && (
        <div className="space-y-2">
          {paginas.map((p) => (
            <div key={p.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-medium">{p.servicoSlug} × {p.localizacaoSlug}</div>
                <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                  {p.destino === "site" ? <Globe size={11} /> : <FileEdit size={11} />} destino: {p.destino === "site" ? "Site do CentralPlus" : "WordPress"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge-pill ${STATUS_CLASSE[p.status]}`}>{p.status}</span>
                {p.status !== "publicada" && p.destino === "site" && isOwner && (
                  <a href={`/c/${slug}/site`} className="btn-ghost text-xs px-2.5 py-1.5">Aprovar no Meu Site</a>
                )}
                {p.status !== "publicada" && p.destino === "wordpress" && isOwner && (
                  <button onClick={() => publicarWordpress(p.id)} disabled={publicando === p.id || !wordpressConfigurado} className="btn-accent text-xs px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-60">
                    {publicando === p.id ? <Loader2 size={12} className="animate-spin" /> : null} Publicar no WordPress
                  </button>
                )}
                {p.urlPublicada && (
                  <a href={p.urlPublicada} target="_blank" rel="noreferrer" className="icon-btn"><ExternalLink size={13} /></a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
