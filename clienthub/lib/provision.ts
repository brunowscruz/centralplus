import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { tenantRoot, sanitizeSlug, fileExists } from "./bos";
import { writeConfig, TenantStatus, TenantClaudeConfig, CLAUDE_DEFAULT } from "./tenants";
import { optionalModules } from "./modules";
import { hashPassword } from "./password";
import { createAccount } from "./claude-accounts";

/**
 * Provisionamento de cliente novo (Fase 3 do spec).
 *
 * Gera `clientes/<slug>/` com a MESMA estrutura que `/instalar` + `/novo-projeto`
 * gerariam via terminal: config.json, CLAUDE.md próprio, `_memoria/*`,
 * `identidade/design-guide.md` e as pastas de trabalho. Cliente novo NUNCA é
 * deploy novo — é só este registro dentro do sistema que já está rodando.
 *
 * Os campos espelham a entrevista do `/instalar` (Fase 2, perguntas 1-10).
 */
export interface ProvisionInput {
  // Sobre o negócio (perguntas 1-4)
  nome: string;
  slug?: string; // se vazio, derivado do nome
  tipo?: string; // "clínica", "loja de carros", "escritório de advocacia"...
  entrega?: string; // "o que entrega, em uma frase" (p2)
  quemPaga?: string; // perfil de cliente real (p3)
  equipe?: string; // sozinho ou equipe (p4)
  // Sobre voz (perguntas 5-6)
  exemploEscrita?: string;
  evitar?: string;
  // Sobre foco (perguntas 7-8)
  gargalo?: string;
  tarefaRepetida?: string;
  // Identidade visual (pergunta 9) — formato que lib/theme.ts parseia
  identidade?: {
    corFundo?: string;
    corDestaque?: string;
    corTexto?: string;
    corCards?: string;
    fonteTitulos?: string;
    fonteCorpo?: string;
    estilo?: string;
  };
  // Módulos ativos do catálogo (menu dinâmico, seção 2.5 do spec)
  modulos?: string[];
  // Credencial de acesso do cliente
  acesso?: { login?: string; senha?: string };
  // Status inicial e observações internas (seção 4, item 6)
  status?: TenantStatus;
  observacoesInternas?: string;

  // ---- campos do wizard "Cadastrar novo cliente" (paridade com a referência) ----
  hub?: string; // id do Hub (lib/catalog/hubs.json)
  experimental?: boolean;
  tema?: "preto" | "branco";
  nomeComercial?: string;
  segmento?: string; // grava em `tipo` (mesmo campo — "segmento/nicho" no formulário)
  corPrincipal?: string;
  responsavel?: { nome?: string; cargo?: string; email?: string; whatsapp?: string };
  presencaDigital?: { dominio?: string; site?: string; instagram?: string; whatsapp?: string };
  crmPreset?: string | null;
  tipoCliente?: "recorrente" | "nao_recorrente" | "nao_definido";
  healthScore?: number;
  logo?: { dataUrl: string; filename?: string | null };
  claude?: {
    modo: "sem" | "compartilhado" | "dedicado";
    contaId?: string; // quando modo === "compartilhado": qual conta usar
    dedicado?: { nome: string; token: string }; // quando modo === "dedicado": cria a conta na hora
    modelosLiberados?: string[];
    modeloChat?: string;
    modeloGerador?: string;
    limiteTokens?: number;
  };
}

export interface ProvisionResult {
  slug: string;
  nome: string;
  login: string;
  senha: string;
  modulos_ativos: string[];
}

export class ProvisionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** "Acme Empresa Ltda" -> "acme-empresa-ltda" (mesma regra da Fase 5 do /instalar). */
export function slugify(nome: string): string {
  return String(nome)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining marks pós-NFKD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Senha legível sem caracteres ambíguos (0/O, 1/l/I). */
export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

const HEX6 = /^#?([0-9a-fA-F]{6})$/;

function normalizeHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = value.trim().match(HEX6);
  return m ? `#${m[1].toUpperCase()}` : undefined;
}

function clean(value: string | undefined): string {
  return (value || "").trim();
}

export function provisionTenant(input: ProvisionInput): ProvisionResult {
  const nome = clean(input.nome);
  if (!nome) throw new ProvisionError("informe o nome do negócio");

  let slug: string;
  try {
    slug = sanitizeSlug(clean(input.slug) || slugify(nome));
  } catch {
    throw new ProvisionError("não foi possível derivar um slug válido do nome");
  }

  const root = tenantRoot(slug);
  if (fileExists(root)) {
    throw new ProvisionError(`o cliente '${slug}' já existe`, 409);
  }

  // Só módulos opcionais do catálogo entram em modulos_ativos (os "always"
  // — visão geral, claude, config — todo cliente tem por definição).
  const optionalIds = new Set(optionalModules().map((m) => m.id as string));
  const modulos = (input.modulos || []).filter((m) => optionalIds.has(m));

  const login = clean(input.acesso?.login).toLowerCase() || slug;
  const senha = clean(input.acesso?.senha) || generatePassword();
  if (senha.length < 6) {
    throw new ProvisionError("a senha precisa de pelo menos 6 caracteres");
  }

  // ---- estrutura de pastas (seção 1 do spec) -------------------------------
  const dirs = [
    "_memoria",
    "identidade",
    ".claude/skills", // skills específicas do cliente (via /mapear-rotinas)
    "marketing",
    "saidas",
    "dados",
    "scripts",
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  // .gitkeep nas pastas que nascem vazias
  for (const d of ["marketing", "saidas", "dados", "scripts", ".claude/skills"]) {
    fs.writeFileSync(path.join(root, d, ".gitkeep"), "", "utf8");
  }

  // ---- Claude — assistente de IA (Sem Claude / Compartilhado / Dedicado) ---
  const claudeInput = input.claude;
  let claudeConfig: TenantClaudeConfig = { ...CLAUDE_DEFAULT };
  if (claudeInput?.modo === "sem") {
    claudeConfig = { ...CLAUDE_DEFAULT, habilitado: false };
  } else if (claudeInput?.modo === "dedicado" && claudeInput.dedicado?.nome && claudeInput.dedicado?.token) {
    const conta = createAccount({
      nome: claudeInput.dedicado.nome,
      tipo: "seat_token",
      compartilhada: false,
      token: claudeInput.dedicado.token,
    });
    claudeConfig = {
      habilitado: true,
      contaId: conta.id,
      modelosLiberados: claudeInput.modelosLiberados || CLAUDE_DEFAULT.modelosLiberados,
      modeloChat: claudeInput.modeloChat || CLAUDE_DEFAULT.modeloChat,
      modeloGerador: claudeInput.modeloGerador || CLAUDE_DEFAULT.modeloGerador,
      limiteTokens: claudeInput.limiteTokens ?? CLAUDE_DEFAULT.limiteTokens,
    };
  } else {
    // "compartilhado" (ou não informado — padrão): usa a conta indicada, ou a
    // conta padrão de API quando nenhuma é escolhida.
    claudeConfig = {
      habilitado: true,
      contaId: claudeInput?.contaId || undefined,
      modelosLiberados: claudeInput?.modelosLiberados || CLAUDE_DEFAULT.modelosLiberados,
      modeloChat: claudeInput?.modeloChat || CLAUDE_DEFAULT.modeloChat,
      modeloGerador: claudeInput?.modeloGerador || CLAUDE_DEFAULT.modeloGerador,
      limiteTokens: claudeInput?.limiteTokens ?? CLAUDE_DEFAULT.limiteTokens,
    };
  }

  // ---- config.json (registro do tenant + menu dinâmico) --------------------
  // Senha NUNCA em texto puro (seção 8 do spec) — só o hash é gravado.
  writeConfig(slug, {
    slug,
    nome,
    tipo: clean(input.segmento || input.tipo) || undefined,
    modulos_ativos: modulos,
    acesso: { login, senha_hash: hashPassword(senha) },
    status: input.status || "em_configuracao",
    observacoes_internas: clean(input.observacoesInternas) || undefined,
    criado_em: new Date().toISOString(),
    hub: clean(input.hub) || undefined,
    experimental: !!input.experimental,
    tema: input.tema || "preto",
    claude: claudeConfig,
    nomeComercial: clean(input.nomeComercial) || undefined,
    corPrincipal: normalizeHex(input.corPrincipal),
    responsavel: input.responsavel,
    presencaDigital: input.presencaDigital,
    healthScore: typeof input.healthScore === "number" ? input.healthScore : 100,
    tipoCliente: input.tipoCliente || "nao_definido",
    crmPreset: modulos.includes("crm") ? input.crmPreset ?? "geral" : null,
  });

  // ---- CLAUDE.md do cliente (herda a raiz, sobrescreve quando relevante) ---
  writeFile(root, "CLAUDE.md", claudeMd(nome, input));

  // ---- _memoria/* (Fase 3 do /instalar) ------------------------------------
  writeFile(root, "_memoria/empresa.md", empresaMd(nome, input));
  writeFile(root, "_memoria/preferencias.md", preferenciasMd(input));
  writeFile(root, "_memoria/estrategia.md", estrategiaMd(input));

  // ---- identidade/design-guide.md (formato que lib/theme.ts parseia) -------
  writeFile(root, "identidade/design-guide.md", designGuideMd(input));

  // ---- logo (upload do cadastro, se enviado) --------------------------------
  if (input.logo?.dataUrl) {
    writeLogo(root, input.logo.dataUrl, input.logo.filename);
  }

  return { slug, nome, login, senha, modulos_ativos: modulos };
}

function writeFile(root: string, rel: string, content: string): void {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

/** Decodifica um data URL (`data:image/png;base64,...`) e grava a logo do cliente. */
function writeLogo(root: string, dataUrl: string, filename?: string | null): void {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return;
  const mime = m[1];
  const ext = mime.split("/")[1]?.replace("svg+xml", "svg") || "png";
  const buf = Buffer.from(m[2], "base64");
  // limite generoso de sanidade (evita gravar payload absurdo por engano do cliente)
  if (buf.length > 5 * 1024 * 1024) return;
  const dir = path.join(root, "identidade");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `logo.${ext}`), buf);
  void filename;
}

// ---- geradores de conteúdo ---------------------------------------------------
// Regra do /instalar: não inventar dados. Campo vazio vira placeholder claro,
// nunca texto fabricado — o card "força do contexto" reflete isso honestamente.

function claudeMd(nome: string, input: ProvisionInput): string {
  const tipo = clean(input.tipo);
  return `# ${nome} — workspace do cliente

Instruções específicas deste cliente. Sobrescrevem as regras da raiz do
B-O-S quando relevantes. O contexto de \`_memoria/\` e \`identidade/\`
desta pasta é lido no início de toda conversa.

## O que é esse workspace

Operação do cliente **${nome}**${tipo ? ` (${tipo})` : ""} dentro da agência.
Tudo que for gerado aqui (posts, site, análises) pertence a este cliente e
usa a identidade visual DELE (\`identidade/design-guide.md\` desta pasta).

## Regras deste cliente

- Toda peça pública (post, site, anúncio) passa por aprovação do operador
  da agência antes de publicar.
- Nunca usar a identidade visual da agência nas peças deste cliente.
${clean(input.evitar) ? `- Evitar na comunicação: ${clean(input.evitar)}\n` : ""}`;
}

function empresaMd(nome: string, input: ProvisionInput): string {
  const linhas = [
    `# Empresa\n`,
    `- **Nome:** ${nome}`,
    clean(input.tipo) && `- **Tipo de negócio:** ${clean(input.tipo)}`,
    clean(input.entrega) && `- **O que entrega:** ${clean(input.entrega)}`,
    clean(input.quemPaga) && `- **Quem paga (perfil de cliente real):** ${clean(input.quemPaga)}`,
    clean(input.equipe) && `- **Equipe:** ${clean(input.equipe)}`,
  ].filter(Boolean);
  return linhas.join("\n") + "\n";
}

function preferenciasMd(input: ProvisionInput): string {
  const exemplo = clean(input.exemploEscrita);
  const evitar = clean(input.evitar);
  const exemploQuote = exemplo
    .split(/\r?\n/)
    .map((l) => `> ${l}`)
    .join("\n");
  let md = `# Preferências\n\n## Tom de voz\n\n`;
  md += exemplo
    ? `Calibrar a escrita pelo exemplo real abaixo — imitar o ritmo, o vocabulário\ne o nível de formalidade dele, não um tom genérico.\n\n### Exemplo de escrita real do cliente\n\n${exemploQuote}\n`
    : `[Ainda sem exemplo de escrita real — pedir um texto recente do cliente\n(legenda, email) e calibrar por ele.]\n`;
  md += `\n## O que evitar\n\n`;
  md += evitar
    ? evitar
        .split(/[;\n]+/)
        .map((e) => `- ${e.trim()}`)
        .filter((e) => e !== "- ")
        .join("\n") + "\n"
    : `[Não informado ainda.]\n`;
  return md;
}

function estrategiaMd(input: ProvisionInput): string {
  const gargalo = clean(input.gargalo);
  const tarefa = clean(input.tarefaRepetida);
  return `# Estratégia

- **Gargalo atual:** ${gargalo || "[não informado ainda]"}
- **Pra tirar das costas:** ${
    tarefa
      ? `${tarefa} — candidata a virar skill via /mapear-rotinas`
      : "[não informado ainda]"
  }
- **Próximas prioridades:** ${
    gargalo
      ? `atacar o gargalo acima direto`
      : "[definir com o cliente na primeira reunião]"
  }
`;
}

function designGuideMd(input: ProvisionInput): string {
  const id = input.identidade || {};
  const fundo = normalizeHex(id.corFundo);
  const destaque = normalizeHex(id.corDestaque);
  const texto = normalizeHex(id.corTexto);
  const cards = normalizeHex(id.corCards);
  // Labels no formato exato que lib/theme.ts parseia. Linha sem valor é
  // ignorada pelo parser e pelo cálculo de força do contexto.
  return `# Identidade visual

## Cores

- **Fundo principal:** ${fundo || ""}
- **Cor de destaque / CTA:** ${destaque || ""}
- **Texto principal:** ${texto || ""}
- **Fundo alternativo / cards:** ${cards || ""}

## Tipografia

- **Títulos e destaques:** ${clean(id.fonteTitulos)}
- **Corpo, subtítulos e botões:** ${clean(id.fonteCorpo)}

## Estilo geral

${clean(id.estilo) || "[Descrever o estilo da marca — sóbrio, vibrante, minimalista...]"}
`;
}
