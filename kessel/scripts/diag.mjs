import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [size, query] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: h } });
p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 200)));
p.on('pageerror', (e) => console.log('pageerror', e.message));
const t0 = Date.now();
await p.goto(pathToFileURL(resolve('kessel/index.html')).href + '?' + (query || 'gl=force'), { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  const info = await Promise.race([
    p.evaluate(() => ({ kind: document.getElementById('tier').dataset.kind, why: document.querySelector('.tier__why').textContent, live: document.documentElement.classList.contains('live') })),
    new Promise((r) => setTimeout(() => r('evaluate timed out (main thread busy)'), 8000)),
  ]);
  console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(info));
  if (info && info.kind && info.kind !== 'stills') break;
}
const ft = await Promise.race([p.evaluate(() => new Promise((r) => { const ts = []; let n = 0; const f = (t) => { ts.push(t); if (++n < 4) requestAnimationFrame(f); else r(ts.slice(1).map((x, i) => Math.round(x - ts[i]))); }; requestAnimationFrame(f); })), new Promise((r) => setTimeout(() => r('frames timed out'), 60000))]);
console.log('frame ms', JSON.stringify(ft));
await b.close();
