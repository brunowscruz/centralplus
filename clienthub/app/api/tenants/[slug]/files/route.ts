import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { listDir, readFile, writeFile, makeDir, createFile, deleteEntry, renameEntry, writeBinaryFile } from "@/lib/files";

// GET  ?path=<dir>            -> lista pasta
// GET  ?path=<file>&read=1    -> conteúdo do arquivo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const rel = req.nextUrl.searchParams.get("path") || "";
  const read = req.nextUrl.searchParams.get("read");
  try {
    if (read) {
      return NextResponse.json(readFile(slug, rel));
    }
    return NextResponse.json({ path: rel, entries: listDir(slug, rel) });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}

// POST multipart/form-data { dir, file } -> upload de arquivo binário
// POST application/json { action: "write"|"mkdir"|"create"|"delete"|"rename", path, content?, newPath? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "upload inválido" }, { status: 400 });
    }
    const dir = String(form.get("dir") || "");
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "arquivo obrigatório" }, { status: 400 });
    const relPath = dir ? `${dir}/${file.name}` : file.name;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      writeBinaryFile(slug, relPath, buffer);
      return NextResponse.json({ ok: true, path: relPath, name: file.name });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  let body: { action?: string; path?: string; content?: string; newPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
  const { action, path: rel, content, newPath } = body;
  if (!rel) return NextResponse.json({ error: "path obrigatório" }, { status: 400 });

  try {
    if (action === "write") {
      writeFile(slug, rel, content ?? "");
    } else if (action === "mkdir") {
      makeDir(slug, rel);
    } else if (action === "create") {
      createFile(slug, rel);
    } else if (action === "delete") {
      deleteEntry(slug, rel);
    } else if (action === "rename") {
      if (!newPath) return NextResponse.json({ error: "newPath obrigatório" }, { status: 400 });
      renameEntry(slug, rel, newPath);
    } else {
      return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
