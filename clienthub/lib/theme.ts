import fs from "node:fs";
import path from "node:path";
import { bosRoot, tenantRoot, fileExists } from "./bos";

/**
 * Tokens de tema derivados de um `identidade/design-guide.md`.
 *
 * O Console/MODO OWNER usa o design-guide da AGÊNCIA (raiz do B-O-S).
 * O workspace de cada cliente usa o design-guide DAQUELE cliente —
 * é isso que faz o cliente sentir "isso é meu, não um SaaS genérico".
 */
export interface ThemeTokens {
  bg: string; // fundo principal
  card: string; // fundo alternativo / cards
  border: string;
  text: string;
  accent: string; // cor de destaque / CTA
  accentText?: string; // cor do texto SOBRE o accent (contraste)
  titleFont?: string;
  bodyFont?: string;
  scheme?: "light" | "dark"; // pro seletor nativo (inputs, scrollbars)
  source: "agencia" | "cliente" | "default" | "preset";
}

// Casca genérica do Hub (seção 6): dark + dourado/âmbar.
export const DEFAULT_THEME: ThemeTokens = {
  bg: "#0A0A0C",
  card: "#171719",
  border: "#2A2A2F",
  text: "#EDEDED",
  accent: "#E0A94A",
  accentText: "#111111",
  scheme: "dark",
  source: "default",
};

/**
 * Só 2 temas de base (claro/escuro) — de propósito, não 4. Múltiplos temas
 * de cor (azul, rosa...) geravam inconsistência: botão/ícone pensado pra um
 * fundo escuro ficava ilegível quando o operador trocava pra um preset
 * "meio-termo". Com só 2 bases bem cuidadas (todo componente testado nas
 * duas), a legibilidade é garantida. A identidade do cliente entra pela
 * `corPrincipal` (accent), que funciona sobre qualquer uma das duas bases —
 * accentText é recalculado automaticamente pra sempre ter contraste.
 */
export type PresetThemeId = "preto" | "branco";

export const PRESET_THEMES: Record<PresetThemeId, { nome: string; theme: ThemeTokens }> = {
  preto: {
    nome: "Escuro",
    theme: {
      bg: "#0A0A0C",
      card: "#171719",
      border: "#2A2A2F",
      text: "#EDEDED",
      accent: "#E0A94A",
      accentText: "#111111",
      titleFont: "ui-sans-serif",
      scheme: "dark",
      source: "preset",
    },
  },
  branco: {
    nome: "Claro",
    theme: {
      bg: "#F4F4F6",
      card: "#FFFFFF",
      border: "#E2E2E7",
      text: "#18181B",
      accent: "#2563EB",
      accentText: "#FFFFFF",
      titleFont: "ui-sans-serif",
      scheme: "light",
      source: "preset",
    },
  },
};

/** Legado: instalações antigas gravaram "azul"/"rosa" — mapeia pro par mais próximo. */
function normalizePresetId(id: string): PresetThemeId {
  if (id === "preto" || id === "branco") return id;
  if (id === "azul") return "preto";
  if (id === "rosa") return "branco";
  return "preto";
}

/**
 * Estima se uma cor hex é clara ou escura (luminância relativa simples) —
 * usado pra decidir automaticamente o accentText (texto sobre o accent)
 * quando o operador escolhe uma corPrincipal customizada, garantindo
 * contraste em qualquer uma das duas bases.
 */
function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return true;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export function presetTheme(id: string, accentOverride?: string): ThemeTokens {
  const base = PRESET_THEMES[normalizePresetId(id)].theme;
  if (!accentOverride) return { ...base };
  return { ...base, accent: accentOverride, accentText: isLight(accentOverride) ? "#111111" : "#FFFFFF" };
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;

function lineValue(md: string, labels: string[]): string | undefined {
  const lines = md.split(/\r?\n/);
  for (const raw of lines) {
    // remove ênfase (**), marcador de lista ("- ", "* ", "• ") e espaço inicial
    const line = raw
      .replace(/\*/g, "")
      .replace(/^\s*[-•]\s*/, "")
      .trim();
    for (const label of labels) {
      const lower = line.toLowerCase();
      if (lower.startsWith(label.toLowerCase())) {
        const after = line.slice(line.indexOf(":") + 1).trim();
        if (after) return after;
      }
    }
  }
  return undefined;
}

function hexFrom(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = value.match(HEX);
  return m ? m[0] : undefined;
}

function fontFrom(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // "Syne (bold, weight 700-800)" -> "Syne"
  const name = value.split(/[(,]/)[0].trim();
  return name || undefined;
}

export function parseDesignGuide(
  md: string,
  source: ThemeTokens["source"],
): ThemeTokens {
  const bg = hexFrom(lineValue(md, ["Fundo principal"])) ?? DEFAULT_THEME.bg;
  const accent =
    hexFrom(lineValue(md, ["Cor de destaque", "Destaque", "CTA"])) ??
    DEFAULT_THEME.accent;
  const text =
    hexFrom(lineValue(md, ["Texto principal", "Texto"])) ?? DEFAULT_THEME.text;
  const card =
    hexFrom(lineValue(md, ["Fundo alternativo", "Cards", "Card"])) ??
    DEFAULT_THEME.card;
  const titleFont = fontFrom(lineValue(md, ["Títulos e destaques", "Títulos"]));
  const bodyFont = fontFrom(lineValue(md, ["Corpo, subtítulos", "Corpo"]));

  return {
    bg,
    card,
    border: DEFAULT_THEME.border,
    text,
    accent,
    titleFont,
    bodyFont,
    source,
  };
}

function readGuide(guidePath: string): string | null {
  if (!fileExists(guidePath)) return null;
  try {
    return fs.readFileSync(guidePath, "utf8");
  } catch {
    return null;
  }
}

/** Tema da agência (Console / MODO OWNER). */
export function agencyTheme(): ThemeTokens {
  const md = readGuide(path.join(bosRoot(), "identidade", "design-guide.md"));
  if (!md) return DEFAULT_THEME;
  const t = parseDesignGuide(md, "agencia");
  // Se o arquivo da agência ainda está em branco (template), cai no default.
  return t;
}

/**
 * Tema de um cliente. Ordem de prioridade:
 * 1. Preset escolhido no cadastro/edição (`tema` no config.json) — a paleta
 *    inteira vem pronta; se houver `corPrincipal`, ela vira o accent.
 * 2. design-guide.md do cliente (compatibilidade com quem já tinha).
 * 3. Tema padrão (preto/dourado).
 *
 * Import tardio de readConfig pra evitar ciclo (tenants.ts importa modules,
 * não theme — mas mantemos por segurança).
 */
export function tenantTheme(slug: string): ThemeTokens {
  const cfgPath = path.join(tenantRoot(slug), "config.json");
  let tema: string | undefined;
  let corPrincipal: string | undefined;
  if (fileExists(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")) as {
        tema?: string;
        corPrincipal?: string;
      };
      if (cfg.tema) tema = cfg.tema;
      if (cfg.corPrincipal) corPrincipal = cfg.corPrincipal;
    } catch {
      /* ignore */
    }
  }
  if (tema) return presetTheme(tema, corPrincipal);

  const md = readGuide(path.join(tenantRoot(slug), "identidade", "design-guide.md"));
  if (md) {
    const parsed = parseDesignGuide(md, "cliente");
    return corPrincipal ? { ...parsed, accent: corPrincipal } : parsed;
  }
  return corPrincipal ? { ...DEFAULT_THEME, accent: corPrincipal } : DEFAULT_THEME;
}
