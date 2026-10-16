// After `vite build`:
//  1. inline the stylesheet into dist/index.html (one request fewer, and the
//     stills layout paints before any script runs);
//  2. write artifact/: the same build with the document skeleton removed,
//     because the preview host wraps the page in its own <html>/<head>/<body>.
import { readFileSync, writeFileSync, rmSync, cpSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (m, href) => {
  const css = readFileSync(join(dist, href), 'utf8');
  rmSync(join(dist, href));
  return `<style>${css}</style>`;
});
writeFileSync(join(dist, 'index.html'), html);

rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact', { recursive: true });
cpSync(join(dist, 'assets'), 'artifact/assets', { recursive: true });
cpSync(join(dist, 'stills'), 'artifact/stills', { recursive: true });
let page = html
  .replace(/<!doctype html>/i, '')
  .replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '')
  .replace(/<head>/i, '').replace(/<\/head>/i, '')
  .replace(/<body>/i, '').replace(/<\/body>/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
// Keep the title within the first 8 KB, ahead of the inlined stylesheet.
const title = page.match(/<title>[\s\S]*?<\/title>/i)[0];
page = title + '\n' + page.replace(title, '').trim() + '\n';
writeFileSync('artifact/index.html', page);
console.log('artifact files:', readdirSync('artifact/assets').length + readdirSync('artifact/stills').length + 1);
