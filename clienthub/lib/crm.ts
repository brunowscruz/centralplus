import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertInsideTenant, fileExists } from "./bos";
import { readConfig } from "./tenants";
import { upsertCliente, patchCliente } from "./clientes";

/**
 * Módulo CRM (nativo). Modelo de dados inspirado no Frappe CRM (lead status,
 * deal status com probabilidade, tarefas, anotações, ligações), mas
 * implementado do zero — a licença AGPL-3.0 do Frappe impede embutir o código
 * num SaaS comercial (regra de ouro da seção 2.5 do spec).
 *
 * Dado vive DENTRO da pasta do tenant (`dados/crm.json`): é dado de negócio
 * do cliente — o Claude Code do workspace pode ler/analisar, e o isolamento
 * multi-tenant é o mesmo sandbox de sempre (assertInsideTenant).
 */

/** Regra simples de automação por etapa: "quando o lead entra aqui, espera N
 * dias e manda essa mensagem" — ver docs/WHATSAPP-EVOLUTION-API.md. Suporta
 * {{nome}}/{{empresa}} no texto. */
export interface CrmAutomacaoWhatsapp {
  ativo: boolean;
  atrasoDias: number;
  mensagem: string;
}

export interface CrmFase {
  id: string;
  nome: string;
  cor: string;
  /** fase terminal: "ganho" | "perdido" | null (fase normal do funil) */
  tipo: "normal" | "ganho" | "perdido";
  automacaoWhatsapp?: CrmAutomacaoWhatsapp;
}

export interface CrmLead {
  id: string;
  nome: string;
  empresa?: string;
  email?: string;
  whatsapp?: string;
  origem?: string; // "Instagram", "Indicação", "Google", "WhatsApp direto"...
  valor?: number; // valor estimado do negócio (R$)
  faseId: string;
  /** sub-status dentro de "perdido" (seção 13.5): ex "retomar depois", "não passou no crédito" */
  subStatus?: string;
  /** vínculo com dados/clientes.json (base de contatos única do tenant) */
  clienteId?: string;
  /** quando entrou na fase ATUAL — base pro atraso da automação (não é o mesmo que atualizadoEm, que muda em qualquer edição) */
  entrouNaFaseEm?: string;
  /** faseId -> ISO de quando a automação daquela fase já disparou pra esse lead (evita duplicar envio) */
  automacaoDisparadaEm?: Record<string, string>;
  tags?: string[];
  /** nome do vendedor/responsável — texto livre, o produto ainda não tem multi-usuário de verdade */
  responsavel?: string;
  /** true quando o lead pediu atendimento humano ao agente de IA (handoff) — o
   * agente para de responder até o operador desmarcar isso manualmente */
  atendimentoHumano?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CrmTarefa {
  id: string;
  titulo: string;
  quando?: string; // ISO date
  leadId?: string;
  feita: boolean;
  criadoEm: string;
}

export interface CrmAnotacao {
  id: string;
  texto: string;
  leadId?: string;
  criadoEm: string;
}

export interface CrmLigacao {
  id: string;
  numero: string;
  duracaoSegundos?: number;
  resultado?: "atendida" | "perdida" | "recusada";
  leadId?: string;
  criadoEm: string;
}

/** Link curto público (`/r/<slug>/<codigo>`) pra colocar em anúncio/bio —
 * conta clique e redireciona pro WhatsApp (com texto pré-preenchido) ou pra
 * uma URL qualquer (página de vendas etc). O `wa.me` não repassa nenhum
 * parâmetro pra dentro da conversa — o único jeito de saber depois de onde
 * o lead veio é o texto de abertura da mensagem, por isso `mensagem` aqui é
 * a mesma coisa que preenche o link E o que casamos no webhook do WhatsApp
 * (ver `upsertLeadDoWhatsapp`) pra gravar a origem sozinho. */
export interface LinkRastreio {
  id: string;
  codigo: string;
  nome: string;
  destino: "whatsapp" | "url";
  numeroWhatsapp?: string;
  mensagem?: string;
  url?: string;
  origem: string;
  cliques: number;
  leadsAtribuidos: number;
  criadoEm: string;
}

export interface CrmData {
  preset: string;
  /** token de captação de lead (Integrações) — não é secreto de acesso ao
   * CRM, só autoriza CRIAR lead via webhook público. Pode ser regenerado. */
  token: string;
  fases: CrmFase[];
  leads: CrmLead[];
  tarefas: CrmTarefa[];
  anotacoes: CrmAnotacao[];
  ligacoes: CrmLigacao[];
  linksRastreio: LinkRastreio[];
}

/** Presets de funil por vertical (seção 4 item 4 / seção 13 do spec). */
const PRESETS: Record<string, { nome: string; fases: Omit<CrmFase, "id">[] }> = {
  geral: {
    nome: "Geral (Completo)",
    fases: [
      { nome: "Novo lead", cor: "#6366f1", tipo: "normal" },
      { nome: "Contato feito", cor: "#0891b2", tipo: "normal" },
      { nome: "Proposta enviada", cor: "#ca8a04", tipo: "normal" },
      { nome: "Negociação", cor: "#c026d3", tipo: "normal" },
      { nome: "Ganho", cor: "#16a34a", tipo: "ganho" },
      { nome: "Perdido", cor: "#dc2626", tipo: "perdido" },
    ],
  },
  clinica: {
    nome: "Clínica & Estética",
    fases: [
      { nome: "Novo contato", cor: "#6366f1", tipo: "normal" },
      { nome: "Avaliação agendada", cor: "#0891b2", tipo: "normal" },
      { nome: "Avaliação feita", cor: "#ca8a04", tipo: "normal" },
      { nome: "Orçamento enviado", cor: "#c026d3", tipo: "normal" },
      { nome: "Fechado", cor: "#16a34a", tipo: "ganho" },
      { nome: "Não fechou", cor: "#dc2626", tipo: "perdido" },
    ],
  },
  varejo: {
    nome: "Varejo & Comércio",
    fases: [
      { nome: "Interessado", cor: "#6366f1", tipo: "normal" },
      { nome: "Atendimento", cor: "#0891b2", tipo: "normal" },
      { nome: "Orçamento", cor: "#ca8a04", tipo: "normal" },
      { nome: "Venda feita", cor: "#16a34a", tipo: "ganho" },
      { nome: "Não comprou", cor: "#dc2626", tipo: "perdido" },
    ],
  },
  servicos: {
    nome: "Serviços & Autônomos",
    fases: [
      { nome: "Novo lead", cor: "#6366f1", tipo: "normal" },
      { nome: "Conversa iniciada", cor: "#0891b2", tipo: "normal" },
      { nome: "Proposta", cor: "#ca8a04", tipo: "normal" },
      { nome: "Fechado", cor: "#16a34a", tipo: "ganho" },
      { nome: "Perdido", cor: "#dc2626", tipo: "perdido" },
    ],
  },
  imobiliarias: {
    nome: "Imobiliária / Corretor",
    fases: [
      { nome: "Novo cliente", cor: "#6366f1", tipo: "normal" },
      { nome: "Visita agendada", cor: "#0891b2", tipo: "normal" },
      { nome: "Visita feita", cor: "#ca8a04", tipo: "normal" },
      { nome: "Proposta / Crédito", cor: "#c026d3", tipo: "normal" },
      { nome: "Fechado", cor: "#16a34a", tipo: "ganho" },
      { nome: "Não fechado", cor: "#dc2626", tipo: "perdido" },
    ],
  },
  "clinica-estetica": {
    nome: "Clínica & Estética",
    fases: [],
  },
};
// alias usado nos hubs.json antigos
PRESETS["clinica-estetica"] = PRESETS.clinica;

/** Sub-status sugeridos pra fase "perdido" (o corretor de imóveis do Banco de Ideias). */
export const SUB_STATUS_PERDIDO = [
  "Retomar contato depois",
  "Não passou no crédito — checar mais pra frente",
  "Fechou com concorrente",
  "Sem resposta",
];

const CRM_FILE = "dados/crm.json";

function crmPath(slug: string): string {
  return assertInsideTenant(slug, CRM_FILE);
}

function newId(): string {
  return crypto.randomBytes(6).toString("hex");
}

function seed(slug: string): CrmData {
  const presetId = readConfig(slug).crmPreset || "geral";
  const preset = PRESETS[presetId] || PRESETS.geral;
  const data: CrmData = {
    preset: presetId,
    token: newId() + newId(),
    fases: preset.fases.map((f) => ({ ...f, id: newId() })),
    leads: [],
    tarefas: [],
    anotacoes: [],
    ligacoes: [],
    linksRastreio: [],
  };
  persist(slug, data);
  return data;
}

function persist(slug: string, data: CrmData): void {
  const p = crmPath(slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readCrm(slug: string): CrmData {
  const p = crmPath(slug);
  if (!fileExists(p)) return seed(slug);
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as CrmData;
    let mudou = false;
    if (!data.token) {
      data.token = newId() + newId();
      mudou = true;
    }
    if (!data.linksRastreio) {
      data.linksRastreio = [];
      mudou = true;
    }
    if (mudou) persist(slug, data);
    return data;
  } catch {
    return seed(slug);
  }
}

/** Regenera o token de captação (invalida qualquer formulário/webhook antigo). */
export function regenerarToken(slug: string): CrmData {
  const data = readCrm(slug);
  data.token = newId() + newId();
  persist(slug, data);
  return data;
}

/** Usado pelo endpoint público de captação (sem sessão) — valida o token. */
export function addLeadPublico(slug: string, token: string, input: Partial<CrmLead>): CrmData {
  const data = readCrm(slug);
  if (!data.token || data.token !== token) throw new Error("token inválido");
  return addLead(slug, input);
}

// ---- mutações (todas persistem e retornam o estado inteiro) -----------------

export function addFase(slug: string, input: { nome?: string; cor?: string; tipo?: CrmFase["tipo"] }): CrmData {
  const data = readCrm(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome da etapa");
  data.fases.push({ id: newId(), nome, cor: input.cor || "#6366f1", tipo: input.tipo || "normal" });
  persist(slug, data);
  return data;
}

export function editarFase(slug: string, faseId: string, input: { nome?: string; cor?: string }): CrmData {
  const data = readCrm(slug);
  const fase = data.fases.find((f) => f.id === faseId);
  if (!fase) throw new Error("etapa não encontrada");
  if (input.nome !== undefined) {
    const nome = input.nome.trim();
    if (!nome) throw new Error("informe o nome da etapa");
    fase.nome = nome;
  }
  if (input.cor !== undefined && input.cor) fase.cor = input.cor;
  persist(slug, data);
  return data;
}

/** Recusa excluir fase com leads dentro — evita apagar lead "órfão" (sem faseId válido). */
export function excluirFase(slug: string, faseId: string): CrmData {
  const data = readCrm(slug);
  const fase = data.fases.find((f) => f.id === faseId);
  if (!fase) throw new Error("etapa não encontrada");
  const temLeads = data.leads.some((l) => l.faseId === faseId);
  if (temLeads) throw new Error("mova os leads dessa etapa pra outra antes de excluir");
  data.fases = data.fases.filter((f) => f.id !== faseId);
  persist(slug, data);
  return data;
}

/** Define (ou desliga) a automação de WhatsApp de uma etapa do funil. */
export function definirAutomacaoFase(slug: string, faseId: string, automacao: CrmAutomacaoWhatsapp): CrmData {
  const data = readCrm(slug);
  const fase = data.fases.find((f) => f.id === faseId);
  if (!fase) throw new Error("etapa não encontrada");
  fase.automacaoWhatsapp = automacao;
  persist(slug, data);
  return data;
}

export function addLead(slug: string, input: Partial<CrmLead>): CrmData {
  const data = readCrm(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe o nome do lead");
  const fase = data.fases.find((f) => f.id === input.faseId) || data.fases[0];
  const now = new Date().toISOString();
  const cliente = upsertCliente(slug, {
    nome,
    empresa: input.empresa,
    email: input.email,
    whatsapp: input.whatsapp,
    origem: input.origem,
  });
  data.leads.push({
    id: newId(),
    nome,
    empresa: input.empresa?.trim() || undefined,
    email: input.email?.trim() || undefined,
    whatsapp: input.whatsapp?.trim() || undefined,
    origem: input.origem?.trim() || undefined,
    valor: typeof input.valor === "number" && input.valor >= 0 ? input.valor : undefined,
    faseId: fase.id,
    clienteId: cliente.id,
    entrouNaFaseEm: now,
    criadoEm: now,
    atualizadoEm: now,
  });
  persist(slug, data);
  return data;
}

export function updateLead(slug: string, id: string, patch: Partial<CrmLead>): CrmData {
  const data = readCrm(slug);
  const lead = data.leads.find((l) => l.id === id);
  if (!lead) throw new Error("lead não encontrado");
  if (patch.nome !== undefined) lead.nome = patch.nome.trim() || lead.nome;
  if (patch.empresa !== undefined) lead.empresa = patch.empresa.trim() || undefined;
  if (patch.email !== undefined) lead.email = patch.email.trim() || undefined;
  if (patch.whatsapp !== undefined) lead.whatsapp = patch.whatsapp.trim() || undefined;
  if (patch.origem !== undefined) lead.origem = patch.origem.trim() || undefined;
  if (patch.valor !== undefined) lead.valor = typeof patch.valor === "number" && patch.valor >= 0 ? patch.valor : undefined;
  if (patch.subStatus !== undefined) lead.subStatus = patch.subStatus || undefined;
  if (patch.tags !== undefined) lead.tags = patch.tags.map((t) => t.trim()).filter(Boolean);
  if (patch.responsavel !== undefined) lead.responsavel = patch.responsavel.trim() || undefined;
  if (patch.atendimentoHumano !== undefined) lead.atendimentoHumano = patch.atendimentoHumano;
  if (patch.faseId !== undefined && data.fases.some((f) => f.id === patch.faseId) && patch.faseId !== lead.faseId) {
    lead.faseId = patch.faseId;
    lead.entrouNaFaseEm = new Date().toISOString();
    const fase = data.fases.find((f) => f.id === patch.faseId)!;
    if (fase.tipo !== "perdido") lead.subStatus = undefined;
  }
  lead.atualizadoEm = new Date().toISOString();
  if (lead.clienteId && (patch.nome !== undefined || patch.empresa !== undefined || patch.email !== undefined || patch.whatsapp !== undefined)) {
    patchCliente(slug, lead.clienteId, {
      nome: lead.nome,
      empresa: lead.empresa,
      email: lead.email,
      whatsapp: lead.whatsapp,
    });
  }
  persist(slug, data);
  return data;
}

export function deleteLead(slug: string, id: string): CrmData {
  const data = readCrm(slug);
  data.leads = data.leads.filter((l) => l.id !== id);
  data.tarefas = data.tarefas.filter((t) => t.leadId !== id);
  data.anotacoes = data.anotacoes.filter((a) => a.leadId !== id);
  data.ligacoes = data.ligacoes.filter((c) => c.leadId !== id);
  persist(slug, data);
  return data;
}

export function addTarefa(slug: string, input: Partial<CrmTarefa>): CrmData {
  const data = readCrm(slug);
  const titulo = (input.titulo || "").trim();
  if (!titulo) throw new Error("informe o título da tarefa");
  data.tarefas.push({
    id: newId(),
    titulo,
    quando: input.quando || undefined,
    leadId: input.leadId || undefined,
    feita: false,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function toggleTarefa(slug: string, id: string): CrmData {
  const data = readCrm(slug);
  const t = data.tarefas.find((x) => x.id === id);
  if (!t) throw new Error("tarefa não encontrada");
  t.feita = !t.feita;
  persist(slug, data);
  return data;
}

export function deleteTarefa(slug: string, id: string): CrmData {
  const data = readCrm(slug);
  data.tarefas = data.tarefas.filter((t) => t.id !== id);
  persist(slug, data);
  return data;
}

export function addAnotacao(slug: string, input: Partial<CrmAnotacao>): CrmData {
  const data = readCrm(slug);
  const texto = (input.texto || "").trim();
  if (!texto) throw new Error("escreva a anotação");
  data.anotacoes.push({ id: newId(), texto, leadId: input.leadId || undefined, criadoEm: new Date().toISOString() });
  persist(slug, data);
  return data;
}

export function deleteAnotacao(slug: string, id: string): CrmData {
  const data = readCrm(slug);
  data.anotacoes = data.anotacoes.filter((a) => a.id !== id);
  persist(slug, data);
  return data;
}

export function addLigacao(slug: string, input: Partial<CrmLigacao>): CrmData {
  const data = readCrm(slug);
  const numero = (input.numero || "").trim();
  if (!numero) throw new Error("informe o número");
  data.ligacoes.push({
    id: newId(),
    numero,
    duracaoSegundos: typeof input.duracaoSegundos === "number" ? input.duracaoSegundos : undefined,
    resultado: input.resultado,
    leadId: input.leadId || undefined,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

// ---- integração com WhatsApp (Evolution API) -------------------------------

/** Casa por número exato (com/sem sufixo @s.whatsapp.net) — usado pelo
 * webhook do WhatsApp e por outras integrações de telefone. */
function normalizarNumero(numero: string): string {
  return numero.replace(/\D/g, "");
}

function normalizarTexto(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Casa o texto de abertura de uma conversa nova com um Link de Rastreio
 * ativo (ver `criarLinkRastreio`) — por "começa com", tolerando o WhatsApp
 * às vezes citar/alterar levemente o texto pré-preenchido. Só é chamado na
 * CRIAÇÃO do lead, nunca depois, pra não sobrescrever a origem de uma
 * conversa que já está andando. */
function encontrarLinkPorMensagem(data: CrmData, textoRecebido: string): LinkRastreio | undefined {
  const alvo = normalizarTexto(textoRecebido);
  if (!alvo) return undefined;
  return data.linksRastreio
    .filter((l) => l.destino === "whatsapp" && l.mensagem)
    .find((l) => alvo.startsWith(normalizarTexto(l.mensagem!)));
}

/** Mensagem nova chegou no WhatsApp: acha o lead pelo número, ou cria um
 * novo na primeira fase do funil. Origem vira o nome do Link de Rastreio
 * quando a primeira mensagem bate com um deles (ver `encontrarLinkPorMensagem`),
 * senão cai no genérico "WhatsApp". Devolve o lead. */
export function upsertLeadDoWhatsapp(slug: string, input: { numero: string; nome?: string; primeiraMensagem?: string }): CrmLead {
  const data = readCrm(slug);
  const numeroLimpo = normalizarNumero(input.numero);
  const existente = data.leads.find((l) => l.whatsapp && normalizarNumero(l.whatsapp) === numeroLimpo);
  if (existente) return existente;

  const linkOrigem = input.primeiraMensagem ? encontrarLinkPorMensagem(data, input.primeiraMensagem) : undefined;
  const origem = linkOrigem?.origem || "WhatsApp";

  const nome = (input.nome || "").trim() || input.numero;
  const cliente = upsertCliente(slug, { nome, whatsapp: input.numero, origem });
  const now = new Date().toISOString();
  const fase = data.fases[0];
  const lead: CrmLead = {
    id: newId(),
    nome,
    whatsapp: input.numero,
    origem,
    faseId: fase.id,
    clienteId: cliente.id,
    entrouNaFaseEm: now,
    criadoEm: now,
    atualizadoEm: now,
  };
  data.leads.push(lead);
  if (linkOrigem) linkOrigem.leadsAtribuidos += 1;
  persist(slug, data);
  return lead;
}

// ---- Links de Rastreio (clique → WhatsApp ou URL, com atribuição) --------

function gerarCodigoLink(nome: string, existentes: string[]): string {
  const base =
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "link";
  let codigo = base;
  let i = 2;
  while (existentes.includes(codigo)) {
    codigo = `${base}-${i}`;
    i++;
  }
  return codigo;
}

export function criarLinkRastreio(
  slug: string,
  input: { nome?: string; destino?: string; numeroWhatsapp?: string; mensagem?: string; url?: string; origem?: string },
): CrmData {
  const data = readCrm(slug);
  const nome = (input.nome || "").trim();
  if (!nome) throw new Error("informe um nome pro link");
  const destino: LinkRastreio["destino"] = input.destino === "url" ? "url" : "whatsapp";
  if (destino === "whatsapp" && !input.numeroWhatsapp?.trim()) throw new Error("informe o número de WhatsApp de destino");
  if (destino === "url" && !input.url?.trim()) throw new Error("informe a URL de destino");
  data.linksRastreio.push({
    id: newId(),
    codigo: gerarCodigoLink(nome, data.linksRastreio.map((l) => l.codigo)),
    nome,
    destino,
    numeroWhatsapp: destino === "whatsapp" ? normalizarNumero(input.numeroWhatsapp!) : undefined,
    mensagem: input.mensagem?.trim() || undefined,
    url: destino === "url" ? input.url!.trim() : undefined,
    origem: input.origem?.trim() || nome,
    cliques: 0,
    leadsAtribuidos: 0,
    criadoEm: new Date().toISOString(),
  });
  persist(slug, data);
  return data;
}

export function excluirLinkRastreio(slug: string, id: string): CrmData {
  const data = readCrm(slug);
  data.linksRastreio = data.linksRastreio.filter((l) => l.id !== id);
  persist(slug, data);
  return data;
}

/** Chamado pela rota pública `/r/[slug]/[codigo]` (sem sessão) — soma o
 * clique e devolve o link pra rota decidir pra onde redirecionar. */
export function registrarCliqueLinkRastreio(slug: string, codigo: string): LinkRastreio | null {
  const data = readCrm(slug);
  const link = data.linksRastreio.find((l) => l.codigo === codigo);
  if (!link) return null;
  link.cliques += 1;
  persist(slug, data);
  return link;
}

export interface AutomacaoPendente {
  lead: CrmLead;
  fase: CrmFase;
}

/** Leads cuja automação da etapa atual já venceu (atrasoDias desde que
 * entrou na fase) e ainda não foi disparada pra eles. */
export function leadsComAutomacaoPendente(slug: string): AutomacaoPendente[] {
  const data = readCrm(slug);
  const agora = Date.now();
  const pendentes: AutomacaoPendente[] = [];
  for (const lead of data.leads) {
    if (!lead.whatsapp || !lead.entrouNaFaseEm) continue;
    const fase = data.fases.find((f) => f.id === lead.faseId);
    const automacao = fase?.automacaoWhatsapp;
    if (!fase || !automacao?.ativo || !automacao.mensagem.trim()) continue;
    if (lead.automacaoDisparadaEm?.[fase.id]) continue;
    const venceEm = new Date(lead.entrouNaFaseEm).getTime() + automacao.atrasoDias * 24 * 60 * 60 * 1000;
    if (agora >= venceEm) pendentes.push({ lead, fase });
  }
  return pendentes;
}

/** Preenche {{nome}}/{{empresa}} no template da automação. */
export function montarMensagemAutomacao(template: string, lead: CrmLead): string {
  return template
    .replace(/\{\{\s*nome\s*\}\}/gi, lead.nome.split(" ")[0] || lead.nome)
    .replace(/\{\{\s*empresa\s*\}\}/gi, lead.empresa || "");
}

export function marcarAutomacaoDisparada(slug: string, leadId: string, faseId: string): void {
  const data = readCrm(slug);
  const lead = data.leads.find((l) => l.id === leadId);
  if (!lead) return;
  lead.automacaoDisparadaEm = { ...lead.automacaoDisparadaEm, [faseId]: new Date().toISOString() };
  persist(slug, data);
}
