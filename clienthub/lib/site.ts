import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, tenantRoot, fileExists } from "./bos";

/**
 * Módulo Meu Site (Fase 4).
 *
 * Convenção (alinhada à skill criar-site do B-O-S):
 * - RASCUNHOS: cada geração da skill vai para `saidas/sites/<nome>-<data>/`
 *   (com index.html). Cada pasta é uma versão candidata.
 * - SITE APROVADO: `site/` na raiz do cliente. Só o OPERADOR aprova uma
 *   versão (regra de ouro do spec: o cliente nunca faz deploy direto) —
 *   aprovar = copiar o rascunho para `site/`.
 */

export const SITE_DIR = "site";
export const DRAFTS_DIR = "saidas/sites";

/** "site" = é (ou evolui) a home do cliente — aprovar substitui a raiz de
 * `site/` inteira. "lp" = página avulsa de campanha/promoção, não ligada à
 * navegação principal — aprovar NUNCA mexe na home, só adiciona/atualiza
 * uma subpasta dentro do site já aprovado (ver approveVersion). */
export type TipoVersao = "site" | "lp";

export interface SiteVersion {
  name: string; // nome da pasta do rascunho
  rel: string; // caminho relativo à pasta do cliente
  mtime: number;
  tipo: TipoVersao;
}

export interface SiteStatus {
  current: { mtime: number } | null; // site/ aprovado
  versions: SiteVersion[]; // rascunhos, mais recente primeiro
}

function hasIndex(abs: string): boolean {
  return fileExists(path.join(abs, "index.html"));
}

const META_FILE = "_meta.json";

/** Tipo de uma pasta de rascunho: lido de `_meta.json` (`{"tipo":"lp"}`) se
 * existir; senão inferido do nome (prefixo `lp-` → "lp") pra não quebrar
 * rascunhos criados antes desse campo existir. Default final: "site". */
function lerTipoVersao(draftAbs: string, nomeVersao: string): TipoVersao {
  try {
    const raw = fs.readFileSync(path.join(draftAbs, META_FILE), "utf8");
    const meta = JSON.parse(raw) as { tipo?: string };
    if (meta.tipo === "lp" || meta.tipo === "site") return meta.tipo;
  } catch {
    /* sem _meta.json ou inválido — cai no fallback por nome */
  }
  return nomeVersao.toLowerCase().startsWith("lp-") ? "lp" : "site";
}

/** Grava o tipo da versão em `_meta.json` dentro da pasta do rascunho —
 * chamado pela rota que prepara o rascunho a partir do briefing da UI. */
export function gravarTipoVersao(slug: string, versionName: string, tipo: TipoVersao): void {
  const draftAbs = assertInsideTenant(slug, path.join(DRAFTS_DIR, assertVersionName(versionName)));
  fs.writeFileSync(path.join(draftAbs, META_FILE), JSON.stringify({ tipo }, null, 2) + "\n", "utf8");
}

export function siteStatus(slug: string): SiteStatus {
  const root = tenantRoot(slug);

  const currentAbs = path.join(root, SITE_DIR);
  const current = hasIndex(currentAbs)
    ? { mtime: fs.statSync(path.join(currentAbs, "index.html")).mtimeMs }
    : null;

  const draftsAbs = path.join(root, DRAFTS_DIR);
  let versions: SiteVersion[] = [];
  if (fileExists(draftsAbs)) {
    versions = fs
      .readdirSync(draftsAbs, { withFileTypes: true })
      .filter((e) => e.isDirectory() && hasIndex(path.join(draftsAbs, e.name)))
      .map((e) => ({
        name: e.name,
        rel: path.join(DRAFTS_DIR, e.name),
        mtime: fs.statSync(path.join(draftsAbs, e.name, "index.html")).mtimeMs,
        tipo: lerTipoVersao(path.join(draftsAbs, e.name), e.name),
      }))
      .sort((a, b) => b.mtime - a.mtime);
  }

  return { current, versions };
}

/** Nome de versão precisa ser uma pasta direta de saidas/sites (sem traversal). */
export function assertVersionName(name: string): string {
  const clean = String(name);
  if (!clean || clean.includes("/") || clean.includes("\\") || clean.startsWith(".")) {
    throw new Error("versão inválida");
  }
  return clean;
}

// ---- páginas dentro de uma versão do site -----------------------------------

export interface SitePage {
  /** "" = home (index.html na raiz da versão); senão, nome da subpasta */
  path: string;
  titulo: string;
  mtime: number;
}

// pastas de infra/asset — nunca são "página", mesmo tendo index.html por engano
const PASTAS_IGNORADAS = new Set([
  "img", "imagens", "images", "assets", "css", "js", "fonts", "screenshots", "videos", "_deploy-nodejs",
]);

function extrairTitulo(absIndexHtml: string): string | undefined {
  try {
    const html = fs.readFileSync(absIndexHtml, "utf8").slice(0, 4000);
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const t = m?.[1]?.trim();
    return t ? t.replace(/\s+/g, " ") : undefined;
  } catch {
    return undefined;
  }
}

/** Varre as páginas de uma versão (site aprovado se version=null, senão o
 * rascunho): a home + cada subpasta direta que tenha seu próprio index.html
 * (convenção real da skill criar-site — uma página = uma subpasta com
 * index.html na raiz do site, não um .html solto). */
export function listarPaginas(slug: string, version: string | null): SitePage[] {
  const base = version
    ? assertInsideTenant(slug, path.join(DRAFTS_DIR, assertVersionName(version)))
    : assertInsideTenant(slug, SITE_DIR);
  if (!hasIndex(base)) return [];

  const paginas: SitePage[] = [];
  const idxRoot = path.join(base, "index.html");
  paginas.push({ path: "", titulo: extrairTitulo(idxRoot) || "Início", mtime: fs.statSync(idxRoot).mtimeMs });

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nome = entry.name;
    if (nome.startsWith(".") || nome.startsWith("_") || PASTAS_IGNORADAS.has(nome.toLowerCase())) continue;
    const idx = path.join(base, nome, "index.html");
    if (fileExists(idx)) {
      paginas.push({ path: nome, titulo: extrairTitulo(idx) || nome, mtime: fs.statSync(idx).mtimeMs });
    }
  }

  return paginas.sort((a, b) => (a.path === "" ? -1 : b.path === "" ? 1 : a.titulo.localeCompare(b.titulo)));
}

/** Slug curto e seguro pra usar em nome de pasta (a partir de um título de página). */
function slugificar(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "pagina"
  );
}

/** Copia o site/ aprovado inteiro pra um rascunho novo — usado quando o
 * usuário pede pra editar uma página do site JÁ aprovado (que não pode ser
 * editado direto). Feito no servidor (determinístico), não pelo agente via
 * prompt. Devolve o nome do rascunho criado. */
export function criarRascunhoAPartirDoSite(slug: string, paginaAlvo?: string): string {
  const siteAbs = assertInsideTenant(slug, SITE_DIR);
  if (!hasIndex(siteAbs)) throw new Error("não existe site aprovado pra copiar");

  const agora = new Date();
  const data = agora.toISOString().slice(0, 10);
  const hhmm = `${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}`;
  const base = `edicao-${slugificar(paginaAlvo || "home")}-${data}-${hhmm}`;

  const draftsAbs = assertInsideTenant(slug, DRAFTS_DIR);
  fs.mkdirSync(draftsAbs, { recursive: true });
  let nome = base;
  let n = 2;
  while (fileExists(path.join(draftsAbs, nome))) {
    nome = `${base}-${n}`;
    n++;
  }

  const draftAbs = assertInsideTenant(slug, path.join(DRAFTS_DIR, nome));
  fs.cpSync(siteAbs, draftAbs, { recursive: true });
  return nome;
}

export interface ResultadoAprovacao {
  tipo: TipoVersao;
  /** "" quando virou a raiz do site; senão, a subpasta onde a LP foi
   * publicada dentro do site aprovado (ex: "lp-black-friday-2026-07-23"). */
  subpasta: string;
}

/**
 * Aprovação do operador. Dois comportamentos, pelo tipo da versão
 * (ver TipoVersao):
 *
 * - "site": copia o rascunho para `site/`, SUBSTITUINDO a raiz inteira —
 *   é a home evoluindo, sempre foi assim. Quem chama isso deve confirmar
 *   com o operador antes se já existe conteúdo aprovado (ver rota
 *   /site/approve) — aqui embaixo não tem essa checagem de propósito
 *   (a função em si é só a mecânica de arquivo, a confirmação é decisão
 *   de UX, não de dado).
 * - "lp": NUNCA mexe na raiz (`site/index.html` e demais páginas ficam
 *   intactos). Copia como uma subpasta dentro do site já aprovado
 *   (`site/<nome-do-rascunho>/`) — vira uma página a mais, alcançável só
 *   pela URL direta, fora do menu (a menos que alguém peça pra adicionar
 *   no menu depois). Se ainda não existe NENHUM site aprovado, não tem o
 *   que preservar: a LP vira o próprio site dessa vez.
 *
 * Em ambos os casos, o rascunho de origem permanece intacto como histórico.
 */
export function approveVersion(slug: string, versionName: string): ResultadoAprovacao {
  const name = assertVersionName(versionName);
  const draftAbs = assertInsideTenant(slug, path.join(DRAFTS_DIR, name));
  if (!hasIndex(draftAbs)) throw new Error("rascunho não encontrado");

  const tipo = lerTipoVersao(draftAbs, name);
  const siteAbs = assertInsideTenant(slug, SITE_DIR);

  if (tipo === "lp" && hasIndex(siteAbs)) {
    const destinoAbs = assertInsideTenant(slug, path.join(SITE_DIR, name));
    fs.rmSync(destinoAbs, { recursive: true, force: true });
    fs.cpSync(draftAbs, destinoAbs, { recursive: true });
    return { tipo, subpasta: name };
  }

  // tipo "site", ou "lp" sem nenhum site aprovado ainda pra preservar
  fs.rmSync(siteAbs, { recursive: true, force: true });
  fs.cpSync(draftAbs, siteAbs, { recursive: true });
  return { tipo, subpasta: "" };
}

/**
 * Resolve o arquivo a servir no preview. `version` vazio = site aprovado.
 * Sempre sandboxed dentro da pasta do cliente.
 */
export function resolvePreviewFile(
  slug: string,
  version: string | null,
  relFile: string,
): string {
  const base = version
    ? path.join(DRAFTS_DIR, assertVersionName(version))
    : SITE_DIR;
  // normaliza e bloqueia traversal do arquivo pedido
  const rel = relFile.replace(/^\/+/, "") || "index.html";
  return assertInsideTenant(slug, path.join(base, rel));
}

/** Resolve a pasta inteira de uma versão (site aprovado se version=null,
 * senão o rascunho) — usado tanto pelo preview quanto pelo download em ZIP. */
export function resolveVersionDir(slug: string, version: string | null): string {
  const base = version
    ? path.join(DRAFTS_DIR, assertVersionName(version))
    : SITE_DIR;
  return assertInsideTenant(slug, base);
}

/** Wrapper NestJS mínimo (só `ServeStaticModule`, sem lógica nenhuma) —
 * existe porque a hospedagem "Node.js App" da Hostinger (e afins) exige um
 * PROCESSO rodando, não aceita site estático puro; o conteúdo continua
 * sendo HTML/CSS/JS estático de sempre, isso aqui só faz ele "parecer" um
 * app Node pra hospedagem aceitar. Padrão recuperado de um cliente
 * (Exacta Labs) que já tinha resolvido esse exato problema — ver
 * `docs/PUBLICACAO-DE-SITE.md`. Devolve caminho relativo → conteúdo; quem
 * chama junta com o conteúdo real do site (que vai em `public/`) na hora
 * de montar o .zip. */
export function arquivosWrapperNodejs(nomeComercial: string): Record<string, string> {
  const nomeSeguro = nomeComercial.trim() || "Site";
  return {
    "package.json": JSON.stringify(
      {
        name: nomeSeguro.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site",
        version: "1.0.0",
        private: true,
        description: `Site de ${nomeSeguro}, servido via NestJS (compatível com deploy Node.js App da Hostinger).`,
        engines: { node: ">=18" },
        scripts: {
          build: "nest build",
          start: "node dist/main",
          "start:dev": "nest start --watch",
          "start:prod": "node dist/main",
        },
        dependencies: {
          "@nestjs/common": "^10.4.15",
          "@nestjs/core": "^10.4.15",
          "@nestjs/platform-express": "^10.4.15",
          "@nestjs/serve-static": "^4.0.2",
          "reflect-metadata": "^0.2.2",
          rxjs: "^7.8.1",
        },
        devDependencies: {
          "@nestjs/cli": "^10.4.9",
          "@types/node": "^20.14.9",
          typescript: "^5.5.4",
        },
      },
      null,
      2,
    ),
    "nest-cli.json": JSON.stringify(
      {
        $schema: "https://json.schemastore.org/nest-cli",
        collection: "@nestjs/schematics",
        sourceRoot: "src",
        compilerOptions: { deleteOutDir: true, assets: [{ include: "../public/**/*", outDir: "dist/public" }] },
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          module: "commonjs",
          declaration: false,
          removeComments: true,
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
          allowSyntheticDefaultImports: true,
          target: "ES2021",
          sourceMap: false,
          outDir: "./dist",
          baseUrl: "./",
          incremental: false,
          skipLibCheck: true,
          strictNullChecks: true,
          noImplicitAny: false,
          strictBindCallApply: false,
          forceConsistentCasingInFileNames: true,
          noFallthroughCasesInSwitch: false,
        },
      },
      null,
      2,
    ),
    "tsconfig.build.json": JSON.stringify(
      { extends: "./tsconfig.json", exclude: ["node_modules", "test", "dist", "**/*spec.ts"] },
      null,
      2,
    ),
    "src/main.ts": `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(\`${nomeSeguro} rodando na porta \${port}\`);
}
bootstrap();
`,
    "src/app.module.ts": `import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
    }),
  ],
})
export class AppModule {}
`,
    "LEIA.md": `# Como publicar na Hostinger (Node.js App)

Esse .zip já vem pronto pro deploy "Node.js App" da Hostinger — o site
continua sendo HTML/CSS/JS estático de sempre, o NestJS aqui é só uma
casca fina pra hospedagem aceitar rodar (ela exige um processo Node, não
aceita site estático puro).

1. Suba o conteúdo deste .zip inteiro pro painel de deploy.
2. Configure:
   - **Comando de build:** \`npm install && npm run build\`
   - **Comando de start:** \`npm run start\`
   - **Porta:** não precisa fixar — o app lê \`process.env.PORT\` sozinho,
     a Hostinger injeta essa variável automaticamente.
3. Depois do deploy, o site abre na raiz do domínio (\`/\`) normalmente,
   subpáginas em \`/nome-da-pagina\`.

Pra atualizar o site depois: gere um .zip novo aqui no Hub (o conteúdo de
\`public/\` já vem sempre com a versão aprovada mais recente) e repita o
deploy.
`,
  };
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}
