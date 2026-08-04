"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Globe2,
  Info,
  ShieldCheck,
  Lock,
  RotateCw,
  ExternalLink,
  Pencil,
  Plus,
  Smartphone,
  Monitor,
  X,
  ChevronLeft,
  Download,
  UploadCloud,
  ChevronDown,
  Server,
} from "lucide-react";
import ChatPanel from "../claude/ChatPanel";
import PublicacaoTab from "./PublicacaoTab";
import type { PublicacaoSummary } from "../config/types";
import { useConfirm } from "@/components/ConfirmProvider";
import { useCelebration } from "@/components/Celebration";
import EmptyState from "@/components/EmptyState";

/**
 * Módulo Meu Site (Fase 4 + galeria de páginas).
 * - Galeria: lista todas as páginas de verdade da versão selecionada (site
 *   aprovado ou um rascunho) — cada página é uma subpasta com index.html
 *   próprio (convenção da skill criar-site), com miniatura viva (iframe real,
 *   não screenshot). Ver antes de editar, sempre.
 * - Preview em iframe do site APROVADO (site/) ou de qualquer rascunho
 *   (saidas/sites/<versão>/), servidos pela rota sandboxed de preview, numa
 *   moldura de navegador (barra de endereço com o domínio real do cliente).
 * - "Editar esta página": se a versão é o site aprovado, prepara um rascunho
 *   novo no servidor (cópia determinística de site/ inteiro — nunca edita
 *   site/ direto); o chat recebe um contexto fixo apontando exatamente pra
 *   pasta daquela página, pra não regenerar o site inteiro por engano.
 * - Regra de ouro: só o OPERADOR aprova um rascunho como site oficial.
 */

type TipoVersao = "site" | "lp";

interface SiteVersion {
  name: string;
  rel: string;
  mtime: number;
  tipo: TipoVersao;
}

interface SiteStatus {
  current: { mtime: number } | null;
  versions: SiteVersion[];
}

interface SitePage {
  path: string; // "" = início
  titulo: string;
  mtime: number;
}

interface EditContext {
  rascunho: string;
  pagina: string; // "" = início
  titulo: string;
}

const SUGESTOES = [
  "Crie o site institucional do meu negócio",
  "Atualize os textos com base na minha memória",
  "Deixe o site mais moderno e interativo",
];

/** tipoVersao decide o que a aprovação faz depois (ver lib/site.ts): "site"
 * substitui a home, "lp" vira só mais uma página dentro do site aprovado,
 * sem tocar em nada existente. */
const TIPOS_BRIEFING = [
  { id: "secao", label: "Nova seção no site atual", tipoVersao: "site" as TipoVersao },
  { id: "pagina", label: "Página nova (faz parte do site)", tipoVersao: "site" as TipoVersao },
  { id: "lp", label: "Landing page pra campanha/promoção", tipoVersao: "lp" as TipoVersao },
] as const;

export default function SiteWorkspace({
  slug,
  chatEnabled,
  isOwner,
  siteExterno,
  publicacao,
}: {
  slug: string;
  chatEnabled: boolean;
  isOwner: boolean;
  siteExterno: string | null;
  /** Config de publicação (FTP/git) deste cliente — null pro cliente comum
   * (nunca lida pra quem não é owner). Sem FTP configurado, o botão de ZIP
   * fica em destaque na barra de ações (é o caminho manual de publicação). */
  publicacao: PublicacaoSummary | null;
}) {
  const temFtp = publicacao?.metodo === "ftp";
  const [subTab, setSubTab] = useState<"site" | "publicacao" | "info" | "seguranca">("site");
  const [status, setStatus] = useState<SiteStatus | null>(null);
  // null = site aprovado; string = nome do rascunho
  const [selected, setSelected] = useState<string | null>(null);
  const [paginas, setPaginas] = useState<SitePage[]>([]);
  const [carregandoPaginas, setCarregandoPaginas] = useState(false);
  // null = galeria; "" = início; string = subpágina
  const [paginaAberta, setPaginaAberta] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [approving, setApproving] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [zipMenuAberto, setZipMenuAberto] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  // rede de segurança determinística pra marcar o tipo (site/lp) do rascunho
  // que o agente está prestes a criar — ver onAgentActivity.
  const [tipoVersaoPendente, setTipoVersaoPendente] = useState<TipoVersao | null>(null);
  const [versoesAntesDaGeracao, setVersoesAntesDaGeracao] = useState<Set<string> | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const confirmar = useConfirm();
  const celebrate = useCelebration();

  const load = useCallback(async (): Promise<SiteStatus | null> => {
    const res = await fetch(`/api/tenants/${slug}/site`);
    if (!res.ok) return null;
    const data = await res.json();
    const novoStatus: SiteStatus = { current: data.current, versions: data.versions };
    setStatus(novoStatus);
    setSelected((sel) => {
      if (sel && data.versions.some((v: SiteVersion) => v.name === sel)) return sel;
      if (sel === null && data.current) return null;
      return data.current ? null : (data.versions[0]?.name ?? null);
    });
    return novoStatus;
  }, [slug]);

  const carregarPaginas = useCallback(
    async (versao: string | null) => {
      setCarregandoPaginas(true);
      try {
        const qs = versao ? `?v=${encodeURIComponent(versao)}` : "";
        const res = await fetch(`/api/tenants/${slug}/site${qs}`);
        if (res.ok) {
          const data = await res.json();
          setPaginas(data.paginas || []);
        }
      } finally {
        setCarregandoPaginas(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    carregarPaginas(selected);
    // não reseta paginaAberta aqui: "selected" também muda programaticamente
    // (ex.: editarPagina criando um rascunho novo e já apontando pra ele) —
    // resetar a página aberta é responsabilidade de quem troca a versão de
    // propósito (o <select> abaixo), não deste efeito.
  }, [selected, carregarPaginas]);

  async function onAgentActivity() {
    // o agente pode ter criado/alterado um rascunho ou página
    const novoStatus = await load();
    carregarPaginas(selected);
    setFrameKey((k) => k + 1);

    // Se veio de um briefing (site/lp escolhido no formulário), garante que
    // o rascunho novo fica marcado com esse tipo — determinístico, não
    // depende só do agente lembrar de gravar o _meta.json sozinho (ver
    // prompt do módulo). Só age na primeira pasta nova que aparecer.
    if (tipoVersaoPendente && versoesAntesDaGeracao && novoStatus) {
      const nova = novoStatus.versions.find((v) => !versoesAntesDaGeracao.has(v.name));
      if (nova) {
        await fetch(`/api/tenants/${slug}/site`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: nova.name, tipo: tipoVersaoPendente }),
        });
        setTipoVersaoPendente(null);
        setVersoesAntesDaGeracao(null);
        load();
      }
    }
  }

  function sairDoModoEdicao() {
    setEditando(false);
    setEditContext(null);
    setSelected(null);
    setPaginaAberta(null);
  }

  function abrirBriefing() {
    setEditando(true);
    setEditContext(null);
    setBriefOpen(true);
  }

  async function editarPagina(pagina: SitePage) {
    setNotice(null);
    if (selected === null) {
      // site aprovado — precisa preparar um rascunho antes de editar
      setPreparando(true);
      try {
        const res = await fetch(`/api/tenants/${slug}/site`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "rascunho-do-site-atual", paginaAlvo: pagina.titulo }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNotice(data.error || "não foi possível preparar o rascunho pra edição.");
          return;
        }
        setStatus({ current: data.current, versions: data.versions });
        setSelected(data.rascunho);
        setPaginaAberta(pagina.path);
        setEditContext({ rascunho: data.rascunho, pagina: pagina.path, titulo: pagina.titulo });
        setEditando(true);
      } finally {
        setPreparando(false);
      }
    } else {
      setPaginaAberta(pagina.path);
      setEditContext({ rascunho: selected, pagina: pagina.path, titulo: pagina.titulo });
      setEditando(true);
    }
  }

  async function approve() {
    if (!selected) return;
    const versaoSelecionada = status?.versions.find((v) => v.name === selected);
    const tipo = versaoSelecionada?.tipo ?? "site";
    const eraPrimeiroSite = !status?.current;

    if (tipo === "site" && status?.current) {
      // busca as páginas do site ATUALMENTE aprovado (não do rascunho
      // selecionado, que é outra versão) — só assim o número no aviso é
      // real. "paginas" no state reflete a versão selecionada, não serve
      // aqui.
      let paginasDoSiteAtual = 0;
      try {
        const res = await fetch(`/api/tenants/${slug}/site`);
        const data = await res.json();
        paginasDoSiteAtual = (data.paginas || []).length;
      } catch {
        /* segue com 0 — melhor perguntar sem número do que travar */
      }
      if (paginasDoSiteAtual > 0) {
        const ok = await confirmar({
          title: "Substituir o site principal inteiro?",
          message:
            `As ${paginasDoSiteAtual} páginas atuais somem, ficam só no histórico de rascunhos. ` +
            `Se a intenção era só adicionar uma página nova sem mexer no resto, cancele e gere de novo como "landing page" em vez de "seção/página".`,
          variant: "danger",
          confirmText: "Substituir",
        });
        if (!ok) return;
      }
    }

    setApproving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/tenants/${slug}/site/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "Falha ao aprovar.");
        return;
      }
      setStatus({ current: data.current, versions: data.versions });
      setSelected(null); // passa a mostrar o site aprovado
      setEditContext(null);
      setFrameKey((k) => k + 1);
      const pub = data.publicacao as { ok: boolean; mensagem: string } | null;
      const aprovacao = data.aprovacao as { tipo: TipoVersao; subpasta: string } | undefined;
      const mensagemBase =
        aprovacao?.tipo === "lp" && aprovacao.subpasta
          ? `Landing page publicada — acessível em /${aprovacao.subpasta}/, o resto do site não foi tocado.`
          : "Versão aprovada — este agora é o site oficial do cliente.";
      setNotice(mensagemBase + (pub ? ` Publicação: ${pub.mensagem}` : ""));
      if (eraPrimeiroSite) {
        celebrate({
          title: "Primeiro site no ar!",
          message: "A primeira versão do site desse cliente acabou de ser aprovada — já é o site oficial dele.",
        });
      }
    } finally {
      setApproving(false);
    }
  }

  const hasAnything = !!status && (status.current !== null || status.versions.length > 0);
  const viewingDraft = selected !== null;

  function previewSrcFor(versao: string | null, caminhoPagina: string): string {
    const arquivo = caminhoPagina ? `${caminhoPagina}/index.html` : "index.html";
    // versão vai no PATH (não em querystring): um HTML com asset relativo em
    // subpasta (css/main.css, assets/foto.png) faz o próprio navegador
    // resolver esse caminho — e resolução de URL relativa nunca carrega a
    // querystring da página base pro recurso resolvido, só o path. Com "?v="
    // isso quebrava (404) qualquer rascunho com CSS/JS/imagem fora da raiz —
    // bug real corrigido 30/07/2026.
    const base = versao
      ? `/api/tenants/${slug}/site/preview/rascunho/${encodeURIComponent(versao)}/${arquivo}`
      : `/api/tenants/${slug}/site/preview/${arquivo}`;
    // cache-buster: garante URL nova a cada edição/recarregamento — o site é
    // editado ao vivo pelo chat, uma cópia antiga no cache do navegador
    // (mesmo com Cache-Control) já causou confusão real ("o preview mostra
    // uma versão diferente do que o arquivo tem de verdade")
    return `${base}?_=${frameKey}`;
  }

  function montarContextoPagina(ctx: EditContext): string {
    const pasta = ctx.pagina ? `saidas/sites/${ctx.rascunho}/${ctx.pagina}/` : `saidas/sites/${ctx.rascunho}/`;
    return `[Contexto: o usuário está editando a página "${ctx.titulo}" dentro do rascunho "${ctx.rascunho}" (${pasta}). Edite SOMENTE os arquivos dessa pasta${
      ctx.pagina ? "" : " (raiz do rascunho — não mexa nas subpastas de outras páginas, se houver)"
    } — não toque nas outras páginas do rascunho, não crie um rascunho novo pra esse pedido, a menos que o pedido claramente peça outra coisa.]`;
  }

  const dominioReal = siteExterno ? (/^https?:\/\//.test(siteExterno) ? siteExterno : `https://${siteExterno}`) : null;
  const enderecoExibido = dominioReal
    ? dominioReal.replace(/^https?:\/\//, "")
    : `pré-visualização interna${!isOwner ? "" : " · sem domínio configurado"}`;

  const paginaAtual = paginaAberta !== null ? paginas.find((p) => p.path === paginaAberta) : null;
  const previewSrc = previewSrcFor(selected, paginaAberta ?? "");

  return (
    <div className="flex gap-0 -mx-6 -my-6" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {/* sidebar do módulo — mesmo padrão do Financeiro/CRM/MKT Online
         (module-sidebar) em vez da barra de sub-abas horizontal antiga. */}
      <aside className="module-sidebar">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-2 mb-2">Meu Site</p>
        <button onClick={() => setSubTab("site")} className={`module-sidebar-item ${subTab === "site" ? "module-sidebar-item--active" : ""}`}>
          <Globe2 size={15} /> Site
        </button>
        {isOwner && (
          <button onClick={() => setSubTab("publicacao")} className={`module-sidebar-item ${subTab === "publicacao" ? "module-sidebar-item--active" : ""}`}>
            <UploadCloud size={15} /> Publicação
          </button>
        )}
        <button onClick={() => setSubTab("info")} className={`module-sidebar-item ${subTab === "info" ? "module-sidebar-item--active" : ""}`}>
          <Info size={15} /> Informações do site
        </button>
        <button onClick={() => setSubTab("seguranca")} className={`module-sidebar-item ${subTab === "seguranca" ? "module-sidebar-item--active" : ""}`}>
          <ShieldCheck size={15} /> Saúde & Segurança
        </button>
        <div className="flex-1" />
      </aside>

      <div className="flex-1 min-w-0 px-6 py-6 space-y-4">
        {subTab === "site" && isOwner && hasAnything && (
          <div className="flex items-center justify-end gap-1.5">
            <select
              className="input text-xs px-2 py-1.5 max-w-56"
              value={selected ?? "__current__"}
              onChange={(e) => {
                setSelected(e.target.value === "__current__" ? null : e.target.value);
                setPaginaAberta(null);
                setEditContext(null);
              }}
            >
              <option value="__current__" disabled={!status?.current}>
                {status?.current ? "✓ Site aprovado" : "— sem site aprovado —"}
              </option>
              {status?.versions.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.tipo === "lp" ? "LP" : "rascunho de site"} · {v.name}
                </option>
              ))}
            </select>
            <button onClick={abrirBriefing} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <Plus size={13} /> Nova página/LP
            </button>
            <div className="relative">
              <button
                onClick={() => setZipMenuAberto((v) => !v)}
                className={temFtp ? "icon-badge h-8 w-8" : "btn-ghost px-3 py-1.5 text-xs inline-flex items-center gap-1.5"}
                title="Baixar esta versão em .zip"
              >
                <Download size={temFtp ? 14 : 13} />
                {!temFtp && "Gerar ZIP"}
                <ChevronDown size={11} />
              </button>
              {zipMenuAberto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setZipMenuAberto(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-lg border border-app bg-card shadow-lg overflow-hidden">
                    <a
                      href={`/api/tenants/${slug}/site/download${selected ? `?v=${encodeURIComponent(selected)}` : ""}`}
                      onClick={() => setZipMenuAberto(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 text-xs hover:bg-app"
                    >
                      <Download size={14} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-medium">ZIP padrão</span>
                        <span className="block text-muted">Hospedagem comum (cPanel, gerenciador de arquivos) — sobe direto, sem build.</span>
                      </span>
                    </a>
                    <a
                      href={`/api/tenants/${slug}/site/download${selected ? `?v=${encodeURIComponent(selected)}` : ""}${selected ? "&" : "?"}formato=nodejs`}
                      onClick={() => setZipMenuAberto(false)}
                      className="flex items-start gap-2.5 px-3 py-2.5 text-xs hover:bg-app border-t border-app"
                    >
                      <Server size={14} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-medium">ZIP Node.js (Hostinger)</span>
                        <span className="block text-muted">Pra plano "Node.js App" — mesmo site, empacotado com o que essa hospedagem exige pra rodar.</span>
                      </span>
                    </a>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => (editando ? sairDoModoEdicao() : setEditando(true))}
              className={`icon-badge h-8 w-8 ${editando ? "text-accent" : ""}`}
              title={editando ? "Sair do modo edição" : "Conversar sobre o site (sem página específica)"}
            >
              <Pencil size={14} />
            </button>
          </div>
        )}

        {subTab === "publicacao" && isOwner && <PublicacaoTab slug={slug} atual={publicacao} />}

      {subTab === "info" && (
        <div className="card p-5 space-y-3 text-sm">
          <Info2Row label="Domínio" value={siteExterno ? siteExterno.replace(/^https?:\/\//, "") : "não configurado"} />
          <Info2Row label="Status" value={hasAnything ? "publicado dentro do Hub" : siteExterno ? "externo, fora do Hub" : "sem site"} />
          <Info2Row label="Páginas no site aprovado" value={`${status?.current ? paginas.length || "—" : 0}`} />
          <Info2Row label="Rascunhos" value={`${status?.versions.length ?? 0}`} />
        </div>
      )}

      {subTab === "seguranca" && (
        <div className="card p-8 text-center">
          <ShieldCheck size={22} className="mx-auto text-muted" />
          <p className="text-sm font-medium mt-3">Saúde & Segurança</p>
          <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto">
            Checagem automática de certificado SSL, uptime e performance ainda não está
            implementada nesta instalação — depende de um monitor externo rodando contra o
            domínio do cliente.
          </p>
        </div>
      )}

      {subTab === "site" && !hasAnything && (
        <div className="card h-[70vh] flex flex-col">
          <div className="flex-1 flex justify-center">
            {siteExterno ? (
              <ExternalSiteState url={siteExterno} chatEnabled={chatEnabled} />
            ) : (
              <SiteEmptyState chatEnabled={chatEnabled} isOwner={isOwner} onNovaPagina={abrirBriefing} />
            )}
          </div>
        </div>
      )}

      {subTab === "site" && hasAnything && (
        <div className={editando ? "grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}>
          <div className="card overflow-hidden h-[70vh] flex flex-col">
            {paginaAberta === null ? (
              // ---- galeria de páginas da versão selecionada -------------------
              <>
                <div className="px-4 py-3 border-b border-app flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`badge-pill ${viewingDraft ? "badge-pill--warn" : "badge-pill--accent"}`}>
                      {viewingDraft ? "RASCUNHO" : "PRODUÇÃO"}
                    </span>
                    <span className="text-sm font-medium">
                      {carregandoPaginas ? "Carregando páginas…" : `${paginas.length} página${paginas.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  {viewingDraft && (
                    <button onClick={approve} disabled={approving} className="btn-accent text-xs px-3 py-1.5 disabled:opacity-60">
                      {approving ? "Aprovando…" : "Aprovar esta versão"}
                    </button>
                  )}
                </div>
                {notice && <div className="px-4 py-1.5 text-xs text-accent border-b border-app">{notice}</div>}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                    {paginas.map((p) => (
                      <PaginaCard
                        key={p.path}
                        pagina={p}
                        src={previewSrcFor(selected, p.path)}
                        isOwner={isOwner}
                        preparando={preparando}
                        onAbrir={() => setPaginaAberta(p.path)}
                        onEditar={() => editarPagina(p)}
                      />
                    ))}
                    {isOwner && (
                      <button
                        onClick={abrirBriefing}
                        className="card border-dashed flex flex-col items-center justify-center gap-2 text-muted hover:text-accent hover:border-accent transition p-6"
                        style={{ minHeight: 170 }}
                      >
                        <Plus size={20} />
                        <span className="text-xs font-medium">Nova página/LP</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // ---- preview de uma página específica ---------------------------
              <>
                <div className="px-3 py-2 border-b border-app flex items-center gap-2 bg-app flex-wrap">
                  <button onClick={() => setPaginaAberta(null)} className="icon-badge h-7 w-7 shrink-0" title="Todas as páginas">
                    <ChevronLeft size={14} />
                  </button>
                  <span className={`badge-pill shrink-0 ${viewingDraft ? "badge-pill--warn" : "badge-pill--accent"}`}>
                    {viewingDraft ? "RASCUNHO" : "PRODUÇÃO EM TEMPO REAL"}
                  </span>
                  <span className="flex-1 min-w-[140px] flex items-center gap-1.5 bg-card border border-app rounded-lg px-2.5 py-1 text-xs text-muted truncate">
                    {dominioReal && !viewingDraft && <Lock size={11} className="shrink-0" />}
                    <span className="truncate">
                      {!viewingDraft && dominioReal ? enderecoExibido : paginaAtual?.titulo || "Início"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setMobile((m) => !m)} className="icon-badge h-7 w-7" title="Alternar largura mobile/desktop">
                      {mobile ? <Monitor size={13} /> : <Smartphone size={13} />}
                    </button>
                    <button onClick={() => setFrameKey((k) => k + 1)} className="icon-badge h-7 w-7" title="Recarregar">
                      <RotateCw size={13} />
                    </button>
                    <a href={previewSrc} target="_blank" rel="noreferrer" className="icon-badge h-7 w-7" title="Abrir em nova aba">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {isOwner && (
                  <div className="px-3 py-2 border-b border-app flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted flex-1 min-w-0 truncate">{paginaAtual?.titulo || "Início"}</span>
                    {!(editando && editContext?.rascunho === (selected ?? "") && editContext?.pagina === paginaAberta) && (
                      <button
                        onClick={() => paginaAtual && editarPagina(paginaAtual)}
                        disabled={preparando}
                        className="btn-accent text-xs px-3 py-1.5 disabled:opacity-60"
                      >
                        {preparando ? "Preparando rascunho…" : "Editar esta página"}
                      </button>
                    )}
                    {viewingDraft && (
                      <button onClick={approve} disabled={approving} className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-60">
                        {approving ? "Aprovando…" : "Aprovar esta versão"}
                      </button>
                    )}
                  </div>
                )}

                {notice && <div className="px-3 py-1.5 text-xs text-accent border-b border-app">{notice}</div>}

                <div className="flex-1 overflow-auto bg-app flex justify-center">
                  <iframe
                    key={frameKey}
                    src={previewSrc}
                    title="Preview do site"
                    sandbox="allow-scripts allow-same-origin"
                    className="h-full border-0 bg-white transition-all"
                    style={{ width: mobile ? 390 : "100%" }}
                  />
                </div>
              </>
            )}

            {!isOwner && (
              <div className="px-3 py-1.5 border-t border-app text-[11px] text-muted">
                Toda mudança de site passa por aprovação da agência antes de ir ao ar.
              </div>
            )}
          </div>

          {/* chat do módulo — só no modo edição */}
          {editando && isOwner && (
            <div className="card overflow-hidden h-[70vh]">
              <ChatPanel
                // troca de página/contexto força uma conversa nova (chave nova
                // => remonta o painel) — sem isso, o histórico de uma página
                // ficava misturado com o de outra
                key={editContext ? `${editContext.rascunho}::${editContext.pagina}` : "geral"}
                slug={slug}
                enabled={chatEnabled}
                onActivity={onAgentActivity}
                module="site"
                sessionScope={editContext ? `${editContext.rascunho}::${editContext.pagina}` : "geral"}
                suggestions={SUGESTOES}
                emptyHint={
                  editContext
                    ? `Descreva o que quer mudar na página "${editContext.titulo}" — o Claude edita só essa página.`
                    : "Peça um site novo, uma seção nova ou uma landing page — o Claude gera um rascunho usando a identidade visual e a memória deste cliente. Pode anexar imagens/briefing."
                }
                initialPrompt={initialPrompt}
                onInitialPromptSent={() => setInitialPrompt(undefined)}
                contextPrefix={editContext ? montarContextoPagina(editContext) : undefined}
                contextLabel={editContext ? `Editando: ${editContext.titulo} · rascunho ${editContext.rascunho}` : undefined}
              />
            </div>
          )}
        </div>
      )}

      {briefOpen && (
        <BriefingModal
          onClose={() => setBriefOpen(false)}
          onEnviar={(mensagem, tipoVersao) => {
            setBriefOpen(false);
            setEditContext(null);
            setInitialPrompt(mensagem);
            setTipoVersaoPendente(tipoVersao);
            setVersoesAntesDaGeracao(new Set((status?.versions ?? []).map((v) => v.name)));
          }}
        />
      )}
      </div>
    </div>
  );
}

function PaginaCard({
  pagina,
  src,
  isOwner,
  preparando,
  onAbrir,
  onEditar,
}: {
  pagina: SitePage;
  src: string;
  isOwner: boolean;
  preparando: boolean;
  onAbrir: () => void;
  onEditar: () => void;
}) {
  return (
    <div className="card overflow-hidden group">
      <button onClick={onAbrir} className="block w-full text-left">
        <div className="relative w-full overflow-hidden bg-white border-b border-app" style={{ height: 168 }}>
          <iframe
            src={src}
            title={pagina.titulo}
            sandbox="allow-scripts allow-same-origin"
            className="w-full border-0 pointer-events-none"
            style={{ height: 640 }}
            loading="lazy"
            tabIndex={-1}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition" />
        </div>
      </button>
      <div className="p-3 flex items-center gap-2">
        <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium truncate">{pagina.titulo}</p>
          <p className="text-[11px] text-muted truncate">{pagina.path ? `/${pagina.path}` : "/ · início"}</p>
        </button>
        {isOwner && (
          <button onClick={onEditar} disabled={preparando} className="btn-ghost px-2.5 py-1 text-[11px] shrink-0 disabled:opacity-60">
            {preparando ? "…" : "Editar"}
          </button>
        )}
      </div>
    </div>
  );
}

function Info2Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-app pb-2">
      <span className="text-muted text-xs uppercase tracking-wide">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ExternalSiteState({ url, chatEnabled }: { url: string; chatEnabled: boolean }) {
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return (
    <div className="self-center text-center max-w-sm">
      <EmptyState
        mood="speech"
        title="Site externo cadastrado"
        subtitle={url}
        actionLabel="Abrir site ↗"
        onAction={() => window.open(href, "_blank", "noreferrer")}
      />
      <p className="text-[11px] text-muted -mt-1 px-6">
        Esse site ainda não foi migrado pra dentro do Hub (sem rascunho/preview aqui).{" "}
        {chatEnabled && "Clique em Editar e peça no chat pra gerar uma versão nova baseada nele."}
      </p>
    </div>
  );
}

function SiteEmptyState({
  chatEnabled,
  isOwner,
  onNovaPagina,
}: {
  chatEnabled: boolean;
  isOwner: boolean;
  onNovaPagina: () => void;
}) {
  // Toda criação/edição de site é owner-only neste módulo (mesma regra do
  // resto da tela — botão "Nova página/LP", "Editar" no card, chat de edição
  // só aparecem pro operador). Mostrar esse CTA pro cliente comum abria um
  // fluxo que terminava sem efeito nenhum (o chat que cumpre a promessa nunca
  // renderiza pra quem não é owner) — bug real corrigido 30/07/2026.
  if (!isOwner) {
    return (
      <EmptyState
        mood="curious"
        title="Nenhum site ainda"
        subtitle="O primeiro site é preparado pela agência. Peça pelo chat da Visão Geral ou fale diretamente com a agência pra começar."
      />
    );
  }
  return (
    <EmptyState
      mood="curious"
      title="Nenhum site ainda"
      actionLabel={chatEnabled ? "Nova página/LP" : undefined}
      onAction={chatEnabled ? onNovaPagina : undefined}
      subtitle={
        chatEnabled
          ? "Clique em “Nova página/LP” acima, ou em Editar, pra pedir o primeiro rascunho de site — o Claude usa a identidade visual e a memória deste cliente (skills criar-site + frontend-design)."
          : "Ative o chat (ANTHROPIC_API_KEY) para gerar o primeiro rascunho de site por aqui."
      }
    />
  );
}

// ---- briefing rápido pra pedir seção/página/LP nova ---------------------------

function BriefingModal({
  onClose,
  onEnviar,
}: {
  onClose: () => void;
  onEnviar: (mensagem: string, tipoVersao: TipoVersao) => void;
}) {
  const [tipo, setTipo] = useState<(typeof TIPOS_BRIEFING)[number]["id"]>("lp");
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");

  function tipoAtual() {
    return TIPOS_BRIEFING.find((t) => t.id === tipo)!;
  }

  function montarMensagem(): string {
    const { label, tipoVersao } = tipoAtual();
    let msg = `Quero ${label.toLowerCase()}`;
    if (nome.trim()) msg += ` — tema/nome: ${nome.trim()}`;
    if (objetivo.trim()) msg += `. Objetivo: ${objetivo.trim()}`;
    msg += `. [tipo: "${tipoVersao}" — ${
      tipoVersao === "lp"
        ? "landing page avulsa, NÃO substitui nem entra no menu do site principal"
        : "isso é (ou vira parte d)o site principal, não uma LP avulsa"
    }]`;
    return msg + ".";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Nova página / landing page</h2>
            <p className="text-xs text-muted mt-0.5">Um briefing rápido — o Claude gera o rascunho no chat ao lado.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">O que é</label>
            <div className="flex flex-col gap-1.5">
              {TIPOS_BRIEFING.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border ${
                    tipo === t.id ? "border-accent text-accent bg-accent/10" : "border-app text-app hover:bg-app"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Tema / nome (ex: "Black Friday", "Curso de liderança")</label>
            <input className="input w-full px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Objetivo (opcional)</label>
            <textarea
              className="input w-full px-3 py-2 text-sm min-h-20 resize-none"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex: captar leads pro evento de dia 20, vender o curso X, apresentar o novo produto..."
            />
          </div>
          <p className="text-[11px] text-muted">
            Dica: depois de enviar, você pode anexar imagens/arquivos direto no chat (botão de clipe) —
            fotos do produto, referências, briefing em PDF etc.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-app">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button onClick={() => onEnviar(montarMensagem(), tipoAtual().tipoVersao)} className="btn-accent px-4 py-2 text-sm">
            Continuar no chat
          </button>
        </div>
      </div>
    </div>
  );
}
