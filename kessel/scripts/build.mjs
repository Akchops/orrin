// Builds kessel/index.html: one self-contained file. Libraries, app code,
// fonts and still frames are all inlined; the page makes no requests.
//   node kessel/scripts/build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const k = join(here, '..');
const repo = join(k, '..');

const bundle = async (entry, extra = {}) => (await build({
  entryPoints: [join(k, entry)], bundle: true, write: false, format: 'iife', minify: true,
  target: 'es2020', legalComments: 'none', absWorkingDir: repo, ...extra,
})).outputFiles[0].text;

// Inline <script> safety: a literal "</script" or "<!--" inside the code
// would end or confuse the script element.
const safe = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// Three.js, tree-shaken: import only the classes and constants the app
// uses (every `T.Name` in src/app), instead of the whole namespace.
const used = new Set();
for (const f of readdirSync(join(k, 'src/app'))) {
  for (const m of readFileSync(join(k, 'src/app', f), 'utf8').matchAll(/\bT\.([A-Z][A-Za-z0-9]+)/g)) used.add(m[1]);
}
mkdirSync(join(k, '.build'), { recursive: true });
const names = [...used].sort();
const libsEntry = [
  `import { ${names.join(', ')} } from 'three';`,
  `import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';`,
  `import gsap from 'gsap';`, `import { ScrollTrigger } from 'gsap/ScrollTrigger';`, `import Lenis from 'lenis';`,
  `export const THREE = { ${names.join(', ')} };`,
  `export { mergeGeometries, toCreasedNormals, gsap, ScrollTrigger, Lenis };`,
].join('\n');
// Written only when it changes, so several builds can run side by side.
const libsPath = join(k, '.build/libs.gen.js');
if (!existsSync(libsPath) || readFileSync(libsPath, 'utf8') !== libsEntry) writeFileSync(libsPath, libsEntry);
const libs = await bundle('.build/libs.gen.js', { globalName: 'KL' });
// Wrapped in a function: the browser only pre-parses it on load and
// compiles it when the live lens calls window.__kesselLibs().
const libsWrapped = `window.__kesselLibs=function(){if(window.__kl)return window.__kl;${libs};return(window.__kl=KL)};`;
const app = await bundle('src/app/main.js');
const siteJs = await bundle('src/site/site.js');

// The site's pages, rendered from the content files (src/content) by the
// templates in src/site/render.js. Re-imported fresh on every build.
const { renderSite } = await import(pathToFileURL(join(k, 'src/site/render.js')).href + '?t=' + Date.now());
const site = renderSite();
// With JS, the first script in <head> sets html[data-route] before first
// paint and only that route is drawn.
const routeCss = `html[data-route] .route{display:none}html[data-route="home"] #home{display:block}` +
  site.ids.filter((id) => id !== 'home').map((id) => `html[data-route="${id}"] #${id}`).join(',') + '{display:flex}';

const b64 = (p) => readFileSync(p).toString('base64');
const font = (f) => `data:font/woff2;base64,${b64(join(repo, 'node_modules/@fontsource-variable', f))}`;
// Styles: the shared base, the film, then one file per page.
const STYLES = ['base', 'film', 'teardown', 'home', 'lenses', 'lens', 'craft', 'workshop', 'contact'];
let css = STYLES.map((n) => readFileSync(join(k, `src/styles/${n}.css`), 'utf8')).join('\n')
  .replaceAll('%%FONT:saira%%', font('saira/files/saira-latin-wdth-normal.woff2'))
  .replaceAll('%%FONT:serif%%', font('source-serif-4/files/source-serif-4-latin-wght-normal.woff2'))
  .replaceAll('%%FONT:serif-italic%%', font('source-serif-4/files/source-serif-4-latin-wght-italic.woff2'))
  .replace('/*%%ROUTECSS%%*/', () => routeCss);

// Stills: rendered by kessel/scripts/stills.mjs. A missing still is a
// visible grey frame, never a broken image.
const blank = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#121419"/></svg>').toString('base64');
const missing = new Set();
const still = (name) => {
  const p = join(k, 'stills', `${name}.webp`);
  if (!existsSync(p)) { missing.add(name); return blank; }
  return `data:image/webp;base64,${b64(p)}`;
};

let html = readFileSync(join(k, 'src/page.html'), 'utf8');
html = html.replace('/*%%CSS%%*/', () => css)
  .replace('/*%%ROUTEMAP%%*/{}', () => JSON.stringify(site.map))
  .replace('<!--%%HEADER%%-->', () => site.header)
  .replace('<!--%%ROUTES%%-->', () => site.html)
  .replace('/*%%SITE%%*/', () => safe(siteJs))
  .replace(/%%STILL:([a-z0-9-]+)%%/g, (m, n) => still(n))
  .replace('/*%%LIBS%%*/', () => safe(libsWrapped))
  .replace('/*%%APP%%*/', () => safe(app));
const outArg = process.argv.find((a) => a.startsWith('--out='));
const out = outArg ? outArg.slice(6) : join(k, 'index.html');
writeFileSync(out, html);
const kb = (n) => (n / 1024).toFixed(0) + ' kB';
if (missing.size) console.log('stills not rendered yet (grey frames):', [...missing].join(', '));
console.log(out.replace(repo + '/', ''), kb(Buffer.byteLength(html)), '| libs', kb(libs.length), '| app', kb(app.length), '| site', kb(siteJs.length), '| css+fonts', kb(css.length), '| routes', site.ids.length);
