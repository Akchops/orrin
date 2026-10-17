// Renders the still frames for the no-JS / reduced-motion layout from the
// live scene itself (kessel/index.html?still=name), as WebP in kessel/stills.
//   node kessel/scripts/stills.mjs [name ...]   then rebuild to inline them
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const all = ['hero', 'aperture', 'through', 'exit', 'focus', 'model-1', 'model-2', 'model-3', 'signed',
  'model-1-lg', 'model-2-lg', 'model-3-lg', 'beauty', 'exploded', 'iris34'];
// [render width, render height, saved width, saved height]; default 900 square.
const SIZE = { 'model-1': [900, 900, 600, 600], 'model-2': [900, 900, 600, 600], 'model-3': [900, 900, 600, 600],
  'model-1-lg': [1000, 1000], 'model-2-lg': [1000, 1000], 'model-3-lg': [1000, 1000], beauty: [1600, 1000], exploded: [1400, 875] };
const names = process.argv.slice(2).length ? process.argv.slice(2) : all;
mkdirSync('kessel/stills', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
for (const n of names) {
  const [rw, rh, ow = rw, oh = rh] = SIZE[n] || [900, 900];
  await page.setViewportSize({ width: rw, height: rh });
  await page.goto(pathToFileURL(resolve('kessel/index.html')).href + '?still=' + n);
  await page.waitForFunction(() => !!window.__still, null, { timeout: 180000 });
  const png = `kessel/stills/${n}.png`;
  writeFileSync(png, Buffer.from((await page.evaluate(() => window.__still)).split(',')[1], 'base64'));
  execFileSync('python3', ['-c', `from PIL import Image; import os; im=Image.open('${png}').convert('RGB').resize((${ow},${oh}), Image.LANCZOS); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=82, method=6); os.remove('${png}')`]);
  console.log('still', n);
}
await browser.close();
