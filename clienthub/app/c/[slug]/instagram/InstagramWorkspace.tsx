"use client";

import { useState } from "react";
import { UserCircle2, Sparkles, BarChart3 } from "lucide-react";
import type { ThemeTokens } from "@/lib/theme";
import PerfilTab from "./tabs/PerfilTab";
import GeradorTab from "./tabs/GeradorTab";
import MetricasTab from "./tabs/MetricasTab";

/**
 * Módulo Instagram (Fase 5) — 3 abas, igual à referência:
 * Perfil (dados reais via Graph API) | Gerador de conteúdo (galeria da skill
 * carrossel + chat) | Métricas (instantâneo real; série histórica ainda não
 * existe nesta instalação — mostrado honestamente, não fabricado).
 */

type Tab = "perfil" | "gerador" | "metricas";

export default function InstagramWorkspace({
  slug,
  chatEnabled,
  isOwner,
  tema,
}: {
  slug: string;
  chatEnabled: boolean;
  isOwner: boolean;
  tema: ThemeTokens;
}) {
  const [tab, setTab] = useState<Tab>("perfil");

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <TabButton active={tab === "perfil"} onClick={() => setTab("perfil")} icon={UserCircle2} label="Perfil" />
        <TabButton active={tab === "gerador"} onClick={() => setTab("gerador")} icon={Sparkles} label="Gerador de conteúdo" />
        <TabButton active={tab === "metricas"} onClick={() => setTab("metricas")} icon={BarChart3} label="Métricas" />
      </div>

      {tab === "perfil" && <PerfilTab slug={slug} />}
      {tab === "gerador" && <GeradorTab slug={slug} chatEnabled={chatEnabled} isOwner={isOwner} tema={tema} />}
      {tab === "metricas" && <MetricasTab slug={slug} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserCircle2;
  label: string;
}) {
  return (
    <button onClick={onClick} className={`ws-tab ${active ? "ws-tab--active" : ""}`}>
      <Icon size={14} />
      {label}
    </button>
  );
}
