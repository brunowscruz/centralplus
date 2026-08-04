import type { ComandoCaminho } from "./canvaClip";

export type { ComandoCaminho };

/**
 * Tipos puros do modelo de camadas — SEM nenhuma dependência de jszip/
 * fast-xml-parser (que só o parser de PPTX em lib/canvaLayers.ts precisa).
 * Separado de propósito pra poder ser importado em componente client (ex
 * EditorDeCamadas.tsx) sem arrastar o parser inteiro pro bundle do
 * navegador. lib/canvaLayers.ts re-exporta esses mesmos tipos pra quem já
 * importa de lá (lib/canvaRender.ts, lib/instagram.ts) continuar igual.
 */
export interface Camada {
  id: string;
  tipo: "texto" | "imagem" | "forma";
  x: number;
  y: number;
  largura: number;
  altura: number;
  texto?: string;
  tamanhoFonte?: number;
  fonte?: string; // nome da fonte (typeface), ex "Garet" — vem direto do PPTX
  negrito?: boolean;
  cor?: string; // cor do texto, hex sem #
  corFundo?: string; // hex sem #, só forma/texto com fundo
  arquivo?: string; // nome do arquivo dentro de img/, só tipo "imagem"
  visivel?: boolean;
  opacidade?: number; // 0-1, padrão 1 (totalmente opaco)
  rotacao?: number; // graus, padrão 0
  flipH?: boolean; // espelhar horizontalmente
  flipV?: boolean; // espelhar verticalmente
  bloqueada?: boolean; // trava mover/redimensionar no editor
  formaTipo?: "retangulo" | "circulo"; // só tipo "forma", padrão retangulo
  /** Recorte/reposição da imagem dentro do quadro (só tipo "imagem"),
   * independente do tamanho do quadro — mesmo modelo do Canva: a imagem
   * pode ser maior que o quadro, escala e desloca dentro dele. escala>=1
   * (1 = a imagem cobre o quadro exatamente); deslocX/deslocY em % (0-100)
   * de quanto a imagem foi arrastada a partir do centro. */
  recorte?: { escala: number; deslocX: number; deslocY: number };
  /** Contorno customizado da forma/imagem no Canva (a:custGeom com curva —
   * ex foto com corte orgânico/diagonal misturando com o fundo). Vira
   * clip-path na hora de desenhar (ver lib/canvaClip.ts). undefined = forma
   * retangular simples (a maioria). */
  contorno?: ComandoCaminho[];
  /** Preenchimento em gradiente (só tipo "forma") — quando presente, tem
   * prioridade sobre corFundo. Ângulo em graus, mesma convenção do CSS
   * `linear-gradient(<angulo>deg, ...)`. */
  gradiente?: { de: string; para: string; angulo: number };
  corBorda?: string; // hex sem #, borda de forma/imagem
  larguraBorda?: number; // px, só tem efeito se corBorda estiver definido
  raioBorda?: number; // px, cantos arredondados de forma/imagem (retangular)
  sombra?: { cor: string; blur: number; x: number; y: number }; // cor hex sem #
  alinhamentoTexto?: "esquerda" | "centro" | "direita"; // só tipo "texto", padrão esquerda
  entrelinha?: number; // multiplicador de line-height, só tipo "texto"
}

export interface PaginaModelo {
  largura: number;
  altura: number;
  camadas: Camada[];
  /** Cor de fundo do slide (hex sem #) — o Canva define isso como fundo do
   * slide inteiro (<p:bg>), separado de qualquer forma/camada. Sem isso o
   * fundo sempre cairia em branco, mesmo quando o design tem uma cor de
   * fundo de propósito (ex sage green atrás de um blob de destaque). */
  corFundo?: string;
}

export interface Modelo {
  paginas: PaginaModelo[];
}
