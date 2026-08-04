// Gera o prompt de aplicação pra ponte manual "Claude-in-Chrome" — rodado
// pelo OPERADOR na própria máquina dele (nunca no chat do tenant, nunca na
// VPS), com o Chrome logado como a conta "Gerente" do perfil GMB do
// cliente (recurso nativo do Google Business Profile — adicionar um
// gerente não depende de OAuth/API aprovada).
//
// Este é o caminho de TERMINAL — pra quem prefere isso. O Hub também tem um
// botão que faz a mesma coisa direto na tela (mais prático pro dia a dia,
// ver SessaoAssistidaCTA.tsx + rota .../prompt-aplicacao), os dois usam a
// MESMA lógica de geração de prompt (lib/gmbApplyPrompt.ts).
//
// Uso:
//   node --import tsx scripts/gerar-prompt-aplicacao-gmb.mjs --slug <tenant> --tipo proposta-gmb
//   node --import tsx scripts/gerar-prompt-aplicacao-gmb.mjs --slug <tenant> --tipo calendario-post --id <id-do-post>
//   node --import tsx scripts/gerar-prompt-aplicacao-gmb.mjs --slug <tenant> --tipo review --id <id-da-review>
//
// Depois de aplicar de verdade (conferido item por item na tela), marque
// como aplicado clicando em "Marcar como aplicado" na própria tela do Hub
// (SessaoAssistidaCTA) — não existe um segundo comando pra isso, pra não
// duplicar a lógica de mutação em dois lugares.

import { lerPropostaGmb, lerCalendarioPosts, lerReviews, lerPerfilNegocioSeo } from "../lib/seoLocal.ts";
import { gerarPromptProposta, gerarPromptPost, gerarPromptReview } from "../lib/gmbApplyPrompt.ts";

function parseArgs(argv) {
  const out = { slug: "", tipo: "", id: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") out.slug = argv[++i] || "";
    else if (argv[i] === "--tipo") out.tipo = argv[++i] || "";
    else if (argv[i] === "--id") out.id = argv[++i] || "";
  }
  return out;
}

const { slug, tipo, id } = parseArgs(process.argv.slice(2));
if (!slug || !tipo) {
  console.error("uso: gerar-prompt-aplicacao-gmb.mjs --slug <tenant> --tipo proposta-gmb|calendario-post|review [--id <id>]");
  process.exit(1);
}

const nomeLegal = lerPerfilNegocioSeo(slug)?.nomeLegal || slug;

let prompt = null;
if (tipo === "proposta-gmb") {
  const proposta = lerPropostaGmb(slug);
  if (!proposta) {
    console.error(`"${slug}" ainda não tem proposta de otimização gerada.`);
    process.exit(1);
  }
  prompt = gerarPromptProposta(nomeLegal, proposta);
} else if (tipo === "calendario-post") {
  if (!id) {
    console.error("--id é obrigatório pro tipo calendario-post");
    process.exit(1);
  }
  const post = lerCalendarioPosts(slug).posts.find((p) => p.id === id);
  if (!post) {
    console.error(`post "${id}" não encontrado.`);
    process.exit(1);
  }
  prompt = gerarPromptPost(nomeLegal, post);
} else if (tipo === "review") {
  if (!id) {
    console.error("--id é obrigatório pro tipo review");
    process.exit(1);
  }
  const review = lerReviews(slug).reviews.find((r) => r.id === id);
  if (!review) {
    console.error(`review "${id}" não encontrada.`);
    process.exit(1);
  }
  prompt = gerarPromptReview(nomeLegal, review);
} else {
  console.error(`tipo desconhecido: "${tipo}" (use proposta-gmb, calendario-post ou review)`);
  process.exit(1);
}

if (!prompt) {
  console.error("nada com status \"aprovada\"/\"aprovado\" ainda — aprove pelo menos um item na tela antes de gerar o prompt.");
  process.exit(1);
}
process.stdout.write(prompt);
