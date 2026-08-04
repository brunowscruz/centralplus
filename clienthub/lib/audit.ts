import fs from "node:fs";
import path from "node:path";
import { bosRoot } from "./bos";

/**
 * Log de auditoria (seção 3/8 do spec): toda ação administrativa relevante
 * (criar/editar cliente, trocar módulo, etc.) vira uma linha aqui. Append-only,
 * JSONL, fora de `clientes/` (não é dado de nenhum tenant específico).
 */
export interface AuditEntry {
  ts: string; // ISO
  ator: string; // e-mail do owner
  acao: string; // "cliente.criado" | "modulo.alterado" | ...
  alvo?: string; // slug do cliente, id do módulo, etc.
  detalhe?: string;
}

function logPath(): string {
  return path.join(bosRoot(), "_auditoria.jsonl");
}

export function logAudit(entry: Omit<AuditEntry, "ts">): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  try {
    fs.appendFileSync(logPath(), line, "utf8");
  } catch {
    // auditoria nunca deve derrubar a ação principal
  }
}

export function readAudit(limit = 100): AuditEntry[] {
  const p = logPath();
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
  const entries = lines
    .map((l) => {
      try {
        return JSON.parse(l) as AuditEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditEntry => !!e);
  return entries.slice(-limit).reverse();
}
