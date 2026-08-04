import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { ZipArchive } from "archiver";
import { getSession } from "@/lib/auth";
import { requireWorkspaceApi } from "@/lib/apiauth";
import { resolveVersionDir, arquivosWrapperNodejs } from "@/lib/site";
import { readConfig } from "@/lib/tenants";

/**
 * Baixa uma versão do site (aprovado ou rascunho) como .zip — alternativa
 * pra quem prefere subir manualmente pelo gerenciador de arquivos da própria
 * hospedagem em vez de depender da publicação automática por FTP. Owner-only,
 * mesma regra do resto do módulo (toda ação aqui é da agência).
 *
 * `?formato=nodejs` empacota o MESMO conteúdo estático dentro de um wrapper
 * NestJS mínimo (ver `arquivosWrapperNodejs`) — pra hospedagem tipo "Node.js
 * App" da Hostinger, que exige um processo rodando, não aceita zip estático
 * puro. Sem esse parâmetro, comportamento de sempre (zip estático direto).
 */

/** Zipa só o conteúdo de verdade do site — pula qualquer entrada que comece
 * com "_" (mesma convenção de "isso é interno, não é página" já usada em
 * `_chat-uploads/` etc). Sem isso, uma pasta de referência esquecida dentro
 * de `site/` (ex: um wrapper de deploy antigo) ia junto no zip e, no
 * formato Node.js, virava até URL pública servida sem querer. */
function adicionarConteudoDoSite(archive: ZipArchive, dirAbs: string, destino: string | false) {
  for (const nome of fs.readdirSync(dirAbs)) {
    if (nome.startsWith("_")) continue;
    const abs = path.join(dirAbs, nome);
    const dest = destino === false ? nome : `${destino}/${nome}`;
    if (fs.statSync(abs).isDirectory()) archive.directory(abs, dest);
    else archive.file(abs, { name: dest });
  }
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getSession();
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "somente o operador baixa o site" }, { status: 403 });
  }
  const { slug: raw } = await params;
  const auth = await requireWorkspaceApi(raw);
  if ("error" in auth) return auth.error;
  const { slug } = auth;

  const version = req.nextUrl.searchParams.get("v") || null;
  let dirAbs: string;
  try {
    dirAbs = resolveVersionDir(slug, version);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!fs.existsSync(dirAbs) || !fs.statSync(dirAbs).isDirectory()) {
    return NextResponse.json({ error: "não há site nessa versão pra baixar." }, { status: 404 });
  }

  const formato = req.nextUrl.searchParams.get("formato") === "nodejs" ? "nodejs" : "estatico";

  const chunks: Buffer[] = [];
  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    if (formato === "nodejs") {
      const nomeComercial = readConfig(slug).nomeComercial || slug;
      for (const [rel, conteudo] of Object.entries(arquivosWrapperNodejs(nomeComercial))) {
        archive.append(conteudo, { name: rel });
      }
      adicionarConteudoDoSite(archive, dirAbs, "public");
    } else {
      adicionarConteudoDoSite(archive, dirAbs, false);
    }
    archive.finalize();
  });

  const nomeArquivo = `${slug}-${version || "site"}${formato === "nodejs" ? "-nodejs" : ""}.zip`;
  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Length": String(zipBuffer.length),
    },
  });
}
