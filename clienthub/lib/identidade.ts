import fs from "node:fs";
import path from "node:path";
import { tenantRoot } from "./bos";

const LOGO_EXTS = ["png", "svg", "jpg", "jpeg", "webp"];

/** Caminho absoluto do arquivo de logo do cliente, se existir. */
export function logoPath(slug: string): string | null {
  const dir = path.join(tenantRoot(slug), "identidade");
  for (const ext of LOGO_EXTS) {
    const p = path.join(dir, `logo.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function hasLogo(slug: string): boolean {
  return logoPath(slug) !== null;
}
