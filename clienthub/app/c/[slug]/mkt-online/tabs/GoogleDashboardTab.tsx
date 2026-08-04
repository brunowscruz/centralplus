"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, TrendingUp, Users, Target as TargetIcon, MapPin, RefreshCw } from "lucide-react";
import AjudaBotao from "./AjudaBotao";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MetricasCampanha {
  id: string;
  nome: string;
  status: string;
  cliques: number;
  impressoes: number;
  custoReais: number;
  conversoes: number;
}
interface MetricasPalavraChave {
  texto: string;
  impressoes: number;
  cliques: number;
}
interface MetricasDiarias {
  data: string;
  cliques: number;
  custoReais: number;
  impressoes: number;
}
interface ReviewRecente {
  autor: string;
  texto: string;
  nota: number;
  data: string;
  respondida: boolean;
}
interface DashboardData {
  periodo: { dias: number; desde: string; ate: string };
  googleAds: {
    configurado: boolean;
    customerId: string | null;
    campanhas: { ok: boolean; mensagem: string; dados: MetricasCampanha[] };
    palavrasChave: { ok: boolean; mensagem: string; dados: MetricasPalavraChave[] };
    diarias: { ok: boolean; mensagem: string; dados: MetricasDiarias[] };
  };
  leads: {
    totalCrm: number;
    conversasNovasWhatsapp: number;
    porOrigem: Record<string, number>;
  };
  avaliacoes: {
    configurado: boolean;
    notaMedia: number | null;
    total: number;
    recentes: ReviewRecente[];
  };
  buscaOrganica: { configurado: boolean };
}

const CORES_ORIGEM = ["var(--accent)", "#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];

export default function GoogleDashboardTab({ slug }: { slug: string }) {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [dias, setDias] = useState(30);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tenants/${slug}/mkt-online/google-dashboard?dias=${dias}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao carregar o painel.");
        return;
      }
      setDados(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAtualizando(false);
    }
  }, [slug, dias]);

  // Os dados de Ads mudam do lado de fora (Google processa aos poucos, não
  // é instantâneo depois de ativar campanha) — sem isso, quem fica com o
  // painel aberto só via número novo depois de um F5. Poll leve, mesma
  // ideia do Funil do CRM.
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

  if (erro && !dados) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium">Não deu pra carregar o painel</p>
        <p className="text-xs text-muted mt-1.5">{erro}</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted py-8 justify-center">
        <Loader2 size={14} className="animate-spin" /> Carregando…
      </div>
    );
  }

  const totalLeads = dados.leads.totalCrm + dados.leads.conversasNovasWhatsapp;
  const custoTotal = dados.googleAds.campanhas.dados.reduce((s, c) => s + c.custoReais, 0);
  const cpl = totalLeads > 0 ? custoTotal / totalLeads : null;

  const origemDados = Object.entries(dados.leads.porOrigem).map(([nome, valor]) => ({ nome, valor }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Google — Ads, leads e avaliações</h2>
          <p className="text-xs text-muted mt-1">Tudo que já dá pra medir com dado real, num lugar só.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select className="input text-xs px-2.5 py-1.5" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button onClick={carregar} disabled={atualizando} className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5 disabled:opacity-60" title={erro || "Atualizar agora"}>
            <RefreshCw size={13} className={atualizando ? "animate-spin" : ""} /> {atualizando ? "Atualizando…" : erro ? "Falhou, tentar de novo" : "Atualizar"}
          </button>
          <AjudaBotao
            titulo="Painel Google — de onde vem cada número"
            passos={[
              "Ads (investimento, custo por lead, campanhas): só aparece com dado real depois que o Google Ads do cliente estiver configurado em Configurações → aba do Hub → Google Ads.",
              "Leads: soma automática do CRM e das conversas novas de WhatsApp — não precisa configurar nada extra, já usa o que o cliente tem no Hub.",
              "Avaliações (nota e comentários): puxa direto do Google, buscando o negócio pelo nome — configurado na aba de Reviews do Google Meu Negócio (modo manual).",
              "Se alguma dessas partes aparecer como \"não configurado\", é porque falta um desses passos — o painel nunca inventa número, só mostra o que é real.",
            ]}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="stat-card__top"><span className="stat-card__label">Leads recebidos</span></div>
          <div className="stat-card__value font-mono">{totalLeads}</div>
          <span className="text-[11px] text-muted">{dados.leads.totalCrm} no CRM · {dados.leads.conversasNovasWhatsapp} conversas novas de WhatsApp</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__top"><span className="stat-card__label">Investimento — Google Ads</span></div>
          <div className="stat-card__value font-mono">R$ {custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
          <span className="text-[11px] text-muted">gasto total no período</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__top"><span className="stat-card__label">Custo por lead</span></div>
          <div className="stat-card__value font-mono">{cpl !== null ? `R$ ${cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</div>
          <span className="text-[11px] text-muted">{cpl === null ? "sem leads no período" : "investimento ÷ leads"}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card__top"><span className="stat-card__label">Nota no Google</span></div>
          <div className="stat-card__value font-mono flex items-center gap-1.5">
            {dados.avaliacoes.notaMedia ?? "—"} {dados.avaliacoes.notaMedia !== null && <Star size={16} className="fill-current" style={{ color: "var(--accent)" }} />}
          </div>
          <span className="text-[11px] text-muted">
            {dados.avaliacoes.total > 0 ? `${dados.avaliacoes.total} avaliação${dados.avaliacoes.total === 1 ? "" : "ões"} (últimas sincronizadas)` : "sem avaliações sincronizadas ainda"}
          </span>
        </div>
      </div>

      {/* Google Ads */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5"><TargetIcon size={13} /> Google Ads</h3>
        {!dados.googleAds.configurado ? (
          <div className="card p-6 text-center">
            <p className="text-sm font-medium">Sem conta de Google Ads vinculada</p>
            <p className="text-xs text-muted mt-1.5">Configure em Configurações → Google Ads pra este dashboard mostrar dado real.</p>
          </div>
        ) : !dados.googleAds.campanhas.ok ? (
          <div className="card p-6 text-center">
            <p className="text-sm font-medium">Não deu pra buscar as métricas</p>
            <p className="text-xs text-muted mt-1.5">{dados.googleAds.campanhas.mensagem}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">Cliques e custo por dia</h4></div>
              <div className="p-4">
                {dados.googleAds.diarias.dados.length === 0 ? (
                  <p className="text-xs text-muted py-10 text-center">Sem atividade registrada nesse período (campanhas pausadas ou sem cliques/impressões).</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={dados.googleAds.diarias.dados}>
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

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">Desempenho por campanha</h4></div>
              <div className="p-4 overflow-x-auto">
                {dados.googleAds.campanhas.dados.length === 0 ? (
                  <p className="text-xs text-muted py-10 text-center">Nenhuma campanha encontrada nessa conta.</p>
                ) : (
                  <table className="table-clean w-full text-xs">
                    <thead>
                      <tr><th className="text-left">Campanha</th><th className="text-right">Cliques</th><th className="text-right">Gasto</th><th className="text-right">Status</th></tr>
                    </thead>
                    <tbody>
                      {dados.googleAds.campanhas.dados.map((c) => (
                        <tr key={c.id}>
                          <td className="max-w-[160px] truncate" title={c.nome}>{c.nome}</td>
                          <td className="text-right font-mono">{c.cliques}</td>
                          <td className="text-right font-mono">R$ {c.custoReais.toLocaleString("pt-BR")}</td>
                          <td className="text-right">
                            <span className={`badge-pill ${c.status === "ENABLED" ? "badge-pill--good" : ""}`}>{c.status === "ENABLED" ? "ativa" : c.status === "PAUSED" ? "pausada" : c.status.toLowerCase()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {dados.googleAds.configurado && dados.googleAds.palavrasChave.ok && dados.googleAds.palavrasChave.dados.length > 0 && (
          <div className="card overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">Palavras-chave — mais impressões</h4></div>
            <div className="p-4 overflow-x-auto">
              <table className="table-clean w-full text-xs">
                <thead><tr><th className="text-left">Busca</th><th className="text-right">Impressões</th><th className="text-right">Cliques</th></tr></thead>
                <tbody>
                  {dados.googleAds.palavrasChave.dados.map((k, i) => (
                    <tr key={i}><td>{k.texto}</td><td className="text-right font-mono">{k.impressoes}</td><td className="text-right font-mono">{k.cliques}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Leads por origem */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users size={13} /> Leads</h3>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">De onde vieram os leads</h4></div>
          <div className="p-4">
            {origemDados.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">Nenhum lead com origem registrada no CRM nesse período ainda.</p>
            ) : (
              <div className="flex items-center gap-6 flex-wrap">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={origemDados} dataKey="valor" nameKey="nome" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {origemDados.map((_, i) => <Cell key={i} fill={CORES_ORIGEM[i % CORES_ORIGEM.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs">
                  {origemDados.map((o, i) => (
                    <div key={o.nome} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CORES_ORIGEM[i % CORES_ORIGEM.length] }} />
                      {o.nome} <span className="text-muted">— {o.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Busca orgânica — honesto sobre não estar configurado ainda */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin size={13} /> Google orgânico — Maps e busca</h3>
        <div className="card p-6 text-center">
          <p className="text-sm font-medium">Ainda não configurado nesta instalação</p>
          <p className="text-xs text-muted mt-1.5 max-w-md mx-auto">
            Visualizações no Google Maps e busca dependem da Google Business Profile Performance API — precisa de um pedido de acesso
            separado ao Google (diferente do Google Ads). Assim que aprovado e configurado, esse bloco passa a mostrar dado real aqui.
          </p>
        </div>
      </div>

      {/* Avaliações */}
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Avaliações no Google</h3>
        {dados.avaliacoes.total === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm font-medium">Nenhuma avaliação sincronizada ainda</p>
            <p className="text-xs text-muted mt-1.5">Sincronize em SEO Local → Perfil de negócio, ou confirme se o Place ID está certo.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-app"><h4 className="text-sm font-medium">Últimas avaliações (Google Places — máximo 5 mais recentes)</h4></div>
            <div className="divide-y divide-[var(--border)]">
              {dados.avaliacoes.recentes.map((r, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.autor}</span>
                    <span className="text-xs font-mono flex items-center gap-1">{r.nota} <Star size={11} className="fill-current" style={{ color: "var(--accent)" }} /></span>
                  </div>
                  <p className="text-xs text-muted mt-1">{r.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
