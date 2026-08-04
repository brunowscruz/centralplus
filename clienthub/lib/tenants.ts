import fs from "node:fs";
import path from "node:path";
import { clientesRoot, tenantRoot, sanitizeSlug, fileExists } from "./bos";
import { resolveMenu, ModuleDef } from "./modules";

export type TenantStatus = "ativo" | "em_configuracao" | "experimental" | "arquivado";

export const STATUS_LABELS: Record<TenantStatus, string> = {
  ativo: "Ativo",
  em_configuracao: "Em configuração",
  experimental: "Experimental",
  arquivado: "Arquivado",
};

export interface TenantConfig {
  slug: string;
  nome: string;
  tipo?: string; // "clínica", "loja de carros", "coaching"... (segmento de negócio)
  modulos_ativos: string[];
  acesso?: { login?: string; senha?: string; senha_hash?: string };
  status?: TenantStatus;
  observacoes_internas?: string; // só o owner vê (seção 4, item 6)
  criado_em?: string;
  hub?: string; // id do Hub (lib/catalog/hubs.json) — a marca/plataforma que esse cliente usa
  experimental?: boolean; // cliente de teste, sem login próprio — owner acessa direto pelo painel
  tema?: "preto" | "branco"; // preset de tema do painel do cliente (só 2 — ver lib/theme.ts)
  claude?: TenantClaudeConfig;
  nomeComercial?: string; // apelido/marca, quando difere da razão social (nome)
  corPrincipal?: string; // hex — cor de marca do cliente (badge/identidade no hub)
  responsavel?: { nome?: string; cargo?: string; email?: string; whatsapp?: string };
  presencaDigital?: { dominio?: string; site?: string; instagram?: string; whatsapp?: string };
  healthScore?: number; // 0-100, definido no cadastro, ajustável depois
  tipoCliente?: "recorrente" | "nao_recorrente" | "nao_definido"; // tipo de cliente (Instagram)
  crmPreset?: string | null;
}

/** Config de IA do cliente (seção 6): qual conta usa, modelos liberados, limites. */
export interface TenantClaudeConfig {
  habilitado: boolean;
  contaId?: string; // id de uma ClaudeAccount (lib/claude-accounts.ts); vazio = usa a conta padrão
  modelosLiberados: string[]; // "haiku" | "sonnet" | "opus"
  modeloChat: string;
  modeloGerador: string;
  limiteTokens: number; // 0 = ilimitado
  /** Permissões do cliente no Claude Code (seção 6) — persistidas; sem
   * upload/download binário implementado ainda nesta instalação, então
   * "importar"/"exportar" hoje não têm efeito de fato, só ficam salvas
   * pra quando esse recurso existir. */
  importarArquivos?: boolean;
  exportarArquivos?: boolean;
  acessoInternet?: boolean;
}

export const CLAUDE_DEFAULT: TenantClaudeConfig = {
  habilitado: true,
  modelosLiberados: ["haiku", "sonnet"],
  modeloChat: "sonnet",
  modeloGerador: "sonnet",
  limiteTokens: 0,
  importarArquivos: false,
  exportarArquivos: false,
  acessoInternet: false,
};

export interface Tenant extends TenantConfig {
  menu: ModuleDef[];
  contextStrength: ContextStrength;
}

const CONFIG_FILE = "config.json";

export function tenantConfigPath(slug: string): string {
  return path.join(tenantRoot(slug), CONFIG_FILE);
}

export function tenantExists(slug: string): boolean {
  try {
    return fileExists(tenantRoot(sanitizeSlug(slug)));
  } catch {
    return false;
  }
}

export function readConfig(slug: string): TenantConfig {
  const clean = sanitizeSlug(slug);
  const p = tenantConfigPath(clean);
  let cfg: Partial<TenantConfig> = {};
  if (fileExists(p)) {
    try {
      cfg = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      cfg = {};
    }
  }
  return {
    slug: clean,
    nome: cfg.nome || clean,
    tipo: cfg.tipo,
    modulos_ativos: Array.isArray(cfg.modulos_ativos) ? cfg.modulos_ativos : [],
    acesso: cfg.acesso,
    status: cfg.status || "em_configuracao",
    observacoes_internas: cfg.observacoes_internas,
    criado_em: cfg.criado_em,
    hub: cfg.hub,
    experimental: cfg.experimental || false,
    tema: cfg.tema || "preto",
    claude: cfg.claude ? { ...CLAUDE_DEFAULT, ...cfg.claude } : { ...CLAUDE_DEFAULT },
    nomeComercial: cfg.nomeComercial,
    corPrincipal: cfg.corPrincipal,
    responsavel: cfg.responsavel,
    presencaDigital: cfg.presencaDigital,
    healthScore: typeof cfg.healthScore === "number" ? cfg.healthScore : 100,
    tipoCliente: cfg.tipoCliente || "nao_definido",
    crmPreset: cfg.crmPreset ?? null,
  };
}

export function writeConfig(slug: string, cfg: TenantConfig): void {
  const p = tenantConfigPath(sanitizeSlug(slug));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export function getTenant(slug: string): Tenant {
  const cfg = readConfig(slug);
  return {
    ...cfg,
    menu: resolveMenu(cfg.modulos_ativos),
    contextStrength: computeContextStrength(cfg.slug),
  };
}

export function listTenants(): Tenant[] {
  const root = clientesRoot();
  if (!fileExists(root)) return [];
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."));
  return entries
    .map((e) => getTenant(e.name))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * "Força do contexto" (seção 1 e regra de ouro do spec): NÃO é enfeite.
 * Mede literalmente quantos campos de `_memoria/` e `identidade/` estão
 * preenchidos de verdade (não placeholder), pois é isso que determina o
 * quão bem o Claude conhece aquele negócio.
 */
export interface ContextStrength {
  score: number; // 0-100
  filled: number;
  total: number;
  items: { key: string; label: string; filled: boolean }[];
}

interface CheckSpec {
  key: string;
  label: string;
  rel: string; // caminho relativo à pasta do cliente
  minChars: number; // conteúdo real mínimo, ignorando frontmatter/títulos
}

const CONTEXT_CHECKS: CheckSpec[] = [
  { key: "empresa", label: "Quem é o negócio", rel: "_memoria/empresa.md", minChars: 120 },
  { key: "preferencias", label: "Tom de voz", rel: "_memoria/preferencias.md", minChars: 80 },
  { key: "estrategia", label: "Foco atual", rel: "_memoria/estrategia.md", minChars: 80 },
  { key: "identidade", label: "Identidade visual", rel: "identidade/design-guide.md", minChars: 120 },
];

/**
 * Considera "preenchido" quando o arquivo existe e tem conteúdo substantivo —
 * descontando linhas de título (#), citações-guia (>) e labels vazios ("- **X:**").
 */
function meaningfulLength(md: string): number {
  return md
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (t.startsWith("#")) return false;
      if (t.startsWith(">")) return false;
      if (t.startsWith("---")) return false;
      // label vazio tipo "- **Fundo principal:**" sem valor
      if (/^[-*]\s*\*{0,2}[^:]+:\*{0,2}\s*$/.test(t)) return false;
      return true;
    })
    .join(" ")
    .replace(/[*_`>#-]/g, "")
    .trim().length;
}

export function computeContextStrength(slug: string): ContextStrength {
  const root = tenantRoot(sanitizeSlug(slug));
  const items = CONTEXT_CHECKS.map((c) => {
    const p = path.join(root, c.rel);
    let filled = false;
    if (fileExists(p)) {
      try {
        filled = meaningfulLength(fs.readFileSync(p, "utf8")) >= c.minChars;
      } catch {
        filled = false;
      }
    }
    return { key: c.key, label: c.label, filled };
  });
  const filled = items.filter((i) => i.filled).length;
  return {
    score: Math.round((filled / items.length) * 100),
    filled,
    total: items.length,
    items,
  };
}
