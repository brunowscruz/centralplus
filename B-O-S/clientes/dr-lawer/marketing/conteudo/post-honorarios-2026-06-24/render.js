const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.resolve(__dirname, '../../instagram/posts/honorarios-2026-06-24');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1350 });

  const htmlPath = path.resolve(__dirname, 'post.html');
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(2000);

  const slide = page.locator('.slide');
  await slide.screenshot({ path: path.join(outDir, 'post.png') });

  await browser.close();
  console.log('Pronto. PNG em: marketing/instagram/posts/honorarios-2026-06-24/post.png');
})();
