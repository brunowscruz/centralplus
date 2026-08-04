"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface MetricasDiarias {
  data: string;
  cliques: number;
  custoReais: number;
  impressoes: number;
}

/** Drill-down de desempenho de UMA campanha já aplicada de verdade — dado
 * real via GET .../ads/[campanha]/metricas (Google Ads API). */
export default function CampanhaMetricas({ slug, nome }: { slug: string; nome: string }) {
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<{ ok: boolean; mensagem: string; dados: MetricasDiarias[] } | null>(null);

  const carregar = useCallback(async () => {
    setDados(null);
    const res = await fetch(`/api/tenants/${slug}/mkt-online/ads/${encodeURIComponent(nome)}/metricas?dias=${dias}`);
    const data = await res.json();
    setDados(data);
  }, [slug, nome, dias]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totais = dados?.dados.reduce(
    (acc, d) => ({ cliques: acc.cliques + d.cliques, custo: acc.custo + d.custoReais, impressoes: acc.impressoes + d.impressoes }),
    { cliques: 0, custo: 0, impressoes: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-medium">Desempenho — {nome}</h3>
        <select className="input text-xs px-2.5 py-1.5" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      {!dados ? (
        <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center"><Loader2 size={14} className="animate-spin" /> Carregando…</div>
      ) : !dados.ok ? (
        <div className="card p-6 text-center">
          <p className="text-sm font-medium">Não deu pra buscar o desempenho</p>
          <p className="text-xs text-muted mt-1.5">{dados.mensagem}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Impressões</span></div>
              <div className="stat-card__value font-mono">{totais?.impressoes ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Cliques</span></div>
              <div className="stat-card__value font-mono">{totais?.cliques ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Custo</span></div>
              <div className="stat-card__value font-mono">R$ {(totais?.custo ?? 0).toLocaleString("pt-BR")}</div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">Cliques e custo por dia</h4></div>
            <div className="p-4">
              {dados.dados.length === 0 ? (
                <p className="text-xs text-muted py-10 text-center">Sem atividade registrada nesse período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={dados.dados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="data" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar yAxisId="left" dataKey="cliques" fill="var(--accent)" radius={[3, 3, 0, 0]} name="Cliques" />
                    <Line yAxisId="right" type="monotone" dataKey="custoReais" stroke="#22c55e" strokeWidth={2} dot={false} name="Custo (R$)" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
