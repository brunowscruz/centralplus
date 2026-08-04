import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import { assertInsideTenant } from "./bos";
import { CONTENT_DIR } from "./instagram";
import { paginaParaHtml, type Modelo } from "./canvaLayers";

/**
 * Camadas -> PNG final, reaproveitando a mesma técnica que a skill
 * /carrossel já comprovou funcionar (HTML com divs posicionados
 * absolutamente + screenshot via Playwright). O HTML gerado aqui
 * (`paginaParaHtml`) é o MESMO usado no preview do editor de camadas —
 * o que o operador vê editando é o que vira o PNG publicado.
 *
 * Salva em `<postName>/instagram/slide-NN.png`, o mesmo formato que
 * `lib/instagram.ts` já lê hoje pra galeria/aprovação — nenhuma mudança
 * necessária lá.
 */
export async function renderizarModelo(slug: string, postName: string, modelo: Modelo): Promise<void> {
  const postAbs = assertInsideTenant(slug, path.join(CONTENT_DIR, postName));
  const imgDir = path.join(postAbs, "img");
  const outDir = path.join(postAbs, "instagram");
  fs.mkdirSync(outDir, { recursive: true });

  // limpa slides antigos antes de regerar — evita PNG órfão quando o
  // número de páginas do modelo muda (ex: apagou uma página do carrossel)
  for (const f of fs.readdirSync(outDir)) {
    if (/^slide-\d+\.png$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  }

  const imgBaseUrl = `file://${imgDir}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (let i = 0; i < modelo.paginas.length; i++) {
      const pagina = modelo.paginas[i];
      await page.setViewportSize({ width: pagina.largura, height: pagina.altura });
      const html = paginaParaHtml(pagina, imgBaseUrl);
      const tmpHtml = path.join(os.tmpdir(), `canva-render-${slug}-${Date.now()}-${i}.html`);
      fs.writeFileSync(tmpHtml, html, "utf8");
      try {
        await page.goto(`file://${tmpHtml}`);
        const numero = String(i + 1).padStart(2, "0");
        await page.screenshot({ path: path.join(outDir, `slide-${numero}.png`) });
      } finally {
        fs.unlinkSync(tmpHtml);
      }
    }
  } finally {
    await browser.close();
  }
}
