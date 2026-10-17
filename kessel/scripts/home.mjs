// Home page walk-through with the live lens: the film, the cut to the
// site's hero, skip film, leaving for another page and coming back, reload.
//   node kessel/scripts/home.mjs out 1440x900 [--gl] [--query=tier=2]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const [out, size] = args;
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const [w, h] = size.split('x').map(Number);
const narrow = w < 800;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: flag('gl') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: narrow, hasTouch: narrow });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
const q = new URLSearchParams(opt('query', ''));
if (flag('gl')) q.set('gl', 'force');
const base = pathToFileURL(resolve('kessel/index.html')).href + (q.toString() ? '?' + q : '');

const settle = async () => {
  await page.waitForTimeout(500);
  await page.waitForFunction(() => !window.__kessel || window.__kessel.idle === true, null, { timeout: 120000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(300);
};
const info = () => page.evaluate(() => {
  const d = document.documentElement, hh = document.getElementById('home-hero');
  return {
    route: d.dataset.route, y: Math.round(scrollY), s: window.__kessel ? +window.__kessel.s.toFixed(2) : null,
    badge: document.querySelector('.tier__kind').textContent + ' | ' + document.querySelector('.tier__why').textContent,
    badgeShown: getComputedStyle(document.getElementById('tier')).display !== 'none',
    stage: getComputedStyle(document.getElementById('stage')).display + '/' + getComputedStyle(document.getElementById('stage')).visibility,
    cls: ['live', 'past-film', 'film-done', 'film-covered'].filter((c) => d.classList.contains(c)).join(' '),
    heroTop: hh && hh.offsetParent ? Math.round(hh.getBoundingClientRect().top) : null,
    sw: d.scrollWidth, title: document.title,
  };
});
const shot = async (name) => { await settle(); await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 }); console.log(name, JSON.stringify(await info())); };
const toStory = (s) => page.evaluate((s) => {
  const o = window.__kessel; let lo = 0, hi = o.ScrollTrigger.maxScroll(window);
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (o.storyAt(m) < s) lo = m; else hi = m; }
  o.lenis.scrollTo(hi, { immediate: true });
}, s);
const nav = async (route) => {
  if (narrow) { await page.click('.masthead__menu'); await page.waitForTimeout(300); }
  await page.click(`.masthead__nav a[data-nav="${route}"]`);
};

await page.goto(base);
await page.waitForFunction(() => { const t = document.getElementById('tier'); return t.dataset.kind !== 'stills' || !/Starting/.test(t.textContent); }, null, { timeout: 120000 }).catch(() => {});
const live = await page.evaluate(() => !!window.__kessel);
await shot('01-film-top');
if (live) {
  await toStory(1.95); await shot('02-film-iris');
  await toStory(10.5); await shot('03-film-focus');
  // The cut: half a screen after the focus pin lets go.
  const y = await page.evaluate(() => { const o = window.__kessel; let lo = 0, hi = o.ScrollTrigger.maxScroll(window); for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (o.storyAt(m) < 11.2) lo = m; else hi = m; } return hi; });
  await page.evaluate((y) => window.__kessel.lenis.scrollTo(y + innerHeight * 0.55, { immediate: true }), y);
  await shot('04-cut');
  await toStory(0); await settle();
}
// Skip film from the top.
await page.click('.skipfilm');
await shot('05-skip-to-hero');
for (let i = 1; i <= 4; i++) {
  await page.evaluate((i) => { const y = document.getElementById('home-hero').getBoundingClientRect().top + scrollY + innerHeight * 0.9 * i; window.__kessel ? window.__kessel.lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); }, i);
  await shot(`06-after-${i}`);
}
await nav('lenses');
await shot('07-lenses');
await nav('home');
await shot('08-home-again');
await page.reload();
await page.waitForFunction(() => { const t = document.getElementById('tier'); return t.dataset.kind !== 'stills' || !/Starting/.test(t.textContent); }, null, { timeout: 120000 }).catch(() => {});
await shot('09-reload');
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
