import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertInsideTenant, fileExists } from "./bos";

/**
 * Base de clientes/contatos ÚNICA do tenant (`dados/clientes.json`).
 * CRM (leads) e Financeiro (contas a receber/pagar, lançamentos) apontam pra
 * cá em vez de duplicar nome/telefone/e-mail em cada módulo — cadastra uma
 * vez, os dois módulos enxergam o mesmo contato (ver `upsertCliente`, usado
 * pelo CRM ao criar/editar lead, e pelo handoff CRM→Financeiro ao gerar um
 * recebível a partir de um negócio ganho).
 */

export interface Cliente {
  id: string;
  nome: string;
  empresa?: string;
  email?: string;
  whatsapp?: string;
  origem?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ClientesData {
  clientes: Cliente[];
}

const FILE = "dados/clientes.json";

function clientesPath(slug: string): string {
  return assertInsideTenant(slug, FILE);
}

function newId(): string {
  return crypto.randomBytes(6).toString("hex");
}

function persist(slug: string, data: ClientesData): void {
  const p = clientesPath(slug);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readClientes(slug: string): ClientesData {
  const p = clientesPath(slug);
  if (!fileExists(p)) return { clientes: [] };
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as ClientesData;
    if (!Array.isArray(data.clientes)) data.clientes = [];
    return data;
  } catch {
    return { clientes: [] };
  }
}

export function getCliente(slug: string, id: string): Cliente | undefined {
  return readClientes(slug).clientes.find((c) => c.id === id);
}

/**
 * Cria um cliente novo ou casa com um já existente (por WhatsApp, depois
 * e-mail) e devolve o registro atualizado. Não cria duplicata pro mesmo
 * contato — é o que permite "base de clientes única" entre módulos.
 */
export function upsertCliente(
  slug: string,
  input: { nome: string; empresa?: string; email?: string; whatsapp?: string; origem?: string },
): Cliente {
  const data = readClientes(slug);
  const nome = input.nome.trim();
  const whatsapp = input.whatsapp?.trim() || undefined;
  const email = input.email?.trim().toLowerCase() || undefined;

  const existente =
    (whatsapp && data.clientes.find((c) => c.whatsapp === whatsapp)) ||
    (email && data.clientes.find((c) => c.email === email));

  const now = new Date().toISOString();
  if (existente) {
    if (nome) existente.nome = nome;
    if (input.empresa?.trim()) existente.empresa = input.empresa.trim();
    if (email) existente.email = email;
    if (whatsapp) existente.whatsapp = whatsapp;
    if (input.origem?.trim() && !existente.origem) existente.origem = input.origem.trim();
    existente.atualizadoEm = now;
    persist(slug, data);
    return existente;
  }

  const novo: Cliente = {
    id: newId(),
    nome,
    empresa: input.empresa?.trim() || undefined,
    email,
    whatsapp,
    origem: input.origem?.trim() || undefined,
    criadoEm: now,
    atualizadoEm: now,
  };
  data.clientes.push(novo);
  persist(slug, data);
  return novo;
}

/** Atualiza um cliente já vinculado (usado quando um lead do CRM é editado). */
export function patchCliente(slug: string, id: string, patch: Partial<Omit<Cliente, "id" | "criadoEm">>): Cliente | undefined {
  const data = readClientes(slug);
  const c = data.clientes.find((x) => x.id === id);
  if (!c) return undefined;
  if (patch.nome?.trim()) c.nome = patch.nome.trim();
  if (patch.empresa !== undefined) c.empresa = patch.empresa?.trim() || undefined;
  if (patch.email !== undefined) c.email = patch.email?.trim().toLowerCase() || undefined;
  if (patch.whatsapp !== undefined) c.whatsapp = patch.whatsapp?.trim() || undefined;
  c.atualizadoEm = new Date().toISOString();
  persist(slug, data);
  return c;
}
