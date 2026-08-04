"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, Grid3x3, TrendingUp } from "lucide-react";

interface Profile {
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}
interface ApiResult {
  connected: boolean;
  reason?: string;
  profile?: Profile;
}

export default function MetricasTab({ slug }: { slug: string }) {
  const [data, setData] = useState<ApiResult | null>(null);

  useEffect(() => {
    fetch(`/api/tenants/${slug}/instagram/profile`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ connected: false }));
  }, [slug]);

  const connected = data?.connected && data.profile;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Users} label="Seguidores (agora)" value={connected ? data!.profile!.followers_count : undefined} />
        <MetricCard icon={Grid3x3} label="Publicações" value={connected ? data!.profile!.media_count : undefined} />
        <MetricCard icon={TrendingUp} label="Seguindo" value={connected ? data!.profile!.follows_count : undefined} />
      </div>

      <div className="card p-8 text-center">
        <BarChart3 size={22} className="mx-auto text-muted" />
        <p className="text-sm font-medium mt-3">Sem série histórica ainda</p>
        <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto">
          {data && !data.connected
            ? data.reason || "Conecte a API do Instagram em Configurações para começar a coletar métricas."
            : "Engajamento por mês, volume de posts e top posts por curtidas aparecem aqui assim que houver histórico coletado com um token válido — hoje só o instantâneo do perfil está disponível."}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="icon-badge h-7 w-7">
          <Icon size={14} />
        </span>
      </div>
      <span className="stat-card__value">{value ?? "—"}</span>
    </div>
  );
}
