/**
 * Utilitários de fonte pro modelo de camadas do Canva — separado de
 * `lib/canvaLayers.ts` de propósito: aquele arquivo importa `jszip` e
 * `fast-xml-parser` (parsing de PPTX, só roda no servidor); esse aqui
 * precisa ser seguro pra importar num componente client (o editor visual
 * usa a MESMA pilha de fonte do render final, pra WYSIWYG bater).
 */

interface CamadaComFonte {
  tipo: string;
  fonte?: string;
}
interface PaginaComCamadas {
  camadas: CamadaComFonte[];
}

/** Fontes de template do Canva que não existem no Google Fonts — troca por
 * uma alternativa gratuita e visualmente próxima, carregada de verdade (em
 * vez de deixar cair silenciosamente na fonte padrão do sistema). "Garet" é
 * um sans-serif geométrico (Type Forward) sem versão no Google Fonts;
 * "Poppins" é o parente mais próximo disponível lá. Chave em minúsculas. */
const FONTE_SUBSTITUTA: Record<string, string> = {
  garet: "Poppins",
};

/** Pilha de font-family pra uma camada de texto: tenta a fonte real do
 * template primeiro (caso o navegador/SO já tenha ela instalada), cai pra
 * substituta conhecida (carregada via Google Fonts), depois sans-serif
 * genérico — nunca deixa o texto sem nenhuma fonte definida. */
export function pilhaFonte(fonte?: string): string {
  // aspas SIMPLES de propósito — isso vira o valor de font-family dentro de
  // um atributo style="..." em HTML (aspas duplas). Usar aspas duplas aqui
  // fecha o atributo no meio e quebra o HTML inteiro dali pra frente (foi
  // um bug real: o texto caía no serif padrão do navegador, não no
  // fallback sans-serif pretendido, porque nada depois da aspa quebrada
  // era interpretado como estilo válido).
  if (!fonte) return "'Inter', sans-serif";
  const substituta = FONTE_SUBSTITUTA[fonte.toLowerCase()];
  const partes = [`'${fonte}'`];
  if (substituta) partes.push(`'${substituta}'`);
  partes.push("sans-serif");
  return partes.join(", ");
}

/** URL do Google Fonts pra carregar todas as famílias distintas usadas na
 * página (fonte real + substitutas) — usado tanto no render final quanto no
 * editor visual (mesmo WYSIWYG). null se a página não usa nenhuma fonte
 * específica (só texto sem estilo definido no PPTX). */
export function googleFontsUrl(pagina: PaginaComCamadas): string | null {
  const familias = new Set<string>();
  for (const c of pagina.camadas) {
    if (c.tipo !== "texto" || !c.fonte) continue;
    familias.add(c.fonte);
    const substituta = FONTE_SUBSTITUTA[c.fonte.toLowerCase()];
    if (substituta) familias.add(substituta);
  }
  if (familias.size === 0) return null;
  const params = Array.from(familias)
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
