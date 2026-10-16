// Screenshot the full page at given scroll depths or story times.
//   node scripts/page-shots.mjs out 1440x900 "s=0,1.9,4.8" [--gl] [--query=...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const [out, size, spec] = args;
const gl = args.includes('--gl');
const extra = (args.find((a) => a.startsWith('--query=')) || '').slice(8);
const base = (args.find((a) => a.startsWith('--url=')) || '--url=http://127.0.0.1:5173/').slice(6);
const [w, h] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: gl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 768, isMobile: w < 768 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (!/GPU stall|parallel_shader|vite\]/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => logs.push('requestfailed: ' + r.url()));
const q = new URLSearchParams(extra);
if (gl) q.set('gl', 'force');
q.set('debug', '1');
await page.goto(base + '?' + q.toString());
await page.waitForFunction(() => document.documentElement.classList.contains('scene-ready') || document.readyState === 'complete', null, { timeout: 120000 });
await page.waitForTimeout(2500);
const [kind, list] = spec.split('=');
for (const v of list.split(',')) {
  const y = await page.evaluate(([kind, v]) => {
    const o = window.__orrin;
    if (kind === 's' && o) {
      // find scroll position whose story time is v by bisection
      let lo = 0, hi = o.ScrollTrigger.maxScroll(window);
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; window.scrollTo(0, m); o.ScrollTrigger.update(); if (o._storyAt ? o._storyAt(m) < v : false) lo = m; else hi = m; }
      return hi;
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    return Math.round(max * Number(v));
  }, [kind, Number(v)]);
  await page.evaluate((y) => { const o = window.__orrin; if (o && o.lenis) o.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, y);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${kind}${v}.png` });
  console.log('shot', kind, v, 'y=', Math.round(y), 's=', await page.evaluate(() => window.__orrin ? window.__orrin.s.toFixed(2) : 'n/a'));
}
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
