import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Banco de Ideias (seção 18/23 do spec): backlog vivo de ideias de módulo,
 * pra nada se perder entre conversas. Persistido em JSON — dado, não código.
 */
export type IdeiaStatus = "ideia" | "em_avaliacao" | "em_construcao" | "disponivel";

export interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  contexto: string;
  vertical: string;
  status: IdeiaStatus;
  criado_em?: string;
}

function catalogPath(): string {
  return path.join(process.cwd(), "lib", "catalog", "ideias.json");
}

export function listIdeias(): Ideia[] {
  const p = catalogPath();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")) as Ideia[];
}

function slugify(titulo: string): string {
  return titulo
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function addIdeia(input: {
  titulo: string;
  descricao: string;
  contexto?: string;
  vertical?: string;
}): Ideia {
  const ideias = listIdeias();
  const baseId = slugify(input.titulo) || crypto.randomUUID().slice(0, 8);
  let id = baseId;
  let n = 2;
  while (ideias.some((i) => i.id === id)) id = `${baseId}-${n++}`;

  const nova: Ideia = {
    id,
    titulo: input.titulo,
    descricao: input.descricao,
    contexto: input.contexto || "Registrada via Console — Banco de Ideias.",
    vertical: input.vertical || "Geral",
    status: "ideia",
    criado_em: new Date().toISOString(),
  };
  ideias.push(nova);
  fs.writeFileSync(catalogPath(), JSON.stringify(ideias, null, 2) + "\n", "utf8");
  return nova;
}
