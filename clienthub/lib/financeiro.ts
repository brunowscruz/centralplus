import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertInsideTenant, fileExists } from "./bos";

/**
 * Módulo Financeiro (nativo). Modelo de dados inspirado no Actual Budget
 * (github.com/actualbudget/actual, MIT — licença permissiva, ver checklist
 * da seção 2.5 do spec) — contas, lançamentos, categorias — mas
 * implementado do zero: nenhum código do projeto original é reaproveitado.
 *
 * Dado vive DENTRO da pasta do tenant (`dados/financeiro.json`): é dado de
 * negócio do cliente — o Claude Code do workspace pode ler/analisar, mesmo
 * isolamento multi-tenant de sempre (assertInsideTenant).
 */

export type TipoLancamento = "entrada" | "saida";
export type FormaPagamento = "pix" | "credito" | "debito" | "boleto" | "transferencia" | "dinheiro" | "outro";
export type StatusConta = "pendente" | "pago" | "atrasado";
export type TipoCarteira = "corrente" | "poupanca" | "cartao" | "dinheiro" | "investimento";

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
}

/** Conta bancária/carteira (conceito separado de "conta a pagar/receber" —
 * inspirado nos "accounts" do Actual Budget). Lançamentos podem apontar pra
 * uma carteira; o saldo dela é saldoInicial + soma dos lançamentos vinculados. */
export interface Carteira {
  id: string;
  nome: string;
  tipo: TipoCarteira;
  saldoInicial: number;
  criadoEm: string;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  categoriaId?: string;
  carteiraId?: string;
  /** vínculo com dados/clientes.json — de onde veio o dinheiro/pra quem foi */
  clienteId?: string;
  valor: number;
  formaPagamento?: FormaPagamento;
  data: string; // ISO date
  recorrente?: boolean;
  criadoEm: string;
}

export interface ContaPagarReceber {
  id: string;
  tipo: "pagar" | "receber";
  descricao: string;
  valor: number;
  vencimento: string; // ISO date
  status: StatusConta;
  categoriaId?: string;
  clienteId?: string;
  pagoEm?: string;
  criadoEm: string;
}

export interface Assinatura {
  id: string;
  nome: string;
  valorMensal: number;
  diaCobranca: number; // 1-31
  ativa: boolean;
  criadoEm: string;
}

/** Orçamento planejado por categoria/mês (envelope budgeting, inspirado no
 * Actual Budget) — "quanto eu quero gastar em X esse mês", comparado depois
 * com o quanto foi de fato lançado naquela categoria. */
export interface MetaCategoria {
  categoriaId: string;
  mes: string; // "YYYY-MM"
  valorPlanejado: number;
}

/** Funcionário/colaborador com custo fixo mensal (folha de pagamento). */
export interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  salario: number;
  diaPagamento: number; // 1-31
  ativo: boolean;
  criadoEm: string;
}

export interface FinanceiroData {
  categorias: CategoriaFinanceira[];
  carteiras: Carteira[];
  lancamentos: Lancamento[];
  contas: ContaPagarReceber[];
  assinaturas: Assinatura[];
  metas: MetaCategoria[];
  funcionarios: Funcionario[];
}

const CATEGORIAS_PADRAO: Omit<CategoriaFinanceira, "id">[] = [
  { nome: "Vendas", tipo: "entrada", cor: "#16a34a" },
  { nome: "Serviços", tipo: "entrada", cor: "#0891b2" },
  { nome: "Assinaturas", tipo: "entrada", cor: "#6366f1" },
  { nome: "Outros recebimentos", tipo: "entrada", cor: "#65a30d" },
  { nome: "Fornecedores", tipo: "saida", cor: "#dc2626" },
  { nome: "Folha de pagamento", tipo: "saida", cor: "#c026d3" },
  { nome: "Impostos", tipo: "saida", cor: "#ca8a04" },
  { nome: "Marketing", tipo: "saida", cor: "#0ea5e9" },
  { nome: "Operacional", tipo: "saida", cor: "#f97316" },
  { nome: "Outras despesas", tipo: "saida", cor: "#78716c" },
];

const FIN_FILE = "dados/financeiro.json";

function finPath(slug: string): string {
  return assertInsideTenant(slug, FIN_FILE);
}
function newId(): string {
  return crypto.randomBytes(6).toString("hex");
}

function seed(slug: string): FinanceiroData {
  const data: FinanceiroData = {
    categorias: CATEGORIAS_PADRAO.map((c) => ({ ...c, id: newId() })),
    carteiras: [],
    lancamentos: [],
    contas: [],
    assinaturas: [],
    metas: [],
    funcionarios: [],
  };
  persist(slug, data);
  return data;
}

function persist(slug: string, data: FinanceiroData): void {
  const p = finPath(slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Instalações antigas não têm carteiras/metas/funcionários no arquivo — backfill silencioso. */
function normalizar(data: FinanceiroData): FinanceiroData {
  if (!Array.isArray(data.carteiras)) data.carteiras = [];
  if (!Array.isArray(data.metas)) data.metas = [];
  if (!Array.isArray(data.funcionarios)) data.funcionarios = [];
  return data;
}

export function readFinanceiro(slug: string): FinanceiroData {
  const p = finPath(slug);
  if (!fileExists(p)) return seed(slug);
  try {
    return normalizar(JSON.parse(fs.readFileSync(p, "utf8")) as FinanceiroData);
  } catch {
    return seed(slug);
  }
}

// ---- mutações -----------------------------------------------------------

export function addLancamento(slug: string, input: Partial<Lancamento>): FinanceiroData {
  const data = readFinanceiro(slug);
  const descricao = (input.descricao || "").trim();
  if (!descricao) throw new Error("informe a descrição");
  const valor = Number(input.valor);
  if (!valor || valor <= 0) throw new Error("informe um valor válido");
  data.lancamentos.push({
    id: newId(),
    tipo: input.tipo === "saida" ? "saida" : "entrada",
    descricao,
    categoriaId: input.categoriaId || undefined,
    carteiraId: input.carteiraId || undefined,
    clienteId: input.clienteId || undefined,
    valor,
    formaPagamento: input.formaPagamento,
    data: input.data || new Date().toISOString().slice(0, 10),
    recorrente: !!input.recorrente,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function deleteLancamento(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  data.lancamentos = data.lancamentos.filter((l) => l.id !== id);
  persist(slug, data);
  return data;
}

export function addConta(slug: string, input: Partial<ContaPagarReceber>): FinanceiroData {
  const data = readFinanceiro(slug);
  const descricao = (input.descricao || "").trim();
  if (!descricao) throw new Error("informe a descrição");
  const valor = Number(input.valor);
  if (!valor || valor <= 0) throw new Error("informe um valor válido");
  data.contas.push({
    id: newId(),
    tipo: input.tipo === "pagar" ? "pagar" : "receber",
    descricao,
    valor,
    vencimento: input.vencimento || new Date().toISOString().slice(0, 10),
    status: "pendente",
    categoriaId: input.categoriaId || undefined,
    clienteId: input.clienteId || undefined,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

// ---- carteiras (contas bancárias) ------------------------------------------

export function addCarteira(slug: string, input: Partial<Carteira>): FinanceiroData {
  const data = readFinanceiro(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome da carteira");
  const tipos: TipoCarteira[] = ["corrente", "poupanca", "cartao", "dinheiro", "investimento"];
  data.carteiras.push({
    id: newId(),
    nome,
    tipo: tipos.includes(input.tipo as TipoCarteira) ? (input.tipo as TipoCarteira) : "corrente",
    saldoInicial: typeof input.saldoInicial === "number" ? input.saldoInicial : 0,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function deleteCarteira(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  data.carteiras = data.carteiras.filter((c) => c.id !== id);
  for (const l of data.lancamentos) if (l.carteiraId === id) l.carteiraId = undefined;
  persist(slug, data);
  return data;
}

// ---- categorias (customizáveis por negócio: corretor, encanador, agência...) ----

export function addCategoria(slug: string, input: { nome?: string; tipo?: TipoLancamento; cor?: string }): FinanceiroData {
  const data = readFinanceiro(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome da categoria");
  data.categorias.push({
    id: newId(),
    nome,
    tipo: input.tipo === "entrada" ? "entrada" : "saida",
    cor: input.cor || "#78716c",
  });
  persist(slug, data);
  return data;
}

export function editCategoria(slug: string, id: string, patch: { nome?: string; cor?: string }): FinanceiroData {
  const data = readFinanceiro(slug);
  const c = data.categorias.find((x) => x.id === id);
  if (!c) throw new Error("categoria não encontrada");
  if (patch.nome?.trim()) c.nome = patch.nome.trim();
  if (patch.cor) c.cor = patch.cor;
  persist(slug, data);
  return data;
}

export function deleteCategoria(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  data.categorias = data.categorias.filter((c) => c.id !== id);
  for (const l of data.lancamentos) if (l.categoriaId === id) l.categoriaId = undefined;
  for (const c of data.contas) if (c.categoriaId === id) c.categoriaId = undefined;
  data.metas = data.metas.filter((m) => m.categoriaId !== id);
  persist(slug, data);
  return data;
}

// ---- funcionários / folha de pagamento -------------------------------------

export function addFuncionario(slug: string, input: Partial<Funcionario>): FinanceiroData {
  const data = readFinanceiro(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome do funcionário");
  const salario = Number(input.salario);
  if (!salario || salario <= 0) throw new Error("informe um salário válido");
  data.funcionarios.push({
    id: newId(),
    nome,
    cargo: input.cargo?.trim() || undefined,
    salario,
    diaPagamento: Math.min(31, Math.max(1, Number(input.diaPagamento) || 5)),
    ativo: true,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function editFuncionario(slug: string, id: string, patch: Partial<Funcionario>): FinanceiroData {
  const data = readFinanceiro(slug);
  const f = data.funcionarios.find((x) => x.id === id);
  if (!f) throw new Error("funcionário não encontrado");
  if (patch.nome?.trim()) f.nome = patch.nome.trim();
  if (patch.cargo !== undefined) f.cargo = patch.cargo?.trim() || undefined;
  if (typeof patch.salario === "number" && patch.salario > 0) f.salario = patch.salario;
  if (typeof patch.diaPagamento === "number") f.diaPagamento = Math.min(31, Math.max(1, patch.diaPagamento));
  persist(slug, data);
  return data;
}

export function toggleFuncionario(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  const f = data.funcionarios.find((x) => x.id === id);
  if (!f) throw new Error("funcionário não encontrado");
  f.ativo = !f.ativo;
  persist(slug, data);
  return data;
}

export function deleteFuncionario(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  data.funcionarios = data.funcionarios.filter((f) => f.id !== id);
  persist(slug, data);
  return data;
}

/** Gera os lançamentos de saída da folha do mês pros funcionários ativos que
 * ainda não têm um lançamento de salário lançado nesse mês (evita duplicar). */
export function lancarFolhaDoMes(slug: string, mes?: string): FinanceiroData {
  const data = readFinanceiro(slug);
  const mesAlvo = mes || new Date().toISOString().slice(0, 7);
  const [ano, mesNum] = mesAlvo.split("-").map(Number);
  const diasNoMes = new Date(ano, mesNum, 0).getDate();
  const catFolha = data.categorias.find((c) => c.tipo === "saida" && c.nome.toLowerCase().includes("folha"));

  let lancados = 0;
  for (const f of data.funcionarios) {
    if (!f.ativo) continue;
    const descricao = `Salário - ${f.nome}`;
    const jaLancado = data.lancamentos.some((l) => l.descricao === descricao && l.data.slice(0, 7) === mesAlvo);
    if (jaLancado) continue;
    const dia = Math.min(f.diaPagamento, diasNoMes);
    data.lancamentos.push({
      id: newId(),
      tipo: "saida",
      descricao,
      categoriaId: catFolha?.id,
      valor: f.salario,
      data: `${mesAlvo}-${String(dia).padStart(2, "0")}`,
      criadoEm: new Date().toISOString(),
    });
    lancados++;
  }
  if (lancados === 0) throw new Error("a folha desse mês já foi lançada pra todos os funcionários ativos");
  persist(slug, data);
  return data;
}

// ---- metas / orçamento por categoria ---------------------------------------

/** Define (cria ou substitui) o valor planejado de uma categoria num mês. */
export function definirMeta(slug: string, input: { categoriaId?: string; mes?: string; valorPlanejado?: unknown }): FinanceiroData {
  const data = readFinanceiro(slug);
  const categoriaId = input.categoriaId;
  if (!categoriaId || !data.categorias.some((c) => c.id === categoriaId)) throw new Error("categoria inválida");
  const mes = input.mes || new Date().toISOString().slice(0, 7);
  const valorPlanejado = Number(input.valorPlanejado);
  if (!(valorPlanejado >= 0)) throw new Error("informe um valor planejado válido");
  const existente = data.metas.find((m) => m.categoriaId === categoriaId && m.mes === mes);
  if (existente) existente.valorPlanejado = valorPlanejado;
  else data.metas.push({ categoriaId, mes, valorPlanejado });
  persist(slug, data);
  return data;
}

export function marcarConta(slug: string, id: string, status: StatusConta): FinanceiroData {
  const data = readFinanceiro(slug);
  const c = data.contas.find((x) => x.id === id);
  if (!c) throw new Error("conta não encontrada");
  c.status = status;
  c.pagoEm = status === "pago" ? new Date().toISOString() : undefined;
  persist(slug, data);
  return data;
}

export function deleteConta(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  data.contas = data.contas.filter((c) => c.id !== id);
  persist(slug, data);
  return data;
}

export function addAssinatura(slug: string, input: Partial<Assinatura>): FinanceiroData {
  const data = readFinanceiro(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome da assinatura");
  const valorMensal = Number(input.valorMensal);
  if (!valorMensal || valorMensal <= 0) throw new Error("informe um valor mensal válido");
  data.assinaturas.push({
    id: newId(),
    nome,
    valorMensal,
    diaCobranca: Math.min(31, Math.max(1, Number(input.diaCobranca) || 1)),
    ativa: true,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function toggleAssinatura(slug: string, id: string): FinanceiroData {
  const data = readFinanceiro(slug);
  const a = data.assinaturas.find((x) => x.id === id);
  if (!a) throw new Error("assinatura não encontrada");
  a.ativa = !a.ativa;
  persist(slug, data);
  return data;
}

// ---- agregações (usadas pela Visão Geral e pelos gráficos) ----------------

export interface ResumoFinanceiro {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  contasReceberPendentes: number;
  contasPagarPendentes: number;
  contasAtrasadas: number;
  assinaturasAtivas: number;
  custoAssinaturasMensal: number;
  funcionariosAtivos: number;
  custoFolhaMensal: number;
}

export function resumoFinanceiro(data: FinanceiroData): ResumoFinanceiro {
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

/** Fluxo de caixa por mês (últimos N meses) — entradas/saídas/saldo. */
export function fluxoCaixaMensal(data: FinanceiroData, meses = 6) {
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

/** Saldo atual de cada carteira: saldoInicial + lançamentos vinculados a ela. */
export function saldoCarteiras(data: FinanceiroData) {
  return data.carteiras.map((c) => {
    const movimentado = data.lancamentos
      .filter((l) => l.carteiraId === c.id)
      .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor : -l.valor), 0);
    return { carteira: c, saldo: c.saldoInicial + movimentado };
  });
}

/** Total gasto (saídas) por categoria, opcionalmente filtrado por mês ("YYYY-MM"). */
export function gastoPorCategoria(data: FinanceiroData, mes?: string) {
  const porCategoria = new Map<string, number>();
  for (const l of data.lancamentos) {
    if (l.tipo !== "saida") continue;
    if (mes && l.data.slice(0, 7) !== mes) continue;
    const key = l.categoriaId || "__sem_categoria__";
    porCategoria.set(key, (porCategoria.get(key) || 0) + l.valor);
  }
  return Array.from(porCategoria.entries())
    .map(([categoriaId, total]) => {
      const cat = data.categorias.find((c) => c.id === categoriaId);
      return { categoriaId, nome: cat?.nome || "Sem categoria", cor: cat?.cor || "#78716c", total };
    })
    .sort((a, b) => b.total - a.total);
}

export interface OrcamentoCategoria {
  categoriaId: string;
  nome: string;
  cor: string;
  planejado: number;
  gasto: number;
}

/** Orçamento (envelope budgeting) do mês: planejado x gasto por categoria de saída. */
export function orcamentoDoMes(data: FinanceiroData, mes: string): OrcamentoCategoria[] {
  const gastos = new Map(gastoPorCategoria(data, mes).map((g) => [g.categoriaId, g.total]));
  return data.metas
    .filter((m) => m.mes === mes)
    .map((m) => {
      const cat = data.categorias.find((c) => c.id === m.categoriaId);
      return {
        categoriaId: m.categoriaId,
        nome: cat?.nome || "Categoria removida",
        cor: cat?.cor || "#78716c",
        planejado: m.valorPlanejado,
        gasto: gastos.get(m.categoriaId) || 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export interface SaudeFinanceira {
  score: number; // 0-100
  nivel: "critico" | "atencao" | "bom" | "otimo";
  alertas: string[];
  runwayMeses: number | null; // quantos meses o saldo atual cobre no ritmo de gasto médio
}

/** Score simples de saúde financeira: saldo positivo, contas atrasadas, gasto vs
 * receita do mês corrente e "fôlego" (runway) do saldo acumulado. Sem número
 * inventado — tudo calculado em cima de lançamentos e contas reais. */
export function saudeFinanceira(data: FinanceiroData): SaudeFinanceira {
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

export interface ItemAgenda {
  id: string;
  tipo: "receber" | "pagar" | "assinatura";
  descricao: string;
  valor: number;
  data: string; // próxima data relevante (vencimento ou próxima cobrança)
  atrasado: boolean;
}

/** Agenda financeira: contas a pagar/receber pendentes + próxima cobrança de
 * cada assinatura ativa, tudo numa linha do tempo só, ordenado por data. */
export function agendaFinanceira(data: FinanceiroData): ItemAgenda[] {
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

export interface ProjecaoMes {
  mes: string;
  aReceber: number;
  aPagar: number;
  custoRecorrente: number;
  saldoProjetado: number;
}

/** Projeção de caixa pros próximos meses: parte do saldo atual e soma só o
 * que já está agendado (contas a receber/pagar pendentes com vencimento no
 * mês) menos o custo recorrente das assinaturas ativas. Não projeta vendas
 * futuras que ainda não foram cadastradas — é uma estimativa conservadora,
 * não uma previsão de receita. */
export function projecaoCaixa(data: FinanceiroData, meses = 6): ProjecaoMes[] {
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
