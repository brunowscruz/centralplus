"use client";

import { useCallback, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Wand2,
  CalendarClock,
  Check,
  Loader2,
  Copy,
} from "lucide-react";
import { useAgentChat } from "@/hooks/useAgentChat";
import { ChatMessages, ChatThinking } from "@/components/ChatMessages";
import type { ThemeTokens } from "@/lib/theme";

interface PostSlide {
  rel: string;
  kind: "image" | "html";
}
interface PublicacaoInfo {
  status: "publicado" | "falhou";
  em: string;
  erro?: string;
  mediaId?: string;
}
interface AgendamentoInfo {
  dataHoraISO: string;
  status: "pendente" | "publicado" | "falhou";
  tentativas: number;
  erro?: string;
}
export interface Post {
  name: string;
  mtime: number;
  slides: PostSlide[];
  legenda: string | null;
  aprovado: string | null;
  modelo: boolean;
  publicacao: PublicacaoInfo | null;
  agendamento: AgendamentoInfo | null;
}

export type SubTab = "post" | "carrossel" | "story";

const FORMATO: Record<SubTab, { label: string; dim: string }> = {
  post: { label: "Post", dim: "1080×1080" },
  carrossel: { label: "Carrossel", dim: "1080×1350" },
  story: { label: "Story", dim: "1080×1920" },
};

const SUGESTOES: Record<SubTab, string[]> = {
  post: ["Post com um dado que impressiona sobre meu negócio", "Post com 5 dicas rápidas pro meu cliente"],
  carrossel: ["Carrossel educativo de 5 slides sobre meu negócio", "Carrossel com 3 erros que o cliente comete"],
  story: ["Story com um CTA direto pro WhatsApp", "Story de bastidores do dia a dia"],
};

const RAIL_MIN = 170, RAIL_MAX = 380, RAIL_DEFAULT = 230;
const TERM_MIN = 260, TERM_MAX = 520, TERM_DEFAULT = 320;

export default function InstagramStudio({
  slug,
  subTab,
  posts,
  selected,
  onSelect,
  chatEnabled,
  isOwner,
  tema,
  onAtualizado,
  onSubTabChange,
  approving,
  onApprove,
  publishing,
  publishError,
  onPublish,
  agendando,
  dataAgendamento,
  setDataAgendamento,
  onAgendar,
  onCancelarAgendamento,
}: {
  slug: string;
  subTab: SubTab;
  posts: Post[];
  selected: string | null;
  onSelect: (name: string) => void;
  chatEnabled: boolean;
  isOwner: boolean;
  tema: ThemeTokens;
  onAtualizado: () => void;
  onSubTabChange: (t: SubTab) => void;
  approving: boolean;
  onApprove: () => void;
  publishing: boolean;
  publishError: string | null;
  onPublish: () => void;
  agendando: boolean;
  dataAgendamento: string;
  setDataAgendamento: (v: string) => void;
  onAgendar: () => void;
  onCancelarAgendamento: () => void;
}) {
  const post = posts.find((p) => p.name === selected) ?? null;
  const [slideIdx, setSlideIdx] = useState(0);
  const [railWidth, setRailWidth] = useState(RAIL_DEFAULT);
  const [termWidth, setTermWidth] = useState(TERM_DEFAULT);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [termCollapsed, setTermCollapsed] = useState(false);
  const [texto, setTexto] = useState("");
  const [gerandoNovoDestino, setGerandoNovoDestino] = useState<SubTab | null>(null);
  const [legendaCopiada, setLegendaCopiada] = useState(false);

  async function copiarLegenda() {
    if (!post?.legenda) return;
    await navigator.clipboard.writeText(post.legenda);
    setLegendaCopiada(true);
    setTimeout(() => setLegendaCopiada(false), 2000);
  }

  const scope = post ? `studio-${post.name}` : `studio-novo-${subTab}`;
  const { messages, busy, send } = useAgentChat(slug, "instagram", scope);

  const mediaUrl = useCallback(
    (p: Post, rel: string) => `/api/tenants/${slug}/instagram/media/${encodeURIComponent(p.name)}/${rel}`,
    [slug],
  );

  const slide = post?.slides[Math.min(slideIdx, (post?.slides.length ?? 1) - 1)];

  /** Depois de qualquer geração NOVA (não edição de post existente), acha o
   * post mais recente daquele tipo e seleciona ele — mesma lógica já usada
   * no MKT Online (AdsTab) pra achar o que acabou de ser criado. */
  async function selecionarMaisRecente(tipo: SubTab) {
    const res = await fetch(`/api/tenants/${slug}/instagram`);
    const data: { posts: Post[] } = await res.json();
    const doTipo = data.posts
      .filter((p) => (tipo === "carrossel" ? p.name.startsWith("carrossel") : tipo === "story" ? p.name.startsWith("story") : !p.name.startsWith("carrossel") && !p.name.startsWith("story")))
      .sort((a, b) => b.mtime - a.mtime);
    onAtualizado();
    if (doTipo[0]) {
      if (tipo !== subTab) onSubTabChange(tipo);
      onSelect(doTipo[0].name);
    }
  }

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || busy) return;
    setTexto("");
    const contexto = post
      ? `[Contexto: o usuário está editando o post "${post.name}" (marketing/conteudo/${post.name}/modelo.json) na aba ${FORMATO[subTab].label}. Edite esse modelo.json diretamente seguindo o schema documentado e rode o render no final — não crie post novo.]`
      : `[Contexto: o usuário está criando um post NOVO na aba ${FORMATO[subTab].label} (formato ${FORMATO[subTab].dim}). Use a skill carrossel.]`;
    const alvo = subTab;
    await send(mensagem, () => selecionarMaisRecente(alvo), undefined, contexto);
  }

  async function usarSugestao(s: string) {
    setTexto(s);
    setTimeout(enviar, 0);
  }

  async function variacao() {
    if (!post || busy) return;
    const contexto = `[Contexto: o usuário pediu uma VARIAÇÃO do post "${post.name}" — siga a regra de Variação documentada (crie post NOVO, mesma identidade, composição diferente, não sobrescreva o original).]`;
    const alvo = subTab;
    await send("Gera uma variação diferente dessa mesma ideia.", () => selecionarMaisRecente(alvo), undefined, contexto);
  }

  async function adaptarFormato(novoTipo: SubTab) {
    if (!post || busy) return;
    setGerandoNovoDestino(novoTipo);
    const contexto = `[Contexto: o usuário pediu pra ADAPTAR o post "${post.name}" pro formato ${FORMATO[novoTipo].label} (${FORMATO[novoTipo].dim}) — siga a regra de Adaptar formato documentada (post novo, recomposto pro novo tamanho, mesma identidade).]`;
    await send(`Adapta essa mesma arte pro formato ${FORMATO[novoTipo].label} também.`, () => {
      setGerandoNovoDestino(null);
      selecionarMaisRecente(novoTipo);
    }, undefined, contexto);
  }

  // arrastar divisores
  const dragging = useRef<"rail" | "term" | null>(null);
  function startDrag(qual: "rail" | "term") {
    dragging.current = qual;
    function onMove(e: MouseEvent) {
      if (dragging.current === "rail") {
        setRailWidth(Math.max(RAIL_MIN, Math.min(RAIL_MAX, e.clientX - (railBoxLeft.current ?? 0))));
      } else if (dragging.current === "term") {
        setTermWidth(Math.max(TERM_MIN, Math.min(TERM_MAX, (termBoxRight.current ?? 0) - e.clientX)));
      }
    }
    function onUp() {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  const railBoxLeft = useRef<number | null>(null);
  const termBoxRight = useRef<number | null>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  const outrosFormatos = (Object.keys(FORMATO) as SubTab[]).filter((t) => t !== subTab);

  return (
    <div
      className="studio"
      ref={studioRef}
      style={{ height: "min(78vh, 720px)" }}
      onMouseDownCapture={() => {
        if (studioRef.current) {
          const rect = studioRef.current.getBoundingClientRect();
          railBoxLeft.current = rect.left;
          termBoxRight.current = rect.right;
        }
      }}
    >
      {/* trilho esquerdo */}
      <div className="studio-rail" style={{ width: railCollapsed ? 0 : railWidth }}>
        <div className="studio-rail-section">
          <h4>Identidade visual</h4>
          <div className="studio-swatches">
            <div className="studio-swatch" style={{ background: tema.bg }} title="Fundo" />
            <div className="studio-swatch" style={{ background: tema.card }} title="Card" />
            <div className="studio-swatch" style={{ background: tema.accent }} title="Destaque" />
            <div className="studio-swatch" style={{ background: tema.text }} title="Texto" />
          </div>
          {tema.titleFont && <div className="studio-id-row"><strong>{tema.titleFont}</strong> · títulos</div>}
          {tema.bodyFont && <div className="studio-id-row"><strong>{tema.bodyFont}</strong> · corpo</div>}
        </div>
        <div className="studio-rail-section">
          <h4>Gerados recentemente</h4>
          {posts.length === 0 && <p className="text-[11px] text-muted">Nada ainda — peça no chat.</p>}
          {posts.map((p) => (
            <div
              key={p.name}
              className={`studio-hist-item ${p.name === selected ? "active" : ""}`}
              onClick={() => {
                onSelect(p.name);
                setSlideIdx(0);
              }}
            >
              {p.slides[0] && p.slides[0].kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p, p.slides[0].rel)} alt="" className="studio-hist-thumb" />
              ) : (
                <div className="studio-hist-thumb" />
              )}
              <div className="studio-hist-main">
                <div className="studio-hist-title">{p.name}</div>
                <div className="studio-hist-sub">
                  {p.agendamento ? "agendado" : p.publicacao?.status === "publicado" ? "✓ publicado" : p.aprovado ? "✓ aprovado" : "rascunho"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="studio-divider" onMouseDown={() => startDrag("rail")} />

      {/* palco central */}
      <div className="studio-stage">
        <div className="studio-stage-top">
          <button className="icon-btn" onClick={() => setRailCollapsed((c) => !c)} title="Esconder/mostrar identidade e histórico">
            {railCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
          <span className="text-xs font-medium truncate flex-1">{post ? post.name : "Novo post"}</span>
          <span className="text-[11px] text-muted font-mono">{FORMATO[subTab].label} · {FORMATO[subTab].dim}</span>
          <button className="icon-btn ml-1" onClick={() => setTermCollapsed((c) => !c)} title="Esconder/mostrar chat">
            {termCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
          </button>
        </div>

        <div className="studio-stage-mid">
          <div
            className="studio-preview-frame"
            style={{ aspectRatio: subTab === "post" ? "1/1" : subTab === "carrossel" ? "1080/1350" : "1080/1920" }}
          >
            {slide ? (
              slide.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(post!, slide.rel)} alt="" className="absolute inset-0 w-full h-full object-contain bg-white" />
              ) : (
                <iframe src={mediaUrl(post!, slide.rel)} title={post!.name} className="absolute inset-0 w-full h-full border-0" />
              )
            ) : (
              <div className="studio-preview-empty">
                <Sparkles size={26} className="opacity-40" />
                <span className="text-xs">Descreva a arte no chat<br />e o resultado aparece aqui.</span>
              </div>
            )}
          </div>
        </div>

        {post && post.slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-1">
            <button className="icon-btn" onClick={() => setSlideIdx((i) => Math.max(0, i - 1))} disabled={slideIdx === 0}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-muted">{slideIdx + 1} / {post.slides.length}</span>
            <button className="icon-btn" onClick={() => setSlideIdx((i) => Math.min(post.slides.length - 1, i + 1))} disabled={slideIdx >= post.slides.length - 1}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {post?.legenda && (
          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] uppercase tracking-wide text-muted">Legenda</span>
              <button onClick={copiarLegenda} className="btn-ghost text-[11px] px-2 py-0.5 flex items-center gap-1">
                {legendaCopiada ? <Check size={11} /> : <Copy size={11} />} {legendaCopiada ? "Copiada" : "Copiar"}
              </button>
            </div>
            <pre className="text-[11px] text-app whitespace-pre-wrap font-sans bg-app border border-app rounded-lg p-2.5 max-h-24 overflow-auto">
              {post.legenda}
            </pre>
          </div>
        )}

        <div className="studio-stage-bottom">
          {post && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted flex-wrap">
              <RefreshCcw size={12} />
              Também em:
              {outrosFormatos.map((t) => (
                <button
                  key={t}
                  onClick={() => adaptarFormato(t)}
                  disabled={busy}
                  className="btn-ghost px-2 py-1 text-[11px] disabled:opacity-50 flex items-center gap-1"
                >
                  {gerandoNovoDestino === t && <Loader2 size={11} className="animate-spin" />}
                  {FORMATO[t].label}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1" />
          {post && !post.aprovado && isOwner && (
            <button onClick={onApprove} disabled={approving} className="btn-accent text-xs px-3 py-1.5 disabled:opacity-60 flex items-center gap-1">
              <Check size={13} /> {approving ? "Aprovando…" : "Aprovar"}
            </button>
          )}
          {post && post.aprovado && !post.agendamento && isOwner && (
            <>
              <button onClick={variacao} disabled={busy} className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-50 flex items-center gap-1">
                <Wand2 size={13} /> Variação
              </button>
              <button onClick={onPublish} disabled={publishing} className="btn-accent text-xs px-3 py-1.5 disabled:opacity-60 flex items-center gap-1">
                <Send size={13} /> {publishing ? "Publicando…" : "Publicar agora"}
              </button>
              <input
                type="datetime-local"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                className="input text-xs px-2 py-1.5"
              />
              <button onClick={onAgendar} disabled={agendando || !dataAgendamento} className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-60 flex items-center gap-1">
                <CalendarClock size={13} /> Agendar
              </button>
            </>
          )}
          {post?.agendamento && (
            <span className="badge-pill badge-pill--accent flex items-center gap-1">
              <CalendarClock size={11} /> agendado pra {new Date(post.agendamento.dataHoraISO).toLocaleString("pt-BR")}
              {isOwner && <button onClick={onCancelarAgendamento} className="ml-1 underline">cancelar</button>}
            </span>
          )}
          {publishError && <span className="text-[11px] text-red-400">{publishError}</span>}
        </div>
        {post && !isOwner && (
          <p className="px-3 pb-2 text-[11px] text-muted">A publicação no feed é feita pela agência após a aprovação.</p>
        )}
      </div>

      <div className="studio-divider" onMouseDown={() => startDrag("term")} />

      {/* terminal criativo */}
      <div className="studio-terminal" style={{ width: termCollapsed ? 46 : termWidth }}>
        <div className="studio-terminal-head">
          <div className="ai-drawer__head badge" style={{ width: 26, height: 26 }}><Sparkles size={13} /></div>
          <div className="studio-terminal-info min-w-0 overflow-hidden">
            <div className="text-xs font-medium">Terminal criativo</div>
            <div className="text-[10px] text-muted truncate">{post ? "editando este post" : "criar do zero"}</div>
          </div>
        </div>
        <div className="studio-terminal-body">
          {messages.length === 0 && (
            <div className="ai-msg bot">
              {chatEnabled
                ? `Pronto pra ${post ? "editar esse post" : `criar um ${FORMATO[subTab].label.toLowerCase()}`}. Descreve o que você quer.`
                : "Chat desativado nesta instalação (ANTHROPIC_API_KEY ausente)."}
            </div>
          )}
          <ChatMessages messages={messages} busy={busy} />
          {busy && messages.length === 0 && <ChatThinking />}
        </div>
        {!post && messages.length === 0 && (
          <div className="studio-terminal-chips">
            {SUGESTOES[subTab].map((s) => (
              <button key={s} className="ai-suggest-chip" onClick={() => usarSugestao(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="studio-terminal-foot">
          <input
            type="text"
            placeholder="Descreva a arte…"
            value={texto}
            disabled={!chatEnabled || busy}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
          />
          <button className="ai-drawer__send" onClick={enviar} disabled={!chatEnabled || busy || !texto.trim()}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
