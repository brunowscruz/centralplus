import fs from "node:fs";
import path from "node:path";
import { bosRoot } from "./bos";
import { anthropicApiKey } from "./agent";

/**
 * Contas Claude (seção 6 do spec): registro das contas Claude conectadas —
 * hoje só o tipo "api_key" (a chave padrão da Anthropic, em .env.local, que
 * já alimenta o chat de todo cliente). O tipo "seat_token" (assento do plano
 * Team, gerado por `claude setup-token`) fica pronto pra quando o operador
 * comprar assentos de verdade — a tela Assentos Claude cria registros aqui
 * com esse tipo, mas o provisionamento automático na VPS (rodar o setup-token
 * remotamente) ainda não existe: por ora fica manual, documentado no registro.
 *
 * Dado fica em `<BOS_ROOT>/_contas_claude.json` — não é por-tenant (é
 * infraestrutura da agência), mesmo padrão de `_auditoria.jsonl`.
 */

export type ClaudeAccountType = "api_key" | "seat_token";

export interface ClaudeAccount {
  id: string;
  nome: string;
  tipo: ClaudeAccountType;
  plano: string; // "Pay-as-you-go (API)" | "Pro" | "Max 5x" | "Team — assento padrão" | ...
  compartilhada: boolean; // disponível pra vincular a mais de um cliente
  token?: string; // só tipo seat_token; nunca sai da API em texto puro (mascarado)
  criado_em: string;
}

function storePath(): string {
  return path.join(bosRoot(), "_contas_claude.json");
}

function seed(): ClaudeAccount[] {
  const inicial: ClaudeAccount[] = [
    {
      id: "conta-padrao",
      nome: "Conta API (padrão)",
      tipo: "api_key",
      plano: "Pay-as-you-go — chave de API da Anthropic",
      compartilhada: true,
      criado_em: new Date().toISOString(),
    },
  ];
  persist(inicial);
  return inicial;
}

function persist(accounts: ClaudeAccount[]): void {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(accounts, null, 2) + "\n", "utf8");
}

function readAll(): ClaudeAccount[] {
  const p = storePath();
  if (!fs.existsSync(p)) return seed();
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as ClaudeAccount[];
    return Array.isArray(parsed) && parsed.length ? parsed : seed();
  } catch {
    return seed();
  }
}

/** Mascara o token — só os últimos 4 caracteres aparecem, nunca o valor inteiro. */
function mask(account: ClaudeAccount): ClaudeAccount {
  if (!account.token) return account;
  const t = account.token;
  return { ...account, token: `••••••••${t.slice(-4)}` };
}

export function listAccounts(): ClaudeAccount[] {
  return readAll().map(mask);
}

/** Só uso interno (nunca exposto por API route) — token real, se existir. */
export function getAccountRaw(id: string): ClaudeAccount | undefined {
  return readAll().find((a) => a.id === id);
}

/** true se a conta tem credencial utilizável agora (api_key sempre; seat_token só se já tem token). */
export function accountIsUsable(a: ClaudeAccount): boolean {
  if (a.tipo === "api_key") return !!anthropicApiKey();
  return !!a.token;
}

function slugifyId(nome: string): string {
  return (
    nome
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "conta"
  );
}

export interface CreateAccountInput {
  nome: string;
  tipo: ClaudeAccountType;
  plano?: string;
  compartilhada?: boolean;
  token?: string; // obrigatório se tipo === "seat_token"
}

export function createAccount(input: CreateAccountInput): ClaudeAccount {
  const accounts = readAll();
  let id = slugifyId(input.nome);
  let n = 2;
  while (accounts.some((a) => a.id === id)) id = `${slugifyId(input.nome)}-${n++}`;

  const novo: ClaudeAccount = {
    id,
    nome: input.nome,
    tipo: input.tipo,
    plano:
      input.plano || (input.tipo === "seat_token" ? "Team — assento padrão" : "Pay-as-you-go — chave de API"),
    compartilhada: input.compartilhada ?? false,
    token: input.tipo === "seat_token" ? input.token : undefined,
    criado_em: new Date().toISOString(),
  };
  persist([...accounts, novo]);
  return mask(novo);
}

export function toggleCompartilhada(id: string): ClaudeAccount | null {
  const accounts = readAll();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], compartilhada: !accounts[idx].compartilhada };
  persist(accounts);
  return mask(accounts[idx]);
}

export function deleteAccount(id: string): boolean {
  const accounts = readAll();
  // a conta padrão (api_key seed) não pode ser apagada — é o fallback de todo cliente sem conta dedicada
  if (id === "conta-padrao") return false;
  const next = accounts.filter((a) => a.id !== id);
  if (next.length === accounts.length) return false;
  persist(next);
  return true;
}

export function accountById(id: string): ClaudeAccount | undefined {
  return listAccounts().find((a) => a.id === id);
}
