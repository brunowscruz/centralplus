/**
 * Contorno customizado (a:custGeom) de uma forma/imagem do Canva → CSS
 * clip-path. Separado de `lib/canvaLayers.ts` de propósito (mesmo motivo do
 * `lib/canvaFontes.ts`): precisa ser seguro pra importar num componente
 * client, o editor visual usa a MESMA função pra WYSIWYG bater com o render
 * final.
 */

export interface ComandoCaminho {
  tipo: "M" | "L" | "C" | "Q" | "Z";
  /** Cada ponto é uma fração (0-1) da largura/altura ORIGINAL da forma no
   * PPTX — na hora de desenhar, multiplica pela largura/altura ATUAL da
   * camada (que pode ter sido redimensionada no editor). */
  pontos: [number, number][];
}

/** Gera o valor de `clip-path: path(...)` a partir dos comandos extraídos
 * do PPTX, escalado pro tamanho atual (px) da camada. undefined se a forma
 * não tem contorno customizado (é um retângulo simples — a maioria). */
export function clipPathCss(
  contorno: ComandoCaminho[] | undefined,
  larguraPx: number,
  alturaPx: number,
): string | undefined {
  if (!contorno || contorno.length === 0) return undefined;
  const partes = contorno.map((c) => {
    if (c.tipo === "Z") return "Z";
    const coords = c.pontos.map(([fx, fy]) => `${(fx * larguraPx).toFixed(2)} ${(fy * alturaPx).toFixed(2)}`).join(", ");
    return `${c.tipo} ${coords}`;
  });
  return `path('${partes.join(" ")}')`;
}
