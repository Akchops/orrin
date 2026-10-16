// Render the lab harness at story times to PNGs (SwiftShader, no GPU here).
//   node scripts/lab-shots.mjs out-dir 1440x900 0 1.5 4.7
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [out, size, ...rest] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
const extra = rest.filter((a) => a.includes('='));
const times = rest.filter((a) => !a.includes('='));
for (const s of times) {
  const qs = new URLSearchParams({ s, ...Object.fromEntries(extra.map((a) => a.split('='))) });
  await page.goto(`http://127.0.0.1:5173/lab.html?${qs}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.screenshot({ path: `${out}/s${s}${extra.length ? '-' + extra.join('_') : ''}.png` });
  console.log('shot', s);
}
console.log(logs.filter((l) => !l.includes('GPU stall')).slice(0, 30).join('\n'));
await browser.close();
