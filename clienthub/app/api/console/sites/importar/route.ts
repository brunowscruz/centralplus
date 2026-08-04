import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import extract from "extract-zip";
import { getSession } from "@/lib/auth";
import { tenantExists } from "@/lib/tenants";
import { sanitizeSlug, assertInsideTenant } from "@/lib/bos";
import { DRAFTS_DIR, siteStatus, gravarTipoVersao } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Importa um site pronto (gerado fora do Hub, ou de uma instalação antiga)
 * pra dentro de um cliente, como um rascunho novo em saidas/sites/ — passa
 * pelo fluxo normal de aprovação depois (regra de ouro: nunca publica
 * sozinho). Dois formatos aceitos:
 * - um único arquivo .zip (extraído pra pasta do rascunho);
 * - vários arquivos com webkitRelativePath preservado (seleção de pasta
 *   inteira no navegador) — reconstrói a árvore de pastas original.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador importa sites" }, { status: 403 });
  }

  const form = await req.formData();
  const slugRaw = form.get("slug");
  const nomeRaw = form.get("nome");
  const tipoRaw = form.get("tipo");
  if (typeof slugRaw !== "string" || !slugRaw) {
    return NextResponse.json({ error: "informe o cliente" }, { status: 400 });
  }
  let slug: string;
  try {
    slug = sanitizeSlug(slugRaw);
  } catch {
    return NextResponse.json({ error: "cliente inválido" }, { status: 400 });
  }
  if (!tenantExists(slug)) {
    return NextResponse.json({ error: "cliente não existe" }, { status: 404 });
  }
  const tipo = tipoRaw === "lp" ? "lp" : "site";

  const arquivos = form.getAll("arquivos").filter((f): f is File => f instanceof File);
  if (arquivos.length === 0) {
    return NextResponse.json({ error: "nenhum arquivo enviado" }, { status: 400 });
  }

  // nome da pasta do rascunho: "importado-<slug-do-nome>-<data>", evitando
  // colisão com um rascunho já existente do mesmo dia.
  const base = `importado-${slugificarNome(typeof nomeRaw === "string" && nomeRaw ? nomeRaw : arquivos[0].name)}-${new Date().toISOString().slice(0, 10)}`;
  const draftsAbs = assertInsideTenant(slug, DRAFTS_DIR);
  fs.mkdirSync(draftsAbs, { recursive: true });
  let nomePasta = base;
  let n = 2;
  while (fs.existsSync(path.join(draftsAbs, nomePasta))) {
    nomePasta = `${base}-${n}`;
    n++;
  }
  const destinoAbs = assertInsideTenant(slug, path.join(DRAFTS_DIR, nomePasta));
  fs.mkdirSync(destinoAbs, { recursive: true });

  try {
    const ehZipUnico = arquivos.length === 1 && arquivos[0].name.toLowerCase().endsWith(".zip");
    if (ehZipUnico) {
      await importarZip(arquivos[0], destinoAbs);
    } else {
      await importarArquivos(arquivos, destinoAbs);
    }

    if (!fs.existsSync(path.join(destinoAbs, "index.html"))) {
      fs.rmSync(destinoAbs, { recursive: true, force: true });
      return NextResponse.json(
        { error: "o pacote importado não tem um index.html na raiz — confira se selecionou a pasta certa (a que já contém o index.html, não uma pasta pai)." },
        { status: 400 },
      );
    }

    gravarTipoVersao(slug, nomePasta, tipo);
    return NextResponse.json({ ...siteStatus(slug), rascunho: nomePasta });
  } catch (e) {
    fs.rmSync(destinoAbs, { recursive: true, force: true });
    return NextResponse.json({ error: `falha ao importar: ${(e as Error).message}` }, { status: 500 });
  }
}

async function importarZip(file: File, destinoAbs: string): Promise<void> {
  const tmpZip = path.join(os.tmpdir(), `import-site-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tmpZip, buffer);
  try {
    await extract(tmpZip, { dir: destinoAbs });
    achatarSeEnvolvidoEmPastaUnica(destinoAbs);
  } finally {
    fs.rmSync(tmpZip, { force: true });
  }
}

/** Seleção de pasta no navegador manda webkitRelativePath tipo
 * "nome-da-pasta/index.html", "nome-da-pasta/img/foto.png" — descarta o
 * primeiro segmento (nome da pasta que o usuário escolheu no seletor do SO,
 * irrelevante aqui) e recria a árvore a partir do segundo segmento em
 * diante. */
async function importarArquivos(arquivos: File[], destinoAbs: string): Promise<void> {
  for (const file of arquivos) {
    const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const partes = relPath.split("/").filter(Boolean);
    const semRaiz = partes.length > 1 ? partes.slice(1) : partes;
    if (semRaiz.some((p) => p === "." || p === "..")) continue; // sem traversal
    const destinoArquivo = path.join(destinoAbs, ...semRaiz);
    if (!destinoArquivo.startsWith(destinoAbs)) continue; // sandbox extra
    fs.mkdirSync(path.dirname(destinoArquivo), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destinoArquivo, buffer);
  }
}

/** Muitos .zip exportados por ferramentas de site vêm com tudo dentro de
 * uma pasta única no topo (ex: meu-site/index.html). Se depois de extrair
 * o destino tem só 1 entrada e ela é uma pasta, sobe o conteúdo um nível. */
function achatarSeEnvolvidoEmPastaUnica(destinoAbs: string): void {
  const entradas = fs.readdirSync(destinoAbs, { withFileTypes: true });
  if (entradas.length !== 1 || !entradas[0].isDirectory()) return;
  const pastaUnica = path.join(destinoAbs, entradas[0].name);
  for (const item of fs.readdirSync(pastaUnica)) {
    fs.renameSync(path.join(pastaUnica, item), path.join(destinoAbs, item));
  }
  fs.rmdirSync(pastaUnica);
}

function slugificarNome(texto: string): string {
  return (
    texto
      .replace(/\.zip$/i, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}
