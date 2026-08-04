"use client";

import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Filter,
  Handshake,
  MessageCircle,
  CheckSquare,
  Users,
  StickyNote,
  Phone,
  Plus,
  X,
  Trash2,
  TrendingUp,
  DollarSign,
  Target,
  MoreHorizontal,
  ChevronDown,
  Plug,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Zap,
  Share2,
  Send,
  History,
  Tag,
  UserRound,
  Pencil,
  Link2,
  MousePointerClick,
} from "lucide-react";
import type { CrmData, CrmLead, CrmFase, CrmTarefa, CrmAnotacao, CrmLigacao, LinkRastreio } from "@/lib/crm";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import EmptyState from "@/components/EmptyState";
import FilterChip from "@/components/FilterChip";
import BulkActionBar from "@/components/BulkActionBar";

// Duplicado aqui (não importado de lib/crm) porque este é Client Component:
// importar um valor de lib/crm puxaria node:crypto pro bundle do navegador.
const SUB_STATUS_PERDIDO = [
  "Retomar contato depois",
  "Não passou no crédito — checar mais pra frente",
  "Fechou com concorrente",
  "Sem resposta",
];

type View = "inicio" | "funil" | "negocios" | "whatsapp" | "tarefas" | "leads" | "anotacoes" | "ligacoes" | "integracoes";

const NAV_PRINCIPAL: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: "inicio", label: "Início", icon: LayoutGrid },
  { id: "funil", label: "Funil", icon: Filter },
  { id: "negocios", label: "Negócios", icon: Handshake },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
];

const NAV_MAIS: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: "leads", label: "Leads", icon: Users },
  { id: "anotacoes", label: "Anotações", icon: StickyNote },
  { id: "ligacoes", label: "Ligações", icon: Phone },
];

const TITULOS: Record<View, string> = {
  inicio: "Painel",
  funil: "Funil",
  negocios: "Negócios",
  whatsapp: "WhatsApp",
  tarefas: "Tarefas",
  leads: "Leads",
  anotacoes: "Anotações",
  ligacoes: "Ligações",
  integracoes: "Integrações",
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PALETA = ["#6366f1", "#0891b2", "#ca8a04", "#c026d3", "#16a34a", "#dc2626", "#f97316", "#0ea5e9"];

export default function CrmWorkspace({ slug, inicial, financeiroAtivo }: { slug: string; inicial: CrmData; financeiroAtivo: boolean }) {
  const [data, setData] = useState<CrmData>(inicial);
  const [view, setView] = useState<View>("inicio");
  const [maisAberto, setMaisAberto] = useState(true);
  const [novoLead, setNovoLead] = useState(false);
  const [leadAberto, setLeadAberto] = useState<CrmLead | null>(null);
  const [filtroFaseLeads, setFiltroFaseLeads] = useState<string>("");
  const [infoAberto, setInfoAberto] = useState<"agente" | null>(null);
  const [automacoesAberto, setAutomacoesAberto] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  async function acao(payload: Record<string, unknown>) {
    const res = await fetch(`/api/tenants/${slug}/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) setData(await res.json());
    return res.ok;
  }

  async function recarregar() {
    setRecarregando(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/crm`);
      if (res.ok) setData(await res.json());
    } finally {
      setRecarregando(false);
    }
  }

  // O funil pode mudar por fora do navegador aberto (lead novo chegando pelo
  // WhatsApp, agente de IA movendo de etapa, automação) — sem isso, quem
  // fica com a tela do Funil aberta só via as mudanças depois de dar F5.
  // Atualiza sempre que entra na aba e, enquanto estiver nela, faz um poll
  // leve — mesma ideia do poll de 4s do ChatThread, só que mais espaçado
  // porque o funil muda com bem menos frequência que uma conversa.
  useEffect(() => {
    if (view !== "funil") return;
    recarregar();
    const t = setInterval(recarregar, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, slug]);

  return (
    <div className="flex gap-0 -mx-6 -my-6 relative" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {/* sidebar do módulo */}
      <aside className="module-sidebar">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-2 mb-2">CRM</p>
        {NAV_PRINCIPAL.map((s) => (
          <NavItem key={s.id} s={s} ativo={view === s.id} onClick={() => setView(s.id)} />
        ))}

        <button
          onClick={() => setMaisAberto((v) => !v)}
          className="module-sidebar-item justify-between mt-1"
        >
          <span className="flex items-center gap-2.5">
            <MoreHorizontal size={15} /> Mais
          </span>
          <ChevronDown size={13} className="transition-transform" style={{ transform: maisAberto ? "rotate(180deg)" : "none" }} />
        </button>
        {maisAberto && (
          <div className="flex flex-col gap-0.5 pl-1">
            {NAV_MAIS.map((s) => (
              <NavItem key={s.id} s={s} ativo={view === s.id} onClick={() => setView(s.id)} />
            ))}
          </div>
        )}

        <div className="flex-1" />
        <NavItem s={{ id: "integracoes", label: "Integrações", icon: Plug }} ativo={view === "integracoes"} onClick={() => setView("integracoes")} />
      </aside>

      {/* conteúdo */}
      <div className="flex-1 min-w-0 px-6 py-6 space-y-5">
        {view !== "funil" && view !== "leads" && view !== "integracoes" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{TITULOS[view]}</h1>
            </div>
            <button onClick={() => setNovoLead(true)} className="btn-accent px-4 py-2 text-sm inline-flex items-center gap-1.5">
              <Plus size={15} /> Novo lead
            </button>
          </div>
        )}

        {view === "inicio" && <Painel data={data} />}
        {view === "funil" && (
          <Funil
            slug={slug}
            data={data}
            acao={acao}
            onAbrir={setLeadAberto}
            onVerNegocios={(faseId) => {
              setFiltroFaseLeads(faseId);
              setView("leads");
            }}
            onInfo={setInfoAberto}
            onAutomacoes={() => setAutomacoesAberto(true)}
            onAtualizar={recarregar}
            atualizando={recarregando}
          />
        )}
        {view === "negocios" && <Negocios data={data} onAbrir={setLeadAberto} />}
        {view === "whatsapp" && <WhatsApp slug={slug} data={data} onImportado={recarregar} />}
        {view === "tarefas" && <Tarefas data={data} acao={acao} onAbrir={setLeadAberto} />}
        {view === "leads" && (
          <Leads
            data={data}
            acao={acao}
            onAbrir={setLeadAberto}
            onNovo={() => setNovoLead(true)}
            faseInicial={filtroFaseLeads}
          />
        )}
        {view === "anotacoes" && <Anotacoes data={data} acao={acao} />}
        {view === "ligacoes" && <Ligacoes data={data} acao={acao} />}
        {view === "integracoes" && <Integracoes slug={slug} data={data} acao={acao} onLeadTeste={recarregar} onAtualizado={setData} />}
      </div>

      {novoLead && <NovoLeadModal data={data} acao={acao} onClose={() => setNovoLead(false)} />}
      {leadAberto && (
        <LeadModal
          slug={slug}
          data={data}
          lead={data.leads.find((l) => l.id === leadAberto.id) || leadAberto}
          acao={acao}
          onClose={() => setLeadAberto(null)}
          financeiroAtivo={financeiroAtivo}
        />
      )}
      {infoAberto && (
        <Modal titulo="Agentes de IA no funil" onClose={() => setInfoAberto(null)}>
          <div className="flex items-start gap-3 text-sm">
            <Sparkles size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-muted leading-relaxed">
              O agente de IA responde sozinho no WhatsApp usando a personalidade que você configurar — ele
              lê o histórico da conversa, decide o que responder, pode mover o lead de etapa e pedir
              atendimento humano quando não souber ajudar. Configure em <strong className="text-app">WhatsApp → Agente de IA</strong>{" "}
              (ícone <Sparkles size={11} className="inline text-accent" /> aparece nas etapas onde ele está ativo). É diferente da
              automação por etapa (botão Ação), que manda sempre a mesma mensagem programada — o agente
              conversa de verdade, etapa por etapa.
            </p>
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t border-app">
            <button onClick={() => setInfoAberto(null)} className="btn-ghost px-4 py-2 text-sm">Entendi</button>
          </div>
        </Modal>
      )}
      {automacoesAberto && <AutomacoesModal data={data} acao={acao} onClose={() => setAutomacoesAberto(false)} />}
    </div>
  );
}

function NavItem({ s, ativo, onClick }: { s: { id: View; label: string; icon: typeof LayoutGrid }; ativo: boolean; onClick: () => void }) {
  const Icon = s.icon;
  return (
    <button onClick={onClick} className={`module-sidebar-item ${ativo ? "module-sidebar-item--active" : ""}`}>
      <Icon size={15} />
      {s.label}
    </button>
  );
}

// ---- Painel (dashboard / Início) --------------------------------------------

function Painel({ data }: { data: CrmData }) {
  const abertos = data.leads.filter((l) => {
    const f = data.fases.find((x) => x.id === l.faseId);
    return f && f.tipo === "normal";
  });
  const ganhos = data.leads.filter((l) => data.fases.find((x) => x.id === l.faseId)?.tipo === "ganho");
  const valorPipe = abertos.reduce((s, l) => s + (l.valor || 0), 0);
  const valorGanho = ganhos.reduce((s, l) => s + (l.valor || 0), 0);
  const fechadosTotal = data.leads.filter((l) => data.fases.find((x) => x.id === l.faseId)?.tipo !== "normal").length;
  const taxa = fechadosTotal ? Math.round((ganhos.length / fechadosTotal) * 100) : 0;

  const origemMap = new Map<string, number>();
  for (const l of data.leads) {
    const key = l.origem || "Sem origem";
    origemMap.set(key, (origemMap.get(key) || 0) + 1);
  }
  const origemSegmentos = Array.from(origemMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: PALETA[i % PALETA.length] }));

  const faseSegmentos = data.fases.map((f) => ({
    label: f.nome,
    value: data.leads.filter((l) => l.faseId === f.id).length,
    color: f.cor,
  }));

  const meses: { chave: string; label: string; n: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ chave, label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), n: 0 });
  }
  for (const l of data.leads) {
    const chave = l.criadoEm.slice(0, 7);
    const m = meses.find((x) => x.chave === chave);
    if (m) m.n++;
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.n));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leads em aberto" value={String(abertos.length)} icon={Users} />
        <Stat label="Em negociação (R$)" value={BRL.format(valorPipe)} icon={TrendingUp} />
        <Stat label="Ganhos (R$)" value={BRL.format(valorGanho)} icon={DollarSign} tone="good" />
        <Stat label="Taxa de conversão" value={`${taxa}%`} icon={Target} tone={taxa >= 50 ? "good" : "warn"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Leads por origem</h2>
          {data.leads.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">Sem leads ainda.</p>
          ) : (
            <Donut segmentos={origemSegmentos} />
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Negócios por etapa</h2>
          {data.leads.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">Sem leads ainda.</p>
          ) : (
            <Donut segmentos={faseSegmentos.filter((s) => s.value > 0)} />
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4">Tendência de leads (últimos 6 meses)</h2>
        <div className="flex items-end gap-3 h-28">
          {meses.map((m) => (
            <div key={m.chave} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-muted">{m.n || ""}</span>
              <div
                className="w-full rounded-md bg-accent"
                style={{ height: `${Math.max(4, (m.n / maxMes) * 100)}%`, opacity: m.n ? 1 : 0.15 }}
              />
              <span className="text-[10px] text-muted capitalize">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {data.leads.length === 0 && (
        <div className="card p-8 text-center">
          <Users size={22} className="mx-auto text-muted" />
          <p className="text-sm font-medium mt-3">Nenhum lead ainda</p>
          <p className="text-xs text-muted mt-1">
            Toda conversa iniciada pelo WhatsApp vira lead automaticamente (quando a integração estiver
            ligada); por ora, cadastre em <strong className="text-app">+ Novo lead</strong> ou conecte o
            formulário do seu site em <strong className="text-app">Integrações</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function Donut({ segmentos }: { segmentos: { label: string; value: number; color: string }[] }) {
  const total = segmentos.reduce((s, x) => s + x.value, 0);
  if (!total) return <p className="text-xs text-muted text-center py-6">Sem dados suficientes.</p>;
  let acc = 0;
  const stops = segmentos
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-[18%] rounded-full bg-card grid place-items-center">
          <span className="text-sm font-bold">{total}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs flex-1 min-w-0">
        {segmentos.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-muted truncate">{s.label}</span>
            <span className="font-medium ml-auto shrink-0">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "#4ade80" : tone === "warn" ? "var(--accent)" : undefined;
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="icon-badge h-7 w-7" style={color ? { color } : undefined}>
          <Icon size={14} />
        </span>
      </div>
      <span className="text-xl font-bold" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// ---- Funil (kanban) ---------------------------------------------------------

function Funil({
  slug,
  data,
  acao,
  onAbrir,
  onVerNegocios,
  onInfo,
  onAutomacoes,
  onAtualizar,
  atualizando,
}: {
  slug: string;
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onAbrir: (l: CrmLead) => void;
  onVerNegocios: (faseId: string) => void;
  onInfo: (v: "agente") => void;
  onAutomacoes: () => void;
  onAtualizar: () => void;
  atualizando: boolean;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [novaEtapa, setNovaEtapa] = useState(false);
  const [nomeEtapa, setNomeEtapa] = useState("");
  const [faseEditando, setFaseEditando] = useState<CrmFase | null>(null);
  // "todas" | Set de faseIds | null (agente desligado/não configurado) — busca
  // leve e independente, só pro ícone de "agente de IA ativo" nas etapas.
  const [agenteFases, setAgenteFases] = useState<"todas" | Set<string> | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tenants/${slug}/whatsapp`);
      if (!res.ok) return;
      const body = await res.json();
      const cfg = body.whatsapp?.agenteIA;
      if (!cfg?.ativo) return setAgenteFases(null);
      setAgenteFases(cfg.faseIds?.length ? new Set<string>(cfg.faseIds) : "todas");
    })();
  }, [slug]);

  async function soltar(faseId: string) {
    if (!arrastando) return;
    await acao({ acao: "lead.editar", id: arrastando, faseId });
    setArrastando(null);
  }

  async function criarEtapa() {
    if (!nomeEtapa.trim()) return;
    const ok = await acao({ acao: "fase.criar", nome: nomeEtapa, cor: PALETA[data.fases.length % PALETA.length] });
    if (ok) {
      setNomeEtapa("");
      setNovaEtapa(false);
    }
  }

  const abertos = data.leads.filter((l) => data.fases.find((f) => f.id === l.faseId)?.tipo === "normal");
  const totalAberto = abertos.reduce((s, l) => s + (l.valor || 0), 0);
  const ganhos = data.leads.filter((l) => data.fases.find((f) => f.id === l.faseId)?.tipo === "ganho").length;
  const fechados = data.leads.filter((l) => data.fases.find((f) => f.id === l.faseId)?.tipo !== "normal").length;
  const taxa = fechados ? Math.round((ganhos / fechados) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Funil</h1>
          <p className="text-xs text-muted mt-0.5">
            {BRL.format(totalAberto)} em aberto · {abertos.length} negócios · {taxa}% taxa de ganho
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={onAtualizar} disabled={atualizando} className="ws-tab disabled:opacity-60" title="Atualizar funil">
            <RefreshCw size={13} className={atualizando ? "animate-spin" : ""} /> {atualizando ? "Atualizando…" : "Atualizar"}
          </button>
          <button onClick={onAutomacoes} className="ws-tab">
            <Zap size={13} /> Ação
          </button>
          <button onClick={() => onInfo("agente")} className="ws-tab">
            <Sparkles size={13} /> Agente
          </button>
          <button onClick={() => setNovaEtapa(true)} className="ws-tab">
            <Plus size={13} /> Etapa
          </button>
        </div>
      </div>

      {novaEtapa && (
        <div className="card p-3 flex gap-2 items-center">
          <input
            className="input flex-1 px-3 py-2 text-sm"
            placeholder="Nome da nova etapa"
            value={nomeEtapa}
            onChange={(e) => setNomeEtapa(e.target.value)}
            autoFocus
          />
          <button onClick={criarEtapa} className="btn-accent px-4 py-2 text-sm">Criar</button>
          <button onClick={() => setNovaEtapa(false)} className="btn-ghost px-3 py-2 text-sm">Cancelar</button>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {data.fases.map((f) => {
            const leads = data.leads.filter((l) => l.faseId === f.id);
            const total = leads.reduce((s, l) => s + (l.valor || 0), 0);
            return (
              <div
                key={f.id}
                className="w-64 shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltar(f.id)}
              >
                <div className="card p-3 mb-2" style={{ borderTopWidth: 3, borderTopColor: f.cor }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.nome}</span>
                    {f.automacaoWhatsapp?.ativo && (
                      <Zap size={11} className="text-accent shrink-0" />
                    )}
                    {(agenteFases === "todas" || (agenteFases instanceof Set && agenteFases.has(f.id))) && (
                      <Sparkles size={11} className="text-accent shrink-0" />
                    )}
                    <button onClick={() => setFaseEditando(f)} className="text-muted hover:text-app shrink-0" aria-label="Editar etapa">
                      <Pencil size={11} />
                    </button>
                    <span className="badge-pill ml-auto">{leads.length}</span>
                  </div>
                  <p className="text-[13px] font-semibold mt-1.5">{BRL.format(total)}</p>
                  {leads.length > 0 && (
                    <button
                      onClick={() => onVerNegocios(f.id)}
                      className="text-[11px] text-accent hover:underline mt-1.5 inline-flex items-center gap-1"
                    >
                      ver negócios <ArrowRight size={11} />
                    </button>
                  )}
                </div>
                <div className="space-y-2 min-h-16 rounded-xl border border-dashed border-app p-2">
                  {leads.map((l) => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => setArrastando(l.id)}
                      onClick={() => onAbrir(l)}
                      className="card p-3 cursor-pointer hover:border-accent transition"
                      style={{ borderLeftWidth: 3, borderLeftColor: f.cor }}
                    >
                      <p className="text-sm font-medium leading-tight">{l.nome}</p>
                      {l.empresa && <p className="text-[11px] text-muted">{l.empresa}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {l.valor ? (
                          <span className="text-[11px] font-semibold text-accent">{BRL.format(l.valor)}</span>
                        ) : (
                          <span />
                        )}
                        {l.origem && <span className="badge-pill">{l.origem}</span>}
                      </div>
                      {l.subStatus && <p className="text-[10px] text-red-400 mt-1">{l.subStatus}</p>}
                    </div>
                  ))}
                  {leads.length === 0 && <p className="text-[11px] text-muted text-center py-3">arraste leads pra cá</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {faseEditando && (
        <EditarFaseModal
          fase={faseEditando}
          temLeads={data.leads.some((l) => l.faseId === faseEditando.id)}
          acao={acao}
          onClose={() => setFaseEditando(null)}
        />
      )}
    </div>
  );
}

function EditarFaseModal({
  fase,
  temLeads,
  acao,
  onClose,
}: {
  fase: CrmFase;
  temLeads: boolean;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(fase.nome);
  const [cor, setCor] = useState(fase.cor);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function salvar() {
    if (!nome.trim()) return;
    setBusy(true);
    const ok = await acao({ acao: "fase.editar", faseId: fase.id, nome, cor });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal titulo="Editar etapa" onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nome"><input className="input w-full px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></Campo>
        <Campo label="Cor">
          <div className="flex flex-wrap gap-1.5">
            {PALETA.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className="h-7 w-7 rounded-full shrink-0"
                style={{ background: c, outline: cor === c ? "2px solid var(--accent)" : "none", outlineOffset: 2 }}
                aria-label={c}
              />
            ))}
          </div>
        </Campo>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
      <div className="flex justify-between gap-2 mt-5 pt-4 border-t border-app">
        <button
          onClick={async () => {
            const ok = await confirmar({
              title: `Excluir a etapa "${fase.nome}"?`,
              message: "Os leads que estiverem nessa etapa precisam ser movidos pra outra antes — essa ação não pode ser desfeita.",
              variant: "danger",
            });
            if (!ok) return;
            setBusy(true);
            setErro(null);
            const okOrErr = await acao({ acao: "fase.excluir", faseId: fase.id });
            setBusy(false);
            if (okOrErr) onClose();
            else setErro(temLeads ? "mova os leads dessa etapa pra outra antes de excluir" : "não foi possível excluir");
          }}
          disabled={busy}
          className="text-red-400 hover:underline text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Trash2 size={13} /> Excluir etapa
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button onClick={salvar} disabled={busy || !nome.trim()} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Automações por etapa (mensagem programada no WhatsApp) -----------------

function AutomacoesModal({
  data,
  acao,
  onClose,
}: {
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  return (
    <Modal titulo="Automações do funil" onClose={onClose}>
      <p className="text-xs text-muted mb-4">
        Quando um lead entra numa etapa, espera o número de dias configurado e manda a mensagem —
        automático, sem precisar abrir o WhatsApp. Use <code className="text-app">{"{{nome}}"}</code> e{" "}
        <code className="text-app">{"{{empresa}}"}</code> na mensagem. Depende da conexão WhatsApp
        estar ativa (aba WhatsApp) — sem ela, a regra fica salva mas não dispara.
      </p>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {data.fases.map((f) => (
          <LinhaAutomacaoFase key={f.id} fase={f} acao={acao} />
        ))}
      </div>
      <div className="flex justify-end mt-5 pt-4 border-t border-app">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Fechar</button>
      </div>
    </Modal>
  );
}

function LinhaAutomacaoFase({
  fase,
  acao,
}: {
  fase: CrmFase;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [ativo, setAtivo] = useState(fase.automacaoWhatsapp?.ativo ?? false);
  const [atrasoDias, setAtrasoDias] = useState(String(fase.automacaoWhatsapp?.atrasoDias ?? 1));
  const [mensagem, setMensagem] = useState(fase.automacaoWhatsapp?.mensagem ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    const ok = await acao({
      acao: "automacao.definir",
      faseId: fase.id,
      ativo,
      atrasoDias: Number(atrasoDias) || 1,
      mensagem,
    });
    setSalvando(false);
    if (ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1500);
    }
  }

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: fase.cor }} />
        <span className="text-sm font-medium flex-1">{fase.nome}</span>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" className="accent-[var(--accent)]" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> ativa
        </label>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted shrink-0">esperar</span>
        <input
          type="number"
          min={0}
          className="input px-2 py-1 text-xs w-16"
          value={atrasoDias}
          onChange={(e) => setAtrasoDias(e.target.value)}
        />
        <span className="text-xs text-muted shrink-0">dia(s), depois enviar:</span>
      </div>
      <textarea
        className="input w-full px-3 py-2 text-sm min-h-16 resize-none"
        placeholder="Ex: Oi {{nome}}, tudo bem? Vi que você se interessou..."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      <div className="flex justify-end mt-2">
        <button onClick={salvar} disabled={salvando} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-60">
          {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ---- Negócios (tabela dos fechados) -----------------------------------------

function Negocios({ data, onAbrir }: { data: CrmData; onAbrir: (l: CrmLead) => void }) {
  const fechados = data.leads.filter((l) => data.fases.find((f) => f.id === l.faseId)?.tipo !== "normal");
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm table-clean">
        <thead>
          <tr className="text-left border-b border-app">
            <th className="px-4 py-3">Negócio</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Resultado</th>
            <th className="px-4 py-3">Origem</th>
          </tr>
        </thead>
        <tbody>
          {fechados.map((l) => {
            const f = data.fases.find((x) => x.id === l.faseId)!;
            return (
              <tr key={l.id} className="border-b border-app last:border-0 cursor-pointer hover:bg-app" onClick={() => onAbrir(l)}>
                <td className="px-4 py-3">
                  <p className="font-medium">{l.nome}</p>
                  {l.empresa && <p className="text-[11px] text-muted">{l.empresa}</p>}
                </td>
                <td className="px-4 py-3">{l.valor ? BRL.format(l.valor) : "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge-pill" style={{ color: f.cor, borderColor: f.cor }}>{f.nome}</span>
                </td>
                <td className="px-4 py-3 text-muted">{l.origem || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {fechados.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhum negócio fechado ainda.</p>}
    </div>
  );
}

// ---- WhatsApp ---------------------------------------------------------------

export interface WhatsAppMensagem {
  id: string;
  numero: string;
  direcao: "recebida" | "enviada";
  texto: string;
  automatica?: boolean;
  falhou?: boolean;
  criadoEm: string;
}

interface AgenteIAConfig {
  ativo: boolean;
  personalidade: string;
  faseIds?: string[];
}

interface WhatsAppStatusResp {
  configuradoNaInstalacao: boolean;
  agenteDisponivel: boolean;
  whatsapp?: { instanceName?: string; status?: string; numero?: string; conectadoEm?: string; agenteIA?: AgenteIAConfig };
  conversas: WhatsAppMensagem[];
}

function normalizaNumero(n: string): string {
  return n.replace(/\D/g, "");
}

/** Thread de conversa com um contato — usada na aba WhatsApp (inbox) e dentro
 * do LeadModal. Poll leve (4s) pra simular tempo real sem SSE/WebSocket. */
function ChatThread({ slug, numero, nome, altura = 380 }: { slug: string; numero: string; nome?: string; altura?: number }) {
  const [mensagens, setMensagens] = useState<WhatsAppMensagem[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const res = await fetch(`/api/tenants/${slug}/whatsapp?numero=${encodeURIComponent(numero)}`);
    if (res.ok) setMensagens((await res.json()).conversas);
  }

  useEffect(() => {
    setMensagens(null);
    carregar();
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, numero]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    const res = await fetch(`/api/tenants/${slug}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "mensagem.enviar", numero, texto: texto.trim() }),
    });
    setEnviando(false);
    if (res.ok) {
      setTexto("");
      carregar();
    } else {
      setErro((await res.json().catch(() => ({}))).error || "não foi possível enviar");
    }
  }

  async function importarHistorico() {
    setImportando(true);
    await fetch(`/api/tenants/${slug}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "conversa.importar", numero }),
    }).catch(() => {});
    setImportando(false);
    carregar();
  }

  return (
    <div className="flex flex-col border border-app rounded-xl overflow-hidden" style={{ height: altura }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-app bg-app shrink-0">
        <p className="text-sm font-medium truncate">{nome || numero}</p>
        <button onClick={importarHistorico} disabled={importando} className="btn-ghost px-2.5 py-1 text-[11px] inline-flex items-center gap-1 shrink-0 disabled:opacity-60">
          <History size={12} /> {importando ? "Importando…" : "Importar histórico"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mensagens === null && <p className="text-xs text-muted text-center py-8">Carregando…</p>}
        {mensagens?.map((m) => (
          <div key={m.id} className={`text-sm ${m.direcao === "enviada" ? "text-right" : ""}`}>
            <span
              className={`inline-block max-w-[80%] px-3 py-1.5 rounded-xl text-xs text-left ${
                m.falhou ? "bg-red-500/15 border border-red-500/40" : m.direcao === "enviada" ? "bg-accent" : "bg-app border border-app"
              }`}
              style={m.direcao === "enviada" && !m.falhou ? { color: "var(--accent-text)" } : undefined}
            >
              {m.texto}
            </span>
            <p className={`text-[10px] mt-0.5 ${m.falhou ? "text-red-400" : "text-muted"}`}>
              {m.falhou ? "não entregue — o WhatsApp rejeitou o envio · " : ""}
              {new Date(m.criadoEm).toLocaleString("pt-BR")}{m.automatica ? " · automática" : ""}
            </p>
          </div>
        ))}
        {mensagens?.length === 0 && <p className="text-xs text-muted text-center py-8">Nenhuma mensagem ainda — puxe o histórico ou escreva abaixo.</p>}
      </div>
      {erro && <p className="text-[11px] text-red-400 px-3">{erro}</p>}
      <div className="flex items-center gap-2 p-2.5 border-t border-app shrink-0">
        <input
          className="input flex-1 px-3 py-2 text-sm"
          placeholder="Escreva uma mensagem…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
        />
        <button onClick={enviar} disabled={enviando || !texto.trim()} className="btn-accent px-3 py-2 text-sm disabled:opacity-60">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function WhatsApp({ slug, data, onImportado }: { slug: string; data: CrmData; onImportado: () => void }) {
  const [status, setStatus] = useState<WhatsAppStatusResp | null>(null);
  const [qr, setQr] = useState<{ base64?: string; pairingCode?: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [importarAberto, setImportarAberto] = useState(false);
  const [numeroSelecionado, setNumeroSelecionado] = useState<string | null>(null);
  const confirmar = useConfirm();

  async function carregar() {
    const res = await fetch(`/api/tenants/${slug}/whatsapp`);
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function whatsappAcao(payload: Record<string, unknown>) {
    setErro(null);
    const res = await fetch(`/api/tenants/${slug}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body.error || "falhou");
      return null;
    }
    return body;
  }

  async function conectar() {
    setCarregando(true);
    const res = await whatsappAcao({ acao: "conectar" });
    setCarregando(false);
    if (res?.qr) setQr(res.qr);
    carregar();
  }

  async function desconectar() {
    const ok = await confirmar({
      title: "Desconectar o WhatsApp deste cliente?",
      message: "O CRM para de receber e enviar mensagens até reconectar.",
      variant: "danger",
      confirmText: "Desconectar",
    });
    if (!ok) return;
    setCarregando(true);
    await whatsappAcao({ acao: "desconectar" });
    setCarregando(false);
    setQr(null);
    carregar();
  }

  const conectado = status?.whatsapp?.status === "conectado";
  const configurado = status?.configuradoNaInstalacao;

  // lista de contatos do inbox: leads com whatsapp + quem já mandou/recebeu mensagem
  const contatos = (() => {
    const map = new Map<string, { numero: string; nome?: string; ultima?: WhatsAppMensagem }>();
    for (const l of data.leads) {
      if (!l.whatsapp) continue;
      map.set(normalizaNumero(l.whatsapp), { numero: l.whatsapp, nome: l.nome });
    }
    for (const m of status?.conversas || []) {
      const chave = normalizaNumero(m.numero);
      const atual = map.get(chave);
      if (!atual) {
        map.set(chave, { numero: m.numero, ultima: m });
      } else if (!atual.ultima || atual.ultima.criadoEm < m.criadoEm) {
        map.set(chave, { ...atual, ultima: m });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.ultima?.criadoEm || "").localeCompare(a.ultima?.criadoEm || ""));
  })();

  return (
    <div className="space-y-4">
      {!configurado ? (
        <div className="card p-4 text-xs text-muted leading-relaxed flex items-start gap-3">
          <MessageCircle size={18} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-app font-medium">Evolution API ainda não configurado nesta instalação</p>
            <p className="mt-1">
              Depende de <code className="text-app">EVOLUTION_API_URL</code>/<code className="text-app">EVOLUTION_API_KEY</code>/
              <code className="text-app">HUB_URL</code> no <code className="text-app">.env.local</code> — ver
              docs/WHATSAPP-EVOLUTION-API.md pro passo a passo de instalação na VPS.
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${conectado ? "bg-green-400" : "bg-muted"}`} />
              <span className="text-sm font-medium">
                {conectado ? `Conectado${status?.whatsapp?.numero ? ` — ${status.whatsapp.numero}` : ""}` : "Não conectado"}
              </span>
            </div>
            <div className="flex gap-1.5">
              {conectado ? (
                <>
                  <button onClick={() => setImportarAberto(true)} className="btn-ghost px-3 py-1.5 text-xs">Importar contatos</button>
                  <button onClick={desconectar} disabled={carregando} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-60">Desconectar</button>
                </>
              ) : (
                <button onClick={conectar} disabled={carregando} className="btn-accent px-3 py-1.5 text-xs disabled:opacity-60">
                  {carregando ? "Gerando QR…" : "Conectar WhatsApp"}
                </button>
              )}
            </div>
          </div>
          {erro && <p className="text-xs text-red-400 mt-2">{erro}</p>}
          {qr?.base64 && !conectado && (
            <div className="mt-4 flex flex-col items-center gap-2 py-4 border-t border-app">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.base64} alt="QR Code do WhatsApp" className="h-48 w-48 rounded-lg border border-app" />
              <p className="text-xs text-muted">Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho.</p>
            </div>
          )}
        </div>
      )}

      {conectado && (
        <AgenteIACard slug={slug} data={data} agenteIA={status?.whatsapp?.agenteIA} agenteDisponivel={!!status?.agenteDisponivel} onSalvo={carregar} />
      )}

      {conectado && (
        <div className="card overflow-hidden grid md:grid-cols-[260px_1fr]" style={{ minHeight: 420 }}>
          <div className="border-b md:border-b-0 md:border-r border-app overflow-y-auto max-h-64 md:max-h-none">
            {contatos.map((c) => (
              <button
                key={c.numero}
                onClick={() => setNumeroSelecionado(c.numero)}
                className={`w-full text-left px-3 py-2.5 border-b border-app hover:bg-app transition ${
                  numeroSelecionado && normalizaNumero(numeroSelecionado) === normalizaNumero(c.numero) ? "bg-app" : ""
                }`}
              >
                <p className="text-sm font-medium truncate">{c.nome || c.numero}</p>
                <p className="text-[11px] text-muted truncate">{c.ultima?.texto || c.numero}</p>
              </button>
            ))}
            {contatos.length === 0 && <p className="text-xs text-muted text-center py-8 px-3">Nenhuma conversa ainda.</p>}
          </div>
          <div className="p-3">
            {numeroSelecionado ? (
              <ChatThread
                slug={slug}
                numero={numeroSelecionado}
                nome={contatos.find((c) => normalizaNumero(c.numero) === normalizaNumero(numeroSelecionado))?.nome}
                altura={392}
              />
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted" style={{ minHeight: 392 }}>
                Selecione uma conversa ao lado
              </div>
            )}
          </div>
        </div>
      )}

      {importarAberto && (
        <ImportarContatosModal
          slug={slug}
          data={data}
          onClose={() => setImportarAberto(false)}
          onImportado={() => {
            setImportarAberto(false);
            onImportado();
          }}
        />
      )}
    </div>
  );
}

/** Config do agente de IA que responde sozinho no WhatsApp — inspirado no
 * wa-agent, plugado no webhook do Evolution API já existente (ver lib/whatsappAgente.ts). */
function AgenteIACard({
  slug,
  data,
  agenteIA,
  agenteDisponivel,
  onSalvo,
}: {
  slug: string;
  data: CrmData;
  agenteIA?: AgenteIAConfig;
  agenteDisponivel: boolean;
  onSalvo: () => void;
}) {
  const [ativo, setAtivo] = useState(agenteIA?.ativo ?? false);
  const [personalidade, setPersonalidade] = useState(agenteIA?.personalidade ?? "");
  const [faseIds, setFaseIds] = useState<Set<string>>(new Set(agenteIA?.faseIds || []));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function alternarFase(id: string) {
    setFaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function salvar() {
    setSalvando(true);
    const res = await fetch(`/api/tenants/${slug}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "agenteIA.definir", ativo, personalidade, faseIds: Array.from(faseIds) }),
    });
    setSalvando(false);
    if (res.ok) {
      setSalvo(true);
      onSalvo();
      setTimeout(() => setSalvo(false), 1500);
    }
  }

  if (!agenteDisponivel) {
    return (
      <div className="card p-4 text-xs text-muted leading-relaxed flex items-start gap-3">
        <Sparkles size={18} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-app font-medium">Agente de IA no WhatsApp ainda não configurado nesta instalação</p>
          <p className="mt-1">Depende de <code className="text-app">ANTHROPIC_API_KEY</code> no <code className="text-app">.env.local</code> (a mesma usada pelo módulo Claude Code).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> Agente de IA</h2>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" className="accent-[var(--accent)]" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> ativo
        </label>
      </div>
      <p className="text-xs text-muted">
        Quando ativo, responde sozinho as mensagens recebidas (usando a personalidade abaixo). Pode mover o lead de
        etapa e pedir atendimento humano quando não souber responder — aí para de responder esse lead até você
        reverter manualmente na ficha dele.
      </p>
      <textarea
        className="input w-full px-3 py-2 text-sm min-h-24 resize-none"
        placeholder="Ex: Você é o assistente virtual da Clínica Sorriso. Seja simpático, curto e direto. Responda dúvidas sobre horários e agende avaliações."
        value={personalidade}
        onChange={(e) => setPersonalidade(e.target.value)}
      />
      <div>
        <p className="text-xs text-muted mb-1.5">Responde em quais etapas (nenhuma marcada = todas):</p>
        <div className="flex flex-wrap gap-1.5">
          {data.fases.map((f) => (
            <button
              key={f.id}
              onClick={() => alternarFase(f.id)}
              className={`badge-pill ${faseIds.has(f.id) ? "" : "opacity-50"}`}
              style={{ borderColor: f.cor, color: faseIds.has(f.id) ? f.cor : undefined }}
            >
              {f.nome}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={salvar} disabled={salvando || !personalidade.trim()} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
          {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function ImportarContatosModal({
  slug,
  data,
  onClose,
  onImportado,
}: {
  slug: string;
  data: CrmData;
  onClose: () => void;
  onImportado: () => void;
}) {
  const [contatos, setContatos] = useState<{ numero: string; nome?: string }[] | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [faseId, setFaseId] = useState(data.fases[0]?.id || "");
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [importarHistorico, setImportarHistorico] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tenants/${slug}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "contatos.listar" }),
      });
      const body = await res.json().catch(() => ({}));
      setCarregando(false);
      if (res.ok) setContatos(body.contatos || []);
      else setErro(body.error || "falhou");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function toggle(numero: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero);
      else next.add(numero);
      return next;
    });
  }

  const contatosFiltrados = (contatos || []).filter((c) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return (c.nome || "").toLowerCase().includes(termo) || c.numero.includes(termo);
  });

  const todosFiltradosSelecionados =
    contatosFiltrados.length > 0 && contatosFiltrados.every((c) => selecionados.has(c.numero));

  function alternarSelecionarTodos() {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (todosFiltradosSelecionados) {
        contatosFiltrados.forEach((c) => next.delete(c.numero));
      } else {
        contatosFiltrados.forEach((c) => next.add(c.numero));
      }
      return next;
    });
  }

  async function importar() {
    if (!contatos || selecionados.size === 0) return;
    setImportando(true);
    const escolhidos = contatos.filter((c) => selecionados.has(c.numero));
    const res = await fetch(`/api/tenants/${slug}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "contatos.importar", contatos: escolhidos, faseId, importarHistorico }),
    });
    setImportando(false);
    if (res.ok) onImportado();
    else setErro((await res.json().catch(() => ({}))).error || "falhou");
  }

  return (
    <Modal titulo="Importar contatos do WhatsApp" onClose={onClose}>
      {carregando ? (
        <p className="text-sm text-muted text-center py-6">Carregando contatos…</p>
      ) : erro ? (
        <p className="text-sm text-red-400">{erro}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted shrink-0">Entram na etapa:</span>
            <select className="input flex-1 px-2 py-1.5 text-xs" value={faseId} onChange={(e) => setFaseId(e.target.value)}>
              {data.fases.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              className="input flex-1 px-3 py-1.5 text-xs"
              placeholder="Buscar por nome ou número…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button onClick={alternarSelecionarTodos} className="btn-ghost px-3 py-1.5 text-xs shrink-0" disabled={contatosFiltrados.length === 0}>
              {todosFiltradosSelecionados ? "Limpar seleção" : "Selecionar todos"}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 border border-app rounded-lg p-2">
            {contatosFiltrados.map((c) => (
              <label key={c.numero} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-app text-sm cursor-pointer">
                <input type="checkbox" className="accent-[var(--accent)]" checked={selecionados.has(c.numero)} onChange={() => toggle(c.numero)} />
                <span className="flex-1 truncate">{c.nome || c.numero}</span>
                <span className="text-[11px] text-muted">{c.numero}</span>
              </label>
            ))}
            {contatosFiltrados.length === 0 && (
              <p className="text-xs text-muted text-center py-6">
                {(contatos || []).length === 0 ? "Nenhum contato encontrado." : "Nenhum contato bate com a busca."}
              </p>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted mt-2 cursor-pointer">
            <input type="checkbox" className="accent-[var(--accent)]" checked={importarHistorico} onChange={(e) => setImportarHistorico(e.target.checked)} />
            Importar histórico de conversa também (pode demorar um pouco a mais)
          </label>
        </>
      )}
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-app">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
        <button onClick={importar} disabled={importando || selecionados.size === 0} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
          {importando ? "Importando…" : `Importar (${selecionados.size})`}
        </button>
      </div>
    </Modal>
  );
}

// ---- Tarefas ----------------------------------------------------------------

function Tarefas({
  data,
  acao,
  onAbrir,
}: {
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onAbrir: (l: CrmLead) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [quando, setQuando] = useState("");

  async function criar() {
    if (!titulo.trim()) return;
    const ok = await acao({ acao: "tarefa.criar", titulo, quando: quando || undefined });
    if (ok) {
      setTitulo("");
      setQuando("");
    }
  }

  const abertas = data.tarefas.filter((t) => !t.feita);
  const feitas = data.tarefas.filter((t) => t.feita);

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col sm:flex-row gap-2">
        <input className="input flex-1 px-3 py-2 text-sm" placeholder="Nova tarefa (ex: ligar pro Fulano)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input type="date" className="input px-3 py-2 text-sm" value={quando} onChange={(e) => setQuando(e.target.value)} />
        <button onClick={criar} className="btn-accent px-4 py-2 text-sm">Adicionar</button>
      </div>
      <div className="card divide-y divide-[var(--border)]">
        {[...abertas, ...feitas].map((t) => {
          const lead = t.leadId ? data.leads.find((l) => l.id === t.leadId) : undefined;
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <input type="checkbox" className="accent-[var(--accent)]" checked={t.feita} onChange={() => acao({ acao: "tarefa.toggle", id: t.id })} />
              <div className="flex-1 min-w-0">
                <span className={t.feita ? "line-through text-muted" : ""}>{t.titulo}</span>
                {lead && (
                  <button
                    onClick={() => onAbrir(lead)}
                    className="flex items-center gap-1.5 mt-1 text-[11px] text-accent hover:underline"
                  >
                    <UserRound size={11} />
                    {lead.nome}
                    {lead.whatsapp && <span className="text-muted">· {lead.whatsapp}</span>}
                    <ArrowRight size={11} />
                  </button>
                )}
                {t.leadId && !lead && (
                  <p className="text-[11px] text-muted mt-1">lead não encontrado (pode ter sido excluído)</p>
                )}
              </div>
              {t.quando && <span className="text-[11px] text-muted shrink-0">{new Date(t.quando).toLocaleDateString("pt-BR")}</span>}
              <button onClick={() => acao({ acao: "tarefa.excluir", id: t.id })} className="text-muted hover:text-red-400 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {data.tarefas.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhuma tarefa.</p>}
      </div>
    </div>
  );
}

// ---- Leads (tabela + filtros) ------------------------------------------------

function Leads({
  data,
  acao,
  onAbrir,
  onNovo,
  faseInicial,
}: {
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onAbrir: (l: CrmLead) => void;
  onNovo: () => void;
  faseInicial?: string;
}) {
  const [nome, setNome] = useState("");
  const [origensSel, setOrigensSel] = useState<string[]>([]);
  const [fasesSel, setFasesSel] = useState<string[]>(faseInicial ? [faseInicial] : []);
  const [tagsSel, setTagsSel] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [excluindo, setExcluindo] = useState(false);
  const confirmar = useConfirm();
  const toast = useToast();

  const origens = Array.from(new Set(data.leads.map((l) => l.origem).filter(Boolean))) as string[];
  const tags = Array.from(new Set(data.leads.flatMap((l) => l.tags || []))).sort();
  const faseNomeById = (id: string) => data.fases.find((f) => f.id === id)?.nome || "";

  const filtrados = data.leads.filter((l) => {
    if (nome && !l.nome.toLowerCase().includes(nome.toLowerCase())) return false;
    if (origensSel.length && !origensSel.includes(l.origem || "")) return false;
    if (fasesSel.length && !fasesSel.includes(faseNomeById(l.faseId))) return false;
    if (tagsSel.length && !(l.tags || []).some((t) => tagsSel.includes(t))) return false;
    return true;
  });

  const temFiltro = Boolean(nome || origensSel.length || fasesSel.length || tagsSel.length);

  function alternarSelecao(id: string) {
    setSelecionados((s) => {
      const novo = new Set(s);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecionados((s) => (s.size === filtrados.length ? new Set() : new Set(filtrados.map((l) => l.id))));
  }

  async function excluirSelecionados() {
    const ok = await confirmar({
      title: `Excluir ${selecionados.size} lead${selecionados.size === 1 ? "" : "s"}?`,
      message: "Todo o histórico de conversas, tarefas e anotações desses leads some junto. Essa ação não pode ser desfeita.",
      variant: "danger",
      confirmText: "Excluir",
    });
    if (!ok) return;
    setExcluindo(true);
    for (const id of selecionados) {
      await acao({ acao: "lead.excluir", id });
    }
    setExcluindo(false);
    toast.success(`${selecionados.size} lead${selecionados.size === 1 ? "" : "s"} excluído${selecionados.size === 1 ? "" : "s"}.`);
    setSelecionados(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Leads</h1>
        <button onClick={onNovo} className="btn-accent px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} /> Criar
        </button>
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-2">
        <input className="input px-3 py-2 text-sm flex-1 min-w-[160px]" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <FilterChip label="Situação" options={data.fases.map((f) => f.nome)} selected={fasesSel} onChange={setFasesSel} />
        {origens.length > 0 && <FilterChip label="Origem" options={origens} selected={origensSel} onChange={setOrigensSel} />}
        {tags.length > 0 && <FilterChip label="Tags" options={tags} selected={tagsSel} onChange={setTagsSel} />}
        {temFiltro && (
          <button onClick={() => { setNome(""); setOrigensSel([]); setFasesSel([]); setTagsSel([]); }} className="btn-ghost px-3 py-2 text-sm">
            Limpar
          </button>
        )}
      </div>

      {selecionados.size > 0 && (
        <BulkActionBar count={selecionados.size} onClear={() => setSelecionados(new Set())}>
          <button onClick={excluirSelecionados} disabled={excluindo} className="btn-danger text-xs px-3 py-1.5 disabled:opacity-60">
            {excluindo ? "Excluindo…" : "Excluir selecionados"}
          </button>
        </BulkActionBar>
      )}

      <div className="card overflow-x-auto">
        {data.leads.length === 0 ? (
          <EmptyState
            mood="speech"
            title="Nenhum lead ainda"
            subtitle="Leads do WhatsApp, formulário do site ou criados manualmente caem aqui."
            actionLabel="Novo lead"
            onAction={onNovo}
          />
        ) : filtrados.length === 0 ? (
          <EmptyState mood="curious" title="Nenhum lead com esse filtro" subtitle="Tente limpar algum dos filtros aplicados acima." />
        ) : (
          <table className="w-full text-sm table-clean">
            <thead>
              <tr className="text-left border-b border-app">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selecionados.size === filtrados.length} onChange={alternarTodos} aria-label="Selecionar todos" />
                </th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const f = data.fases.find((x) => x.id === l.faseId);
                return (
                  <tr key={l.id} className="border-b border-app last:border-0 hover:bg-app">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selecionados.has(l.id)} onChange={() => alternarSelecao(l.id)} aria-label={`Selecionar ${l.nome}`} />
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onAbrir(l)}>
                      <p className="font-medium">{l.nome}</p>
                      {l.empresa && <p className="text-[11px] text-muted">{l.empresa}</p>}
                      {l.tags && l.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {l.tags.map((t) => <span key={t} className="badge-pill text-[10px]">{t}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs cursor-pointer" onClick={() => onAbrir(l)}>{l.whatsapp || l.email || "—"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onAbrir(l)}>
                      {f && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: f.cor }} />
                          {f.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onAbrir(l)}>{l.valor ? BRL.format(l.valor) : "—"}</td>
                    <td className="px-4 py-3 text-muted cursor-pointer" onClick={() => onAbrir(l)}>{l.origem || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Anotações --------------------------------------------------------------

function Anotacoes({ data, acao }: { data: CrmData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [texto, setTexto] = useState("");
  async function criar() {
    if (!texto.trim()) return;
    const ok = await acao({ acao: "anotacao.criar", texto });
    if (ok) setTexto("");
  }
  return (
    <div className="space-y-4">
      <div className="card p-4 flex gap-2">
        <input className="input flex-1 px-3 py-2 text-sm" placeholder="Escreva uma anotação..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button onClick={criar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
      </div>
      <div className="space-y-2">
        {[...data.anotacoes].reverse().map((a) => (
          <div key={a.id} className="card p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{a.texto}</p>
              <p className="text-[11px] text-muted mt-1">{new Date(a.criadoEm).toLocaleString("pt-BR")}</p>
            </div>
            <button onClick={() => acao({ acao: "anotacao.excluir", id: a.id })} className="text-muted hover:text-red-400 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {data.anotacoes.length === 0 && <p className="text-sm text-muted text-center py-8">Nenhuma anotação.</p>}
      </div>
    </div>
  );
}

// ---- Ligações ---------------------------------------------------------------

function Ligacoes({ data, acao }: { data: CrmData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [numero, setNumero] = useState("");
  const [resultado, setResultado] = useState<"atendida" | "perdida" | "recusada">("atendida");
  async function criar() {
    if (!numero.trim()) return;
    const ok = await acao({ acao: "ligacao.criar", numero, resultado });
    if (ok) setNumero("");
  }
  const label = { atendida: "Atendida", perdida: "Perdida", recusada: "Recusada" };
  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col sm:flex-row gap-2">
        <input className="input flex-1 px-3 py-2 text-sm" placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <select className="input px-3 py-2 text-sm" value={resultado} onChange={(e) => setResultado(e.target.value as never)}>
          <option value="atendida">Atendida</option>
          <option value="perdida">Perdida</option>
          <option value="recusada">Recusada</option>
        </select>
        <button onClick={criar} className="btn-accent px-4 py-2 text-sm">Registrar</button>
      </div>
      <div className="card divide-y divide-[var(--border)]">
        {[...data.ligacoes].reverse().map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <Phone size={13} className="text-muted" /> {c.numero}
            </span>
            <span className="flex items-center gap-3 text-xs text-muted">
              <span className="badge-pill">{label[c.resultado || "atendida"]}</span>
              {new Date(c.criadoEm).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
        {data.ligacoes.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhuma ligação registrada.</p>}
      </div>
    </div>
  );
}

// ---- Integrações --------------------------------------------------------------

function Integracoes({
  slug,
  data,
  acao,
  onLeadTeste,
  onAtualizado,
}: {
  slug: string;
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onLeadTeste: () => void;
  onAtualizado: (d: CrmData) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const confirmar = useConfirm();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlWebhook = `${origin}/api/crm/lead-capture/${slug}?token=${data.token}`;

  const snippetForm = `<form id="lead-form">
  <input name="nome" placeholder="Seu nome" required />
  <input name="telefone" placeholder="WhatsApp" required />
  <button type="submit">Enviar</button>
</form>
<script>
  document.getElementById('lead-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    fetch('${urlWebhook}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: f.nome.value, telefone: f.telefone.value, source: 'Formulário do site' }),
    }).then(function () { alert('Recebemos seu contato!'); f.reset(); });
  });
</script>`;

  async function enviarTeste() {
    setEnviando(true);
    try {
      await fetch(`/api/crm/lead-capture/${slug}?token=${data.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "Lead de teste", telefone: "+55 11 90000-0000", source: "Teste manual (Integrações)" }),
      });
      onLeadTeste();
    } finally {
      setEnviando(false);
    }
  }

  async function regenerar() {
    const ok = await confirmar({
      title: "Gerar um novo token?",
      message: "Isso invalida o formulário/URL atual — quem já tem o código antigo vai parar de funcionar.",
      variant: "danger",
      confirmText: "Gerar novo token",
    });
    if (!ok) return;
    setRegenerando(true);
    await acao({ acao: "token.regenerar" });
    setRegenerando(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Integrações</h1>
        <p className="text-xs text-muted mt-0.5">Formas de fazer leads externos caírem direto neste CRM.</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Formulário no seu site</h2>
          <span className="badge-pill badge-pill--good">PRONTO PRA USAR</span>
        </div>
        <p className="text-xs text-muted">Cole este trecho no HTML do seu site. Cada envio vira um lead automaticamente.</p>
        <CodeBlock texto={snippetForm} />
        <div className="flex flex-wrap gap-2">
          <CopyButton texto={snippetForm} label="Copiar código" />
          <button onClick={enviarTeste} disabled={enviando} className="btn-ghost px-3 py-2 text-xs disabled:opacity-60">
            {enviando ? "Enviando…" : "Enviar um lead de teste"}
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Zapier, Make, RD Station e outras</h2>
          <span className="badge-pill badge-pill--good">PRONTO PRA USAR</span>
        </div>
        <p className="text-xs text-muted">Use esta URL como destino de um POST (webhook de saída) em qualquer ferramenta de automação.</p>
        <CodeBlock texto={urlWebhook} />
        <CopyButton texto={urlWebhook} label="Copiar URL" />
        <p className="text-[11px] text-amber-400/90">Essa URL cria leads no seu CRM — trate como um link privado.</p>
      </div>

      <LinksRastreioSection slug={slug} data={data} acao={acao} onAtualizado={onAtualizado} />

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Share2 size={14} /> Facebook / Instagram Lead Ads</h2>
          <span className="badge-pill badge-pill--warn">SOB CONFIGURAÇÃO</span>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Essa conexão exige credenciais da Meta (Graph API) por cliente — a ativação é feita pela equipe,
          não é um autoatendimento. Fale com quem administra este Hub pra ligar.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Token de captação</h2>
        <p className="text-xs text-muted">
          É o que autoriza o formulário/webhook acima a criar leads — não é sua senha de login. Gere um novo
          se o código/URL atual vazar.
        </p>
        <button onClick={regenerar} disabled={regenerando} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-60">
          <RefreshCw size={13} /> {regenerando ? "Gerando…" : "Gerar novo token"}
        </button>
      </div>
    </div>
  );
}

/** Link curto pra colocar em anúncio/bio: conta clique e redireciona pro
 * WhatsApp (já com o texto certo, que o webhook casa pra saber a origem) ou
 * pra uma página de vendas. Ver `criarLinkRastreio`/`encontrarLinkPorMensagem`
 * em lib/crm.ts pro porquê do texto pré-preenchido ser a chave disso tudo. */
function LinksRastreioSection({
  slug,
  data,
  acao,
  onAtualizado,
}: {
  slug: string;
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onAtualizado: (d: CrmData) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [destino, setDestino] = useState<"whatsapp" | "url">("whatsapp");
  const [numeroWhatsapp, setNumeroWhatsapp] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [url, setUrl] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const confirmar = useConfirm();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/tenants/${slug}/whatsapp`);
      if (!res.ok) return;
      const body = await res.json();
      const numero = body.whatsapp?.numero;
      if (numero) setNumeroWhatsapp(numero);
    })();
  }, [slug]);

  async function criar() {
    if (!nome.trim()) return;
    if (destino === "whatsapp" && !numeroWhatsapp.trim()) return;
    if (destino === "url" && !url.trim()) return;
    setSalvando(true);
    setErro(null);
    const res = await fetch(`/api/tenants/${slug}/crm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "linkRastreio.criar", nome, destino, numeroWhatsapp, mensagem, url }),
    });
    setSalvando(false);
    if (res.ok) {
      onAtualizado(await res.json());
      setNome("");
      setMensagem("");
      setUrl("");
      setAberto(false);
    } else {
      const body = await res.json().catch(() => null);
      setErro(body?.error || "não foi possível criar o link.");
    }
  }

  async function excluir(id: string) {
    const ok = await confirmar({
      title: "Excluir este link?",
      message: "Quem já tiver ele salvo vai parar de funcionar.",
      variant: "danger",
    });
    if (!ok) return;
    await acao({ acao: "linkRastreio.excluir", id });
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Link2 size={14} /> Links de Rastreio</h2>
        <span className="badge-pill badge-pill--good">PRONTO PRA USAR</span>
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Gere um link curto pra colocar num anúncio, na bio ou onde quiser. Ele conta quantos cliques recebeu e manda
        a pessoa pro WhatsApp (já com uma mensagem pronta) ou pra uma página — quando ela manda essa mensagem, o CRM
        reconhece sozinho de onde ela veio e já preenche a origem do lead.
      </p>

      {data.linksRastreio.length > 0 && (
        <div className="divide-y divide-[var(--border)] border border-app rounded-lg overflow-hidden">
          {data.linksRastreio.map((l) => (
            <LinkRastreioRow key={l.id} link={l} origin={origin} slug={slug} onExcluir={() => excluir(l.id)} />
          ))}
        </div>
      )}
      {data.linksRastreio.length === 0 && <p className="text-xs text-muted">Nenhum link criado ainda.</p>}

      {!aberto ? (
        <button onClick={() => setAberto(true)} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> Novo link de rastreio
        </button>
      ) : (
        <div className="border border-app rounded-lg p-3 space-y-2.5">
          <Campo label="Nome (só pra você reconhecer, ex: Anúncio Google - Julho)">
            <input className="input w-full px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Campo>
          <div className="flex gap-2">
            <button onClick={() => setDestino("whatsapp")} className={`ws-tab flex-1 justify-center ${destino === "whatsapp" ? "ws-tab--active" : ""}`}>
              WhatsApp
            </button>
            <button onClick={() => setDestino("url")} className={`ws-tab flex-1 justify-center ${destino === "url" ? "ws-tab--active" : ""}`}>
              Página de vendas (URL)
            </button>
          </div>
          {destino === "whatsapp" ? (
            <>
              <Campo label="Número de WhatsApp de destino">
                <input className="input w-full px-3 py-2 text-sm" value={numeroWhatsapp} onChange={(e) => setNumeroWhatsapp(e.target.value)} placeholder="5511999999999" />
              </Campo>
              <Campo label="Mensagem que abre pronta (única — é ela que identifica a origem depois)">
                <input className="input w-full px-3 py-2 text-sm" value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Olá! Vi o anúncio e quero saber mais" />
              </Campo>
            </>
          ) : (
            <Campo label="URL de destino (página de vendas, site, etc)">
              <input className="input w-full px-3 py-2 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </Campo>
          )}
          {erro && <p className="text-[11px] text-red-400">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={criar} disabled={salvando} className="btn-accent px-4 py-2 text-xs disabled:opacity-60">
              {salvando ? "Criando…" : "Criar link"}
            </button>
            <button onClick={() => setAberto(false)} className="btn-ghost px-3 py-2 text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkRastreioRow({ link, origin, slug, onExcluir }: { link: LinkRastreio; origin: string; slug: string; onExcluir: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const urlCurta = `${origin}/r/${slug}/${link.codigo}`;

  return (
    <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-medium">{link.nome}</p>
        <p className="text-[11px] text-muted font-mono truncate">{urlCurta}</p>
        <p className="text-[11px] text-muted mt-0.5">
          → {link.destino === "whatsapp" ? `WhatsApp ${link.numeroWhatsapp}` : link.url} · origem gravada como "{link.origem}"
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1 text-xs text-muted" title="Cliques">
          <MousePointerClick size={13} /> {link.cliques}
        </span>
        <span className="badge-pill badge-pill--good">{link.leadsAtribuidos} lead{link.leadsAtribuidos === 1 ? "" : "s"}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(urlCurta);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
          className="btn-ghost h-7 w-7 !p-0 flex items-center justify-center"
        >
          {copiado ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button onClick={onExcluir} className="text-muted hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ texto }: { texto: string }) {
  return (
    <pre className="bg-app border border-app rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono text-muted">
      {texto}
    </pre>
  );
}

function CopyButton({ texto, label }: { texto: string; label: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="btn-accent px-3 py-2 text-xs inline-flex items-center gap-1.5"
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado!" : label}
    </button>
  );
}

// ---- Modais -----------------------------------------------------------------

function NovoLeadModal({
  data,
  acao,
  onClose,
}: {
  data: CrmData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [f, setF] = useState({ nome: "", empresa: "", email: "", whatsapp: "", origem: "", valor: "", faseId: data.fases[0]?.id || "" });
  const [busy, setBusy] = useState(false);

  async function salvar() {
    if (!f.nome.trim()) return;
    setBusy(true);
    const ok = await acao({
      acao: "lead.criar",
      ...f,
      valor: f.valor ? Number(f.valor) : undefined,
    });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal titulo="Novo lead" onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nome *"><input className="input w-full px-3 py-2 text-sm" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus /></Campo>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Empresa"><input className="input w-full px-3 py-2 text-sm" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} /></Campo>
          <Campo label="WhatsApp"><input className="input w-full px-3 py-2 text-sm" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+55 11 99999-9999" /></Campo>
          <Campo label="E-mail"><input className="input w-full px-3 py-2 text-sm" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
          <Campo label="Origem"><input className="input w-full px-3 py-2 text-sm" value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} placeholder="Instagram, Indicação..." /></Campo>
          <Campo label="Valor estimado (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></Campo>
          <Campo label="Fase inicial">
            <select className="input w-full px-3 py-2 text-sm" value={f.faseId} onChange={(e) => setF({ ...f, faseId: e.target.value })}>
              {data.fases.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-app">
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
        <button onClick={salvar} disabled={busy || !f.nome.trim()} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
          {busy ? "Salvando…" : "Criar lead"}
        </button>
      </div>
    </Modal>
  );
}

function LeadModal({
  slug,
  data,
  lead,
  acao,
  onClose,
  financeiroAtivo,
}: {
  slug: string;
  data: CrmData;
  lead: CrmLead;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  financeiroAtivo: boolean;
}) {
  const fase = data.fases.find((f) => f.id === lead.faseId);
  const ehPerdido = fase?.tipo === "perdido";
  const [ofertaRecebivel, setOfertaRecebivel] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [responsavel, setResponsavel] = useState(lead.responsavel || "");
  const confirmar = useConfirm();

  async function mudarFase(novaFaseId: string) {
    const ok = await acao({ acao: "lead.editar", id: lead.id, faseId: novaFaseId });
    if (ok && financeiroAtivo) {
      const novaFase = data.fases.find((f) => f.id === novaFaseId);
      if (novaFase?.tipo === "ganho") setOfertaRecebivel(true);
    }
  }

  async function adicionarTag() {
    const t = tagInput.trim();
    if (!t) return;
    const tags = Array.from(new Set([...(lead.tags || []), t]));
    setTagInput("");
    await acao({ acao: "lead.editar", id: lead.id, tags });
  }

  async function removerTag(t: string) {
    await acao({ acao: "lead.editar", id: lead.id, tags: (lead.tags || []).filter((x) => x !== t) });
  }

  async function salvarResponsavel() {
    if (responsavel === (lead.responsavel || "")) return;
    await acao({ acao: "lead.editar", id: lead.id, responsavel });
  }

  return (
    <>
    <Modal titulo={lead.nome} onClose={onClose} larga>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-3 text-sm min-w-0">
          {lead.empresa && <Linha label="Empresa" valor={lead.empresa} />}
          {lead.whatsapp && <Linha label="WhatsApp" valor={lead.whatsapp} />}
          {lead.email && <Linha label="E-mail" valor={lead.email} />}
          {lead.origem && <Linha label="Origem" valor={lead.origem} />}
          {lead.valor ? <Linha label="Valor" valor={BRL.format(lead.valor)} /> : null}

          <Campo label="Fase">
            <select
              className="input w-full px-3 py-2 text-sm"
              value={lead.faseId}
              onChange={(e) => mudarFase(e.target.value)}
            >
              {data.fases.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Campo>

          {ehPerdido && (
            <Campo label="Motivo / sub-status">
              <select
                className="input w-full px-3 py-2 text-sm"
                value={lead.subStatus || ""}
                onChange={(e) => acao({ acao: "lead.editar", id: lead.id, subStatus: e.target.value })}
              >
                <option value="">— selecione —</option>
                {SUB_STATUS_PERDIDO.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
          )}

          <Campo label={<span className="inline-flex items-center gap-1"><UserRound size={11} /> Responsável</span>}>
            <input
              className="input w-full px-3 py-2 text-sm"
              placeholder="Nome do vendedor/atendente"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              onBlur={salvarResponsavel}
            />
          </Campo>

          <Campo label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {(lead.tags || []).map((t) => (
                <span key={t} className="badge-pill inline-flex items-center gap-1">
                  {t}
                  <button onClick={() => removerTag(t)} className="hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
              {(lead.tags || []).length === 0 && <span className="text-[11px] text-muted">Nenhuma tag ainda.</span>}
            </div>
            <div className="flex gap-1.5">
              <input
                className="input flex-1 px-2.5 py-1.5 text-xs"
                placeholder="Nova tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarTag()}
              />
              <button onClick={adicionarTag} className="btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1"><Tag size={12} /> Add</button>
            </div>
          </Campo>

          {lead.atendimentoHumano && (
            <div className="card p-2.5 flex items-center justify-between gap-2 text-xs bg-app">
              <span className="text-muted">Atendimento automático pausado (lead pediu atendimento humano)</span>
              <button
                onClick={() => acao({ acao: "lead.editar", id: lead.id, atendimentoHumano: false })}
                className="btn-ghost px-2.5 py-1 text-[11px] shrink-0"
              >
                Retomar agente de IA
              </button>
            </div>
          )}

          {lead.whatsapp && <ChatThread slug={slug} numero={lead.whatsapp} nome={lead.nome} altura={280} />}
        </div>

        <TimelineLead data={data} lead={lead} acao={acao} />
      </div>

      <div className="flex justify-between gap-2 mt-5 pt-4 border-t border-app">
        <button
          onClick={async () => {
            const ok = await confirmar({
              title: `Excluir o lead "${lead.nome}"?`,
              message: "Todo o histórico de conversas, tarefas e anotações desse lead some junto. Essa ação não pode ser desfeita.",
              variant: "danger",
            });
            if (ok) {
              await acao({ acao: "lead.excluir", id: lead.id });
              onClose();
            }
          }}
          className="text-red-400 hover:underline text-xs inline-flex items-center gap-1.5"
        >
          <Trash2 size={13} /> Excluir lead
        </button>
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Fechar</button>
      </div>
    </Modal>
      {ofertaRecebivel && (
        <GerarRecebivelModal slug={slug} lead={lead} onClose={() => setOfertaRecebivel(false)} />
      )}
    </>
  );
}

type EventoTimeline =
  | { tipo: "tarefa"; item: CrmTarefa }
  | { tipo: "anotacao"; item: CrmAnotacao }
  | { tipo: "ligacao"; item: CrmLigacao };

/** Timeline unificada do lead: tarefas + anotações + ligações filtradas por
 * leadId (os dados já tinham leadId, só faltava a UI agrupar por lead). */
function TimelineLead({
  data,
  lead,
  acao,
}: {
  data: CrmData;
  lead: CrmLead;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [aba, setAba] = useState<"tarefa" | "anotacao" | "ligacao" | null>(null);
  const [texto, setTexto] = useState("");

  const eventos: EventoTimeline[] = [
    ...data.tarefas.filter((t) => t.leadId === lead.id).map((item) => ({ tipo: "tarefa" as const, item })),
    ...data.anotacoes.filter((a) => a.leadId === lead.id).map((item) => ({ tipo: "anotacao" as const, item })),
    ...data.ligacoes.filter((c) => c.leadId === lead.id).map((item) => ({ tipo: "ligacao" as const, item })),
  ].sort((a, b) => b.item.criadoEm.localeCompare(a.item.criadoEm));

  async function adicionar() {
    if (!texto.trim() || !aba) return;
    if (aba === "tarefa") await acao({ acao: "tarefa.criar", titulo: texto.trim(), leadId: lead.id });
    if (aba === "anotacao") await acao({ acao: "anotacao.criar", texto: texto.trim(), leadId: lead.id });
    if (aba === "ligacao") await acao({ acao: "ligacao.criar", numero: lead.whatsapp || texto.trim(), resultado: "atendida", leadId: lead.id });
    setTexto("");
    setAba(null);
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Timeline</p>
        <div className="flex gap-1">
          <button onClick={() => setAba(aba === "tarefa" ? null : "tarefa")} className="btn-ghost px-2 py-1 text-[11px] inline-flex items-center gap-1"><CheckSquare size={11} /> Tarefa</button>
          <button onClick={() => setAba(aba === "anotacao" ? null : "anotacao")} className="btn-ghost px-2 py-1 text-[11px] inline-flex items-center gap-1"><StickyNote size={11} /> Nota</button>
          <button onClick={() => setAba(aba === "ligacao" ? null : "ligacao")} className="btn-ghost px-2 py-1 text-[11px] inline-flex items-center gap-1"><Phone size={11} /> Ligação</button>
        </div>
      </div>
      {aba && (
        <div className="flex gap-1.5 mb-3">
          <input
            className="input flex-1 px-2.5 py-1.5 text-xs"
            placeholder={aba === "tarefa" ? "Título da tarefa…" : aba === "anotacao" ? "Escreva a anotação…" : "Registrar ligação (Enter)"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            autoFocus
          />
          <button onClick={adicionar} className="btn-accent px-3 py-1.5 text-xs">Add</button>
        </div>
      )}
      <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
        {eventos.map((ev) => (
          <div key={`${ev.tipo}-${ev.item.id}`} className="card p-2.5 text-xs">
            <div className="flex items-start gap-2">
              {ev.tipo === "tarefa" && <CheckSquare size={12} className="text-accent shrink-0 mt-0.5" />}
              {ev.tipo === "anotacao" && <StickyNote size={12} className="text-accent shrink-0 mt-0.5" />}
              {ev.tipo === "ligacao" && <Phone size={12} className="text-accent shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                {ev.tipo === "tarefa" && <p className={ev.item.feita ? "line-through text-muted" : ""}>{ev.item.titulo}</p>}
                {ev.tipo === "anotacao" && <p>{ev.item.texto}</p>}
                {ev.tipo === "ligacao" && <p>Ligação — {ev.item.resultado || "atendida"}</p>}
                <p className="text-[10px] text-muted mt-0.5">{new Date(ev.item.criadoEm).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </div>
        ))}
        {eventos.length === 0 && <p className="text-xs text-muted text-center py-8">Nenhuma atividade registrada com esse lead ainda.</p>}
      </div>
    </div>
  );
}

function GerarRecebivelModal({ slug, lead, onClose }: { slug: string; lead: CrmLead; onClose: () => void }) {
  const [valor, setValor] = useState(lead.valor ? String(lead.valor) : "");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [feito, setFeito] = useState(false);

  async function gerar() {
    if (!valor) return;
    setBusy(true);
    const res = await fetch(`/api/tenants/${slug}/financeiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acao: "conta.criar",
        tipo: "receber",
        descricao: lead.empresa ? `${lead.nome} — ${lead.empresa}` : lead.nome,
        valor: Number(valor),
        vencimento,
        clienteId: lead.clienteId,
      }),
    });
    setBusy(false);
    if (res.ok) setFeito(true);
  }

  return (
    <Modal titulo="Gerar conta a receber?" onClose={onClose}>
      {feito ? (
        <div className="text-sm text-center py-4">
          <p className="text-app font-medium">Conta a receber criada em Financeiro.</p>
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm mt-4">Fechar</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">
            Esse negócio foi marcado como ganho. Quer já criar a cobrança em Financeiro → Contas a Receber,
            usando os dados desse lead?
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Valor (R$)">
              <input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </Campo>
            <Campo label="Vencimento">
              <input type="date" className="input w-full px-3 py-2 text-sm" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Campo>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-app">
            <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Agora não</button>
            <button onClick={gerar} disabled={busy || !valor} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
              {busy ? "Criando…" : "Gerar conta a receber"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Modal({ titulo, children, onClose, larga }: { titulo: string; children: React.ReactNode; onClose: () => void; larga?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`card w-full ${larga ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onClose} className="text-muted hover:text-app" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-app pb-1.5">
      <span className="text-muted text-xs uppercase tracking-wide">{label}</span>
      <span>{valor}</span>
    </div>
  );
}
