import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, tenantRoot } from "./bos";

export interface DirEntry {
  name: string;
  path: string; // relativo à pasta do cliente
  type: "dir" | "file";
  size?: number;
}

const TEXT_EXT = new Set([
  ".md", ".txt", ".json", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".css", ".html", ".htm", ".csv", ".yml", ".yaml", ".env", ".sh", ".py",
  ".xml", ".svg", ".gitignore",
]);

export function isTextFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXT.has(ext) || name.startsWith(".");
}

/**
 * Arquivos que existem dentro da pasta do tenant mas NUNCA aparecem no
 * navegador de arquivos — mesmo pro próprio cliente ver seu workspace. Hoje é
 * só `config.json` (guarda `acesso.senha_hash` e é escrito/lido só por
 * lib/tenants.ts via fs direto — nunca precisa passar por aqui). Segredos de
 * integração (token Meta/Instagram etc.) não vivem na pasta do tenant de
 * jeito nenhum — ver lib/integrations.ts.
 */
const HIDDEN_FILES = new Set(["config.json"]);

/** Lista o conteúdo de uma pasta do cliente (sempre sandboxed). */
export function listDir(slug: string, relPath: string): DirEntry[] {
  const abs = assertInsideTenant(slug, relPath);
  const root = tenantRoot(slug);
  if (!fs.existsSync(abs)) return [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  return entries
    .filter((e) => e.name !== ".DS_Store" && !(relPath === "" && HIDDEN_FILES.has(e.name)))
    .map((e) => {
      const full = path.join(abs, e.name);
      const rel = path.relative(root, full);
      const isDir = e.isDirectory();
      let size: number | undefined;
      if (!isDir) {
        try {
          size = fs.statSync(full).size;
        } catch {
          size = undefined;
        }
      }
      return { name: e.name, path: rel, type: isDir ? "dir" : "file", size } as DirEntry;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export interface FileRead {
  path: string;
  name: string;
  content: string | null; // null se binário/muito grande
  editable: boolean;
  size: number;
  reason?: string;
}

const MAX_READ = 512 * 1024; // 512KB

export function readFile(slug: string, relPath: string): FileRead {
  const abs = assertInsideTenant(slug, relPath);
  const name = path.basename(abs);
  if (path.dirname(relPath || ".") === "." && HIDDEN_FILES.has(name)) {
    throw new Error("arquivo não disponível");
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) throw new Error("é uma pasta");
  if (stat.size > MAX_READ) {
    return { path: relPath, name, content: null, editable: false, size: stat.size, reason: "arquivo muito grande" };
  }
  if (!isTextFile(name)) {
    return { path: relPath, name, content: null, editable: false, size: stat.size, reason: "arquivo binário" };
  }
  return {
    path: relPath,
    name,
    content: fs.readFileSync(abs, "utf8"),
    editable: true,
    size: stat.size,
  };
}

function assertNotHidden(relPath: string): void {
  if (path.dirname(relPath || ".") === "." && HIDDEN_FILES.has(path.basename(relPath))) {
    throw new Error("arquivo não disponível");
  }
}

export function writeFile(slug: string, relPath: string, content: string): void {
  assertNotHidden(relPath);
  const abs = assertInsideTenant(slug, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

export function makeDir(slug: string, relPath: string): void {
  const abs = assertInsideTenant(slug, relPath);
  fs.mkdirSync(abs, { recursive: true });
}

export function createFile(slug: string, relPath: string): void {
  assertNotHidden(relPath);
  const abs = assertInsideTenant(slug, relPath);
  if (fs.existsSync(abs)) throw new Error("já existe");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, "", "utf8");
}

/** Grava um arquivo binário (upload) — mesmo sandbox, sem assumir utf8. */
export function writeBinaryFile(slug: string, relPath: string, data: Buffer): void {
  assertNotHidden(relPath);
  const abs = assertInsideTenant(slug, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, data);
}

/** Exclui arquivo ou pasta (recursivo). Nunca a raiz do tenant. */
export function deleteEntry(slug: string, relPath: string): void {
  assertNotHidden(relPath);
  const clean = (relPath || "").trim();
  if (!clean || clean === "." || clean === "/") throw new Error("não é possível excluir a raiz do workspace");
  const abs = assertInsideTenant(slug, clean);
  if (!fs.existsSync(abs)) throw new Error("não encontrado");
  fs.rmSync(abs, { recursive: true, force: true });
}

/** Renomeia/move um arquivo ou pasta dentro do mesmo sandbox. */
export function renameEntry(slug: string, fromRel: string, toRel: string): void {
  assertNotHidden(fromRel);
  assertNotHidden(toRel);
  const fromAbs = assertInsideTenant(slug, fromRel);
  const toAbs = assertInsideTenant(slug, toRel);
  if (!fs.existsSync(fromAbs)) throw new Error("não encontrado");
  if (fs.existsSync(toAbs)) throw new Error("já existe um item com esse nome");
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromAbs, toAbs);
}

/** Resolve o caminho absoluto sandboxed de um arquivo pra servir os bytes crus (preview/download). */
export function rawFilePath(slug: string, relPath: string): string {
  assertNotHidden(relPath);
  const abs = assertInsideTenant(slug, relPath);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) throw new Error("arquivo não encontrado");
  return abs;
}
