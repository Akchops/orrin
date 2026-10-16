// Render every fallback still from the live scene into public/stills as
// WebP at 1000 and 600 px. Uses SwiftShader (no GPU in CI or here).
//   node scripts/render-stills.mjs [name ...]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const names = process.argv.slice(2).length ? process.argv.slice(2)
  : ['hero', 'crown', 'movement', 'dial', 'strap', 'caseback', 'model-01', 'model-02', 'model-03', 'model-04', 'model-05'];
mkdirSync('public/stills', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
for (const name of names) {
  await page.goto(`http://127.0.0.1:5173/stills.html?name=${name}`);
  await page.waitForFunction(() => !!window.__still, null, { timeout: 180000 });
  const data = await page.evaluate(() => window.__still);
  const png = `public/stills/${name}.png`;
  writeFileSync(png, Buffer.from(data.split(',')[1], 'base64'));
  execFileSync('python3', ['scripts/webp.py', png]);
  console.log('still', name);
}
await browser.close();
