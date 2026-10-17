// Screenshots of kessel/index.html opened from disk.
//   node kessel/scripts/shots.mjs out 1440x900 "0,2,4.9" [--gl] [--query=tier=2] [--reduced] [--nojs] [--dpr=2] [--prefix=x]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const [out, size, list] = args;
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const FILE = opt('file', 'kessel/index.html');
const [w, h] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: flag('gl') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const ctx = await browser.newContext({
  viewport: { width: w, height: h }, deviceScaleFactor: Number(opt('dpr', 1)), isMobile: w < 800, hasTouch: w < 800,
  reducedMotion: flag('reduced') ? 'reduce' : 'no-preference', javaScriptEnabled: !flag('nojs'),
});
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (!/GPU stall|fallback to software|GroupMarker/.test(m.text())) logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) logs.push('REQUEST: ' + r.url()); });
const q = new URLSearchParams(opt('query', ''));
if (flag('gl')) q.set('gl', 'force');
const url = pathToFileURL(resolve(FILE)).href + (q.toString() ? '?' + q : '');
await page.goto(url);
await page.waitForTimeout(flag('nojs') ? 500 : 4000);
if (!flag('nojs')) {
  await page.waitForFunction(() => document.getElementById('tier').dataset.kind !== 'stills' || !document.getElementById('notice').hidden, null, { timeout: 120000 }).catch(() => {});
}
const pre = opt('prefix', '');
for (const v of list.split(',')) {
  if (flag('nojs')) { await page.screenshot({ path: `${out}/${pre}full.png`, fullPage: true }); break; }
  const live = await page.evaluate(() => !!window.__kessel);
  if (live) {
    const y = await page.evaluate((s) => { const o = window.__kessel; let lo = 0, hi = o.ScrollTrigger.maxScroll(window); for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (o.storyAt(m) < s) lo = m; else hi = m; } return hi; }, Number(v));
    await page.evaluate((y) => window.__kessel.lenis.scrollTo(y, { immediate: true }), y);
  } else {
    await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), Number(v) / 16.5);
  }
  // Wait until the scene has settled at this scroll position (render-on-change).
  await page.waitForTimeout(600);
  await page.waitForFunction(() => !window.__kessel || window.__kessel.idle === true, null, { timeout: 120000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${pre}s${v}.png`, timeout: 120000 });
  const info = await page.evaluate(() => ({ kind: document.getElementById('tier').dataset.kind, why: document.querySelector('.tier__why').textContent, s: window.__kessel ? window.__kessel.s.toFixed(2) : '-', sw: document.documentElement.scrollWidth }));
  console.log('shot', v, JSON.stringify(info));
}
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
