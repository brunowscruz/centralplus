import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, tenantRoot, fileExists } from "./bos";
import type { Modelo } from "./canvaLayers";

/** "Hidratação Intensa" -> "hidratacao-intensa". Cópia local (não a de
 * lib/provision.ts) de propósito: essa função aqui não pode arrastar a
 * cadeia de imports do provisionamento (lê lib/catalog/modulos.json
 * relativo ao cwd do processo Next.js) — precisa continuar funcionando
 * também quando chamada por scripts/render-modelo.mjs, invocado com o cwd
 * na pasta do tenant, não na raiz do app. */
function slugify(nome: string): string {
  return String(nome)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Módulo Instagram (Fase 5).
 *
 * Convenção (alinhada à skill carrossel do B-O-S):
 * - Cada post é uma pasta `marketing/conteudo/<tipo>-<tema>-<data>/` com
 *   slides renderizados (PNG 1080x1350; ou HTMLs se ainda não renderizou)
 *   e `legenda.md` gerada junto.
 * - Aprovação do OPERADOR = marker `.aprovado` na pasta do post (regra de
 *   ouro: cliente não publica). A publicação real no feed é `lib/instagramPublish.ts`
 *   (Meta Graph API), chamada pelo botão "Publicar agora"/agendamento no
 *   Hub — sempre depois do `.aprovado`, ver docs/PUBLICACAO-INSTAGRAM.md.
 */

export const CONTENT_DIR = "marketing/conteudo";

export interface PostSlide {
  /** caminho relativo à pasta do post */
  rel: string;
  kind: "image" | "html";
}

export interface Post {
  name: string; // nome da pasta
  mtime: number;
  slides: PostSlide[];
  legenda: string | null;
  aprovado: string | null; // ISO date do marker, se aprovado
  modelo: boolean; // true = tem modelo.json (editável em camadas — implantado do Canva ou criado do zero)
  publicacao: PublicacaoInfo | null; // última tentativa de publicação real (null = nunca tentou)
  agendamento: AgendamentoInfo | null; // agendamento pendente/último, se houver
}

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Slides de um post: PNGs primeiro (instagram/ e raiz), senão HTMLs. */
function collectSlides(postAbs: string): PostSlide[] {
  const buckets: { dir: string; prefix: string }[] = [
    { dir: path.join(postAbs, "instagram"), prefix: "instagram/" },
    { dir: postAbs, prefix: "" },
  ];
  const images: PostSlide[] = [];
  const htmls: PostSlide[] = [];
  for (const { dir, prefix } of buckets) {
    if (!fileExists(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      const ext = path.extname(f).toLowerCase();
      if (IMG_EXT.has(ext)) images.push({ rel: prefix + f, kind: "image" });
      else if (ext === ".html" || ext === ".htm")
        htmls.push({ rel: prefix + f, kind: "html" });
    }
    if (images.length > 0) break; // achou os renders — não misturar com a raiz
  }
  return images.length > 0 ? images : htmls;
}

export function listPosts(slug: string): Post[] {
  const root = path.join(tenantRoot(slug), CONTENT_DIR);
  if (!fileExists(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => {
      const abs = path.join(root, e.name);
      const legendaPath = path.join(abs, "legenda.md");
      const aprovadoPath = path.join(abs, ".aprovado");
      return {
        name: e.name,
        mtime: fs.statSync(abs).mtimeMs,
        slides: collectSlides(abs),
        legenda: fileExists(legendaPath)
          ? fs.readFileSync(legendaPath, "utf8")
          : null,
        aprovado: fileExists(aprovadoPath)
          ? fs.readFileSync(aprovadoPath, "utf8").trim() || "aprovado"
          : null,
        modelo: fileExists(path.join(abs, "modelo.json")),
        publicacao: lerPublicacao(slug, e.name),
        agendamento: lerAgendamento(slug, e.name),
      };
    })
    .filter((p) => p.slides.length > 0 || p.legenda !== null)
    .sort((a, b) => b.mtime - a.mtime);
}

/** Um post só, pelo nome (usado antes de publicar/agendar — não precisa
 * listar todos). null se a pasta não existir ou não tiver conteúdo. */
export function obterPost(slug: string, postName: string): Post | null {
  const name = assertPostName(postName);
  return listPosts(slug).find((p) => p.name === name) ?? null;
}

/** Nome de post precisa ser pasta direta de marketing/conteudo (sem traversal). */
export function assertPostName(name: string): string {
  const clean = String(name);
  if (!clean || clean.includes("/") || clean.includes("\\") || clean.startsWith(".")) {
    throw new Error("post inválido");
  }
  return clean;
}

/** Aprovação do operador: grava o marker .aprovado na pasta do post. */
export function approvePost(slug: string, postName: string): void {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name));
  if (!fileExists(abs)) throw new Error("post não encontrado");
  fs.writeFileSync(path.join(abs, ".aprovado"), new Date().toISOString(), "utf8");
}

/** Resolve um arquivo de mídia do post para a rota de preview (sandboxed). */
export function resolveMediaFile(
  slug: string,
  postName: string,
  relFile: string,
): string {
  const name = assertPostName(postName);
  const rel = relFile.replace(/^\/+/, "");
  if (!rel) throw new Error("arquivo inválido");
  return assertInsideTenant(slug, path.join(CONTENT_DIR, name, rel));
}

/** Cria a pasta de um post novo a partir de um modelo Canva implantado —
 * mesma convenção `<tipo>-<tema>-<data>` que a skill /carrossel já usa,
 * com sufixo numérico se já existir uma pasta com esse nome hoje. */
export function criarPastaDePost(slug: string, tipo: string, titulo: string): string {
  const root = assertInsideTenant(slug, CONTENT_DIR);
  fs.mkdirSync(root, { recursive: true });
  const data = new Date().toISOString().slice(0, 10);
  const base = `${tipo}-${slugify(titulo) || "modelo"}-${data}`;
  let nome = base;
  let n = 2;
  while (fileExists(path.join(root, nome))) {
    nome = `${base}-${n}`;
    n++;
  }
  fs.mkdirSync(path.join(root, nome), { recursive: true });
  return nome;
}

/** Lê o modelo.json de um post implantado do Canva (null se o post não tem). */
export function lerModelo(slug: string, postName: string): Modelo | null {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "modelo.json"));
  if (!fileExists(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8")) as Modelo;
}

/** Grava o modelo.json — chamado na implantação inicial e a cada edição
 * (editor visual ou chat), sempre seguido de `renderizarModelo` pra
 * regenerar os PNGs em `instagram/`. */
export function salvarModelo(slug: string, postName: string, modelo: Modelo): void {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "modelo.json"));
  fs.writeFileSync(abs, JSON.stringify(modelo, null, 2) + "\n", "utf8");
}

/** Resultado da última tentativa de publicação real no Instagram (ver
 * lib/instagramPublish.ts) — nunca inventado, só gravado depois de uma
 * chamada real à Graph API (sucesso ou erro). */
export interface PublicacaoInfo {
  status: "publicado" | "falhou";
  em: string; // ISO
  erro?: string;
  mediaId?: string;
}

export function lerPublicacao(slug: string, postName: string): PublicacaoInfo | null {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "publicacao.json"));
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as PublicacaoInfo;
  } catch {
    return null;
  }
}

export function salvarPublicacao(slug: string, postName: string, info: PublicacaoInfo): void {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "publicacao.json"));
  fs.writeFileSync(abs, JSON.stringify(info, null, 2) + "\n", "utf8");
}

/** Agendamento de publicação de um post — grava/lê `agendamento.json` na
 * pasta do post (ver docs/PUBLICACAO-INSTAGRAM.md e o cron
 * app/api/cron/instagram-publicacoes/route.ts que consome isso). */
export interface AgendamentoInfo {
  dataHoraISO: string;
  status: "pendente" | "publicado" | "falhou";
  tentativas: number;
  erro?: string;
}

export function lerAgendamento(slug: string, postName: string): AgendamentoInfo | null {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "agendamento.json"));
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as AgendamentoInfo;
  } catch {
    return null;
  }
}

export function salvarAgendamento(slug: string, postName: string, info: AgendamentoInfo | null): void {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name, "agendamento.json"));
  if (info === null) {
    if (fileExists(abs)) fs.unlinkSync(abs);
    return;
  }
  fs.writeFileSync(abs, JSON.stringify(info, null, 2) + "\n", "utf8");
}

/** Resolve um slide FINAL (PNG já renderizado em instagram/) pra servir sem
 * autenticação pra Graph API da Meta (ela busca a imagem pela URL, não
 * aceita upload binário nem header de sessão) — ver
 * app/api/public/instagram-slides/[slug]/[post]/[arquivo]/route.ts.
 * Deliberadamente restrito: só arquivo direto dentro de <post>/instagram/
 * (nunca subpasta, nunca img/ com fotos-fonte), e só quando o post já foi
 * APROVADO pelo operador — conteúdo não aprovado nunca fica alcançável por
 * essa rota, mesmo sabendo a URL. */
export function resolveSlidePublico(slug: string, postName: string, arquivo: string): string {
  const name = assertPostName(postName);
  const abs = assertInsideTenant(slug, path.join(CONTENT_DIR, name));
  if (!fileExists(path.join(abs, ".aprovado"))) {
    throw new Error("post não aprovado");
  }
  const nomeArquivo = path.basename(arquivo);
  if (!IMG_EXT.has(path.extname(nomeArquivo).toLowerCase()) || nomeArquivo !== arquivo) {
    throw new Error("arquivo inválido");
  }
  return assertInsideTenant(slug, path.join(CONTENT_DIR, name, "instagram", nomeArquivo));
}
