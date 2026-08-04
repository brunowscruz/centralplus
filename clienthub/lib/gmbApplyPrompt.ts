import type { PropostaOtimizacaoGmb, PostGmb, RespostaReview } from "./seoLocal";

/**
 * Geração do texto da "sessão assistida" (ponte Claude-in-Chrome) — extraído
 * aqui pra ser a MESMA lógica usada tanto pela rota da API (botão no Hub,
 * ver app/api/tenants/[slug]/mkt-online/seo-local/prompt-aplicacao/route.ts)
 * quanto pelo script de terminal (scripts/gerar-prompt-aplicacao-gmb.mjs,
 * mantido como caminho alternativo pra quem preferir rodar na unha) — nunca
 * duas implementações do mesmo prompt.
 */

const CAMPO_LABEL: Record<string, string> = {
  categoriaPrincipal: "Categoria principal",
  categoriasSecundarias: "Categorias secundárias",
  descricaoGeral: "Descrição do perfil",
  descricaoPorServico: "Descrição por serviço",
  atributos: "Atributos",
  faq: "Perguntas frequentes (FAQ)",
  planoFotos: "Plano de fotos (upload gradual, um nome de arquivo por vez)",
};

function formatarValorCampo(campo: string, valor: unknown): string {
  if (campo === "categoriaPrincipal" || campo === "descricaoGeral") return String(valor);
  if (campo === "categoriasSecundarias" || campo === "atributos") return (valor as string[]).join(", ");
  if (campo === "descricaoPorServico") {
    return (valor as { servicoSlug: string; descricao: string }[]).map((v) => `   - [${v.servicoSlug}] ${v.descricao}`).join("\n");
  }
  if (campo === "faq") {
    return (valor as { pergunta: string; resposta: string }[]).map((v) => `   P: ${v.pergunta}\n   R: ${v.resposta}`).join("\n\n");
  }
  if (campo === "planoFotos") {
    return (valor as { nomeArquivoSugerido: string; descricao: string; categoria: string }[])
      .map((v) => `   - ${v.nomeArquivoSugerido} — ${v.descricao} (categoria: ${v.categoria})`)
      .join("\n");
  }
  return JSON.stringify(valor);
}

function cabecalho(nomeLegal: string): string {
  return [
    `[Sessão assistida — Google Business Profile de "${nomeLegal}"]`,
    `Você está no navegador logado como GERENTE do perfil GMB de "${nomeLegal}".`,
    "Aplique EXATAMENTE as mudanças abaixo, uma de cada vez, conferindo o",
    "resultado na tela antes de ir pra próxima. Pare e avise se algum campo",
    "não existir na interface do jeito descrito — não tente adivinhar onde",
    "fica.",
    "",
  ].join("\n");
}

export function gerarPromptProposta(nomeLegal: string, proposta: PropostaOtimizacaoGmb): string | null {
  const campos = Object.entries(CAMPO_LABEL).filter(
    ([chave]) => proposta[chave as keyof PropostaOtimizacaoGmb] && (proposta[chave as keyof PropostaOtimizacaoGmb] as { status: string }).status === "aprovada",
  );
  if (campos.length === 0) return null;
  let saida = cabecalho(nomeLegal);
  campos.forEach(([chave, label], i) => {
    const campo = proposta[chave as keyof PropostaOtimizacaoGmb] as { valor: unknown };
    saida += `${i + 1}. ${label}:\n${formatarValorCampo(chave, campo.valor)}\n\n`;
  });
  saida += "Ao terminar TODOS os itens acima, confirme aqui quais foram aplicados com sucesso.\n";
  return saida;
}

const TIPO_POST_LABEL: Record<string, string> = { evento: "Evento", "chamada-para-acao": "Chamada para ação", oferta: "Oferta" };

export function gerarPromptPost(nomeLegal: string, post: PostGmb): string | null {
  if (post.status !== "aprovado") return null;
  return (
    cabecalho(nomeLegal) +
    `1. Criar um post do tipo "${TIPO_POST_LABEL[post.tipo] || post.tipo}":\n` +
    `   Título: ${post.titulo}\n` +
    `   Texto: ${post.texto}\n` +
    (post.imagemSugerida ? `   Imagem sugerida (fazer upload se disponível): ${post.imagemSugerida}\n` : "") +
    `\nAo terminar, confirme aqui que o post foi publicado com sucesso.\n`
  );
}

export function gerarPromptReview(nomeLegal: string, review: RespostaReview): string | null {
  if (review.status !== "aprovada") return null;
  return (
    cabecalho(nomeLegal) +
    `1. Responder a avaliação de "${review.avaliacaoAutor || "cliente"}" (${review.notaEstrelas} estrelas):\n` +
    `   Avaliação original: "${review.avaliacaoTexto}"\n` +
    `   Sua resposta: ${review.respostaSugerida}\n` +
    `\nAo terminar, confirme aqui que a resposta foi publicada com sucesso.\n`
  );
}
