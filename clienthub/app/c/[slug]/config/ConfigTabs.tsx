"use client";

import { useState } from "react";
import { ShieldCheck, Building2 } from "lucide-react";
import type { TenantSummary, MetaInstagramSummary, OpenAISummary, WordPressSummary, GoogleAdsSummary, ModuleOption, ContaClaudeOption } from "./types";
import PrivacidadeTab from "./PrivacidadeTab";
import HubConfigTab from "./HubConfigTab";

export default function ConfigTabs({
  slug,
  isOwner,
  tenant,
  metaInstagram,
  openai,
  wordpress,
  googleAds,
  moduleOptions,
  contasClaude,
}: {
  slug: string;
  isOwner: boolean;
  tenant: TenantSummary;
  metaInstagram: MetaInstagramSummary | null;
  openai: OpenAISummary | null;
  wordpress: WordPressSummary | null;
  googleAds: GoogleAdsSummary | null;
  moduleOptions: ModuleOption[];
  contasClaude: ContaClaudeOption[];
}) {
  const [tab, setTab] = useState<"privacidade" | "hub">("privacidade");

  return (
    <div>
      <div className="flex gap-1.5">
        <button onClick={() => setTab("privacidade")} className={`ws-tab ${tab === "privacidade" ? "ws-tab--active" : ""}`}>
          <Building2 size={14} /> Privacidade & Perfil
        </button>
        {isOwner && (
          <button onClick={() => setTab("hub")} className={`ws-tab ${tab === "hub" ? "ws-tab--active" : ""}`}>
            <ShieldCheck size={14} /> Configurações do Hub
          </button>
        )}
      </div>

      <div className="mt-5">
        {tab === "privacidade" && <PrivacidadeTab slug={slug} isOwner={isOwner} tenant={tenant} />}
        {tab === "hub" && isOwner && (
          <HubConfigTab
            slug={slug}
            tenant={tenant}
            metaInstagram={metaInstagram}
            openai={openai}
            wordpress={wordpress}
            googleAds={googleAds}
            moduleOptions={moduleOptions}
            contasClaude={contasClaude}
          />
        )}
      </div>
    </div>
  );
}
