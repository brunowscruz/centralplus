#!/usr/bin/env node
// Importa uma pasta de B-O-S standalone (instalação antiga, de antes do Hub)
// pra dentro do CentralPlus como cliente novo em clientes/<slug>/.
//
// Uso:
//   node scripts/importar-cliente-bos.mjs <pasta-de-origem> [--slug=x] [--hub=id] [--nome="Nome"]
//
// Ex.:
//   node scripts/importar-cliente-bos.mjs ../_referencias/ExactaLabs --hub=agencia
//
// Contrato completo (o que é copiado, o que é ignorado e por quê, o que fica
// pendente pro operador revisar depois): ver docs/IMPORTAR-CLIENTE-BOS.md.
//
// Não ativa nenhum módulo — isso fica sempre pro operador liberar depois
// (Console → Clientes → Editar cliente), de propósito.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOS_ROOT = path.resolve(__dirname, "..", process.env.BOS_ROOT || "../B-O-S");

// ---- args -------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
const srcArg = rawArgs.find((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  rawArgs
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.slice(2).split("=");
      return [k, rest.length ? rest.join("=") : true];
    }),
);

if (!srcArg) {
  console.error('uso: node scripts/importar-cliente-bos.mjs <pasta-de-origem> [--slug=x] [--hub=id] [--nome="Nome"]');
  process.exit(1);
}

const srcRoot = path.resolve(process.cwd(), srcArg);
if (!fs.existsSync(srcRoot) || !fs.statSync(srcRoot).isDirectory()) {
  console.error(`pasta não encontrada: ${srcRoot}`);
  process.exit(1);
}

// ---- helpers (espelham lib/bos.ts, lib/provision.ts, lib/password.ts) -------

function slugify(nome) {
  return String(nome)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeSlug(slug) {
  const clean = String(slug).normalize("NFKD").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
  if (!clean) throw new Error("slug inválido");
  return clean;
}

function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

function readIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function extractField(md, label) {
  if (!md) return "";
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, "i");
  const m = md.match(re);
  return m ? m[1].trim() : "";
}

function extractHexNear(md, keyword) {
  if (!md) return null;
  const linha = md.split(/\r?\n/).find((l) => l.toLowerCase().includes(keyword));
  const m = linha && linha.match(/#([0-9a-fA-F]{6})/);
  return m ? `#${m[1].toUpperCase()}` : null;
}

function isLightHex(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// ---- descobrir nome / slug ----------------------------------------------------

const empresaMd = readIfExists(path.join(srcRoot, "_memoria/empresa.md"));
const designMd = readIfExists(path.join(srcRoot, "identidade/design-guide.md"));

const nomeDetectado = extractField(empresaMd, "Nome") || path.basename(srcRoot);
const nome = (flags.nome || nomeDetectado).trim();
const slug = sanitizeSlug(flags.slug || slugify(nome));

const destRoot = path.join(BOS_ROOT, "clientes", slug);
if (fs.existsSync(destRoot)) {
  console.error(`já existe um cliente '${slug}' em ${path.relative(process.cwd(), destRoot)} — escolha outro --slug ou remova antes.`);
  process.exit(1);
}

console.log(`Importando "${nome}" de ${path.relative(process.cwd(), srcRoot)} → clientes/${slug}/\n`);

// ---- cópia seletiva -----------------------------------------------------------
// Regra: dado REAL do cliente é copiado por inteiro; infraestrutura genérica do
// instalador (skills globais, scripts globais, boilerplate) nunca é copiada —
// já existe (e é mantida) na raiz compartilhada do B-O-S.

const SKIP_ANYWHERE = new Set(["node_modules", "dist", ".DS_Store", ".git"]);

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_ANYWHERE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyRealDir(nomePasta) {
  const s = path.join(srcRoot, nomePasta);
  if (!fs.existsSync(s)) return false;
  const d = path.join(destRoot, nomePasta);
  fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
    if (SKIP_ANYWHERE.has(entry.name)) continue;
    if (entry.name === "README.md") continue; // boilerplate do instalador, não é dado do cliente
    const sp = path.join(s, entry.name);
    const dp = path.join(d, entry.name);
    if (entry.isDirectory()) copyRecursive(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
  return true;
}

const REAL_DIRS = ["_memoria", "identidade", "dados", "marketing", "saidas"];
const copiadas = [];
for (const d of REAL_DIRS) {
  if (copyRealDir(d)) copiadas.push(d);
}

// ---- normalizar sites empacotados (Node/NestJS/Vite só pra hospedagem) --------
// A skill criar-site gera site estático puro (index.html direto na raiz do
// rascunho — é isso que o módulo Meu Site espera). Instalações antigas às
// vezes empacotavam o mesmo estático dentro de um wrapper Node só porque a
// hospedagem exigia um processo rodando (ex: Hostinger) — o HTML real fica
// em <rascunho>/public/index.html em vez de <rascunho>/index.html direto.
// Detecta esse caso e "achata": manda o conteúdo real de public/ pra raiz do
// rascunho (onde o Meu Site sabe procurar) e preserva o wrapper original
// numa subpasta _deploy-nodejs/, só de referência (pra redeploy nesse
// formato específico, se precisar de novo).
const sitesNormalizados = [];
const sitesNaoReconhecidos = [];
const sitesDir = path.join(destRoot, "saidas", "sites");
if (fs.existsSync(sitesDir)) {
  for (const entry of fs.readdirSync(sitesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const draftDir = path.join(sitesDir, entry.name);
    const temIndexDireto = fs.existsSync(path.join(draftDir, "index.html"));
    const publicDir = path.join(draftDir, "public");
    const temPublicIndex = fs.existsSync(path.join(publicDir, "index.html"));
    if (temIndexDireto) continue; // já no formato esperado, não mexe
    if (!temPublicIndex) {
      sitesNaoReconhecidos.push(entry.name);
      continue; // estrutura não reconhecida — fica como está, revisar na mão
    }

    const deployDir = path.join(draftDir, "_deploy-nodejs");
    fs.mkdirSync(deployDir, { recursive: true });
    for (const item of fs.readdirSync(draftDir)) {
      if (item === "public" || item === "_deploy-nodejs") continue;
      fs.renameSync(path.join(draftDir, item), path.join(deployDir, item));
    }
    for (const item of fs.readdirSync(publicDir)) {
      fs.renameSync(path.join(publicDir, item), path.join(draftDir, item));
    }
    fs.rmdirSync(publicDir);
    fs.writeFileSync(
      path.join(deployDir, "LEIA.md"),
      "# Wrapper de deploy (Node/NestJS/Vite)\n\n" +
        "Esse site foi originalmente empacotado com um servidor Node mínimo só " +
        "porque a hospedagem de origem exigia um processo rodando (ex: Hostinger) " +
        "— o conteúdo em si é 100% estático. Na importação, o estático (que estava " +
        "em `public/`) foi movido pra raiz desta pasta, no formato que o módulo " +
        "Meu Site espera (`index.html` direto). Os arquivos aqui são só o wrapper " +
        "original, preservado de referência — só use se for redeployar nesse " +
        "formato específico de novo.\n",
    );
    sitesNormalizados.push(entry.name);
  }
}

// pastas de infra compartilhada — nascem vazias (padrão do provisionamento normal)
for (const d of [".claude/skills", "scripts"]) {
  fs.mkdirSync(path.join(destRoot, d), { recursive: true });
  fs.writeFileSync(path.join(destRoot, d, ".gitkeep"), "", "utf8");
}
// pastas de dado real que ficaram vazias (cliente não tinha nada lá) ganham .gitkeep
for (const d of REAL_DIRS) {
  const dir = path.join(destRoot, d);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.readdirSync(dir).length === 0) fs.writeFileSync(path.join(dir, ".gitkeep"), "", "utf8");
}

function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name));
    else n++;
  }
  return n;
}
const totalArquivos = countFiles(destRoot);

// ---- CLAUDE.md do cliente ------------------------------------------------------
// Preserva o CLAUDE.md original por inteiro (pode ter regras específicas que o
// cliente já tinha customizado no fim do arquivo) — só adiciona um cabeçalho
// padrão do Hub por cima. Nunca tenta "adivinhar" e cortar só a parte
// custom — arriscado de errar; melhor manter tudo e aceitar a redundância
// com a raiz do B-O-S (inofensiva) do que perder alguma regra real.
const claudeMdOriginal = readIfExists(path.join(srcRoot, "CLAUDE.md"));
const claudeMdFinal = `# ${nome} — workspace do cliente

Instruções específicas deste cliente. Sobrescrevem as regras da raiz do
B-O-S quando relevantes. O contexto de \`_memoria/\` e \`identidade/\`
desta pasta é lido no início de toda conversa.

## Regras deste cliente

- Toda peça pública (post, site, anúncio) passa por aprovação do operador
  da agência antes de publicar.
- Nunca usar a identidade visual da agência nas peças deste cliente.

---

> Importado de uma instalação B-O-S standalone em ${new Date().toISOString().slice(0, 10)}. O
> conteúdo abaixo é o CLAUDE.md original dessa instalação, preservado na
> íntegra — pode repetir regras gerais que já existem na raiz do B-O-S
> (inofensivo) e também pode ter regras específicas que esse cliente já
> tinha customizado (essas continuam valendo).

${claudeMdOriginal || "_(este cliente não tinha um CLAUDE.md próprio.)_"}
`;
fs.writeFileSync(path.join(destRoot, "CLAUDE.md"), claudeMdFinal, "utf8");

// ---- .env de origem: nunca copiado pro workspace (segredo) ---------------------
const envOriginal = readIfExists(path.join(srcRoot, ".env"));
const envPairs = envOriginal
  ? envOriginal
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()])
  : [];

const notasImportacao = [];
if (envPairs.length) {
  notasImportacao.push(`.env original tinha: ${envPairs.map(([k]) => k).join(", ")} — nenhum valor copiado pra pasta do cliente (segredo nunca fica no workspace sandboxed).`);
}

// Instagram: se token + IG User ID reais estavam no .env, migra pra
// B-O-S/_integracoes/<slug>.json (mesmo lugar/formato que lib/integrations.ts usa)
// em vez de descartar — mas nunca dentro da pasta do tenant.
const metaToken = envPairs.find(([k]) => k === "META_PAGE_ACCESS_TOKEN")?.[1];
const metaIgUserId = envPairs.find(([k]) => k === "META_IG_USER_ID")?.[1];
if (metaToken && metaIgUserId) {
  const integracoesDir = path.join(BOS_ROOT, "_integracoes");
  fs.mkdirSync(integracoesDir, { recursive: true });
  fs.writeFileSync(
    path.join(integracoesDir, `${slug}.json`),
    JSON.stringify(
      {
        metaInstagram: {
          pageAccessToken: metaToken,
          igUserId: metaIgUserId,
          obtidoEm: new Date().toISOString(),
          observacao: "Importado do .env da instalação B-O-S standalone — verificar se ainda é válido em Configurações → Instagram (API), pode já ter expirado.",
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  notasImportacao.push("Instagram: token e IG User ID encontrados no .env original e migrados — confirmar validade em Configurações → Instagram (API).");
} else {
  notasImportacao.push("Instagram: não estava conectado nessa instalação (token/IG User ID vazios no .env original) — conectar do zero se for o caso.");
}

// SITE_URL só é aproveitado se não for o placeholder padrão do instalador
const siteUrl = envPairs.find(([k]) => k === "SITE_URL")?.[1];
const siteUrlReal = siteUrl && siteUrl !== "https://seudominio.com.br" ? siteUrl : undefined;

// ---- config.json ----------------------------------------------------------------

const tipo = extractField(empresaMd, "Negócio") || extractField(empresaMd, "Perfil") || undefined;
const corPrincipal = extractHexNear(designMd, "destaque") || extractHexNear(designMd, "cta");
const fundoHex = extractHexNear(designMd, "fundo principal");
const tema = fundoHex ? (isLightHex(fundoHex) ? "branco" : "preto") : "preto";

const login = slug;
const senha = generatePassword();
const senhaHash = bcrypt.hashSync(senha, 10);

const hubId = flags.hub ? String(flags.hub) : undefined;

const config = {
  slug,
  nome,
  tipo,
  modulos_ativos: [], // sempre vazio — liberar módulo é decisão manual do operador
  acesso: { login, senha_hash: senhaHash },
  status: "em_configuracao",
  observacoes_internas: `Importado da pasta B-O-S standalone em ${path.basename(srcRoot)} (${new Date().toISOString().slice(0, 10)}). ${notasImportacao.join(" ")} Nenhum módulo foi ativado — liberar em Editar cliente conforme necessário.`,
  criado_em: new Date().toISOString(),
  hub: hubId,
  experimental: false,
  tema,
  claude: {
    habilitado: true,
    modelosLiberados: ["haiku", "sonnet"],
    modeloChat: "sonnet",
    modeloGerador: "sonnet",
    limiteTokens: 0,
    importarArquivos: false,
    exportarArquivos: false,
    acessoInternet: false,
  },
  nomeComercial: nome,
  corPrincipal: corPrincipal || undefined,
  responsavel: {},
  presencaDigital: siteUrlReal ? { site: siteUrlReal } : {},
  healthScore: 100,
  tipoCliente: "nao_definido",
  crmPreset: null,
};
fs.writeFileSync(path.join(destRoot, "config.json"), JSON.stringify(config, null, 2) + "\n", "utf8");

// ---- relatório final --------------------------------------------------------------

console.log(`Pastas copiadas: ${copiadas.join(", ") || "(nenhuma — instalação de origem vazia)"}`);
console.log(`Total de arquivos no workspace novo: ${totalArquivos}`);
console.log(`Tema detectado: ${tema}${corPrincipal ? ` · cor de destaque: ${corPrincipal}` : " · cor de destaque: não detectada, revisar em Configurações"}`);
if (sitesNormalizados.length) console.log(`Sites normalizados (wrapper Node → formato do Meu Site): ${sitesNormalizados.join(", ")}`);
if (sitesNaoReconhecidos.length) console.log(`Sites em saidas/sites/ com estrutura não reconhecida (sem index.html, revisar na mão): ${sitesNaoReconhecidos.join(", ")}`);
for (const n of notasImportacao) console.log(`- ${n}`);
console.log(`\nCliente '${slug}' criado em clientes/${slug}/.`);
console.log(`Login: ${login}`);
console.log(`Senha: ${senha}  (mostrada só agora — depois só o hash fica salvo)`);
console.log(`\nNenhum módulo ativado ainda — libere em Console → Clientes → Editar cliente.`);
console.log(`A pasta de origem (${path.relative(process.cwd(), srcRoot)}) NÃO foi apagada — depois de conferir que o import ficou certo, pode remover manualmente.`);
