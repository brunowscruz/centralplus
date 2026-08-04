const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // Pasta de saída organizada por tema em marketing/instagram/
  const outDir = path.resolve(__dirname, '../../../instagram/carrosseis/autonomia-juridica-2026-06-23');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1350 });

  const htmlPath = path.resolve(__dirname, 'carrossel.html');
  await page.goto(`file://${htmlPath}`);

  await page.waitForTimeout(2000);

  const slides = await page.locator('.slide').all();
  console.log(`Renderizando ${slides.length} slides...`);

  for (let i = 0; i < slides.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const outPath = path.join(outDir, `slide-${num}.png`);
    await slides[i].screenshot({ path: outPath });
    console.log(`✓ slide-${num}.png`);
  }

  await browser.close();
  console.log(`\nPronto. PNGs em: marketing/instagram/carrosseis/autonomia-juridica-2026-06-23/`);
})();
