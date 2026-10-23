// Renders the still frames for the no-JS / reduced-motion layout from the
// live scene itself (kessel/index.html?still=name), as WebP in kessel/stills.
//   node kessel/scripts/stills.mjs [name ...]   then rebuild to inline them
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const all = ['hero', 'aperture', 'through', 'exit', 'focus', 'model-1', 'model-2', 'model-3', 'signed',
  'model-1-lg', 'model-2-lg', 'model-3-lg', 'beauty', 'exploded', 'iris34',
  'hero-lens', 'lens-1', 'lens-2', 'lens-3', 'lineup-1', 'lineup-2', 'lineup-3',
  'd-knurl', 'exploded-wide',
  ...[1, 2, 3].flatMap((k) => ['glass', 'iris', 'scale', 'mount', 'sign'].map((d) => `i-${k}-${d}`))];
// [render width, render height, saved width, saved height]; default 900 square.
const SIZE = { 'model-1': [900, 900, 600, 600], 'model-2': [900, 900, 600, 600], 'model-3': [900, 900, 600, 600],
  'model-1-lg': [1000, 1000], 'model-2-lg': [1000, 1000], 'model-3-lg': [1000, 1000], beauty: [1600, 1000], exploded: [1400, 875],
  'hero-lens': [1800, 1800], 'lens-1': [1800, 1350], 'lens-2': [1800, 1350], 'lens-3': [1800, 1350],
  'lineup-1': [1800, 760], 'lineup-2': [1800, 760], 'lineup-3': [1800, 760],
  'd-knurl': [2000, 1000], 'exploded-wide': [2400, 1100],
  // Inspect the lens: one 4:3 frame for every detail, as the stage.
  ...Object.fromEntries([1, 2, 3].flatMap((k) => ['glass', 'iris', 'scale', 'mount', 'sign'].map((d) => [`i-${k}-${d}`, [1200, 900]]))),
  'hero-wide': [1600, 1000], 'hero-tall': [900, 1600], 'td-apart': [1600, 1000], 'td-apart-tall': [900, 1600] };
// Every still keeps its transparent background, so it sits on the page's
// charcoal gradient like the live canvas does (the film's frames used to be
// flattened onto black, which showed as dark boxes on the lighter page).
const argv = process.argv.slice(2);
const FILE = (argv.find((a) => a.startsWith('--file=')) || '--file=kessel/index.html').slice(7);
const picked = argv.filter((a) => !a.startsWith('--'));
const names = picked.length ? picked : all;
mkdirSync('kessel/stills', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
for (const n of names) {
  const [rw, rh, ow = rw, oh = rh] = SIZE[n] || [900, 900];
  await page.setViewportSize({ width: rw, height: rh });
  await page.goto(pathToFileURL(resolve(FILE)).href + '?still=' + n, { timeout: 180000 });
  await page.waitForFunction(() => !!window.__still, null, { timeout: 180000 });
  const marks = await page.evaluate(() => window.__stillMarks || null);
  if (marks && n.startsWith('td-')) writeFileSync(`kessel/stills/${n}.json`, JSON.stringify(marks));
  const png = `kessel/stills/${n}.png`;
  writeFileSync(png, Buffer.from((await page.evaluate(() => window.__still)).split(',')[1], 'base64'));
  const mode = 'RGBA';
  execFileSync('python3', ['-c', `from PIL import Image; import os; im=Image.open('${png}').convert('${mode}').resize((${ow},${oh}), Image.LANCZOS); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=84, method=6); os.remove('${png}')`]);
  console.log('still', n);
}
await browser.close();
