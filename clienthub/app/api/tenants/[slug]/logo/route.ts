import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { logoPath } from "@/lib/identidade";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Serve a logo do cliente (identidade/logo.*). Sandbox: só quem tem acesso
// ao workspace (owner ou o próprio cliente).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;

  const p = logoPath(auth.slug);
  if (!p) return new Response("sem logo", { status: 404 });

  const buf = fs.readFileSync(p);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    },
  });
}
