"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeTokens } from "@/lib/theme";
import AgendadosTab from "./AgendadosTab";
import InstagramStudio, { type Post, type SubTab } from "./InstagramStudio";

const SUB_TABS: { id: SubTab | "agendados"; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "carrossel", label: "Carrossel" },
  { id: "story", label: "Story" },
  { id: "agendados", label: "Agendados" },
];

/** Deriva um "tipo" grosseiro a partir do nome da pasta (convenção da skill carrossel). */
function tipoDoPost(name: string): SubTab {
  if (name.startsWith("carrossel")) return "carrossel";
  if (name.startsWith("story")) return "story";
  return "post";
}

export default function GeradorTab({
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
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [subTab, setSubTab] = useState<SubTab | "agendados">("post");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tenants/${slug}/instagram`);
    if (!res.ok) return;
    const data: { posts: Post[] } = await res.json();
    setPosts(data.posts);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = (posts || []).filter((p) => subTab !== "agendados" && tipoDoPost(p.name) === subTab);

  function selectPost(name: string) {
    setSelected(name);
    setPublishError(null);
  }

  async function approve() {
    if (!selected) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/instagram/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: selected }),
      });
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
    } finally {
      setApproving(false);
    }
  }

  async function publicar() {
    if (!selected) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/tenants/${slug}/instagram/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || "falha ao publicar");
        await load();
        return;
      }
      await load();
    } finally {
      setPublishing(false);
    }
  }

  async function agendar() {
    if (!selected || !dataAgendamento) return;
    setAgendando(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/instagram/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: selected, dataHoraISO: new Date(dataAgendamento).toISOString() }),
      });
      if (res.ok) {
        setDataAgendamento("");
        await load();
      }
    } finally {
      setAgendando(false);
    }
  }

  async function cancelarAgendamento() {
    if (!selected) return;
    await fetch(`/api/tenants/${slug}/instagram/schedule`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post: selected }),
    });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              subTab === t.id ? "border-accent text-accent" : "border-app text-muted hover:text-app"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "agendados" && <AgendadosTab slug={slug} isOwner={isOwner} onAbrirPost={selectPost} />}

      {subTab !== "agendados" && (
        <InstagramStudio
          slug={slug}
          subTab={subTab}
          posts={filtered}
          selected={selected}
          onSelect={selectPost}
          chatEnabled={chatEnabled}
          isOwner={isOwner}
          tema={tema}
          onAtualizado={load}
          onSubTabChange={setSubTab}
          approving={approving}
          onApprove={approve}
          publishing={publishing}
          publishError={publishError}
          onPublish={publicar}
          agendando={agendando}
          dataAgendamento={dataAgendamento}
          setDataAgendamento={setDataAgendamento}
          onAgendar={agendar}
          onCancelarAgendamento={cancelarAgendamento}
        />
      )}
    </div>
  );
}
