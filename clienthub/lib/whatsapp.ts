import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, fileExists } from "./bos";
import { readIntegrations, setWhatsApp, evolutionConfigurado, WhatsAppInstanceConfig } from "./integrations";
import {
  leadsComAutomacaoPendente,
  marcarAutomacaoDisparada,
  montarMensagemAutomacao,
  addAnotacao,
  addLigacao,
} from "./crm";

/**
 * Integração WhatsApp via Evolution API (self-hosted, ver
 * `../_referencias/evolution-api-main` e docs/WHATSAPP-EVOLUTION-API.md).
 *
 * Um servidor Evolution API só, compartilhado pela instalação inteira
 * (EVOLUTION_API_URL/EVOLUTION_API_KEY) — cada cliente do Hub ganha a
 * própria "instance" lá dentro (isolamento nativo do Evolution API), nome
 * da instance = slug do tenant. Token da instance fica em
 * `_integracoes/<slug>.json` (segredo, nunca na pasta do tenant).
 *
 * Conversas (mensagens de verdade) são dado de negócio do cliente — vivem
 * em `dados/whatsapp.json` DENTRO da pasta do tenant, mesmo padrão de
 * crm.json/financeiro.json.
 */

// ---- cliente HTTP do Evolution API ------------------------------------------

const EVOLUTION_EVENTS = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED", "CALL", "CONTACTS_UPSERT"];

function apiUrl(): string {
  return (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
}

function webhookUrl(slug: string): string {
  const base = (process.env.HUB_URL || "").replace(/\/+$/, "");
  return `${base}/api/whatsapp/webhook/${slug}`;
}

async function evoFetch(pathname: string, opts: { method: string; apiKey: string; body?: unknown }) {
  const res = await fetch(`${apiUrl()}${pathname}`, {
    method: opts.method,
    headers: { "Content-Type": "application/json", apikey: opts.apiKey },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // o Evolution API às vezes aninha a mensagem de verdade em "response.message"
    // (ex.: 403 de nome de instância duplicado) — sem isso, só sobra "Forbidden"/"Bad Request" genérico
    const msg = (data && (data.response?.message || data.message || data.error)) || `Evolution API respondeu ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join("; ") : String(msg));
  }
  return data;
}

export interface QrCodeResult {
  base64?: string;
  pairingCode?: string;
}

/** Conecta o WhatsApp desse cliente e devolve o QR code pra parear.
 * "Desconectar" faz só logout no Evolution API — a instance continua
 * existindo lá (com o mesmo token) até "Excluir instância" ser usado. Por
 * isso, se já tem token salvo, reaproveita a instance existente (só pede QR
 * novo) em vez de tentar criar de novo — criar de novo com o mesmo nome dá
 * 403 "already in use". Só cria uma instance nova de fato na primeira vez
 * (ou se o token salvo não existir mais no Evolution API). */
export async function conectarInstancia(slug: string): Promise<QrCodeResult> {
  if (!evolutionConfigurado()) throw new Error("EVOLUTION_API_URL/EVOLUTION_API_KEY não configurados nesta instalação.");
  if (!process.env.HUB_URL) throw new Error("HUB_URL não configurado — preciso saber o endereço público do Hub pra receber os webhooks.");

  const tokenExistente = readIntegrations(slug).whatsapp?.instanceToken;
  if (tokenExistente) {
    try {
      const qr = await obterNovoQrCode(slug);
      setWhatsApp(slug, { status: "conectando" });
      return qr;
    } catch {
      // token não serve mais (instance foi excluída direto no Evolution API,
      // fora do Hub) — cai pro fluxo de criação abaixo
    }
  }

  const adminKey = process.env.EVOLUTION_API_KEY!;
  const result = await evoFetch("/instance/create", {
    method: "POST",
    apiKey: adminKey,
    body: {
      instanceName: slug,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: { url: webhookUrl(slug), byEvents: false, events: EVOLUTION_EVENTS },
    },
  });

  setWhatsApp(slug, { instanceName: slug, instanceToken: result.hash, status: "conectando" });
  const qr = result.qrcode as { base64?: string; pairingCode?: string } | undefined;
  return { base64: qr?.base64, pairingCode: qr?.pairingCode };
}

function instanceToken(slug: string): string {
  const cfg = readIntegrations(slug).whatsapp;
  if (!cfg?.instanceToken) throw new Error("esse cliente ainda não tem uma instância WhatsApp criada.");
  return cfg.instanceToken;
}

/** Pede um QR novo (o anterior expira em ~40s) sem recriar a instance. */
export async function obterNovoQrCode(slug: string): Promise<QrCodeResult> {
  const data = await evoFetch(`/instance/connect/${encodeURIComponent(slug)}`, { method: "GET", apiKey: instanceToken(slug) });
  return { base64: data?.base64, pairingCode: data?.pairingCode };
}

export async function statusConexao(slug: string): Promise<string> {
  const data = await evoFetch(`/instance/connectionState/${encodeURIComponent(slug)}`, { method: "GET", apiKey: instanceToken(slug) });
  const estado = data?.instance?.state || data?.state || "unknown";
  const status: WhatsAppInstanceConfig["status"] = estado === "open" ? "conectado" : estado === "connecting" ? "conectando" : "desconectado";
  const atual = readIntegrations(slug).whatsapp;
  if (atual && atual.status !== status) {
    setWhatsApp(slug, { status, ...(status === "conectado" ? { conectadoEm: new Date().toISOString() } : {}) });
  }
  return estado;
}

export async function desconectar(slug: string): Promise<void> {
  await evoFetch(`/instance/logout/${encodeURIComponent(slug)}`, { method: "DELETE", apiKey: instanceToken(slug) });
  setWhatsApp(slug, { status: "desconectado", desconectadoEm: new Date().toISOString() });
}

export async function excluirInstancia(slug: string): Promise<void> {
  const token = instanceToken(slug);
  await evoFetch(`/instance/delete/${encodeURIComponent(slug)}`, { method: "DELETE", apiKey: token });
  setWhatsApp(slug, { instanceName: undefined, instanceToken: undefined, status: "desconectado", numero: undefined });
}

/** Manda uma mensagem de texto pro número (com DDI, só dígitos ou com +).
 * Devolve o id da mensagem no WhatsApp (`key.id` do Baileys) em caso de
 * sucesso na CHAMADA — importante: "sucesso" aqui é só o Evolution API ter
 * aceitado o pedido de envio, não confirmação de entrega de verdade. O
 * WhatsApp confirma/rejeita a entrega depois, de forma assíncrona, via
 * webhook "messages.update" (ver `marcarStatusMensagem` e o handler do
 * webhook) — é por isso que guardamos esse id, pra poder casar a atualização
 * de status com a mensagem certa depois. */
export async function enviarMensagemWhatsapp(slug: string, numero: string, texto: string): Promise<string | null> {
  try {
    const resp = await evoFetch(`/message/sendText/${encodeURIComponent(slug)}`, {
      method: "POST",
      apiKey: instanceToken(slug),
      body: { number: numero.replace(/\D/g, ""), text: texto },
    });
    return resp?.key?.id ? String(resp.key.id) : "";
  } catch {
    return null;
  }
}

export interface WhatsAppContato {
  numero: string;
  nome?: string;
}

/** Lista os contatos já salvos na instância (pra importar como leads).
 * "remoteJid" é o JID de WhatsApp de verdade (ex.: 5511999998888@s.whatsapp.net)
 * — "id" é só a chave primária (cuid) do registro no banco do Evolution API,
 * não um número de telefone (bug corrigido: o código antigo lia de "id").
 * Contatos "@lid" (identificador de privacidade que o WhatsApp usa em vez do
 * número de telefone em alguns grupos/contas business) ficam de fora — não dá
 * pra mandar mensagem/importar histórico com um "número" que não é um número
 * de telefone de verdade. */
export async function listarContatosWhatsapp(slug: string): Promise<WhatsAppContato[]> {
  const data = await evoFetch(`/chat/findContacts/${encodeURIComponent(slug)}`, {
    method: "POST",
    apiKey: instanceToken(slug),
    body: {},
  });
  const lista = Array.isArray(data) ? data : [];
  return lista
    .filter((c: { remoteJid?: string }) => c.remoteJid?.endsWith("@s.whatsapp.net")) // sem grupos e sem @lid
    .map((c: { remoteJid: string; pushName?: string }) => ({
      numero: c.remoteJid.replace("@s.whatsapp.net", ""),
      nome: c.pushName || undefined,
    }));
}

// ---- conversas (dado do cliente, dentro da pasta do tenant) -----------------

export interface WhatsAppMensagem {
  id: string;
  numero: string;
  direcao: "recebida" | "enviada";
  texto: string;
  automatica?: boolean;
  /** true quando o WhatsApp confirmou (via webhook messages.update) que a
   * entrega falhou — comum em sessão recém-conectada mandando pra contato
   * novo, o WhatsApp pode rejeitar silenciosamente por anti-spam. Ver
   * docs/WHATSAPP-EVOLUTION-API.md. */
  falhou?: boolean;
  criadoEm: string;
}

interface WhatsAppConversasData {
  mensagens: WhatsAppMensagem[];
}

const WA_FILE = "dados/whatsapp.json";

function waPath(slug: string): string {
  return assertInsideTenant(slug, WA_FILE);
}

function readConversas(slug: string): WhatsAppConversasData {
  const p = waPath(slug);
  if (!fileExists(p)) return { mensagens: [] };
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as WhatsAppConversasData;
    if (!Array.isArray(data.mensagens)) data.mensagens = [];
    return data;
  } catch {
    return { mensagens: [] };
  }
}

function persistConversas(slug: string, data: WhatsAppConversasData): void {
  const p = waPath(slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Teto de retenção por tenant (todas as conversas somadas, não por contato).
// Limite conhecido do storage file-based: se um cliente tiver volume muito alto
// de mensagens (chat ao vivo + histórico importado), isso é o gatilho pra
// reavaliar storage (Postgres) — mesmo raciocínio já documentado pra Financeiro/CRM.
const MAX_MENSAGENS = 10000;

export function registrarMensagem(slug: string, msg: Omit<WhatsAppMensagem, "id" | "criadoEm"> & { id?: string }): void {
  const data = readConversas(slug);
  data.mensagens.push({
    criadoEm: new Date().toISOString(),
    ...msg,
    // id explícito (ex.: "evo-<key.id do Baileys>") permite casar com uma
    // atualização de status depois — sem id, gera um local só pra identidade na lista
    id: msg.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  if (data.mensagens.length > MAX_MENSAGENS) data.mensagens = data.mensagens.slice(-MAX_MENSAGENS);
  persistConversas(slug, data);
}

/** Marca uma mensagem enviada como "falhou" (entrega rejeitada pelo
 * WhatsApp) — chamado pelo webhook quando chega "messages.update" com
 * status ERROR pro id dessa mensagem. */
export function marcarMensagemFalhou(slug: string, id: string): void {
  const data = readConversas(slug);
  const m = data.mensagens.find((x) => x.id === id);
  if (!m) return;
  m.falhou = true;
  persistConversas(slug, data);
}

export function listarConversa(slug: string, numero?: string): WhatsAppMensagem[] {
  const data = readConversas(slug);
  const msgs = numero ? data.mensagens.filter((m) => m.numero.replace(/\D/g, "") === numero.replace(/\D/g, "")) : data.mensagens;
  return [...msgs].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

/** Manda a mensagem pelo Evolution API e já registra na conversa local — usado
 * pelo chat ao vivo do CRM, pelo teste de conexão e pelo agente de IA. */
export async function enviarERegistrar(slug: string, numero: string, texto: string, automatica = false): Promise<boolean> {
  const idMensagem = await enviarMensagemWhatsapp(slug, numero, texto);
  if (idMensagem === null) return false;
  registrarMensagem(slug, { id: idMensagem ? `evo-${idMensagem}` : undefined, numero, direcao: "enviada", texto, automatica });
  return true;
}

/** Puxa o histórico retroativo de um contato direto do Evolution API
 * (`/chat/findMessages`, consulta o Postgres da própria instância — só tem o
 * que o Baileys já sincronizou desde que a instância foi pareada, não é o
 * histórico completo "de sempre" do celular) e grava em dados/whatsapp.json.
 * Devolve quantas mensagens novas entraram (ignora duplicatas por id). */
export async function importarHistoricoConversa(slug: string, numero: string): Promise<number> {
  const remoteJid = `${numero.replace(/\D/g, "")}@s.whatsapp.net`;
  const data = readConversas(slug);
  const existentes = new Set(data.mensagens.map((m) => m.id));
  const novasMensagens: WhatsAppMensagem[] = [];
  let page = 1;

  while (true) {
    const resp = await evoFetch(`/chat/findMessages/${encodeURIComponent(slug)}`, {
      method: "POST",
      apiKey: instanceToken(slug),
      // o Evolution API guarda mensagem por "remoteJid" OU "remoteJidAlt" (WhatsApp
      // às vezes usa um identificador @lid como remoteJid principal e só o número de
      // telefone de verdade fica em remoteJidAlt) — manda os dois pra bater com as duas
      // formas de armazenar a mesma conversa.
      body: { where: { key: { remoteJid, remoteJidAlt: remoteJid } }, page, offset: 100 },
    });
    const bloco = resp?.messages;
    const records: Array<{
      key?: { id?: string; fromMe?: boolean };
      message?: { conversation?: string; extendedTextMessage?: { text?: string } };
      messageTimestamp?: number;
    }> = bloco?.records || [];

    for (const rec of records) {
      const texto = rec.message?.conversation || rec.message?.extendedTextMessage?.text;
      if (!texto) continue; // outros tipos (imagem, áudio, doc) ficam de fora, igual ao webhook
      const id = rec.key?.id ? `evo-${rec.key.id}` : `evo-${rec.messageTimestamp}-${Math.random().toString(36).slice(2, 8)}`;
      if (existentes.has(id)) continue;
      existentes.add(id);
      novasMensagens.push({
        id,
        numero: numero.replace(/\D/g, ""),
        direcao: rec.key?.fromMe ? "enviada" : "recebida",
        texto,
        criadoEm: rec.messageTimestamp ? new Date(rec.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
      });
    }

    const totalPages = bloco?.pages || 1;
    if (page >= totalPages || records.length === 0) break;
    page++;
  }

  if (novasMensagens.length > 0) {
    data.mensagens.push(...novasMensagens);
    data.mensagens.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    if (data.mensagens.length > MAX_MENSAGENS) data.mensagens = data.mensagens.slice(-MAX_MENSAGENS);
    persistConversas(slug, data);
  }
  return novasMensagens.length;
}

// ---- automações por etapa (disparadas pelo cron) -----------------------------

export interface ResultadoAutomacoes {
  enviadas: number;
  falhas: number;
}

/** Roda pra um cliente só: acha os leads com automação vencida e manda a
 * mensagem de cada um. Chamado pela rota de cron pra cada tenant conectado. */
export async function processarAutomacoesPendentes(slug: string): Promise<ResultadoAutomacoes> {
  const pendentes = leadsComAutomacaoPendente(slug);
  let enviadas = 0;
  let falhas = 0;
  for (const { lead, fase } of pendentes) {
    if (!lead.whatsapp || !fase.automacaoWhatsapp) continue;
    const texto = montarMensagemAutomacao(fase.automacaoWhatsapp.mensagem, lead);
    const idMensagem = await enviarMensagemWhatsapp(slug, lead.whatsapp, texto);
    if (idMensagem !== null) {
      marcarAutomacaoDisparada(slug, lead.id, fase.id);
      registrarMensagem(slug, { id: idMensagem ? `evo-${idMensagem}` : undefined, numero: lead.whatsapp, direcao: "enviada", texto, automatica: true });
      addAnotacao(slug, { texto: `Mensagem automática enviada (etapa "${fase.nome}"): ${texto}`, leadId: lead.id });
      enviadas++;
    } else {
      falhas++;
    }
  }
  return { enviadas, falhas };
}

/** Registra uma chamada recebida do webhook do Evolution API como ligação no CRM. */
export function registrarChamadaWhatsapp(slug: string, numero: string, resultado: "atendida" | "perdida" | "recusada"): void {
  addLigacao(slug, { numero, resultado });
}
