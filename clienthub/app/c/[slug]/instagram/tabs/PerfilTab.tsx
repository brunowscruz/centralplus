"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Users, Grid3x3, Link2 } from "lucide-react";

interface Profile {
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
}

interface ApiResult {
  connected: boolean;
  reason?: string;
  profile?: Profile;
}

export default function PerfilTab({ slug }: { slug: string }) {
  const [data, setData] = useState<ApiResult | null>(null);

  useEffect(() => {
    fetch(`/api/tenants/${slug}/instagram/profile`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ connected: false, reason: "Falha ao consultar a API." }));
  }, [slug]);

  if (!data) {
    return <div className="card p-8 text-center text-sm text-muted">Carregando perfil…</div>;
  }

  if (!data.connected || !data.profile) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <AlertTriangle size={22} className="mx-auto text-accent" />
        <p className="text-sm font-medium mt-3">Instagram não conectado</p>
        <p className="text-xs text-muted mt-1.5">
          {data.reason || "Configure o token da API do Instagram para ver o perfil aqui."}
        </p>
        <a href={`/c/${slug}/config`} className="btn-accent inline-block mt-4 px-4 py-2 text-xs">
          Ir para Configurações
        </a>
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        {p.profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.profile_picture_url} alt={p.username} className="h-20 w-20 rounded-full object-cover border border-app" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-app border border-app grid place-items-center text-muted">
            <Users size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">@{p.username || "—"}</p>
            <span className="badge-pill badge-pill--good">API conectada</span>
          </div>
          {p.name && <p className="text-sm text-muted mt-0.5">{p.name}</p>}
          {p.biography && <p className="text-sm mt-2 whitespace-pre-wrap">{p.biography}</p>}
          {p.website && (
            <a href={p.website} target="_blank" rel="noreferrer" className="text-xs text-accent inline-flex items-center gap-1 mt-1.5">
              <Link2 size={12} /> {p.website}
            </a>
          )}

          <div className="flex gap-6 mt-4">
            <Stat label="Publicações" value={p.media_count} icon={Grid3x3} />
            <Stat label="Seguidores" value={p.followers_count} icon={Users} />
            <Stat label="Seguindo" value={p.follows_count} icon={Users} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof Users }) {
  return (
    <div>
      <p className="text-lg font-semibold flex items-center gap-1.5">
        <Icon size={14} className="text-muted" />
        {value ?? "—"}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
