const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.resolve(__dirname, 'instagram');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1350 });

  const files = [
    { html: 'post-1-dor-solucao.html', out: 'slide-01.png' },
    { html: 'post-2-painel.html', out: 'slide-02.png' },
  ];

  for (const f of files) {
    const htmlPath = path.resolve(__dirname, f.html);
    await page.goto(`file://${htmlPath}`);
    await page.waitForTimeout(1000);
    const slide = page.locator('.slide');
    await slide.screenshot({ path: path.join(outDir, f.out) });
    console.log(`Pronto: instagram/${f.out}`);
  }

  await browser.close();
})();
