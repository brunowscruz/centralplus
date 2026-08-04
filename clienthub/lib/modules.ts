import fs from "node:fs";
import path from "node:path";

/**
 * Catálogo de módulos do CentralPlus (seção 2.5 do spec — "regra de ouro"
 * não-negociável: módulo é DADO, nunca código hardcoded no shell da app).
 *
 * O catálogo vive em `lib/catalog/modulos.json`, não neste arquivo TS — isto
 * aqui só carrega, tipa e resolve esse JSON. Adicionar uma capacidade nova ao
 * produto = adicionar um item ao JSON (uma vez), nunca mexer no formulário de
 * cadastro ou no menu na mão (ambos iteram sobre `MODULE_CATALOG`).
 *
 * CentralPlus é instalado UMA vez. Cliente novo nunca é um deploy novo — é um
 * registro em `clientes/<slug>/`. O menu de cada cliente é gerado dinamicamente
 * a partir da lista `modulos_ativos` no `config.json` daquele cliente, cruzada
 * com este catálogo.
 */

export type ModuleId =
  | "visao-geral"
  | "site"
  | "instagram"
  | "financeiro"
  | "crm"
  | "claude"
  | "config"
  | (string & {});

/** Maturidade de implementação dentro do CentralPlus (eixo "está pronto?"). */
export type ModuleMaturity = "pronto" | "parcial" | "stub";

/** Origem do código do módulo (eixo "de onde vem?" — seção 2.5). */
export type ModuleOrigin = "nativo" | "adaptado-de-open-source";

export interface ModuleSource {
  repo: string;
  licenca: string;
  /** true = já foi de fato forkado e integrado; false = só avaliado/planejado. */
  adotado: boolean;
  nota?: string;
}

export interface ModuleDef {
  id: ModuleId;
  label: string;
  /** rota relativa dentro do workspace do cliente (/c/<slug>/<path>) */
  path: string;
  icon: string; // emoji placeholder até termos ícones de verdade
  /** módulos que todo cliente sempre tem, independentemente de config */
  always: boolean;
  status: ModuleMaturity;
  description: string;
  versao: string;
  origem: ModuleOrigin;
  dependencias: string[];
  fonte?: ModuleSource;
}

interface ModuleJson {
  id: string;
  nome: string;
  path: string;
  icone: string;
  sempre: boolean;
  versao: string;
  origem: ModuleOrigin;
  descricao: string;
  dependencias: string[];
  status: ModuleMaturity;
  fonte?: ModuleSource;
}

let cache: ModuleDef[] | null = null;

function catalogPath(): string {
  return path.join(process.cwd(), "lib", "catalog", "modulos.json");
}

function fromJson(m: ModuleJson): ModuleDef {
  return {
    id: m.id,
    label: m.nome,
    path: m.path,
    icon: m.icone,
    always: m.sempre,
    status: m.status,
    description: m.descricao,
    versao: m.versao,
    origem: m.origem,
    dependencias: m.dependencias || [],
    fonte: m.fonte,
  };
}

/** Catálogo completo, lido do JSON (cacheado em memória do processo). */
export function loadCatalog(): ModuleDef[] {
  if (cache) return cache;
  const raw = fs.readFileSync(catalogPath(), "utf8");
  const parsed = JSON.parse(raw) as ModuleJson[];
  cache = parsed.map(fromJson);
  return cache;
}

/** Mantido por compatibilidade com quem já importa o array direto. */
export const MODULE_CATALOG: ModuleDef[] = loadCatalog();

export function moduleById(id: string): ModuleDef | undefined {
  return loadCatalog().find((m) => m.id === id);
}

/** Módulos opcionais (que ligam/desligam por cliente). */
export function optionalModules(): ModuleDef[] {
  return loadCatalog().filter((m) => !m.always);
}

/**
 * Resolve o menu final de um cliente: sempre os `always`, na ordem do catálogo,
 * intercalados com os opcionais que estão em `modulos_ativos`.
 * A ordem visual segue a navegação do spec:
 * Visão Geral | Meu Site | Instagram | MKT Online | Financeiro | [CRM] | Claude Code | Configurações
 *
 * ATENÇÃO — exceção real à "regra de ouro" (módulo é dado, zero código pra
 * adicionar): esta lista é a ÚNICA coisa neste arquivo que não deriva do
 * catálogo. Um módulo novo em lib/catalog/modulos.json com `sempre:false`
 * fica invisível no menu de QUALQUER cliente (mesmo ativado em
 * modulos_ativos) até o id dele ser adicionado aqui também — foi exatamente
 * isso que aconteceu com "mkt-online" na primeira rodada. Sempre que
 * adicionar um módulo novo, adicione o id aqui também.
 */
const NAV_ORDER: string[] = [
  "visao-geral",
  "site",
  "instagram",
  "mkt-online",
  "financeiro",
  "crm",
  "claude",
  "config",
];

export function resolveMenu(modulosAtivos: string[]): ModuleDef[] {
  const active = new Set(modulosAtivos);
  return NAV_ORDER.map(moduleById)
    .filter((m): m is ModuleDef => !!m)
    .filter((m) => m.always || active.has(m.id));
}
