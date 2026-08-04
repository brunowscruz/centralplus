import path from "node:path";
import fs from "node:fs";

/**
 * Resolve the root of the B-O-S engine (the folder that holds `clientes/`,
 * `_memoria/`, `identidade/`, `.claude/skills/`, etc).
 *
 * CentralPlus is installed ONCE and wraps this single engine. Every tenant is
 * a folder under `<BOS_ROOT>/clientes/<slug>/`.
 */
export function bosRoot(): string {
  const configured = process.env.BOS_ROOT || "../B-O-S";
  const resolved = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  return resolved;
}

export function clientesRoot(): string {
  return path.join(bosRoot(), "clientes");
}

/**
 * Absolute path to a single tenant folder. This is the ONLY folder a tenant's
 * agent session or file browser is ever allowed to touch (see assertInsideTenant).
 */
export function tenantRoot(slug: string): string {
  return path.join(clientesRoot(), sanitizeSlug(slug));
}

/** slugs are filesystem folder names — keep them boring and safe. */
export function sanitizeSlug(slug: string): string {
  const clean = String(slug)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
  if (!clean) throw new Error("slug inválido");
  return clean;
}

/**
 * Hard sandbox guard. Resolves `relPath` against the tenant folder and throws
 * if the result escapes it (path traversal, absolute paths, symlink tricks).
 * Every filesystem and agent operation must pass through here.
 */
export function assertInsideTenant(slug: string, relPath: string): string {
  const root = tenantRoot(slug);
  const target = path.resolve(root, relPath || ".");
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error("acesso fora da pasta do cliente bloqueado");
  }
  return target;
}

export function fileExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}
