"use client";

import { useEffect, useState } from "react";
import { ExternalLink, CheckCircle2, Loader2, Link2, Check, Puzzle, X, MessageCircleQuestion } from "lucide-react";

/**
 * Enquanto o OAuth oficial da Google Business Profile API não sai aprovado
 * (pode levar semanas), aplicar de verdade no perfil do cliente é feito
 * numa sessão manual — mas o clique aqui já resolve a parte que dava pra
 * automatizar: busca o prompt pronto (sem terminal), copia pra área de
 * transferência e abre a aba do Google Business Profile, tudo de um clique
 * só. O ÚNICO passo que sobra pro operador é abrir a extensão Claude-in-
 * Chrome nessa aba e colar — nenhum site consegue acionar uma extensão de
 * outro sozinho (barreira de segurança do próprio Chrome, não uma
 * limitação nossa), então isso sempre vai precisar de um clique manual. O
 * modal de instrução existe pra deixar ISSO claro em português simples
 * antes de sair clicando, já que quem usa pode não ser familiarizado com
 * extensão de navegador (regra do produto: UX pra leigo, nunca assumir que
 * o usuário já sabe).
 */
export default function SessaoAssistidaCTA({
  slug,
  tipo,
  id,
  onMarcarAplicado,
}: {
  slug: string;
  tipo: "proposta-gmb" | "calendario-post" | "review";
  id?: string;
  onMarcarAplicado: () => Promise<void>;
}) {
  const [linkGmb, setLinkGmb] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [salvandoLink, setSalvandoLink] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil`)
      .then((r) => r.json())
      .then((d) => setLinkGmb(d.perfil?.linkGmb || ""))
      .catch(() => setLinkGmb(""));
  }, [slug]);

  async function salvarLink() {
    if (!linkInput.trim()) return;
    setSalvandoLink(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/perfil/link-gmb`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkGmb: linkInput.trim() }),
      });
      if (res.ok) setLinkGmb(linkInput.trim());
    } finally {
      setSalvandoLink(false);
    }
  }

  async function confirmarEAbrir() {
    setModalAberto(false);
    setErro(null);
    setPronto(false);
    setPreparando(true);
    // IMPORTANTE: nunca abrir a aba nova antes de copiar — assim que uma
    // aba nova ganha foco, o Chrome recusa navigator.clipboard.writeText()
    // na aba de origem (erro real observado: "Document is not focused").
    // Por isso a ordem é sempre gerar → copiar → só DEPOIS abrir a aba.
    try {
      const params = new URLSearchParams({ tipo });
      if (id) params.set("id", id);
      const res = await fetch(`/api/tenants/${slug}/mkt-online/seo-local/prompt-aplicacao?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "não consegui gerar o prompt");
        return;
      }
      try {
        await navigator.clipboard.writeText(data.prompt);
      } catch (e) {
        console.error("clipboard.writeText falhou:", e);
        setErro("não consegui copiar o prompt (o navegador bloqueou) — mas vou abrir a aba do Google mesmo assim.");
      }
      window.open(linkGmb || "https://business.google.com/", "_blank");
      setPronto(true);
      setTimeout(() => setPronto(false), 5000);
    } catch (e) {
      console.error("falha ao preparar sessão assistida:", e);
      setErro("não consegui gerar o prompt — tenta de novo");
    } finally {
      setPreparando(false);
    }
  }

  async function marcar() {
    setMarcando(true);
    try {
      await onMarcarAplicado();
    } finally {
      setMarcando(false);
    }
  }

  return (
    <div className="card p-4 space-y-3" style={{ borderStyle: "dashed" }}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <ExternalLink size={14} /> Aplicar de verdade no Google
      </div>

      {linkGmb === "" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Primeira vez aqui — cole o link de gerenciar o perfil do Google Business Profile deste cliente (uma vez só, fica salvo).
          </p>
          <div className="flex items-center gap-2">
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://business.google.com/..."
              className="input flex-1 px-3 py-2 text-sm font-mono"
            />
            <button onClick={salvarLink} disabled={salvandoLink || !linkInput.trim()} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 disabled:opacity-60">
              {salvandoLink ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Salvar link
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">
            Copia o prompt e abre o perfil do Google numa aba nova — depois é só abrir a extensão Claude-in-Chrome nessa aba e colar.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setModalAberto(true)} disabled={preparando} className="btn-accent text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60">
              {preparando ? <Loader2 size={13} className="animate-spin" /> : pronto ? <Check size={13} /> : <ExternalLink size={13} />}
              {preparando ? "Preparando…" : pronto ? "Copiado! Abriu a aba do Google" : "Abrir Google + copiar prompt"}
            </button>
            <button onClick={marcar} disabled={marcando} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-60">
              {marcando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Marcar como aplicado
            </button>
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </>
      )}

      {modalAberto && <ComoAplicarModal onFechar={() => setModalAberto(false)} onConfirmar={confirmarEAbrir} />}
    </div>
  );
}

/** Explica o passo a passo em português simples antes de abrir a aba —
 * quem usa isso pode nunca ter usado uma extensão de navegador, então nada
 * pode ser "óbvio". Ilustração da barra de extensões feita com ícones do
 * próprio design system (nada de imagem externa/print de tela, que
 * desatualiza fácil e não se adapta a tema claro/escuro). */
function ComoAplicarModal({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Como aplicar no Google</h2>
            <p className="text-xs text-muted mt-0.5">São só 3 passos rápidos, sem complicação.</p>
          </div>
          <button onClick={onFechar} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* ilustração: barra de navegador com o ícone de extensões destacado */}
        <div
          className="rounded-xl border border-app p-3 mb-5 flex items-center gap-2"
          style={{ background: "color-mix(in srgb, var(--text) 4%, var(--card))" }}
        >
          <div className="h-2 w-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text) 25%, transparent)" }} />
          <div className="h-2 w-2 rounded-full" style={{ background: "color-mix(in srgb, var(--text) 25%, transparent)" }} />
          <div className="flex-1 h-6 rounded-md" style={{ background: "color-mix(in srgb, var(--text) 8%, transparent)" }} />
          <div className="relative">
            <div className="h-7 w-7 rounded-md border-2 border-accent flex items-center justify-center text-accent">
              <Puzzle size={14} />
            </div>
            <span className="absolute -bottom-4 right-0 text-[9px] text-accent whitespace-nowrap font-medium">clique aqui ↑</span>
          </div>
        </div>

        <ol className="space-y-3.5 mb-5">
          <li className="flex gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-accent text-[11px] font-semibold flex items-center justify-center" style={{ color: "var(--accent-text, #111)" }}>1</span>
            <p className="text-sm">Uma aba do navegador vai abrir com o perfil do Google — o texto com as mudanças já fica copiado, sem precisar fazer nada.</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-accent text-[11px] font-semibold flex items-center justify-center" style={{ color: "var(--accent-text, #111)" }}>2</span>
            <p className="text-sm">
              Nessa aba nova, clique no ícone de <strong>extensões</strong> (a peça de quebra-cabeça 🧩 no canto do navegador) e abra o <strong>Claude</strong>.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-accent text-[11px] font-semibold flex items-center justify-center" style={{ color: "var(--accent-text, #111)" }}>3</span>
            <p className="text-sm">
              Cole no chat (<span className="font-mono text-xs">Cmd/Ctrl + V</span>) o texto que já copiamos.
            </p>
          </li>
        </ol>

        <div className="rounded-lg border border-app p-3 mb-5 flex items-start gap-2" style={{ background: "color-mix(in srgb, var(--ai) 8%, transparent)" }}>
          <MessageCircleQuestion size={15} className="shrink-0 mt-0.5 text-app" style={{ color: "var(--ai)" }} />
          <p className="text-xs text-muted">
            O Claude pode fazer alguma pergunta pra confirmar uma informação — é só responder normalmente. Depois disso ele aplica tudo sozinho, você só confere no final.
          </p>
        </div>

        <button onClick={onConfirmar} className="btn-accent text-sm px-4 py-2.5 w-full flex items-center justify-center gap-2">
          <ExternalLink size={15} /> Entendi, abrir agora
        </button>
      </div>
    </div>
  );
}
