// Renders the still frames for the no-JS / reduced-motion layout from the
// live scene itself (kessel/index.html?still=name), as WebP in kessel/stills.
//   node kessel/scripts/stills.mjs [name ...]   then rebuild to inline them
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const all = ['hero', 'aperture', 'through', 'exit', 'focus', 'model-1', 'model-2', 'model-3', 'signed'];
const names = process.argv.slice(2).length ? process.argv.slice(2) : all;
mkdirSync('kessel/stills', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
for (const n of names) {
  await page.goto(pathToFileURL(resolve('kessel/index.html')).href + '?still=' + n);
  await page.waitForFunction(() => !!window.__still, null, { timeout: 180000 });
  const png = `kessel/stills/${n}.png`;
  writeFileSync(png, Buffer.from((await page.evaluate(() => window.__still)).split(',')[1], 'base64'));
  const size = n.startsWith('model') ? 600 : 900;
  execFileSync('python3', ['-c', `from PIL import Image; import os; im=Image.open('${png}').convert('RGB').resize((${size},${size}), Image.LANCZOS); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=82, method=6); os.remove('${png}')`]);
  console.log('still', n);
}
await browser.close();
