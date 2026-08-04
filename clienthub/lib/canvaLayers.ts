import { pilhaFonte, googleFontsUrl } from "./canvaFontes";
import { clipPathCss } from "./canvaClip";
import type { PaginaModelo } from "./canvaTypes";

export { pilhaFonte, googleFontsUrl, clipPathCss };
export type { ComandoCaminho, Camada, PaginaModelo, Modelo } from "./canvaTypes";

/**
 * Motor de render de camadas → HTML (usado por `lib/canvaRender.ts` via
 * Playwright pra virar PNG). É o formato universal de QUALQUER post do
 * Instagram — todo post nasce e é editado só pela IA via chat (ver
 * MODULE_PREFIX.instagram em app/api/tenants/[slug]/chat/route.ts), nunca
 * por UI manual.
 *
 * Até 27/07/2026 esse arquivo também tinha um parser de PPTX (importação de
 * templates do Canva, ~470 linhas) — removido de propósito junto com a
 * biblioteca de templates do Canva (decisão do usuário: menos robustez de
 * fidelidade de import, mais simplicidade e um fluxo 100% conversacional).
 */

function linkGoogleFonts(pagina: PaginaModelo): string {
  const url = googleFontsUrl(pagina);
  return url ? `<link rel="stylesheet" href="${url}"/>` : "";
}

/** Camadas → HTML com divs posicionados absolutamente — mesma técnica que a
 * skill /carrossel usa (HTML → screenshot via Playwright, ver
 * lib/canvaRender.ts). */
export function paginaParaHtml(pagina: PaginaModelo, imgBaseUrl: string): string {
  const camadasHtml = pagina.camadas
    .filter((c) => c.visivel !== false)
    .map((c) => {
      // transform (rotação + espelhamento) e opacidade se aplicam ao quadro
      // inteiro da camada — mesma ordem sempre, pra nunca divergir.
      const partesTransform: string[] = [];
      if (c.rotacao) partesTransform.push(`rotate(${c.rotacao}deg)`);
      if (c.flipH) partesTransform.push("scaleX(-1)");
      if (c.flipV) partesTransform.push("scaleY(-1)");
      const transform = partesTransform.length ? `transform:${partesTransform.join(" ")};` : "";
      const opacidade = c.opacidade !== undefined && c.opacidade < 1 ? `opacity:${c.opacidade};` : "";
      const borda = c.corBorda ? `border:${c.larguraBorda ?? 1}px solid #${c.corBorda};` : "";
      // sombra em imagem/forma vira box-shadow (contorno do quadro); em texto
      // vira text-shadow (nas próprias letras) — mesmo campo `sombra`, CSS
      // diferente conforme o tipo, senão um texto sobre foto (regra da skill
      // /carrossel) ficaria com sombra ao redor do BLOCO em vez das letras.
      const sombraCaixa =
        c.sombra && c.tipo !== "texto" ? `box-shadow:${c.sombra.x}px ${c.sombra.y}px ${c.sombra.blur}px #${c.sombra.cor};` : "";
      const sombraTexto = c.sombra && c.tipo === "texto" ? `text-shadow:${c.sombra.x}px ${c.sombra.y}px ${c.sombra.blur}px #${c.sombra.cor};` : "";
      const estiloBase = `position:absolute;left:${c.x}px;top:${c.y}px;width:${c.largura}px;height:${c.altura}px;${transform}${opacidade}${borda}${sombraCaixa}`;

      const clipPath = clipPathCss(c.contorno, c.largura, c.altura);
      const clipEstilo = clipPath ? `clip-path:${clipPath};` : "";

      if (c.tipo === "imagem") {
        // recorte = a imagem pode ser maior que o quadro e deslocada dentro
        // dele — quadro com overflow:hidden, img absoluta escalada/deslocada
        // por dentro.
        const escala = c.recorte?.escala ?? 1;
        const deslocX = c.recorte?.deslocX ?? 0;
        const deslocY = c.recorte?.deslocY ?? 0;
        const imgEstilo =
          escala !== 1 || deslocX !== 0 || deslocY !== 0
            ? `position:absolute;top:50%;left:50%;width:${escala * 100}%;height:${escala * 100}%;object-fit:cover;transform:translate(calc(-50% + ${deslocX}%), calc(-50% + ${deslocY}%));`
            : `width:100%;height:100%;object-fit:cover;`;
        const raioImg = c.raioBorda ? `border-radius:${c.raioBorda}px;` : "";
        return `<div style="${estiloBase}overflow:hidden;${raioImg}${clipEstilo}"><img src="${imgBaseUrl}/${encodeURIComponent(c.arquivo || "")}" style="${imgEstilo}" /></div>`;
      }
      if (c.tipo === "forma") {
        const fundo = c.gradiente
          ? `background:linear-gradient(${c.gradiente.angulo}deg, #${c.gradiente.de}, #${c.gradiente.para});`
          : c.corFundo
            ? `background:#${c.corFundo};`
            : "";
        const raio = c.formaTipo === "circulo" ? "border-radius:50%;" : c.raioBorda ? `border-radius:${c.raioBorda}px;` : "";
        return `<div style="${estiloBase}${fundo}${raio}${clipEstilo}"></div>`;
      }
      const cor = c.cor ? `color:#${c.cor};` : "";
      const tamanho = c.tamanhoFonte ? `font-size:${c.tamanhoFonte}px;` : "";
      const peso = c.negrito ? "font-weight:700;" : "";
      const alinhamento =
        c.alinhamentoTexto === "centro" ? "text-align:center;" : c.alinhamentoTexto === "direita" ? "text-align:right;" : "";
      const entrelinha = c.entrelinha ? `line-height:${c.entrelinha};` : "";
      const texto = (c.texto || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");
      return `<div style="${estiloBase}${cor}${tamanho}${peso}${alinhamento}${entrelinha}${sombraTexto}font-family:${pilhaFonte(c.fonte)};white-space:pre-wrap;">${texto}</div>`;
    })
    .join("\n");

  const corFundoPagina = pagina.corFundo ? `#${pagina.corFundo}` : "#fff";
  return `<!doctype html><html><head><meta charset="utf-8"/>
${linkGoogleFonts(pagina)}
<style>*{margin:0;padding:0;box-sizing:border-box;} body{width:${pagina.largura}px;height:${pagina.altura}px;overflow:hidden;position:relative;background:${corFundoPagina};}</style>
</head><body>${camadasHtml}</body></html>`;
}
