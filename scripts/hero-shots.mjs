// Deliverable screenshots of the disassembly at device pixel ratio 2.
//   node scripts/hero-shots.mjs out
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const devices = [
  { name: 'laptop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
const moments = [['lift', 3.35], ['exploded', 4.85], ['dial', 5.85]];
for (const d of devices) {
  const ctx = await browser.newContext(d);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4173/?gl=force');
  await page.waitForFunction(() => document.documentElement.classList.contains('scene-ready'), null, { timeout: 180000 });
  await page.waitForTimeout(3000);
  for (const [label, s] of moments) {
    const y = await page.evaluate((v) => {
      const o = window.__orrin; let lo = 0, hi = o.ScrollTrigger.maxScroll(window);
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (o._storyAt(m) < v) lo = m; else hi = m; }
      return hi;
    }, s);
    await page.evaluate((y) => window.__orrin.lenis.scrollTo(y, { immediate: true }), y);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${out}/${d.name}-${label}.png` });
    console.log(d.name, label, await page.evaluate(() => window.__orrin.s.toFixed(2)));
  }
  await ctx.close();
}
await browser.close();
