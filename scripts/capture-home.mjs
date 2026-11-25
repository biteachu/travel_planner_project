import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const folder = 'screenshots/2026-11-25-motion';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3417/');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.world-photo img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
    await page.screenshot({ path: `${folder}/home-${device}.png`, fullPage: true, animations: 'disabled' });
    await context.close();
  }
} finally { await browser.close(); }
console.log('Saved only two home overviews. No account or authentication screenshot.');
