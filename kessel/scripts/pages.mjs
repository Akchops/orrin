// Screenshots of the site pages (no WebGL needed): each route at a viewport.
//   node kessel/scripts/pages.mjs out 1440x900 "lenses,craft" [--full] [--reduced] [--nojs] [--q]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [out, size, list, ...rest] = process.argv.slice(2);
const flag = (n) => rest.includes('--' + n);
const FILE = (rest.find((a) => a.startsWith('--file=')) || '--file=kessel/index.html').slice(7);
const [w, h] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, deviceScaleFactor: 1,
  reducedMotion: flag('reduced') ? 'reduce' : 'no-preference', javaScriptEnabled: !flag('nojs') });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
for (const r of list.split(',')) {
  await page.goto(pathToFileURL(resolve(FILE)).href + (flag('q') ? '?static' : '') + '#' + r);
  await page.waitForTimeout(900);
  if (flag('full')) {
    // Walk down the page so lazy images load, then back to the top.
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h * 0.8) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  }
  const info = await page.evaluate(() => ({ route: document.documentElement.dataset.route, title: document.title, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, badge: getComputedStyle(document.getElementById('tier')).display }));
  console.log(r, JSON.stringify(info));
  await page.screenshot({ path: `${out}/${r}.png`, fullPage: flag('full') });
}
console.log(logs.join('\n'));
await browser.close();
