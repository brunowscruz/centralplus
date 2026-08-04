import fs from "node:fs";
import path from "node:path";
import { assertInsideTenant, fileExists } from "./bos";

/**
 * SEO Local — sub-área do módulo MKT Online (Google Meu Negócio + páginas
 * locais + schema markup). Ver MODULE_PREFIX["mkt-online"] em
 * app/api/tenants/[slug]/chat/route.ts pro contrato completo com o agente.
 *
 * Convenção de pastas:
 *   marketing/mkt-online/seo-local/perfil-negocio.json
 *   marketing/mkt-online/seo-local/concorrencia.json
 *   marketing/mkt-online/seo-local/diagnosticos/diagnostico-<data>.md
 *   marketing/mkt-online/seo-local/proposta-otimizacao-gmb.json
 *   marketing/mkt-online/seo-local/calendario-posts.json
 *   marketing/mkt-online/seo-local/reviews/respostas.json
 *   marketing/mkt-online/seo-local/paginas-locais.json
 *
 * Mesmo princípio de lib/mktOnline.ts: dado ESTRUTURADO que código
 * determinístico precisa consumir (schema JSON-LD, matriz de páginas
 * locais) vive em JSON tipado aqui. Cliente ideal / tom de voz continuam
 * só em _memoria/*.md (prosa livre pro agente se orientar) — NUNCA
 * duplicados aqui.
 */

export const SEO_LOCAL_DIR = "marketing/mkt-online/seo-local";

/** Cópia local de propósito (mesma razão de lib/instagram.ts/lib/mktOnline.ts):
 * não puxar a cadeia de imports de lib/provision.ts aqui. */
function slugify(nome: string): string {
  return String(nome)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function arquivo(slug: string, rel: string): string {
  return assertInsideTenant(slug, path.join(SEO_LOCAL_DIR, rel));
}

function lerJson<T>(abs: string): T | null {
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function salvarJson(abs: string, dado: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(dado, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// 1. Perfil de negócio (NAP + serviços + áreas — dado ESTRUTURAL, não prosa)
// ---------------------------------------------------------------------------

export interface ServicoSeo {
  slug: string;
  nome: string;
  descricaoCurta?: string;
}

export interface AreaAtuacaoSeo {
  slug: string;
  cidade: string;
  bairro?: string;
  estado: string;
}

export interface PerfilNegocioSeo {
  nomeLegal: string;
  telefone: string;
  enderecoCompleto: string;
  categoriaGmbPrincipal?: string;
  servicos: ServicoSeo[];
  areasAtuacao: AreaAtuacaoSeo[];
  /** Termos de busca essenciais pra presença online — editado direto (tag)
   * ou pela IA, mesmo arquivo. */
  palavrasChave?: string[];
  /** O que torna o negócio único — mesma ideia, editável direto ou pela IA. */
  diferenciais?: string[];
  /** Link "Ver perfil"/"Gerenciar perfil" do Google Business Profile do
   * cliente — preenchido manualmente pelo operador (a IA não tem como
   * descobrir isso sozinha). Usado só pra abrir a aba certa na ponte
   * Claude-in-Chrome (SessaoAssistidaCTA), nunca pra nenhuma automação. */
  linkGmb?: string;
  /** Place ID do Google Maps — diferente do linkGmb (aquele é o link de
   * GERENCIAR, esse é o identificador público do local). Usado só pra
   * buscar avaliações reais via Google Places API (lib/googlePlaces.ts),
   * uma API pública que não depende do token pendente de aprovação. */
  placeId?: string;
  atualizadoEm: string; // ISO
}

function normalizarPerfilNegocio(p: PerfilNegocioSeo): PerfilNegocioSeo {
  return {
    ...p,
    servicos: Array.isArray(p.servicos) ? p.servicos : [],
    areasAtuacao: Array.isArray(p.areasAtuacao) ? p.areasAtuacao : [],
    palavrasChave: Array.isArray(p.palavrasChave) ? p.palavrasChave : [],
    diferenciais: Array.isArray(p.diferenciais) ? p.diferenciais : [],
  };
}

export function lerPerfilNegocioSeo(slug: string): PerfilNegocioSeo | null {
  const dado = lerJson<PerfilNegocioSeo>(arquivo(slug, "perfil-negocio.json"));
  return dado ? normalizarPerfilNegocio(dado) : null;
}

export function salvarPerfilNegocioSeo(slug: string, perfil: PerfilNegocioSeo): void {
  salvarJson(arquivo(slug, "perfil-negocio.json"), perfil);
}

export const CAMPOS_TAG_PERFIL = ["servicos", "areasAtuacao", "palavrasChave", "diferenciais"] as const;
export type CampoTagPerfil = (typeof CAMPOS_TAG_PERFIL)[number];

/** Edição rápida por tag (atalho manual, mesmo arquivo que a IA escreve) —
 * `valores` é sempre string[] simples (o que o componente TagInput
 * trabalha); servicos/areasAtuacao viram os objetos estruturados que o
 * resto do sistema (páginas locais, schema markup) já espera. */
export function atualizarCampoTagPerfil(slug: string, campo: CampoTagPerfil, valores: string[]): PerfilNegocioSeo | null {
  const atual = lerPerfilNegocioSeo(slug);
  if (!atual) return null;

  let proximo: PerfilNegocioSeo;
  if (campo === "servicos") {
    proximo = { ...atual, servicos: valores.map((nome) => ({ slug: slugify(nome), nome })) };
  } else if (campo === "areasAtuacao") {
    proximo = {
      ...atual,
      areasAtuacao: valores.map((texto) => {
        const [cidade, estado] = texto.split(",").map((p) => p.trim());
        return { slug: slugify(texto), cidade: cidade || texto, estado: estado || "" };
      }),
    };
  } else {
    proximo = { ...atual, [campo]: valores };
  }
  proximo.atualizadoEm = new Date().toISOString();
  salvarPerfilNegocioSeo(slug, proximo);
  return proximo;
}

/** Só o link do GMB — setter isolado porque é o único campo do perfil que
 * o operador edita direto (não passa pela entrevista com a IA). */
export function atualizarLinkGmb(slug: string, linkGmb: string): PerfilNegocioSeo | null {
  const atual = lerPerfilNegocioSeo(slug);
  if (!atual) return null;
  const proximo = { ...atual, linkGmb, atualizadoEm: new Date().toISOString() };
  salvarPerfilNegocioSeo(slug, proximo);
  return proximo;
}

/** Place ID pro Google Places API (busca de avaliações reais) — setter
 * isolado no mesmo espírito de atualizarLinkGmb. */
export function atualizarPlaceId(slug: string, placeId: string): PerfilNegocioSeo | null {
  const atual = lerPerfilNegocioSeo(slug);
  if (!atual) return null;
  const proximo = { ...atual, placeId, atualizadoEm: new Date().toISOString() };
  salvarPerfilNegocioSeo(slug, proximo);
  return proximo;
}

// ---------------------------------------------------------------------------
// 2. Auditoria de concorrência (Agente 2)
// ---------------------------------------------------------------------------

export interface ConcorrenteGmb {
  nome: string;
  categoriaPrincipal?: string;
  categoriasSecundarias: string[];
  distanciaEstimadaKm?: number;
  nomeContemPalavraChave: boolean;
  cidadeCorrespondeAlvo: boolean;
  horarioPublicado: boolean;
  nota?: number;
  numAvaliacoes?: number;
  avaliacaoMaisRecenteEm?: string; // ISO, se detectável
  enderecoVisivel: boolean;
  numFotos?: number;
  temDescricao: boolean;
  servicosListados: string[];
  atributos: string[];
  postsRecentesUltimos30d?: number;
  posicaoNoMapa?: number;
}

export interface ConcorrenciaExecucao {
  id: string; // slug-do-termo-data
  termoBuscado: string;
  localizacaoBuscada: string;
  executadoEm: string; // ISO
  concorrentes: ConcorrenteGmb[];
}

export interface ConcorrenciaArquivo {
  execucoes: ConcorrenciaExecucao[]; // mais recente primeiro
}

const MAX_EXECUCOES_HISTORICO = 20;

export function lerConcorrencia(slug: string): ConcorrenciaArquivo {
  const dado = lerJson<ConcorrenciaArquivo>(arquivo(slug, "concorrencia.json"));
  return dado && Array.isArray(dado.execucoes) ? dado : { execucoes: [] };
}

export function salvarExecucaoConcorrencia(slug: string, execucao: ConcorrenciaExecucao): void {
  const atual = lerConcorrencia(slug);
  const proximas = [execucao, ...atual.execucoes.filter((e) => e.id !== execucao.id)]
    .sort((a, b) => b.executadoEm.localeCompare(a.executadoEm))
    .slice(0, MAX_EXECUCOES_HISTORICO);
  salvarJson(arquivo(slug, "concorrencia.json"), { execucoes: proximas });
}

// ---------------------------------------------------------------------------
// 3. Diagnóstico (Agente 3) — markdown puro, é conteúdo pronto de venda
// ---------------------------------------------------------------------------

function diagnosticosDir(slug: string): string {
  return arquivo(slug, "diagnosticos");
}

export function listarDiagnosticos(slug: string): { nome: string; atualizadoEm: string }[] {
  const dir = diagnosticosDir(slug);
  if (!fileExists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => {
      const abs = path.join(dir, e.name);
      return { nome: e.name.replace(/\.md$/, ""), atualizadoEm: fs.statSync(abs).mtime.toISOString() };
    })
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

export function lerDiagnostico(slug: string, nome: string): string | null {
  if (!nome || nome.includes("/") || nome.includes("\\") || nome.startsWith(".")) return null;
  const abs = path.join(diagnosticosDir(slug), `${nome}.md`);
  if (!fileExists(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

export function salvarDiagnostico(slug: string, nome: string, conteudo: string): void {
  if (!nome || nome.includes("/") || nome.includes("\\") || nome.startsWith(".")) {
    throw new Error("nome de diagnóstico inválido");
  }
  const abs = path.join(diagnosticosDir(slug), `${nome}.md`);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, conteudo, "utf8");
}

// ---------------------------------------------------------------------------
// 4. Proposta de otimização do perfil GMB (Agente 4) — aprovação campo-a-campo
// ---------------------------------------------------------------------------

export type StatusCampo = "proposta" | "aprovada" | "rejeitada" | "aplicada";

export interface CampoProposta<T> {
  valor: T;
  status: StatusCampo;
  aprovadoEm?: string;
  aplicadoEm?: string;
}

export interface FaqItem {
  pergunta: string;
  resposta: string;
}

export interface FotoPlanejada {
  nomeArquivoSugerido: string;
  descricao: string;
  categoria: string;
}

export interface DescricaoServicoProposta {
  servicoSlug: string;
  descricao: string;
}

export interface PropostaOtimizacaoGmb {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  categoriaPrincipal: CampoProposta<string>;
  categoriasSecundarias: CampoProposta<string[]>;
  descricaoGeral: CampoProposta<string>;
  descricaoPorServico: CampoProposta<DescricaoServicoProposta[]>;
  atributos: CampoProposta<string[]>;
  faq: CampoProposta<FaqItem[]>;
  planoFotos: CampoProposta<FotoPlanejada[]>;
}

/** Nomes válidos de campo — usado tanto pra normalização quanto pra validar
 * o corpo da rota PATCH de aprovação (nunca aceitar um nome arbitrário). */
export const CAMPOS_PROPOSTA_GMB = [
  "categoriaPrincipal",
  "categoriasSecundarias",
  "descricaoGeral",
  "descricaoPorServico",
  "atributos",
  "faq",
  "planoFotos",
] as const;
export type CampoPropostaNome = (typeof CAMPOS_PROPOSTA_GMB)[number];

function normalizarCampo<T>(campo: CampoProposta<T> | undefined, valorPadrao: T): CampoProposta<T> {
  if (!campo || typeof campo !== "object") return { valor: valorPadrao, status: "proposta" };
  return { valor: campo.valor ?? valorPadrao, status: campo.status || "proposta", aprovadoEm: campo.aprovadoEm, aplicadoEm: campo.aplicadoEm };
}

/** Nunca confiar cegamente no que o agente escreveu (mesmo princípio de
 * normalizarCampanha em lib/mktOnline.ts) — garante que todo campo exista e
 * que arrays nunca sejam null/undefined, mesmo se o agente pulou um campo. */
function normalizarProposta(p: PropostaOtimizacaoGmb): PropostaOtimizacaoGmb {
  return {
    ...p,
    categoriaPrincipal: normalizarCampo(p.categoriaPrincipal, ""),
    categoriasSecundarias: normalizarCampo(p.categoriasSecundarias, []),
    descricaoGeral: normalizarCampo(p.descricaoGeral, ""),
    descricaoPorServico: normalizarCampo(p.descricaoPorServico, []),
    atributos: normalizarCampo(p.atributos, []),
    faq: normalizarCampo(p.faq, []),
    planoFotos: normalizarCampo(p.planoFotos, []),
  };
}

function propostaGmbPath(slug: string): string {
  return arquivo(slug, "proposta-otimizacao-gmb.json");
}

export function lerPropostaGmb(slug: string): PropostaOtimizacaoGmb | null {
  const dado = lerJson<PropostaOtimizacaoGmb>(propostaGmbPath(slug));
  return dado ? normalizarProposta(dado) : null;
}

export function salvarPropostaGmb(slug: string, proposta: PropostaOtimizacaoGmb): void {
  salvarJson(propostaGmbPath(slug), proposta);
}

/** Transição de status de UM campo — é isso que a rota PATCH de aprovação
 * chama, nunca reescreve a proposta inteira a partir do cliente. */
export function atualizarStatusCampoProposta(
  slug: string,
  campo: CampoPropostaNome,
  novoStatus: StatusCampo,
): PropostaOtimizacaoGmb | null {
  const atual = lerPropostaGmb(slug);
  if (!atual) return null;
  const agora = new Date().toISOString();
  const campoAtual = atual[campo] as CampoProposta<unknown>;
  const campoNovo: CampoProposta<unknown> = {
    ...campoAtual,
    status: novoStatus,
    aprovadoEm: novoStatus === "aprovada" ? agora : campoAtual.aprovadoEm,
    aplicadoEm: novoStatus === "aplicada" ? agora : campoAtual.aplicadoEm,
  };
  const proxima: PropostaOtimizacaoGmb = { ...atual, [campo]: campoNovo, atualizadoEm: agora };
  salvarPropostaGmb(slug, proxima);
  return proxima;
}

// ---------------------------------------------------------------------------
// 5. Calendário de posts do GMB (Agente 5)
// ---------------------------------------------------------------------------

export type TipoPostGmb = "evento" | "chamada-para-acao" | "oferta";
export type StatusPostGmb = "rascunho" | "aprovado" | "aplicado" | "falhou";

export interface PostGmb {
  id: string;
  dataPrevista: string; // ISO (data, sem hora)
  objetivo: string;
  palavraChave: string;
  tipo: TipoPostGmb;
  titulo: string;
  texto: string;
  imagemSugerida?: string;
  status: StatusPostGmb;
  criadoEm: string;
  atualizadoEm: string;
  aplicadoEm?: string;
  erro?: string;
}

export interface CalendarioPosts {
  posts: PostGmb[];
}

function calendarioPostsPath(slug: string): string {
  return arquivo(slug, "calendario-posts.json");
}

export function lerCalendarioPosts(slug: string): CalendarioPosts {
  const dado = lerJson<CalendarioPosts>(calendarioPostsPath(slug));
  return dado && Array.isArray(dado.posts) ? dado : { posts: [] };
}

export function salvarCalendarioPosts(slug: string, calendario: CalendarioPosts): void {
  salvarJson(calendarioPostsPath(slug), calendario);
}

export function atualizarStatusPost(slug: string, postId: string, novoStatus: StatusPostGmb): CalendarioPosts {
  const atual = lerCalendarioPosts(slug);
  const agora = new Date().toISOString();
  const posts = atual.posts.map((p) =>
    p.id === postId
      ? { ...p, status: novoStatus, atualizadoEm: agora, aplicadoEm: novoStatus === "aplicado" ? agora : p.aplicadoEm }
      : p,
  );
  const proximo = { posts };
  salvarCalendarioPosts(slug, proximo);
  return proximo;
}

// ---------------------------------------------------------------------------
// 6. Monitor de reviews & respostas (Agente 7)
// ---------------------------------------------------------------------------

export type SentimentoReview = "positiva" | "neutra" | "negativa";
export type StatusReview = "rascunho" | "aprovada" | "aplicada";

export interface RespostaReview {
  id: string;
  avaliacaoTexto: string;
  avaliacaoAutor?: string;
  notaEstrelas: number;
  dataRecebida: string; // ISO, informada manualmente (sem polling automático)
  sentimento: SentimentoReview;
  respostaSugerida: string;
  exigeAprovacao: boolean;
  status: StatusReview;
  slaVencimentoEm: string; // dataRecebida + 48h
  criadoEm: string;
  atualizadoEm: string;
  aprovadoEm?: string;
  aplicadoEm?: string;
}

export interface RespostasReviewArquivo {
  reviews: RespostaReview[];
}

function reviewsPath(slug: string): string {
  return arquivo(slug, "reviews/respostas.json");
}

/** exigeAprovacao é SEMPRE recalculado aqui a partir de sentimento — nunca
 * confiar no que o agente escreveu: review negativa não pode escapar
 * aprovação por bug/esquecimento de prompt. */
function normalizarReview(r: RespostaReview): RespostaReview {
  return { ...r, exigeAprovacao: r.sentimento === "negativa" };
}

export function lerReviews(slug: string): RespostasReviewArquivo {
  const dado = lerJson<RespostasReviewArquivo>(reviewsPath(slug));
  const reviews = dado && Array.isArray(dado.reviews) ? dado.reviews : [];
  return { reviews: reviews.map(normalizarReview) };
}

export function salvarReview(slug: string, review: RespostaReview): void {
  const atual = lerReviews(slug);
  const proximas = [review, ...atual.reviews.filter((r) => r.id !== review.id)];
  salvarJson(reviewsPath(slug), { reviews: proximas });
}

export function atualizarStatusReview(slug: string, id: string, novoStatus: StatusReview): RespostasReviewArquivo {
  const atual = lerReviews(slug);
  const agora = new Date().toISOString();
  const reviews = atual.reviews.map((r) =>
    r.id === id
      ? { ...r, status: novoStatus, atualizadoEm: agora, aprovadoEm: novoStatus === "aprovada" ? agora : r.aprovadoEm, aplicadoEm: novoStatus === "aplicada" ? agora : r.aplicadoEm }
      : r,
  );
  const proximo = { reviews };
  salvarJson(reviewsPath(slug), proximo);
  return proximo;
}

// ---------------------------------------------------------------------------
// 7. Páginas locais — serviço × localização (Agente 6)
// ---------------------------------------------------------------------------

export type DestinoPagina = "site" | "wordpress";
export type StatusPaginaLocal = "rascunho" | "aprovada" | "publicada";

export interface PaginaLocal {
  id: string;
  servicoSlug: string;
  localizacaoSlug: string;
  palavraChaveAlvo: string;
  /** ex: "paginas-locais-2026-07-29/pintura-residencial-curitiba" — pasta
   * dentro de saidas/sites/, mesmo mecanismo de rascunho do módulo Site. */
  pastaRascunho: string;
  destino: DestinoPagina;
  status: StatusPaginaLocal;
  urlPublicada?: string;
  wpPostId?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PaginasLocaisArquivo {
  paginas: PaginaLocal[];
}

function paginasLocaisPath(slug: string): string {
  return arquivo(slug, "paginas-locais.json");
}

export function lerPaginasLocais(slug: string): PaginasLocaisArquivo {
  const dado = lerJson<PaginasLocaisArquivo>(paginasLocaisPath(slug));
  return dado && Array.isArray(dado.paginas) ? dado : { paginas: [] };
}

export function salvarPaginaLocal(slug: string, pagina: PaginaLocal): void {
  const atual = lerPaginasLocais(slug);
  const proximas = [pagina, ...atual.paginas.filter((p) => p.id !== pagina.id)];
  salvarJson(paginasLocaisPath(slug), { paginas: proximas });
}

export function atualizarPaginaLocal(
  slug: string,
  id: string,
  patch: Partial<Pick<PaginaLocal, "status" | "urlPublicada" | "wpPostId">>,
): PaginasLocaisArquivo {
  const atual = lerPaginasLocais(slug);
  const agora = new Date().toISOString();
  const paginas = atual.paginas.map((p) => (p.id === id ? { ...p, ...patch, atualizadoEm: agora } : p));
  const proximo = { paginas };
  salvarJson(paginasLocaisPath(slug), proximo);
  return proximo;
}

// ---------------------------------------------------------------------------
// 8. Fotos do perfil — reais, enviadas/recortadas no ImageCropModal
// ---------------------------------------------------------------------------

const FOTOS_DIR = "fotos";

function fotosDir(slug: string): string {
  return arquivo(slug, FOTOS_DIR);
}

function nomeArquivoSeguro(nome: string): string {
  const base = nome.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!base || base.includes("..")) throw new Error("nome de arquivo inválido");
  return base;
}

export function listarFotosPerfil(slug: string): string[] {
  const dir = fotosDir(slug);
  if (!fileExists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort((a, b) => {
      const ta = fs.statSync(path.join(dir, a)).mtimeMs;
      const tb = fs.statSync(path.join(dir, b)).mtimeMs;
      return tb - ta;
    });
}

export function salvarFotoPerfil(slug: string, nomeSugerido: string, dados: Buffer): string {
  const dir = fotosDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  const seguro = nomeArquivoSeguro(nomeSugerido);
  const ext = path.extname(seguro) || ".jpg";
  const base = path.basename(seguro, ext);
  let nome = `${base}${ext}`;
  let n = 2;
  while (fileExists(path.join(dir, nome))) {
    nome = `${base}-${n}${ext}`;
    n++;
  }
  fs.writeFileSync(path.join(dir, nome), dados);
  return nome;
}

export function resolveFotoPerfil(slug: string, nomeArquivo: string): string {
  return assertInsideTenant(slug, path.join(SEO_LOCAL_DIR, FOTOS_DIR, nomeArquivoSeguro(nomeArquivo)));
}

export function removerFotoPerfil(slug: string, nomeArquivo: string): void {
  const abs = resolveFotoPerfil(slug, nomeArquivo);
  if (fileExists(abs)) fs.rmSync(abs);
}
