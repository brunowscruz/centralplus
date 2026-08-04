import fs from "node:fs";
import path from "node:path";

/**
 * "Hubs" (seção 3 do spec): templates de produto que pré-selecionam quais
 * módulos já vêm ligados por tipo de negócio. Vive em JSON (dado), não em
 * código — mesmo princípio do catálogo de módulos (seção 2.5).
 *
 * Ainda não está conectado ao wizard de provisionamento (fica para quando o
 * campo "tipo_hub" for adicionado ao cadastro) — por ora é consulta.
 */
export interface HubPreset {
  id: string;
  nome: string;
  descricao: string;
  modulos_padrao: string[];
  crm_preset: string | null;
  dominio?: string;
  tema?: "claro" | "escuro";
  cor_destaque?: string;
  tipografia?: string;
  login_texto?: string;
  origem?: "nativo" | "personalizado";
  versao?: string;
}

function catalogPath(): string {
  return path.join(process.cwd(), "lib", "catalog", "hubs.json");
}

let cache: HubPreset[] | null = null;

export function listHubs(): HubPreset[] {
  if (cache) return cache;
  cache = JSON.parse(fs.readFileSync(catalogPath(), "utf8")) as HubPreset[];
  return cache;
}

export function hubById(id: string): HubPreset | undefined {
  return listHubs().find((h) => h.id === id);
}

function slugifyId(nome: string): string {
  return nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreateHubInput {
  nome: string;
  descricao?: string;
  modulos_padrao: string[];
  crm_preset: string | null;
  dominio?: string;
  tema?: "claro" | "escuro";
  cor_destaque?: string;
  tipografia?: string;
  login_texto?: string;
}

/** Cria um Hub novo (marca white-label própria) e persiste no catálogo. */
export function createHub(input: CreateHubInput): HubPreset {
  const hubs = listHubs();
  let id = slugifyId(input.nome) || "hub";
  let n = 2;
  while (hubs.some((h) => h.id === id)) {
    id = `${slugifyId(input.nome)}-${n++}`;
  }
  const novo: HubPreset = {
    id,
    nome: input.nome,
    descricao: input.descricao || "",
    modulos_padrao: input.modulos_padrao,
    crm_preset: input.crm_preset,
    dominio: input.dominio,
    tema: input.tema || "escuro",
    cor_destaque: input.cor_destaque || "#e0a94a",
    tipografia: input.tipografia || "Moderna (padrão)",
    login_texto: input.login_texto || "Acesso ao Hub",
    origem: "personalizado",
    versao: "1.0.0",
  };
  const next = [...hubs, novo];
  fs.writeFileSync(catalogPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
  cache = next;
  return novo;
}
