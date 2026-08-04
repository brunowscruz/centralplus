// Gera/atualiza o schema markup (JSON-LD) de uma página do cliente a partir
// dos dados reais já coletados de SEO Local — nunca a IA escreve esse
// markup na mão (ver lib/schemaMarkup.ts). Chamado pelo agente via Bash
// (MODULE_PREFIX["mkt-online"], seção 8, em app/api/tenants/[slug]/chat/route.ts).
//
// Uso: node --import tsx scripts/gerar-schema-local.mjs <slug> [pasta-html-relativa]
//   pasta-html-relativa default: "site/index.html" (schema do negócio na
//   home aprovada). Pra uma página local específica (Fase 4), passe o
//   caminho relativo do index.html dela dentro de saidas/sites/<versão>/.
//
// FAQ (proposta-otimizacao-gmb.json) e avaliações (reviews/respostas.json)
// são lidos de forma defensiva — ainda não existem antes da Fase 2 do
// pipeline de SEO Local, e mesmo depois só entram no schema se já tiverem
// sido aprovados por um humano (nunca dado em rascunho).

import fs from "node:fs";
import { assertInsideTenant, fileExists } from "../lib/bos.ts";
import { lerPerfilNegocioSeo } from "../lib/seoLocal.ts";
import {
  gerarLocalBusinessJsonLd,
  gerarServiceJsonLd,
  gerarFaqPageJsonLd,
  gerarAggregateRatingJsonLd,
  injetarJsonLdNoHtml,
} from "../lib/schemaMarkup.ts";

const [, , slug, pastaHtml = "site/index.html"] = process.argv;
if (!slug) {
  console.error("uso: gerar-schema-local.mjs <slug> [pasta-html-relativa]");
  process.exit(1);
}

const perfil = lerPerfilNegocioSeo(slug);
if (!perfil) {
  console.error(`"${slug}" ainda não tem marketing/mkt-online/seo-local/perfil-negocio.json preenchido — preencha o perfil de negócio antes.`);
  process.exit(1);
}

const absHtml = assertInsideTenant(slug, pastaHtml);
if (!fileExists(absHtml)) {
  console.error(`arquivo não encontrado: ${pastaHtml}`);
  process.exit(1);
}

/** Leitura defensiva de um JSON que pode não existir ainda (Fase 2 do
 * pipeline) — nunca derruba o script, só trata como "sem dado". */
function lerJsonSeExistir(relPath) {
  try {
    const abs = assertInsideTenant(slug, relPath);
    if (!fileExists(abs)) return null;
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

const blocos = [gerarLocalBusinessJsonLd(perfil)];

for (const servico of perfil.servicos) {
  blocos.push(gerarServiceJsonLd(servico, perfil));
}

const proposta = lerJsonSeExistir("marketing/mkt-online/seo-local/proposta-otimizacao-gmb.json");
const faqAprovado = proposta?.faq?.status === "aprovada" || proposta?.faq?.status === "aplicada" ? proposta.faq.valor : [];
const faqBloco = gerarFaqPageJsonLd(faqAprovado || []);
if (faqBloco) blocos.push(faqBloco);

const reviewsArquivo = lerJsonSeExistir("marketing/mkt-online/seo-local/reviews/respostas.json");
const reviews = Array.isArray(reviewsArquivo?.reviews) ? reviewsArquivo.reviews : Array.isArray(reviewsArquivo) ? reviewsArquivo : [];
const reviewsSchema = reviews.map((r) => ({
  notaEstrelas: r.notaEstrelas,
  aprovada: r.status === "aprovada" || r.status === "aplicada",
}));
const ratingBloco = gerarAggregateRatingJsonLd(reviewsSchema);
if (ratingBloco) blocos.push(ratingBloco);

injetarJsonLdNoHtml(absHtml, blocos);
console.log(`schema markup atualizado em ${pastaHtml} (${blocos.length} bloco${blocos.length === 1 ? "" : "s"}: LocalBusiness + ${perfil.servicos.length} Service${faqBloco ? " + FAQPage" : ""}${ratingBloco ? " + AggregateRating" : ""})`);
