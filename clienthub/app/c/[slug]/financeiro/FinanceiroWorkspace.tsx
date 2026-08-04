"use client";

import { useState } from "react";
import {
  LayoutGrid,
  HeartPulse,
  Wallet as WalletIcon,
  Users,
  CalendarDays,
  Target,
  FileBarChart,
  Calculator,
  Lock,
  Settings,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Repeat,
  LineChart,
  Plus,
  Trash2,
  DollarSign,
  AlertTriangle,
  Bot,
  X,
  Landmark,
  Gauge,
  PiggyBank,
  Tag,
  Pencil,
  Download,
  Banknote,
  Compass,
} from "lucide-react";
import type {
  FinanceiroData,
  Lancamento,
  Carteira,
  TipoCarteira,
  OrcamentoCategoria,
  SaudeFinanceira,
  ItemAgenda,
  ProjecaoMes,
} from "@/lib/financeiro";
import ChatPanel from "../claude/ChatPanel";

// resumoFinanceiro/fluxoCaixaMensal/saldoCarteiras/gastoPorCategoria/
// orcamentoDoMes/saudeFinanceira/agendaFinanceira/projecaoCaixa duplicados
// aqui (não importados de lib/financeiro) porque este é Client Component:
// importar um valor de lib/financeiro puxaria node:crypto pro bundle do
// navegador.
function resumoFinanceiro(data: FinanceiroData) {
  const totalEntradas = data.lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const totalSaidas = data.lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const hoje = new Date().toISOString().slice(0, 10);
  const contasReceberPendentes = data.contas
    .filter((c) => c.tipo === "receber" && c.status !== "pago")
    .reduce((s, c) => s + c.valor, 0);
  const contasPagarPendentes = data.contas
    .filter((c) => c.tipo === "pagar" && c.status !== "pago")
    .reduce((s, c) => s + c.valor, 0);
  const contasAtrasadas = data.contas.filter((c) => c.status !== "pago" && c.vencimento < hoje).length;
  const assinaturasAtivas = data.assinaturas.filter((a) => a.ativa);
  const funcionariosAtivos = data.funcionarios.filter((f) => f.ativo);
  return {
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
    contasReceberPendentes,
    contasPagarPendentes,
    contasAtrasadas,
    assinaturasAtivas: assinaturasAtivas.length,
    custoAssinaturasMensal: assinaturasAtivas.reduce((s, a) => s + a.valorMensal, 0),
    funcionariosAtivos: funcionariosAtivos.length,
    custoFolhaMensal: funcionariosAtivos.reduce((s, f) => s + f.salario, 0),
  };
}

function fluxoCaixaMensal(data: FinanceiroData, meses = 6) {
  const buckets: Record<string, { mes: string; entradas: number; saidas: number }> = {};
  const now = new Date();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { mes: key, entradas: 0, saidas: 0 };
  }
  for (const l of data.lancamentos) {
    const key = l.data.slice(0, 7);
    if (!buckets[key]) continue;
    if (l.tipo === "entrada") buckets[key].entradas += l.valor;
    else buckets[key].saidas += l.valor;
  }
  return Object.values(buckets);
}

function saldoCarteiras(data: FinanceiroData) {
  return data.carteiras.map((c) => {
    const movimentado = data.lancamentos
      .filter((l) => l.carteiraId === c.id)
      .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor : -l.valor), 0);
    return { carteira: c, saldo: c.saldoInicial + movimentado };
  });
}

function gastoPorCategoria(data: FinanceiroData, mes?: string) {
  const porCategoria: Record<string, number> = {};
  for (const l of data.lancamentos) {
    if (l.tipo !== "saida") continue;
    if (mes && l.data.slice(0, 7) !== mes) continue;
    const key = l.categoriaId || "__sem_categoria__";
    porCategoria[key] = (porCategoria[key] || 0) + l.valor;
  }
  return Object.entries(porCategoria)
    .map(([categoriaId, total]) => {
      const cat = data.categorias.find((c) => c.id === categoriaId);
      return { categoriaId, nome: cat?.nome || "Sem categoria", cor: cat?.cor || "#78716c", total };
    })
    .sort((a, b) => b.total - a.total);
}

function orcamentoDoMes(data: FinanceiroData, mes: string): OrcamentoCategoria[] {
  const gastos: Record<string, number> = {};
  for (const g of gastoPorCategoria(data, mes)) gastos[g.categoriaId] = g.total;
  return data.metas
    .filter((m) => m.mes === mes)
    .map((m) => {
      const cat = data.categorias.find((c) => c.id === m.categoriaId);
      return {
        categoriaId: m.categoriaId,
        nome: cat?.nome || "Categoria removida",
        cor: cat?.cor || "#78716c",
        planejado: m.valorPlanejado,
        gasto: gastos[m.categoriaId] || 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

function saudeFinanceira(data: FinanceiroData): SaudeFinanceira {
  const r = resumoFinanceiro(data);
  const meses = fluxoCaixaMensal(data, 3);
  const mesAtual = meses[meses.length - 1];
  const gastoMedioMensal = meses.reduce((s, m) => s + m.saidas, 0) / meses.length;

  let score = 100;
  const alertas: string[] = [];

  if (r.saldo < 0) {
    score -= 40;
    alertas.push("Saldo geral negativo.");
  }
  if (r.contasAtrasadas > 0) {
    score -= Math.min(30, r.contasAtrasadas * 10);
    alertas.push(`${r.contasAtrasadas} conta${r.contasAtrasadas > 1 ? "s" : ""} atrasada${r.contasAtrasadas > 1 ? "s" : ""}.`);
  }
  if (mesAtual && mesAtual.saidas > mesAtual.entradas && mesAtual.entradas > 0) {
    score -= 15;
    alertas.push("Gastos do mês atual estão maiores que as entradas.");
  }
  if (r.contasPagarPendentes > r.contasReceberPendentes && r.contasReceberPendentes >= 0) {
    score -= 10;
    alertas.push("Tem mais a pagar do que a receber pendente.");
  }
  score = Math.max(0, Math.min(100, score));

  const runwayMeses = gastoMedioMensal > 0 ? Math.round((r.saldo / gastoMedioMensal) * 10) / 10 : null;
  const nivel: SaudeFinanceira["nivel"] = score >= 80 ? "otimo" : score >= 55 ? "bom" : score >= 30 ? "atencao" : "critico";
  if (alertas.length === 0) alertas.push("Nenhum alerta no momento — financeiro em dia.");

  return { score, nivel, alertas, runwayMeses };
}

function agendaFinanceira(data: FinanceiroData): ItemAgenda[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const itens: ItemAgenda[] = [];

  for (const c of data.contas) {
    if (c.status === "pago") continue;
    itens.push({ id: c.id, tipo: c.tipo, descricao: c.descricao, valor: c.valor, data: c.vencimento, atrasado: c.vencimento < hoje });
  }

  const agora = new Date();
  for (const a of data.assinaturas) {
    if (!a.ativa) continue;
    let proxima = new Date(agora.getFullYear(), agora.getMonth(), a.diaCobranca);
    if (proxima < agora) proxima = new Date(agora.getFullYear(), agora.getMonth() + 1, a.diaCobranca);
    itens.push({
      id: a.id,
      tipo: "assinatura",
      descricao: a.nome,
      valor: a.valorMensal,
      data: proxima.toISOString().slice(0, 10),
      atrasado: false,
    });
  }

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}

function projecaoCaixa(data: FinanceiroData, meses = 6): ProjecaoMes[] {
  const r = resumoFinanceiro(data);
  const custoRecorrente = r.custoAssinaturasMensal + r.custoFolhaMensal;
  let saldo = r.saldo;
  const now = new Date();
  const out: ProjecaoMes[] = [];

  for (let i = 0; i < meses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const aReceber = data.contas
      .filter((c) => c.tipo === "receber" && c.status !== "pago" && c.vencimento.slice(0, 7) === key)
      .reduce((s, c) => s + c.valor, 0);
    const aPagar = data.contas
      .filter((c) => c.tipo === "pagar" && c.status !== "pago" && c.vencimento.slice(0, 7) === key)
      .reduce((s, c) => s + c.valor, 0);
    if (i > 0) saldo += aReceber - aPagar - custoRecorrente;
    out.push({ mes: key, aReceber, aPagar, custoRecorrente, saldoProjetado: Math.round(saldo * 100) / 100 });
  }
  return out;
}

const PALETA = ["#6366f1", "#0891b2", "#ca8a04", "#c026d3", "#16a34a", "#dc2626", "#f97316", "#0ea5e9"];

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const SUGESTOES_BOT = ["Qual é o meu saldo hoje?", "Quais contas estão atrasadas?", "Resuma minha saúde financeira"];

type SidebarItem =
  | "visao-geral"
  | "saude"
  | "financeiro"
  | "funcionarios"
  | "agenda"
  | "metas"
  | "relatorios"
  | "mapas"
  | "calculadoras"
  | "base"
  | "permissoes"
  | "configuracoes";

const SIDEBAR: { id: SidebarItem; label: string; icon: typeof LayoutGrid; pronto?: boolean }[] = [
  { id: "visao-geral", label: "Visão Geral", icon: LayoutGrid, pronto: true },
  { id: "saude", label: "Saúde Financeira", icon: HeartPulse, pronto: true },
  { id: "financeiro", label: "Financeiro", icon: WalletIcon, pronto: true },
  { id: "funcionarios", label: "Funcionários", icon: Users, pronto: true },
  { id: "agenda", label: "Agenda", icon: CalendarDays, pronto: true },
  { id: "metas", label: "Orçamento", icon: Target, pronto: true },
  { id: "relatorios", label: "Relatórios", icon: FileBarChart, pronto: true },
  { id: "mapas", label: "Projeção de Caixa", icon: Compass, pronto: true },
  { id: "calculadoras", label: "Calculadoras", icon: Calculator, pronto: true },
  { id: "base", label: "Categorias", icon: Tag, pronto: true },
  { id: "permissoes", label: "Permissões", icon: Lock },
  { id: "configuracoes", label: "Configurações", icon: Settings, pronto: true },
];

type SubAba = "resumo" | "carteiras" | "entradas" | "saidas" | "receber" | "pagar" | "assinaturas" | "fluxo";

const SUB_ABAS: { id: SubAba; label: string; icon: typeof TrendingUp }[] = [
  { id: "resumo", label: "Visão Geral", icon: LayoutGrid },
  { id: "carteiras", label: "Carteiras", icon: Landmark },
  { id: "entradas", label: "Entradas", icon: TrendingUp },
  { id: "saidas", label: "Saídas", icon: TrendingDown },
  { id: "receber", label: "Contas a Receber", icon: Receipt },
  { id: "assinaturas", label: "Assinaturas", icon: Repeat },
  { id: "pagar", label: "Contas a Pagar", icon: CreditCard },
  { id: "fluxo", label: "Fluxo de Caixa", icon: LineChart },
];

export default function FinanceiroWorkspace({
  slug,
  inicial,
  chatEnabled,
}: {
  slug: string;
  inicial: FinanceiroData;
  chatEnabled: boolean;
}) {
  const [data, setData] = useState<FinanceiroData>(inicial);
  const [item, setItem] = useState<SidebarItem>("visao-geral");
  const [subAba, setSubAba] = useState<SubAba>("resumo");
  const [botAberto, setBotAberto] = useState(false);

  async function acao(payload: Record<string, unknown>) {
    const res = await fetch(`/api/tenants/${slug}/financeiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) setData(await res.json());
    return res.ok;
  }

  return (
    <div className="flex gap-0 -mx-6 -my-6 relative" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {/* sidebar do módulo */}
      <aside className="module-sidebar">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted px-2 mb-2">Financeiro</p>
        {SIDEBAR.map((s) => {
          const Icon = s.icon;
          const active = item === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setItem(s.id)}
              className={`module-sidebar-item ${active ? "module-sidebar-item--active" : ""}`}
            >
              <Icon size={15} />
              {s.label}
            </button>
          );
        })}
        <div className="flex-1" />
      </aside>

      {/* conteúdo */}
      <div className="flex-1 min-w-0 px-6 py-6">
        {item === "visao-geral" && <VisaoGeral data={data} />}
        {item === "saude" && <SaudeFinanceiraView data={data} />}
        {item === "metas" && <Orcamento data={data} acao={acao} />}
        {item === "relatorios" && <Relatorios data={data} />}
        {item === "funcionarios" && <FuncionariosView data={data} acao={acao} />}
        {item === "agenda" && <AgendaView data={data} />}
        {item === "mapas" && <ProjecaoView data={data} />}
        {item === "calculadoras" && <Calculadoras />}
        {item === "base" && <Categorias data={data} acao={acao} />}
        {item === "configuracoes" && <ConfiguracoesView data={data} />}
        {item === "permissoes" && (
          <div className="card p-10 text-center max-w-md">
            <Lock size={22} className="mx-auto text-muted" />
            <p className="text-sm font-medium mt-3">Permissões</p>
            <p className="text-xs text-muted mt-1.5">
              Controle de quem vê/edita o quê depende de multi-usuário por workspace (hoje cada cliente tem
              um único login) — é uma mudança de arquitetura maior, registrada como próxima fase no README,
              não construída nesta rodada.
            </p>
          </div>
        )}

        {item === "financeiro" && (
          <div className="space-y-4">
            <div className="flex gap-1.5 flex-wrap">
              {SUB_ABAS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSubAba(a.id)}
                    className={`ws-tab ${subAba === a.id ? "ws-tab--active" : ""}`}
                  >
                    <Icon size={13} />
                    {a.label}
                  </button>
                );
              })}
            </div>
            {subAba === "resumo" && <VisaoGeral data={data} />}
            {subAba === "carteiras" && <Carteiras data={data} acao={acao} />}
            {subAba === "entradas" && <Lancamentos data={data} tipo="entrada" acao={acao} />}
            {subAba === "saidas" && <Lancamentos data={data} tipo="saida" acao={acao} />}
            {subAba === "receber" && <Contas data={data} tipo="receber" acao={acao} />}
            {subAba === "pagar" && <Contas data={data} tipo="pagar" acao={acao} />}
            {subAba === "assinaturas" && <Assinaturas data={data} acao={acao} />}
            {subAba === "fluxo" && <FluxoCaixa data={data} />}
          </div>
        )}

      </div>

      {/* AlumBot — assistente flutuante */}
      <button
        onClick={() => setBotAberto((v) => !v)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full grid place-items-center shadow-xl z-40"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        title="Assistente financeiro"
      >
        <Bot size={20} />
      </button>

      {botAberto && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[70vh] card overflow-hidden z-40 shadow-2xl flex flex-col">
          <div className="px-3 py-2 border-b border-app flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Bot size={14} className="text-accent" /> Assistente Financeiro
            </span>
            <button onClick={() => setBotAberto(false)} className="text-muted hover:text-app">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel
              slug={slug}
              enabled={chatEnabled}
              onActivity={() => {}}
              module="financeiro"
              suggestions={SUGESTOES_BOT}
              emptyHint="Pergunte sobre seu financeiro — saldo, contas atrasadas, maior despesa do mês. Lê os dados reais deste workspace."
            />
          </div>
        </div>
      )}
    </div>
  );
}


// ---- Visão Geral --------------------------------------------------------

function VisaoGeral({ data }: { data: FinanceiroData }) {
  const r = resumoFinanceiro(data);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Entradas" value={BRL.format(r.totalEntradas)} icon={TrendingUp} tone="good" />
        <Stat label="Saídas" value={BRL.format(r.totalSaidas)} icon={TrendingDown} tone="bad" />
        <Stat label="Saldo" value={BRL.format(r.saldo)} icon={DollarSign} tone={r.saldo >= 0 ? "good" : "bad"} />
        <Stat label="A receber" value={BRL.format(r.contasReceberPendentes)} icon={Receipt} />
        <Stat label="A pagar" value={BRL.format(r.contasPagarPendentes)} icon={CreditCard} />
        <Stat
          label="Contas atrasadas"
          value={String(r.contasAtrasadas)}
          icon={AlertTriangle}
          tone={r.contasAtrasadas > 0 ? "bad" : "good"}
        />
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="icon-badge h-9 w-9">
            <Repeat size={16} />
          </span>
          <div>
            <p className="text-sm font-medium">{r.assinaturasAtivas} assinaturas ativas</p>
            <p className="text-xs text-muted">{BRL.format(r.custoAssinaturasMensal)}/mês</p>
          </div>
        </div>
      </div>

      {data.carteiras.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Carteiras</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saldoCarteiras(data).map(({ carteira, saldo }) => (
              <div key={carteira.id} className="flex items-center gap-3">
                <span className="icon-badge h-8 w-8"><Landmark size={14} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{carteira.nome}</p>
                  <p className={`text-sm font-semibold ${saldo >= 0 ? "" : "text-red-400"}`}>{BRL.format(saldo)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.lancamentos.length === 0 && data.contas.length === 0 && (
        <div className="card p-8 text-center">
          <WalletIcon size={22} className="mx-auto text-muted" />
          <p className="text-sm font-medium mt-3">Nenhum lançamento ainda</p>
          <p className="text-xs text-muted mt-1">
            Registre em Financeiro → Entradas/Saídas, ou peça ao assistente (canto inferior direito) pra lançar por você.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "#4ade80" : tone === "bad" ? "#f87171" : undefined;
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="icon-badge h-7 w-7" style={color ? { color } : undefined}>
          <Icon size={14} />
        </span>
      </div>
      <span className="text-xl font-bold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

// ---- Entradas / Saídas ---------------------------------------------------

function Lancamentos({
  data,
  tipo,
  acao,
}: {
  data: FinanceiroData;
  tipo: "entrada" | "saida";
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [carteiraId, setCarteiraId] = useState("");
  const [dataLanc, setDataLanc] = useState(new Date().toISOString().slice(0, 10));

  const lista = data.lancamentos.filter((l) => l.tipo === tipo).sort((a, b) => b.data.localeCompare(a.data));
  const categorias = data.categorias.filter((c) => c.tipo === tipo);
  const total = lista.reduce((s, l) => s + l.valor, 0);

  async function salvar() {
    if (!descricao.trim() || !valor) return;
    const ok = await acao({
      acao: "lancamento.criar",
      tipo,
      descricao,
      valor: Number(valor),
      categoriaId: categoriaId || undefined,
      carteiraId: carteiraId || undefined,
      data: dataLanc,
    });
    if (ok) {
      setDescricao("");
      setValor("");
      setAberto(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Total: <strong className="text-app">{BRL.format(total)}</strong>
        </p>
        <button onClick={() => setAberto((v) => !v)} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> {tipo === "entrada" ? "Nova entrada" : "Nova saída"}
        </button>
      </div>

      {aberto && (
        <div className="card p-4 grid sm:grid-cols-2 gap-3">
          <input className="input px-3 py-2 text-sm" placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <input type="number" min={0} className="input px-3 py-2 text-sm" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
          <select className="input px-3 py-2 text-sm" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {data.carteiras.length > 0 && (
            <select className="input px-3 py-2 text-sm" value={carteiraId} onChange={(e) => setCarteiraId(e.target.value)}>
              <option value="">Sem carteira</option>
              {data.carteiras.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}
          <input type="date" className="input px-3 py-2 text-sm" value={dataLanc} onChange={(e) => setDataLanc(e.target.value)} />
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={salvar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm table-clean">
          <thead>
            <tr className="text-left border-b border-app">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <LancamentoRow key={l.id} l={l} data={data} acao={acao} />
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}

function LancamentoRow({
  l,
  data,
  acao,
}: {
  l: Lancamento;
  data: FinanceiroData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const cat = data.categorias.find((c) => c.id === l.categoriaId);
  return (
    <tr className="border-b border-app last:border-0">
      <td className="px-4 py-3 text-muted text-xs">{new Date(l.data).toLocaleDateString("pt-BR")}</td>
      <td className="px-4 py-3">{l.descricao}</td>
      <td className="px-4 py-3">
        {cat ? <span className="badge-pill" style={{ color: cat.cor, borderColor: cat.cor }}>{cat.nome}</span> : "—"}
      </td>
      <td className={`px-4 py-3 font-medium ${l.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
        {l.tipo === "entrada" ? "+" : "-"}
        {BRL.format(l.valor)}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => acao({ acao: "lancamento.excluir", id: l.id })} className="text-muted hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

// ---- Contas a Pagar/Receber -----------------------------------------------

function Contas({
  data,
  tipo,
  acao,
}: {
  data: FinanceiroData;
  tipo: "pagar" | "receber";
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));

  const lista = data.contas.filter((c) => c.tipo === tipo).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const hoje = new Date().toISOString().slice(0, 10);

  async function salvar() {
    if (!descricao.trim() || !valor) return;
    const ok = await acao({ acao: "conta.criar", tipo, descricao, valor: Number(valor), vencimento });
    if (ok) {
      setDescricao("");
      setValor("");
      setAberto(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setAberto((v) => !v)} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> Nova conta a {tipo === "pagar" ? "pagar" : "receber"}
        </button>
      </div>

      {aberto && (
        <div className="card p-4 grid sm:grid-cols-3 gap-3">
          <input className="input px-3 py-2 text-sm sm:col-span-1" placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <input type="number" min={0} className="input px-3 py-2 text-sm" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
          <input type="date" className="input px-3 py-2 text-sm" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          <div className="sm:col-span-3 flex justify-end">
            <button onClick={salvar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-[var(--border)]">
        {lista.map((c) => {
          const atrasada = c.status !== "pago" && c.vencimento < hoje;
          return (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{c.descricao}</p>
                <p className="text-[11px] text-muted">
                  Vence em {new Date(c.vencimento).toLocaleDateString("pt-BR")}
                  {atrasada && <span className="text-red-400"> · atrasada</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{BRL.format(c.valor)}</span>
                <span className={`badge-pill ${c.status === "pago" ? "badge-pill--good" : atrasada ? "badge-pill--bad" : "badge-pill--warn"}`}>
                  {c.status === "pago" ? "Pago" : atrasada ? "Atrasada" : "Pendente"}
                </span>
                {c.status !== "pago" && (
                  <button
                    onClick={() => acao({ acao: "conta.marcar", id: c.id, status: "pago" })}
                    className="btn-ghost px-2 py-1 text-[11px]"
                  >
                    Marcar pago
                  </button>
                )}
                <button onClick={() => acao({ acao: "conta.excluir", id: c.id })} className="text-muted hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <p className="text-sm text-muted text-center py-10">Nenhuma conta a {tipo === "pagar" ? "pagar" : "receber"} ainda.</p>
        )}
      </div>
    </div>
  );
}

// ---- Assinaturas ----------------------------------------------------------

function Assinaturas({ data, acao }: { data: FinanceiroData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [diaCobranca, setDiaCobranca] = useState("1");

  async function salvar() {
    if (!nome.trim() || !valorMensal) return;
    const ok = await acao({ acao: "assinatura.criar", nome, valorMensal: Number(valorMensal), diaCobranca: Number(diaCobranca) });
    if (ok) {
      setNome("");
      setValorMensal("");
      setAberto(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setAberto((v) => !v)} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> Nova assinatura
        </button>
      </div>

      {aberto && (
        <div className="card p-4 grid sm:grid-cols-3 gap-3">
          <input className="input px-3 py-2 text-sm" placeholder="Nome (ex: Software X)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input type="number" min={0} className="input px-3 py-2 text-sm" placeholder="Valor mensal" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
          <input type="number" min={1} max={31} className="input px-3 py-2 text-sm" placeholder="Dia da cobrança" value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} />
          <div className="sm:col-span-3 flex justify-end">
            <button onClick={salvar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-[var(--border)]">
        {data.assinaturas.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className={`font-medium ${!a.ativa ? "line-through text-muted" : ""}`}>{a.nome}</p>
              <p className="text-[11px] text-muted">cobrança dia {a.diaCobranca}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{BRL.format(a.valorMensal)}/mês</span>
              <button onClick={() => acao({ acao: "assinatura.toggle", id: a.id })} className="btn-ghost px-2 py-1 text-[11px]">
                {a.ativa ? "Cancelar" : "Reativar"}
              </button>
            </div>
          </div>
        ))}
        {data.assinaturas.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhuma assinatura cadastrada.</p>}
      </div>
    </div>
  );
}

// ---- Fluxo de Caixa ---------------------------------------------------------

function FluxoCaixa({ data }: { data: FinanceiroData }) {
  const meses = fluxoCaixaMensal(data, 6);
  const max = Math.max(1, ...meses.map((m) => Math.max(m.entradas, m.saidas)));

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold mb-4">Últimos 6 meses</h2>
      <div className="flex items-end gap-3 h-48">
        {meses.map((m) => (
          <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 h-40 w-full justify-center">
              <div
                className="w-3 rounded-t bg-[#4ade80]"
                style={{ height: `${(m.entradas / max) * 100}%` }}
                title={`Entradas: ${BRL.format(m.entradas)}`}
              />
              <div
                className="w-3 rounded-t bg-[#f87171]"
                style={{ height: `${(m.saidas / max) * 100}%` }}
                title={`Saídas: ${BRL.format(m.saidas)}`}
              />
            </div>
            <span className="text-[10px] text-muted">{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#4ade80]" /> Entradas</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f87171]" /> Saídas</span>
      </div>
    </div>
  );
}

// ---- Carteiras (contas bancárias) -------------------------------------------

const TIPOS_CARTEIRA: { id: TipoCarteira; label: string }[] = [
  { id: "corrente", label: "Conta corrente" },
  { id: "poupanca", label: "Poupança" },
  { id: "cartao", label: "Cartão de crédito" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "investimento", label: "Investimento" },
];

function Carteiras({ data, acao }: { data: FinanceiroData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCarteira>("corrente");
  const [saldoInicial, setSaldoInicial] = useState("0");

  const saldos = saldoCarteiras(data);
  const total = saldos.reduce((s, x) => s + x.saldo, 0);

  async function salvar() {
    if (!nome.trim()) return;
    const ok = await acao({ acao: "carteira.criar", nome, tipo, saldoInicial: Number(saldoInicial) || 0 });
    if (ok) {
      setNome("");
      setSaldoInicial("0");
      setAberto(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Saldo total: <strong className="text-app">{BRL.format(total)}</strong>
        </p>
        <button onClick={() => setAberto((v) => !v)} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={13} /> Nova carteira
        </button>
      </div>

      {aberto && (
        <div className="card p-4 grid sm:grid-cols-3 gap-3">
          <input className="input px-3 py-2 text-sm" placeholder="Nome (ex: Nubank PJ)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <select className="input px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCarteira)}>
            {TIPOS_CARTEIRA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input type="number" className="input px-3 py-2 text-sm" placeholder="Saldo inicial" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
          <div className="sm:col-span-3 flex justify-end">
            <button onClick={salvar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {saldos.map(({ carteira, saldo }) => (
          <div key={carteira.id} className="card p-4">
            <div className="flex items-start justify-between">
              <span className="icon-badge h-9 w-9"><Landmark size={16} /></span>
              <button onClick={() => acao({ acao: "carteira.excluir", id: carteira.id })} className="text-muted hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-sm font-semibold mt-3">{carteira.nome}</p>
            <p className="text-[11px] text-muted mb-1">{TIPOS_CARTEIRA.find((t) => t.id === carteira.tipo)?.label}</p>
            <p className={`text-lg font-bold ${saldo >= 0 ? "" : "text-red-400"}`}>{BRL.format(saldo)}</p>
          </div>
        ))}
      </div>
      {data.carteiras.length === 0 && (
        <div className="card p-8 text-center">
          <Landmark size={22} className="mx-auto text-muted" />
          <p className="text-sm font-medium mt-3">Nenhuma carteira cadastrada</p>
          <p className="text-xs text-muted mt-1">
            Cadastre suas contas bancárias e caixas (ex: conta PJ, cartão de crédito) pra acompanhar o saldo de cada uma.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Saúde Financeira --------------------------------------------------------

function SaudeFinanceiraView({ data }: { data: FinanceiroData }) {
  const saude = saudeFinanceira(data);
  const corNivel = { critico: "#f87171", atencao: "var(--accent)", bom: "#4ade80", otimo: "#4ade80" }[saude.nivel];
  const labelNivel = { critico: "Crítico", atencao: "Atenção", bom: "Bom", otimo: "Ótimo" }[saude.nivel];

  return (
    <div className="space-y-5">
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${corNivel} ${saude.score * 3.6}deg, color-mix(in srgb, var(--text) 10%, transparent) 0deg)` }}>
          <div className="absolute inset-[14%] rounded-full bg-card grid place-items-center">
            <span className="text-2xl font-bold" style={{ color: corNivel }}>{saude.score}</span>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="badge-pill" style={{ color: corNivel, borderColor: corNivel }}>{labelNivel}</span>
          <p className="text-sm font-semibold mt-2">Saúde financeira do negócio</p>
          <p className="text-xs text-muted mt-1">
            {saude.runwayMeses !== null
              ? saude.runwayMeses >= 0
                ? `No ritmo de gasto atual, o saldo cobre ${saude.runwayMeses} mês(es).`
                : "Gasto médio mensal maior que o saldo disponível."
              : "Sem lançamentos suficientes pra estimar fôlego de caixa."}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Gauge size={15} className="text-accent" /> Alertas</h2>
        <ul className="space-y-2">
          {saude.alertas.map((a, i) => (
            <li key={i} className="text-sm text-muted flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-current mt-1.5 shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- Orçamento (metas por categoria) -----------------------------------------

function Orcamento({ data, acao }: { data: FinanceiroData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const categoriasSaida = data.categorias.filter((c) => c.tipo === "saida");
  const metasMes = data.metas.filter((m) => m.mes === mes);
  const orcamento = orcamentoDoMes(data, mes);
  const totalPlanejado = orcamento.reduce((s, o) => s + o.planejado, 0);
  const totalGasto = orcamento.reduce((s, o) => s + o.gasto, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Orçamento</h1>
          <p className="text-xs text-muted mt-0.5">Planeje quanto quer gastar por categoria e acompanhe o real.</p>
        </div>
        <input type="month" className="input px-3 py-2 text-sm" value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Planejado no mês" value={BRL.format(totalPlanejado)} icon={PiggyBank} />
        <Stat label="Gasto no mês" value={BRL.format(totalGasto)} icon={TrendingDown} tone={totalGasto > totalPlanejado && totalPlanejado > 0 ? "bad" : undefined} />
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {categoriasSaida.map((cat) => {
          const meta = metasMes.find((m) => m.categoriaId === cat.id);
          return <LinhaOrcamento key={cat.id} categoria={cat} valorPlanejado={meta?.valorPlanejado} mes={mes} data={data} acao={acao} />;
        })}
        {categoriasSaida.length === 0 && <p className="text-sm text-muted text-center py-10">Nenhuma categoria de saída cadastrada.</p>}
      </div>
    </div>
  );
}

function LinhaOrcamento({
  categoria,
  valorPlanejado,
  mes,
  data,
  acao,
}: {
  categoria: FinanceiroData["categorias"][number];
  valorPlanejado?: number;
  mes: string;
  data: FinanceiroData;
  acao: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(valorPlanejado ?? ""));
  const gasto = gastoPorCategoria(data, mes).find((g) => g.categoriaId === categoria.id)?.total || 0;
  const pct = valorPlanejado ? Math.min(999, Math.round((gasto / valorPlanejado) * 100)) : 0;

  async function salvar() {
    const ok = await acao({ acao: "meta.definir", categoriaId: categoria.id, mes, valorPlanejado: Number(valor) || 0 });
    if (ok) setEditando(false);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: categoria.cor }} />
        <span className="flex-1">{categoria.nome}</span>
        {editando ? (
          <>
            <input
              type="number"
              min={0}
              autoFocus
              className="input px-2 py-1 text-sm w-28"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <button onClick={salvar} className="btn-accent px-3 py-1.5 text-xs">Salvar</button>
            <button onClick={() => setEditando(false)} className="btn-ghost px-3 py-1.5 text-xs">Cancelar</button>
          </>
        ) : valorPlanejado ? (
          <>
            <span className="text-muted text-xs">{BRL.format(gasto)} de {BRL.format(valorPlanejado)}</span>
            <button onClick={() => setEditando(true)} className="text-xs text-accent hover:underline">editar</button>
          </>
        ) : (
          <button onClick={() => setEditando(true)} className="text-xs text-accent hover:underline">definir meta</button>
        )}
      </div>
      {valorPlanejado ? (
        <div className="h-1.5 rounded-full bg-app overflow-hidden mt-2 ml-5">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, background: pct > 100 ? "#f87171" : categoria.cor }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---- Relatórios ---------------------------------------------------------------

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
        <div className="absolute inset-[18%] rounded-full bg-card grid place-items-center" />
      </div>
      <div className="space-y-1.5 text-xs flex-1 min-w-0">
        {segmentos.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-muted truncate">{s.label}</span>
            <span className="font-medium ml-auto shrink-0">{BRL.format(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Relatorios({ data }: { data: FinanceiroData }) {
  const gastos = gastoPorCategoria(data).slice(0, 8).map((g, i) => ({ label: g.nome, value: g.total, color: g.cor || PALETA[i % PALETA.length] }));
  const saldos = saldoCarteiras(data);
  const maxSaldo = Math.max(1, ...saldos.map((s) => Math.abs(s.saldo)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Relatórios</h1>
        <p className="text-xs text-muted mt-0.5">Análises calculadas em cima dos lançamentos reais deste workspace.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4">Gasto por categoria (todo o período)</h2>
        <Donut segmentos={gastos} />
      </div>

      <FluxoCaixa data={data} />

      {saldos.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Saldo por carteira</h2>
          <div className="space-y-2.5">
            {saldos.map(({ carteira, saldo }) => (
              <div key={carteira.id} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 truncate">{carteira.nome}</span>
                <span className="flex-1 h-2 rounded-full bg-app overflow-hidden">
                  <span
                    className="h-full block rounded-full"
                    style={{ width: `${(Math.abs(saldo) / maxSaldo) * 100}%`, background: saldo >= 0 ? "#4ade80" : "#f87171" }}
                  />
                </span>
                <span className={`w-28 text-right font-medium ${saldo >= 0 ? "" : "text-red-400"}`}>{BRL.format(saldo)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Funcionários / Folha de Pagamento ---------------------------------------

function FuncionariosView({ data, acao }: { data: FinanceiroData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [salario, setSalario] = useState("");
  const [diaPagamento, setDiaPagamento] = useState("5");
  const [lancando, setLancando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const ativos = data.funcionarios.filter((f) => f.ativo);
  const custoFolha = ativos.reduce((s, f) => s + f.salario, 0);

  async function salvar() {
    if (!nome.trim() || !salario) return;
    const ok = await acao({ acao: "funcionario.criar", nome, cargo: cargo || undefined, salario: Number(salario), diaPagamento: Number(diaPagamento) });
    if (ok) {
      setNome("");
      setCargo("");
      setSalario("");
      setAberto(false);
    }
  }

  async function lancarFolha() {
    setLancando(true);
    setMensagem(null);
    const ok = await acao({ acao: "folha.lancar" });
    setLancando(false);
    setMensagem(ok ? "Folha do mês lançada em Entradas/Saídas." : "A folha desse mês já foi lançada pra todos os funcionários ativos.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Funcionários</h1>
          <p className="text-xs text-muted mt-0.5">
            {ativos.length} ativo{ativos.length === 1 ? "" : "s"} · folha mensal {BRL.format(custoFolha)}
          </p>
        </div>
        <div className="flex gap-2">
          {data.funcionarios.some((f) => f.ativo) && (
            <button onClick={lancarFolha} disabled={lancando} className="btn-ghost px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-60">
              <Banknote size={13} /> {lancando ? "Lançando…" : "Lançar folha do mês"}
            </button>
          )}
          <button onClick={() => setAberto((v) => !v)} className="btn-accent px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
            <Plus size={13} /> Novo funcionário
          </button>
        </div>
      </div>

      {mensagem && <p className="text-xs text-muted">{mensagem}</p>}

      {aberto && (
        <div className="card p-4 grid sm:grid-cols-4 gap-3">
          <input className="input px-3 py-2 text-sm" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="input px-3 py-2 text-sm" placeholder="Cargo (opcional)" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          <input type="number" min={0} className="input px-3 py-2 text-sm" placeholder="Salário" value={salario} onChange={(e) => setSalario(e.target.value)} />
          <input type="number" min={1} max={31} className="input px-3 py-2 text-sm" placeholder="Dia pagamento" value={diaPagamento} onChange={(e) => setDiaPagamento(e.target.value)} />
          <div className="sm:col-span-4 flex justify-end">
            <button onClick={salvar} className="btn-accent px-4 py-2 text-sm">Salvar</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-[var(--border)]">
        {data.funcionarios.map((f) => (
          <div key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className={`font-medium ${!f.ativo ? "line-through text-muted" : ""}`}>{f.nome}</p>
              <p className="text-[11px] text-muted">{f.cargo || "sem cargo"} · paga todo dia {f.diaPagamento}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{BRL.format(f.salario)}/mês</span>
              <button onClick={() => acao({ acao: "funcionario.toggle", id: f.id })} className="btn-ghost px-2 py-1 text-[11px]">
                {f.ativo ? "Desligar" : "Reativar"}
              </button>
              <button onClick={() => acao({ acao: "funcionario.excluir", id: f.id })} className="text-muted hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {data.funcionarios.length === 0 && (
          <div className="text-center py-10">
            <Users size={22} className="mx-auto text-muted" />
            <p className="text-sm font-medium mt-3">Nenhum funcionário cadastrado</p>
            <p className="text-xs text-muted mt-1.5">
              Cadastre a equipe (ex: recepcionista, ajudante) pra acompanhar o custo de folha e gerar o
              lançamento do salário automaticamente todo mês.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Agenda financeira ------------------------------------------------------

const LABEL_TIPO_AGENDA: Record<ItemAgenda["tipo"], string> = { receber: "A receber", pagar: "A pagar", assinatura: "Assinatura" };

function AgendaView({ data }: { data: FinanceiroData }) {
  const itens = agendaFinanceira(data);
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasados = itens.filter((i) => i.atrasado);
  const proximos = itens.filter((i) => !i.atrasado);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Agenda</h1>
        <p className="text-xs text-muted mt-0.5">Tudo que tem data marcada — contas a pagar/receber e a próxima cobrança de cada assinatura.</p>
      </div>

      {atrasados.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3 text-red-400 flex items-center gap-2"><AlertTriangle size={14} /> Atrasados</h2>
          <div className="space-y-2">
            {atrasados.map((i) => <LinhaAgenda key={`${i.tipo}-${i.id}`} item={i} />)}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Próximos</h2>
        <div className="space-y-2">
          {proximos.map((i) => <LinhaAgenda key={`${i.tipo}-${i.id}`} item={i} />)}
          {proximos.length === 0 && <p className="text-sm text-muted text-center py-8">Nada agendado pra frente.</p>}
        </div>
      </div>

      {itens.length === 0 && (
        <div className="card p-8 text-center">
          <CalendarDays size={22} className="mx-auto text-muted" />
          <p className="text-sm font-medium mt-3">Agenda vazia</p>
          <p className="text-xs text-muted mt-1">Contas a pagar/receber e assinaturas ativas aparecem aqui, ordenadas por data.</p>
        </div>
      )}
      {itens.length > 0 && atrasados.length === 0 && (
        <p className="text-xs text-muted text-center">Referência: hoje é {new Date(hoje).toLocaleDateString("pt-BR")}.</p>
      )}
    </div>
  );
}

function LinhaAgenda({ item }: { item: ItemAgenda }) {
  const cor = item.atrasado ? "#f87171" : item.tipo === "receber" ? "#4ade80" : "var(--accent)";
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cor }} />
        <div>
          <p className="font-medium">{item.descricao}</p>
          <p className="text-[11px] text-muted">{LABEL_TIPO_AGENDA[item.tipo]} · {new Date(item.data).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>
      <span className="font-medium" style={{ color: item.tipo === "pagar" ? "#f87171" : undefined }}>
        {item.tipo === "pagar" ? "-" : "+"}{BRL.format(item.valor)}
      </span>
    </div>
  );
}

// ---- Projeção de Caixa --------------------------------------------------------

function ProjecaoView({ data }: { data: FinanceiroData }) {
  const projecao = projecaoCaixa(data, 6);
  const max = Math.max(1, ...projecao.map((p) => Math.abs(p.saldoProjetado)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Projeção de Caixa</h1>
        <p className="text-xs text-muted mt-0.5">
          Estimativa dos próximos 6 meses a partir do saldo atual + contas já agendadas − custo recorrente
          (assinaturas e folha). Não projeta vendas futuras ainda não cadastradas.
        </p>
      </div>

      <div className="card p-5">
        <div className="space-y-3">
          {projecao.map((p) => (
            <div key={p.mes} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-muted">{p.mes.slice(5)}/{p.mes.slice(2, 4)}</span>
              <span className="flex-1 h-2 rounded-full bg-app overflow-hidden">
                <span
                  className="h-full block rounded-full"
                  style={{ width: `${(Math.abs(p.saldoProjetado) / max) * 100}%`, background: p.saldoProjetado >= 0 ? "#4ade80" : "#f87171" }}
                />
              </span>
              <span className={`w-32 text-right font-semibold ${p.saldoProjetado >= 0 ? "" : "text-red-400"}`}>{BRL.format(p.saldoProjetado)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="A receber (agendado)" value={BRL.format(projecao.reduce((s, p) => s + p.aReceber, 0))} icon={TrendingUp} tone="good" />
        <Stat label="A pagar (agendado)" value={BRL.format(projecao.reduce((s, p) => s + p.aPagar, 0))} icon={TrendingDown} tone="bad" />
        <Stat label="Custo recorrente/mês" value={BRL.format(projecao[0]?.custoRecorrente || 0)} icon={Repeat} />
      </div>
    </div>
  );
}

// ---- Calculadoras financeiras -------------------------------------------------

function Calculadoras() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Calculadoras</h1>
        <p className="text-xs text-muted mt-0.5">Ferramentas rápidas — não gravam nada, é só cálculo na hora.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CalcComissao />
        <CalcPrecificacao />
        <CalcMargem />
        <CalcPontoEquilibrio />
      </div>
    </div>
  );
}

function CalcCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold mb-3">{titulo}</h2>
      {children}
    </div>
  );
}

/** Comissão de venda (ex: corretor de imóveis) — valor do negócio × percentual. */
function CalcComissao() {
  const [valor, setValor] = useState("");
  const [pct, setPct] = useState("6");
  const comissao = (Number(valor) || 0) * (Number(pct) || 0) / 100;
  return (
    <CalcCard titulo="Comissão de venda">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Campo label="Valor do negócio (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo label="Comissão (%)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>
      </div>
      <p className="text-xs text-muted">Você recebe</p>
      <p className="text-xl font-bold text-accent">{BRL.format(comissao)}</p>
    </CalcCard>
  );
}

/** Precificação de serviço (ex: encanador) — material + mão de obra + margem. */
function CalcPrecificacao() {
  const [material, setMaterial] = useState("");
  const [horas, setHoras] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [margem, setMargem] = useState("30");
  const custo = (Number(material) || 0) + (Number(horas) || 0) * (Number(valorHora) || 0);
  const preco = custo * (1 + (Number(margem) || 0) / 100);
  return (
    <CalcCard titulo="Precificação de serviço">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Campo label="Material (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={material} onChange={(e) => setMaterial(e.target.value)} /></Campo>
        <Campo label="Margem desejada (%)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={margem} onChange={(e) => setMargem(e.target.value)} /></Campo>
        <Campo label="Horas de trabalho"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={horas} onChange={(e) => setHoras(e.target.value)} /></Campo>
        <Campo label="Valor da hora (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={valorHora} onChange={(e) => setValorHora(e.target.value)} /></Campo>
      </div>
      <p className="text-xs text-muted">Custo {BRL.format(custo)} · preço sugerido</p>
      <p className="text-xl font-bold text-accent">{BRL.format(preco)}</p>
    </CalcCard>
  );
}

/** Margem e markup — dado o custo e o preço de venda. */
function CalcMargem() {
  const [custo, setCusto] = useState("");
  const [preco, setPreco] = useState("");
  const c = Number(custo) || 0;
  const p = Number(preco) || 0;
  const lucro = p - c;
  const margem = p > 0 ? (lucro / p) * 100 : 0;
  const markup = c > 0 ? (lucro / c) * 100 : 0;
  return (
    <CalcCard titulo="Margem e markup">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Campo label="Custo (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={custo} onChange={(e) => setCusto(e.target.value)} /></Campo>
        <Campo label="Preço de venda (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={preco} onChange={(e) => setPreco(e.target.value)} /></Campo>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-muted">Lucro</p>
          <p className="text-lg font-bold" style={{ color: lucro >= 0 ? "#4ade80" : "#f87171" }}>{BRL.format(lucro)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Margem</p>
          <p className="text-lg font-bold text-accent">{margem.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted">Markup</p>
          <p className="text-lg font-bold text-accent">{markup.toFixed(1)}%</p>
        </div>
      </div>
    </CalcCard>
  );
}

/** Ponto de equilíbrio — quantas vendas/serviços pra cobrir os custos fixos do mês. */
function CalcPontoEquilibrio() {
  const [fixos, setFixos] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");
  const [custoVarUnit, setCustoVarUnit] = useState("");
  const margemContribuicao = (Number(precoUnit) || 0) - (Number(custoVarUnit) || 0);
  const ponto = margemContribuicao > 0 ? (Number(fixos) || 0) / margemContribuicao : null;
  return (
    <CalcCard titulo="Ponto de equilíbrio">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Campo label="Custos fixos do mês (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={fixos} onChange={(e) => setFixos(e.target.value)} /></Campo>
        <span />
        <Campo label="Preço por venda/serviço (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={precoUnit} onChange={(e) => setPrecoUnit(e.target.value)} /></Campo>
        <Campo label="Custo variável unitário (R$)"><input type="number" min={0} className="input w-full px-3 py-2 text-sm" value={custoVarUnit} onChange={(e) => setCustoVarUnit(e.target.value)} /></Campo>
      </div>
      <p className="text-xs text-muted">Você precisa vender/atender</p>
      <p className="text-xl font-bold text-accent">{ponto !== null ? `${Math.ceil(ponto)} por mês` : "— informe preço maior que o custo variável"}</p>
    </CalcCard>
  );
}

// ---- Categorias ---------------------------------------------------------------

function Categorias({ data, acao }: { data: FinanceiroData; acao: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [aberto, setAberto] = useState<"entrada" | "saida" | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#6366f1");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const entradas = data.categorias.filter((c) => c.tipo === "entrada");
  const saidas = data.categorias.filter((c) => c.tipo === "saida");

  async function criar(tipo: "entrada" | "saida") {
    if (!nome.trim()) return;
    const ok = await acao({ acao: "categoria.criar", nome, tipo, cor });
    if (ok) {
      setNome("");
      setCor(PALETA[Math.floor(Math.random() * PALETA.length)]);
      setAberto(null);
    }
  }

  async function salvarEdicao(id: string) {
    const ok = await acao({ acao: "categoria.editar", id, nome: editNome });
    if (ok) setEditandoId(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Categorias</h1>
        <p className="text-xs text-muted mt-0.5">
          Ajuste pro seu negócio — corretor pode ter &quot;Venda de imóvel&quot;/&quot;Aluguel&quot;, encanador
          &quot;Material&quot;/&quot;Mão de obra&quot;, agência &quot;Cliente X&quot;/&quot;Escritório&quot;.
        </p>
      </div>

      {(["entrada", "saida"] as const).map((tipo) => (
        <div key={tipo} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{tipo === "entrada" ? "Categorias de entrada" : "Categorias de saída"}</h2>
            <button onClick={() => setAberto(aberto === tipo ? null : tipo)} className="btn-ghost px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <Plus size={13} /> Nova categoria
            </button>
          </div>

          {aberto === tipo && (
            <div className="flex gap-2 mb-3">
              <input className="input flex-1 px-3 py-2 text-sm" placeholder="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
              <input type="color" className="input h-9 w-12 p-1" value={cor} onChange={(e) => setCor(e.target.value)} />
              <button onClick={() => criar(tipo)} className="btn-accent px-4 py-2 text-sm">Criar</button>
            </div>
          )}

          <div className="space-y-1.5">
            {(tipo === "entrada" ? entradas : saidas).map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 text-sm py-1">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.cor }} />
                {editandoId === c.id ? (
                  <>
                    <input className="input flex-1 px-2 py-1 text-sm" value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus />
                    <button onClick={() => salvarEdicao(c.id)} className="text-xs text-accent hover:underline">salvar</button>
                    <button onClick={() => setEditandoId(null)} className="text-xs text-muted hover:underline">cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{c.nome}</span>
                    <button onClick={() => { setEditandoId(c.id); setEditNome(c.nome); }} className="text-muted hover:text-app">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => acao({ acao: "categoria.excluir", id: c.id })} className="text-muted hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {(tipo === "entrada" ? entradas : saidas).length === 0 && (
              <p className="text-xs text-muted text-center py-4">Nenhuma categoria de {tipo === "entrada" ? "entrada" : "saída"} ainda.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Configurações --------------------------------------------------------------

function paraCSV(linhas: (string | number)[][]): string {
  return linhas
    .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

function baixarCSV(nomeArquivo: string, conteudo: string) {
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

function ConfiguracoesView({ data }: { data: FinanceiroData }) {
  function exportarLancamentos() {
    const cabecalho = ["Data", "Tipo", "Descrição", "Categoria", "Valor"];
    const linhas = data.lancamentos.map((l) => [
      l.data,
      l.tipo === "entrada" ? "Entrada" : "Saída",
      l.descricao,
      data.categorias.find((c) => c.id === l.categoriaId)?.nome || "",
      l.valor.toFixed(2),
    ]);
    baixarCSV("lancamentos.csv", paraCSV([cabecalho, ...linhas]));
  }

  function exportarContas() {
    const cabecalho = ["Tipo", "Descrição", "Valor", "Vencimento", "Status"];
    const linhas = data.contas.map((c) => [
      c.tipo === "receber" ? "A receber" : "A pagar",
      c.descricao,
      c.valor.toFixed(2),
      c.vencimento,
      c.status,
    ]);
    baixarCSV("contas.csv", paraCSV([cabecalho, ...linhas]));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Configurações</h1>
        <p className="text-xs text-muted mt-0.5">Ajustes gerais do módulo Financeiro deste workspace.</p>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Exportar dados</h2>
        <p className="text-xs text-muted">Baixe um CSV pra planilha ou pra mandar pro seu contador.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarLancamentos} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-1.5">
            <Download size={13} /> Lançamentos ({data.lancamentos.length})
          </button>
          <button onClick={exportarContas} className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-1.5">
            <Download size={13} /> Contas a pagar/receber ({data.contas.length})
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-2">
        <h2 className="text-sm font-semibold">Estrutura</h2>
        <p className="text-xs text-muted">
          {data.categorias.length} categorias · {data.carteiras.length} carteiras · {data.funcionarios.filter((f) => f.ativo).length} funcionários ativos.
          Gerencie em <strong className="text-app">Categorias</strong> e em <strong className="text-app">Financeiro → Carteiras</strong>.
        </p>
      </div>
    </div>
  );
}
