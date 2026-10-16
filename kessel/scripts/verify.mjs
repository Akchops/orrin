// Failure-mode checks for kessel/index.html. Each case prints the badge and
// any network request the page attempted (there must be none).
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const file = resolve('kessel/index.html');
const html = readFileSync(file, 'utf8');
const ext = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+/gi)].map((m) => m[0]);
console.log('external src/href in file:', ext.length ? ext : 'none');

// The artifact host's documented policy: inline scripts plus five CDNs,
// nothing else; data: allowed for images and fonts.
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net/npm/ https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data: blob:; connect-src 'none'";
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP });
  res.end(html);
}).listen(4311);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function run(name, url, { init, offline = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, offline });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const reqs = [], errs = [];
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:4311/')) reqs.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => { const t = document.getElementById('tier'); return t.dataset.kind !== 'stills' || !/Starting/.test(t.textContent); }, null, { timeout: 60000 }).catch(() => {});
  // Prove it animates from scroll: story time and the canvas both change.
  let moved = '';
  const live = await page.evaluate(() => !!window.__kessel);
  if (live) {
    // Compare rendered pixels of the stage (a WebGL buffer cannot be read
    // back after compositing, so compare screenshots instead).
    const clip = { x: 400, y: 100, width: 600, height: 500 };
    const s0 = await page.evaluate(() => window.__kessel.s);
    const shotA = await page.screenshot({ clip, timeout: 120000 });
    await page.evaluate(() => window.__kessel.lenis.scrollTo(window.__kessel.ScrollTrigger.maxScroll(window) * 0.12, { immediate: true }));
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => window.__kessel.idle === true, null, { timeout: 60000 }).catch(() => {});
    const s1 = await page.evaluate(() => window.__kessel.s);
    const shotB = await page.screenshot({ clip, timeout: 120000 });
    moved = ` | scroll moved story ${s0.toFixed(2)} -> ${s1.toFixed(2)}, rendered pixels changed: ${!shotA.equals(shotB)}`;
  }
  const badge = await page.evaluate(() => { const t = document.getElementById('tier'); return `${t.querySelector('.tier__kind').textContent} | ${t.querySelector('.tier__why').textContent}`; });
  const notice = await page.evaluate(() => { const n = document.getElementById('notice'); return n.hidden ? '(no notice)' : n.textContent; });
  console.log(`\n[${name}] badge: ${badge}\n  notice: ${notice}${moved}\n  requests: ${reqs.length ? reqs.join(', ') : 'none'}  errors: ${errs.length ? errs.join(' / ') : 'none'}`);
  await ctx.close();
}
const fileUrl = pathToFileURL(file).href;
await run('file, offline, 3D forced (software GL)', fileUrl + '?gl=force', { offline: true });
await run('host-like CSP, 3D forced', 'http://127.0.0.1:4311/?gl=force');
await run('host-like CSP, default probe (no GPU here)', 'http://127.0.0.1:4311/');
await run('WebGL blocked', fileUrl, { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...r) { return /webgl/i.test(t) ? null : g.call(this, t, ...r); }; } });
await run('libraries throw on start', fileUrl + '?gl=force', { init: () => { Object.defineProperty(window, '__kesselLibs', { configurable: true, set() {}, get() { return () => { throw new Error('simulated library failure'); }; } }); } });
await run('libraries missing', fileUrl + '?gl=force', { init: () => { Object.defineProperty(window, '__kesselLibs', { configurable: true, set() {}, get() { return undefined; } }); } });
await browser.close();
server.close();
