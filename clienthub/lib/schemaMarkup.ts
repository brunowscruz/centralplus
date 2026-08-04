import fs from "node:fs";
import type { PerfilNegocioSeo, ServicoSeo } from "./seoLocal";

/**
 * Schema markup (JSON-LD, schema.org) do SEO Local — SEMPRE código
 * determinístico, nunca a IA escrevendo o markup na mão (mesmo princípio já
 * usado no projeto pro CSV do Google Ads / render do Instagram: a IA decide
 * os DADOS estruturados, código monta o artefato final). Consumido por
 * scripts/gerar-schema-local.mjs, chamado pelo agente via Bash.
 *
 * Formatos mínimos aceitos pra FAQ/avaliação são desacoplados dos tipos
 * "de negócio" (PropostaOtimizacaoGmb/RespostaReview, Fase 2) de propósito
 * — este módulo só precisa da forma final do dado, não do ciclo de
 * aprovação inteiro.
 */

export interface FaqItemSchema {
  pergunta: string;
  resposta: string;
}

export interface ReviewSchema {
  notaEstrelas: number;
  /** Só entra no agregado se já passou por aprovação — nunca conta review
   * ainda em rascunho. */
  aprovada: boolean;
}

const MARCADOR_INICIO = "<!-- seo-local-jsonld:inicio -->";
const MARCADOR_FIM = "<!-- seo-local-jsonld:fim -->";

export function gerarLocalBusinessJsonLd(perfil: PerfilNegocioSeo, categoriaSchemaOrg?: string): object {
  const areaPrincipal = perfil.areasAtuacao[0];
  return {
    "@context": "https://schema.org",
    "@type": categoriaSchemaOrg || "LocalBusiness",
    name: perfil.nomeLegal,
    telephone: perfil.telefone,
    address: {
      "@type": "PostalAddress",
      streetAddress: perfil.enderecoCompleto,
      ...(areaPrincipal ? { addressLocality: areaPrincipal.cidade, addressRegion: areaPrincipal.estado } : {}),
      addressCountry: "BR",
    },
    ...(perfil.categoriaGmbPrincipal ? { additionalType: perfil.categoriaGmbPrincipal } : {}),
    areaServed: perfil.areasAtuacao.map((a) => (a.bairro ? `${a.bairro}, ${a.cidade}` : a.cidade)),
  };
}

export function gerarServiceJsonLd(servico: ServicoSeo, perfil: PerfilNegocioSeo): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: servico.nome,
    ...(servico.descricaoCurta ? { description: servico.descricaoCurta } : {}),
    provider: {
      "@type": "LocalBusiness",
      name: perfil.nomeLegal,
    },
    areaServed: perfil.areasAtuacao.map((a) => a.cidade),
  };
}

/** `null` se não houver nenhuma pergunta — nunca gera um FAQPage vazio. */
export function gerarFaqPageJsonLd(faq: FaqItemSchema[]): object | null {
  if (!faq || faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}

/** `null` se não houver nenhuma avaliação REAL aprovada — NUNCA inventa
 * nota/volume pra "completar" o schema (regra de ouro do CLAUDE.md: nunca
 * inventar dado que não existe). */
export function gerarAggregateRatingJsonLd(reviews: ReviewSchema[]): object | null {
  const validas = (reviews || []).filter((r) => r.aprovada);
  if (validas.length === 0) return null;
  const media = validas.reduce((soma, r) => soma + r.notaEstrelas, 0) / validas.length;
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: Number(media.toFixed(1)),
    reviewCount: validas.length,
  };
}

/**
 * Insere (ou substitui, se já existir) o bloco de JSON-LD antes de
 * `</head>` — idempotente via marcadores HTML, então rodar de novo com
 * dado atualizado nunca duplica o bloco anterior.
 */
export function injetarJsonLdNoHtml(absHtmlPath: string, blocos: object[]): void {
  const html = fs.readFileSync(absHtmlPath, "utf8");
  const semBlocoAnterior = html.replace(
    new RegExp(`${MARCADOR_INICIO}[\\s\\S]*?${MARCADOR_FIM}\\n?`, "g"),
    "",
  );
  if (blocos.length === 0) {
    fs.writeFileSync(absHtmlPath, semBlocoAnterior, "utf8");
    return;
  }
  const scripts = blocos
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join("\n");
  const blocoNovo = `${MARCADOR_INICIO}\n${scripts}\n${MARCADOR_FIM}\n`;
  const comBloco = semBlocoAnterior.includes("</head>")
    ? semBlocoAnterior.replace("</head>", `${blocoNovo}</head>`)
    : blocoNovo + semBlocoAnterior;
  fs.writeFileSync(absHtmlPath, comBloco, "utf8");
}
