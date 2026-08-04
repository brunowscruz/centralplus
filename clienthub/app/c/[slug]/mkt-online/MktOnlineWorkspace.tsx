"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, MapPin, Target, ArrowRight, Loader2, LayoutDashboard } from "lucide-react";
import GmbTab from "./tabs/GmbTab";
import AdsTab from "./tabs/AdsTab";
import AiAssistantFab from "./tabs/AiAssistantFab";
import SeoLocalTab from "./tabs/seo-local/SeoLocalTab";
import GoogleDashboardTab from "./tabs/GoogleDashboardTab";
import GmbHubTab from "./tabs/GmbHubTab";

type Tab = "visao-geral" | "gmb" | "ads-google" | "dashboard-google";

/** Dentro da aba "Google Meu Negócio", automático/manual continua com a
 * própria tela de escolha e o próprio "voltar pra escolha" — só a
 * navegação de TOPO (entre estas 4 abas) que virou barra fixa, sem
 * conceito de "voltar pro MKT Online" nenhum. */
type ModoGmb = "escolha" | "auto" | "manual";

interface PerfilGMB {
  titulo: string;
  categoria: string;
  descricao: string;
  endereco?: string;
  horario: string;
  atualizadoEm: string;
}
interface CampanhaAds {
  plataforma: "google" | "meta";
  titulo: string;
  tipo: "produto" | "servico" | "zero";
  descricaoNegocio: string;
  anuncios: { titulo: string; descricao: string }[];
  palavrasChave: string[];
  publico: string;
  orcamentoSugeridoDia?: number;
  criativo?: string;
  urlDestino?: string;
  status: "rascunho" | "aplicada" | "falhou";
  aplicacao?: { tentadoEm: string; ok: boolean; mensagem: string; googleCampaignId?: string; googleAdGroupId?: string };
  criadoEm: string;
  atualizadoEm: string;
}

const ABAS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "visao-geral", label: "Visão Geral", icon: LayoutGrid },
  { id: "gmb", label: "Google Meu Negócio", icon: MapPin },
  { id: "ads-google", label: "Google Ads", icon: Target },
  { id: "dashboard-google", label: "Painel Google", icon: LayoutDashboard },
];

export default function MktOnlineWorkspace({ slug, chatEnabled, isOwner }: { slug: string; chatEnabled: boolean; isOwner: boolean }) {
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [modoGmb, setModoGmb] = useState<ModoGmb>("escolha");
  const [perfil, setPerfil] = useState<PerfilGMB | null>(null);
  const [campanhasGoogle, setCampanhasGoogle] = useState<{ nome: string; campanha: CampanhaAds }[] | null>(null);
  const [campanhasMeta, setCampanhasMeta] = useState<{ nome: string; campanha: CampanhaAds }[] | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarResumo = useCallback(async () => {
    setLoading(true);
    try {
      const [rGmb, rGoogle, rMeta] = await Promise.all([
        fetch(`/api/tenants/${slug}/mkt-online/gmb`),
        fetch(`/api/tenants/${slug}/mkt-online/ads?plataforma=google`),
        fetch(`/api/tenants/${slug}/mkt-online/ads?plataforma=meta`),
      ]);
      const [dGmb, dGoogle, dMeta] = await Promise.all([rGmb.json(), rGoogle.json(), rMeta.json()]);
      setPerfil(dGmb.perfil ?? null);
      setCampanhasGoogle(dGoogle.campanhas ?? []);
      setCampanhasMeta(dMeta.campanhas ?? []);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const diasDesdeGmb = perfil ? Math.round((Date.now() - new Date(perfil.atualizadoEm).getTime()) / 86400000) : null;

  const contextoAtual =
    tab === "gmb"
      ? modoGmb === "auto"
        ? "O usuário está vendo a ficha do Google Meu Negócio (modo automático)."
        : modoGmb === "manual"
          ? "O usuário está na sub-área de Google Meu Negócio — modo manual (concorrência, diagnóstico, perfil de negócio)."
          : "O usuário está escolhendo entre gerar o Google Meu Negócio automaticamente ou manualmente."
      : tab === "ads-google"
        ? "O usuário está vendo as campanhas de Google Ads."
        : tab === "dashboard-google"
          ? "O usuário está no Painel Google (Ads, leads e avaliações)."
          : "O usuário está na visão geral do MKT Online.";

  return (
    <div className="flex gap-0 -mx-6 -my-6" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {/* sidebar do módulo — mesmo padrão do Financeiro/CRM (module-sidebar),
         em vez da barra de abas horizontal antiga: com 4 seções fixas, a
         vertical não quebra linha nem empurra os botões de ação pra baixo em
         tela estreita (validado com o operador via mockup comparativo). */}
      <aside className="module-sidebar">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-2 mb-2">MKT Online</p>
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setTab(a.id)} className={`module-sidebar-item ${tab === a.id ? "module-sidebar-item--active" : ""}`}>
            <a.icon size={15} />
            {a.label}
          </button>
        ))}
        <div className="flex-1" />
      </aside>

      <div className="flex-1 min-w-0 px-6 py-6">
      {tab === "visao-geral" && (
        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center">
              <Loader2 size={14} className="animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Google Meu Negócio</span>
                  </div>
                  <div className="stat-card__value" style={{ fontSize: "1.1rem" }}>
                    {!perfil ? "Não gerado" : diasDesdeGmb !== null && diasDesdeGmb > 30 ? "Desatualizado" : "Em dia"}
                  </div>
                  <span className="text-[11px] text-muted">
                    {perfil ? `atualizado há ${diasDesdeGmb} dia${diasDesdeGmb === 1 ? "" : "s"}` : "gere pela primeira vez"}
                  </span>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Google Ads</span>
                  </div>
                  <div className="stat-card__value font-mono">{campanhasGoogle?.length ?? 0}</div>
                  <span className="text-[11px] text-muted">campanha{campanhasGoogle?.length === 1 ? "" : "s"} pronta{campanhasGoogle?.length === 1 ? "" : "s"}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <button className="tool-card" style={{ ["--tool-color" as string]: "#4ade80" }} onClick={() => setTab("gmb")}>
                  <div className="tool-card__icon"><MapPin size={20} /></div>
                  <h3>Google Meu Negócio</h3>
                  <p>Gere automaticamente com a IA, ou monte passo a passo com ajuda da IA — perfil, concorrência, avaliações e mais.</p>
                  <div className="tool-card__foot">
                    <span className={`badge-pill ${!perfil || (diasDesdeGmb !== null && diasDesdeGmb > 30) ? "badge-pill--warn" : "badge-pill--good"}`}>
                      {!perfil ? "nunca gerado" : diasDesdeGmb !== null && diasDesdeGmb > 30 ? "precisa de atenção" : "em dia"}
                    </span>
                    <span className="tool-card__cta">Abrir <ArrowRight size={13} /></span>
                  </div>
                </button>

                <button className="tool-card" style={{ ["--tool-color" as string]: "var(--accent)" }} onClick={() => setTab("ads-google")}>
                  <div className="tool-card__icon"><Target size={20} /></div>
                  <h3>Google Ads</h3>
                  <p>Descreve o que quer vender e a IA monta a campanha inteira — título, anúncios, palavras-chave, público.</p>
                  <div className="tool-card__foot">
                    <span className="badge-pill badge-pill--accent">{campanhasGoogle?.length ?? 0} campanha{campanhasGoogle?.length === 1 ? "" : "s"}</span>
                    <span className="tool-card__cta">Abrir <ArrowRight size={13} /></span>
                  </div>
                </button>

                <button className="tool-card" onClick={() => setTab("dashboard-google")}>
                  <div className="tool-card__icon"><LayoutDashboard size={20} /></div>
                  <h3>Painel Google</h3>
                  <p>Ads, leads e avaliações num lugar só — dado real, direto da API do Google.</p>
                  <div className="tool-card__foot">
                    <span className="badge-pill badge-pill--good">dados reais</span>
                    <span className="tool-card__cta">Abrir <ArrowRight size={13} /></span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "gmb" && (
        <>
          {modoGmb === "escolha" && <GmbHubTab onEscolher={(modo) => setModoGmb(modo === "auto" ? "auto" : "manual")} />}
          {modoGmb === "auto" && (
            <>
              <button onClick={() => setModoGmb("escolha")} className="btn-ghost text-xs px-2.5 py-1.5 mb-3 inline-flex items-center gap-1">
                ← Voltar pro Google Meu Negócio
              </button>
              <GmbTab slug={slug} perfil={perfil} onAtualizado={carregarResumo} title="Google Meu Negócio — automático" />
            </>
          )}
          {modoGmb === "manual" && (
            <>
              <button onClick={() => setModoGmb("escolha")} className="btn-ghost text-xs px-2.5 py-1.5 mb-3 inline-flex items-center gap-1">
                ← Voltar pro Google Meu Negócio
              </button>
              <SeoLocalTab slug={slug} isOwner={isOwner} />
            </>
          )}
        </>
      )}
      {tab === "ads-google" && (
        <AdsTab slug={slug} plataforma="google" isOwner={isOwner} campanhas={campanhasGoogle} onAtualizado={carregarResumo} />
      )}
      {tab === "dashboard-google" && <GoogleDashboardTab slug={slug} />}
      </div>

      {chatEnabled && <AiAssistantFab slug={slug} contexto={contextoAtual} />}
    </div>
  );
}
