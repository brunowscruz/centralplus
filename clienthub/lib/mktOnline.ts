import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, fileExists } from "./bos";

/**
 * Módulo MKT Online — Google Meu Negócio, Google Ads e Meta Ads gerados pela
 * IA, prontos pra o próprio cliente importar/preencher (autoatendimento,
 * nada publica sozinho — ver docs no CLAUDE.md e o plano original).
 *
 * Convenção de pastas (mesma família de lib/instagram.ts):
 *   marketing/mkt-online/gmb.json
 *   marketing/mkt-online/ads-google/<slug-titulo>-<data>/campanha.json (+img/)
 *   marketing/mkt-online/ads-meta/<slug-titulo>-<data>/campanha.json (+img/)
 *
 * Geração do CONTEÚDO (texto/palavras-chave/público/imagem) é sempre o
 * agente (ver MODULE_PREFIX["mkt-online"] em app/api/tenants/[slug]/chat/route.ts),
 * que escreve os JSON diretamente. Já os ARQUIVOS de download (CSV do Google
 * Ads, texto do GMB/Meta) são sempre gerados por código determinístico aqui
 * — mesmo princípio do paginaParaHtml do Instagram (nunca deixar a IA
 * desenhar o arquivo final na mão, formato tem que ser sempre consistente).
 */

export const MKT_DIR = "marketing/mkt-online";

/** Cópia local de propósito (mesma razão de lib/instagram.ts): não puxar a
 * cadeia de imports de lib/provision.ts aqui. */
function slugify(nome: string): string {
  return String(nome)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PerfilGMB {
  titulo: string;
  categoria: string;
  descricao: string;
  endereco?: string;
  horario: string;
  atualizadoEm: string; // ISO
}

export type PlataformaAds = "google" | "meta";

/** Resultado da última tentativa de criar a campanha DE VERDADE via Google
 * Ads API (ver lib/googleAds.ts) — só existe pra plataforma "google" com
 * credencial configurada; Meta Ads continua 100% manual (sem API oficial de
 * bulk import estável, ver gerarResumoMetaAds). */
export interface AplicacaoCampanhaAds {
  tentadoEm: string; // ISO
  ok: boolean;
  mensagem: string;
  googleCampaignId?: string;
  googleAdGroupId?: string;
}

export interface CampanhaAds {
  plataforma: PlataformaAds;
  titulo: string;
  tipo: "produto" | "servico" | "zero";
  descricaoNegocio: string; // o que o cliente pediu/descreveu
  /** Usado pela plataforma "meta" (criativo = título+corpo por variação). Pra
   * "google", desde a rodada de qualidade de anúncio, o conteúdo real vive em
   * `headlines`/`descriptions` abaixo (pool, não par) — `anuncios` só continua
   * aqui pra campanha antiga que já existia antes disso ler sem quebrar. */
  anuncios?: { titulo: string; descricao: string }[];
  /** Só "google". Pool de títulos da Rede de Pesquisa — até 15, ≤30
   * caracteres cada, o Google combina sozinho com as descrições. Google
   * recomenda 10-15 pra "Ad strength: Excellent" (3 é "Poor"). */
  headlines?: string[];
  /** Só "google". Pool de descrições — até 4, ≤90 caracteres cada. */
  descriptions?: string[];
  /** Só "google". Frases curtas extras que aparecem junto do anúncio (ex:
   * "Orçamento grátis") — ≤25 caracteres cada, até ~10. */
  callouts?: string[];
  /** Só "google". Lista com cabeçalho fixo do Google (ex: "Services",
   * "Types" — sempre em inglês, é assim que a API exige mesmo em conta
   * PT-BR) + valores curtos (≤25 caracteres). Ver HEADERS_SNIPPET_VALIDOS
   * em lib/googleAds.ts pra lista completa aceita. */
  snippetsEstruturados?: { cabecalho: string; valores: string[] }[];
  /** Só "google". Palavras-chave negativas — buscas que claramente NÃO
   * interessam pro negócio (evita gastar orçamento com clique errado). */
  palavrasNegativas?: string[];
  /** Só "google". Cidade(s)/região(ões) onde o anúncio deve aparecer, em
   * texto livre (ex: "Santos, SP") — resolvido pro ID da Google Ads API na
   * hora de aplicar (ver `resolverLocalizacoes` em lib/googleAds.ts). Sem
   * isso preenchido, a campanha aplica sem nenhuma segmentação geográfica
   * (alcance default da conta, quase sempre grande demais pra negócio
   * local) — por isso a IA sempre tenta preencher a partir do contexto do
   * negócio, nunca deixa em branco por padrão. */
  localizacoes?: string[];
  palavrasChave: string[];
  publico: string;
  orcamentoSugeridoDia?: number;
  /** Como o operador pensou o valor — a Google Ads API só aceita orçamento
   * DIÁRIO nativamente (não existe "orçamento mensal" na API); quando é
   * "mensal", orcamentoSugeridoDia já vem convertido (valor ÷ 30.4) e este
   * campo é só pra UI mostrar "R$X/mês" em vez de "R$X/dia" de volta pro
   * operador. Ausente/"diario" = comportamento de sempre. */
  tipoOrcamento?: "diario" | "mensal";
  criativo?: string; // nome do arquivo dentro de img/, se houver
  /** Landing page do anúncio — a Google Ads API exige final_url em todo
   * anúncio; sem isso preenchido, "aplicar" fica desabilitado na UI. */
  urlDestino?: string;
  /** "rascunho" é o único estado que a IA escreve. "aplicada"/"falhou" só
   * são gravados por lib/googleAds.ts::aplicarCampanhaGoogleAds (nunca pelo
   * agente) — a confirmação antes de aplicar é um passo da própria UI, não
   * um estado intermediário persistido. */
  status: "rascunho" | "aplicada" | "falhou";
  /** Espelha o status real na conta do Google Ads depois de aplicada —
   * atualizado por lib/googleAds.ts::pausarOuRetomarCampanhaGoogleAds. Toda
   * campanha nasce PAUSED na API (regra de segurança de sempre), então o
   * valor inicial após aplicar é sempre "PAUSED". */
  statusGoogleAds?: "ENABLED" | "PAUSED";
  aplicacao?: AplicacaoCampanhaAds;
  criadoEm: string;
  atualizadoEm: string;
}

function gmbPath(slug: string): string {
  return assertInsideTenant(slug, path.join(MKT_DIR, "gmb.json"));
}

export function lerPerfilGMB(slug: string): PerfilGMB | null {
  const abs = gmbPath(slug);
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as PerfilGMB;
  } catch {
    return null;
  }
}

export function salvarPerfilGMB(slug: string, perfil: PerfilGMB): void {
  const abs = gmbPath(slug);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(perfil, null, 2) + "\n", "utf8");
}

function pastaPlataforma(plataforma: PlataformaAds): string {
  return plataforma === "google" ? "ads-google" : "ads-meta";
}

function campanhaPath(slug: string, plataforma: PlataformaAds, nome: string): string {
  if (!nome || nome.includes("/") || nome.includes("\\") || nome.startsWith(".")) {
    throw new Error("campanha inválida");
  }
  return assertInsideTenant(slug, path.join(MKT_DIR, pastaPlataforma(plataforma), nome));
}

/** Cria a pasta de uma campanha nova — mesma lógica de sufixo numérico de
 * criarPastaDePost (lib/instagram.ts), pra manter a convenção consistente
 * entre módulos. */
export function criarPastaCampanha(slug: string, plataforma: PlataformaAds, titulo: string): string {
  const root = assertInsideTenant(slug, path.join(MKT_DIR, pastaPlataforma(plataforma)));
  fs.mkdirSync(root, { recursive: true });
  const data = new Date().toISOString().slice(0, 10);
  const base = `${slugify(titulo) || "campanha"}-${data}`;
  let nome = base;
  let n = 2;
  while (fileExists(path.join(root, nome))) {
    nome = `${base}-${n}`;
    n++;
  }
  fs.mkdirSync(path.join(root, nome), { recursive: true });
  return nome;
}

export function listarCampanhas(slug: string, plataforma: PlataformaAds): { nome: string; campanha: CampanhaAds }[] {
  const root = assertInsideTenant(slug, path.join(MKT_DIR, pastaPlataforma(plataforma)));
  if (!fileExists(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ nome: e.name, campanha: lerCampanha(slug, plataforma, e.name) }))
    .filter((x): x is { nome: string; campanha: CampanhaAds } => x.campanha !== null)
    .sort((a, b) => b.campanha.criadoEm.localeCompare(a.campanha.criadoEm));
}

/** Normaliza campos que a IA às vezes escreve num formato levemente
 * diferente do documentado (ex "R$ 80-150" em vez de 80) — nunca confiar
 * cegamente em arquivo escrito pelo agente; corrige na leitura, num lugar
 * só, em vez de cada consumidor (CSV, tela) ter que se defender sozinho. */
const STATUS_VALIDOS = new Set(["rascunho", "aplicada", "falhou"]);

function normalizarCampanha(c: CampanhaAds): CampanhaAds {
  const bruto = c.orcamentoSugeridoDia as unknown;
  let orcamentoSugeridoDia: number | undefined;
  if (bruto === undefined || bruto === null || bruto === "") {
    orcamentoSugeridoDia = undefined;
  } else if (typeof bruto === "number" && Number.isFinite(bruto)) {
    orcamentoSugeridoDia = bruto;
  } else {
    const match = String(bruto).match(/\d+(\.\d+)?/);
    const n = match ? Number(match[0]) : NaN;
    orcamentoSugeridoDia = Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  }
  const status = STATUS_VALIDOS.has(c.status as string) ? c.status : "rascunho";
  return { ...c, orcamentoSugeridoDia, status };
}

export function lerCampanha(slug: string, plataforma: PlataformaAds, nome: string): CampanhaAds | null {
  const abs = path.join(campanhaPath(slug, plataforma, nome), "campanha.json");
  if (!fileExists(abs)) return null;
  try {
    return normalizarCampanha(JSON.parse(fs.readFileSync(abs, "utf8")) as CampanhaAds);
  } catch {
    return null;
  }
}

export function salvarCampanha(slug: string, plataforma: PlataformaAds, nome: string, campanha: CampanhaAds): void {
  const dir = campanhaPath(slug, plataforma, nome);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "campanha.json"), JSON.stringify(campanha, null, 2) + "\n", "utf8");
}

/** Grava o resultado de uma tentativa de aplicação real via Google Ads API
 * (lib/googleAds.ts) — muda `status` pra "aplicada"/"falhou" de acordo,
 * nunca deixa a campanha num estado ambíguo. */
export function registrarResultadoAplicacaoCampanha(
  slug: string,
  plataforma: PlataformaAds,
  nome: string,
  resultado: Omit<AplicacaoCampanhaAds, "tentadoEm">,
): CampanhaAds | null {
  const campanha = lerCampanha(slug, plataforma, nome);
  if (!campanha) return null;
  const aplicacao: AplicacaoCampanhaAds = { ...resultado, tentadoEm: new Date().toISOString() };
  const proxima: CampanhaAds = {
    ...campanha,
    status: resultado.ok ? "aplicada" : "falhou",
    // toda campanha nasce PAUSED na API (regra de segurança) — só marca
    // isso quando realmente aplicou com sucesso.
    statusGoogleAds: resultado.ok ? "PAUSED" : campanha.statusGoogleAds,
    aplicacao,
    atualizadoEm: aplicacao.tentadoEm,
  };
  salvarCampanha(slug, plataforma, nome, proxima);
  return proxima;
}

/** Atualiza só o statusGoogleAds (pausar/retomar) sem mexer em mais nada da
 * campanha — chamado depois de confirmar a mudança na API de verdade. */
export function registrarStatusGoogleAds(
  slug: string,
  plataforma: PlataformaAds,
  nome: string,
  statusGoogleAds: "ENABLED" | "PAUSED",
): CampanhaAds | null {
  const campanha = lerCampanha(slug, plataforma, nome);
  if (!campanha) return null;
  const proxima: CampanhaAds = { ...campanha, statusGoogleAds, atualizadoEm: new Date().toISOString() };
  salvarCampanha(slug, plataforma, nome, proxima);
  return proxima;
}

export function removerCampanha(slug: string, plataforma: PlataformaAds, nome: string): void {
  const dir = campanhaPath(slug, plataforma, nome);
  if (fileExists(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export function resolveArquivoCampanha(slug: string, plataforma: PlataformaAds, nome: string, relFile: string): string {
  const dir = campanhaPath(slug, plataforma, nome);
  const rel = relFile.replace(/^\/+/, "");
  if (!rel) throw new Error("arquivo inválido");
  return assertInsideTenant(slug, path.join(MKT_DIR, pastaPlataforma(plataforma), nome, rel));
}

// ---------------------------------------------------------------------------
// Geradores determinísticos de arquivo pra download
// ---------------------------------------------------------------------------

/** Ficha do Google Meu Negócio — texto organizado, mesma ordem dos campos
 * mostrados na tela, pronto pra colar campo a campo na interface do Google
 * (não existe formato de importação em massa pro GMB). */
export function gerarArquivoGmb(perfil: PerfilGMB): string {
  const linhas = [
    "PERFIL DO GOOGLE MEU NEGÓCIO — gerado pela IA",
    "Cole cada campo abaixo no campo correspondente do seu perfil no Google.",
    "",
    `Título: ${perfil.titulo}`,
    `Categoria: ${perfil.categoria}`,
    "",
    "Descrição:",
    perfil.descricao,
    "",
    `Horário de funcionamento: ${perfil.horario}`,
  ];
  if (perfil.endereco) linhas.push(`Endereço: ${perfil.endereco}`);
  return linhas.join("\n") + "\n";
}

function csvEscape(v: string): string {
  if (v === "") return "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function csvLinha(campos: string[]): string {
  return campos.map(csvEscape).join(",");
}

/**
 * CSV real, importável no Google Ads Editor (Conta → Importar → CSV) —
 * formato documentado e tolerante: primeira linha é o cabeçalho, e o
 * próprio Editor deixa remapear coluna na hora de importar se algum nome
 * não bater exato. Cobre o caso comum (campanha de Pesquisa com um grupo
 * de anúncio) — mesmo recorte de escopo que a skill /anuncio-google já usa
 * (campanha sempre sobe PAUSADA, ativação é sempre manual).
 */
/** Campanha "google" pode não ter mais `anuncios` (formato novo usa pool
 * `headlines`/`descriptions` — ver lib/googleAds.ts). O CSV de importação em
 * massa do Google Ads Editor só aceita 3 títulos + 2 descrições por linha
 * mesmo (formato antigo, fixo), então usar só os primeiros já é suficiente
 * aqui — isso é só o fallback manual, a campanha de verdade usa o pool
 * inteiro via API. */
function anunciosOuFallback(campanha: CampanhaAds): { titulo: string; descricao: string }[] {
  if (campanha.anuncios?.length) return campanha.anuncios;
  const descricoes = campanha.descriptions || [];
  return (campanha.headlines || []).slice(0, 3).map((h, i) => ({ titulo: h, descricao: descricoes[i % (descricoes.length || 1)] || "" }));
}

export function gerarCsvGoogleAds(campanha: CampanhaAds): string {
  const cab = [
    "Campaign",
    "Campaign Type",
    "Networks",
    "Budget",
    "Ad Group",
    "Keyword",
    "Match Type",
    "Headline 1",
    "Headline 2",
    "Headline 3",
    "Description 1",
    "Description 2",
  ];
  const nomeCampanha = campanha.titulo;
  const nomeGrupo = campanha.titulo;
  const linhas: string[][] = [];

  // linha da campanha (define tipo, rede e orçamento)
  linhas.push([
    nomeCampanha,
    "Search",
    "Google Search",
    campanha.orcamentoSugeridoDia ? String(campanha.orcamentoSugeridoDia) : "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  // linha do grupo de anúncio
  linhas.push([nomeCampanha, "", "", "", nomeGrupo, "", "", "", "", "", "", ""]);
  // uma linha por palavra-chave (correspondência ampla, o cliente ajusta se quiser)
  for (const kw of campanha.palavrasChave) {
    linhas.push([nomeCampanha, "", "", "", nomeGrupo, kw, "Broad", "", "", "", "", ""]);
  }
  // uma linha por variação de anúncio
  for (const ad of anunciosOuFallback(campanha)) {
    linhas.push([nomeCampanha, "", "", "", nomeGrupo, "", "", ad.titulo, "", "", ad.descricao, ""]);
  }

  return [csvLinha(cab), ...linhas.map(csvLinha)].join("\n") + "\n";
}

/**
 * Resumo organizado pro Meta Ads — DE PROPÓSITO não é um arquivo de
 * importação em massa: o formato oficial do Gerenciador de Anúncios exige
 * template baixado na hora (~40 colunas, nome tem que bater exato, muda com
 * frequência) — fixar isso na unha arrisca gerar arquivo que a Meta
 * rejeita. Em vez disso, entrega o conteúdo já organizado com os MESMOS
 * nomes de campo do Gerenciador (Título/Texto principal/Público/Orçamento),
 * pronto pra colar na hora de criar a campanha manualmente.
 */
export function gerarResumoMetaAds(campanha: CampanhaAds): string {
  const linhas = [
    "CAMPANHA META ADS (Instagram/Facebook) — gerado pela IA",
    "Resumo pra você preencher no Gerenciador de Anúncios — os nomes dos campos abaixo são os mesmos que aparecem lá.",
    "",
    `Nome da campanha: ${campanha.titulo}`,
    `Público: ${campanha.publico}`,
  ];
  if (campanha.orcamentoSugeridoDia) linhas.push(`Orçamento sugerido: R$ ${campanha.orcamentoSugeridoDia}/dia`);
  linhas.push("", "Palavras-chave/temas (pra orientar a segmentação por interesse):", campanha.palavrasChave.join(", "), "");
  anunciosOuFallback(campanha).forEach((ad, i) => {
    linhas.push(`Anúncio ${i + 1}`, `  Título: ${ad.titulo}`, `  Texto principal (Body): ${ad.descricao}`, "");
  });
  if (campanha.criativo) linhas.push(`Imagem: ${campanha.criativo} (baixe na tela e suba como imagem do anúncio)`);
  return linhas.join("\n") + "\n";
}
