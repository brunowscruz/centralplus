import fs from "node:fs";
import path from "node:path";
import { bosRoot } from "./bos";

/**
 * Chave da Anthropic para o módulo Claude Code (Agent SDK).
 * Ordem: env do próprio app -> .env do B-O-S (reaproveita a config do motor).
 */
export function anthropicApiKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = path.join(bosRoot(), ".env");
    if (fs.existsSync(envPath)) {
      const txt = fs.readFileSync(envPath, "utf8");
      const m = txt.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/m);
      if (m) {
        const val = m[1].replace(/^["']|["']$/g, "").trim();
        if (val) return val;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
