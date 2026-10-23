// The lens stage guard, run by every build (scripts/build.mjs fails if it
// fails) and by hand in QA: on every page with a lens, at eight screen
// sizes, the lens's box on screen must lie inside its stage ([data-lstage],
// src/styles/base.css .lstage), the stage must be no taller than 70% of the
// screen, and no visible text may touch the lens.
//   node kessel/scripts/verify-stage.mjs <page.html> [--query=?tier=2] [--sizes=WxH,...] [--routes=home,...] [--reduce] [--nojs] [--jobs=4] [-v]
// The lens's box: for a still, its opaque pixels (alpha) mapped through the
// image's object-fit and object-position; for the 2D film (the Home hero),
// the opaque pixels of its canvas; for a live 3D viewer (?gl=force), the
// viewer's own projection of the model (el.__lensBox, src/app/viewer.js).
// Text: every visible text node's line boxes, the badge and the tried pill
// included. Exits 1 and lists each failure.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

export const SIZES = ['2576x1105', '1920x1080', '1728x1117', '1440x900', '1280x720', '1024x768', '768x1024', '390x844'];
export const ROUTES = ['home', 'lenses', 'lens-shaniwar', 'lens-parvati', 'lens-sinhagad', 'craft', 'contact'];

export async function verifyStage(file, { query = '?tier=2', sizes = SIZES, routes = ROUTES, reduce = false, js = true, jobs = 4, log = () => {} } = {}) {
  const gl = query.includes('gl=force');
  const browser = await chromium.launch(gl ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const errors = [];
  let checked = 0;
  // One screen size per browser context, `jobs` at a time.
  const one = async (size) => {
      const [w, h] = size.split('x').map(Number);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, javaScriptEnabled: js, reducedMotion: reduce ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      for (const r of routes) {
        await page.goto(`file://${resolve(file)}${query}#${r}`, { timeout: 300000 });
        await page.waitForTimeout(gl ? 6000 : 1200);
        const n = await page.evaluate(() => document.querySelectorAll(`#${document.documentElement.dataset.route || (document.querySelector('.route:target, .route:has(:target)') || document.getElementById('home')).id} [data-lstage]`).length);
        if (!n) { errors.push(`${size} ${r}: no lens stage on the page`); continue; }
        for (let i = 0; i < n; i++) {
          // Bring the stage on screen (lazy stills load, beats settle).
          // A jump over earlier beats may land on one of them (by design):
          // jump again until the stage is on screen.
          for (let k = 0; k < 4; k++) {
            const moved = await page.evaluate((i) => {
              const s = document.querySelectorAll(`#${document.documentElement.dataset.route || (document.querySelector('.route:target, .route:has(:target)') || document.getElementById('home')).id} [data-lstage]`)[i];
              const head = (document.querySelector('.masthead') || { offsetHeight: 0 }).offsetHeight;
              const r = s.getBoundingClientRect();
              if (r.top >= head - 1 && r.bottom <= innerHeight + 1) return false;
              window.scrollTo(0, Math.max(0, scrollY + r.top - head - Math.max(0, (innerHeight - head - r.height) / 2)));
              return true;
            }, i);
            if (!moved) break;
            await page.waitForTimeout(gl ? 2500 : 1100);
          }
          await page.evaluate(async (i) => {
            const s = document.querySelectorAll(`#${document.documentElement.dataset.route || (document.querySelector('.route:target, .route:has(:target)') || document.getElementById('home')).id} [data-lstage]`)[i];
            await Promise.race([Promise.all([...s.querySelectorAll('img')].map((m) => (m.complete ? null : m.decode().catch(() => null)))), new Promise((ok) => setTimeout(ok, 4000))]);
          }, i);
          // A live viewer may still be starting: wait for it to measure.
          let res = await page.evaluate(measure, i);
          for (let k = 0; !res.lens && gl && k < 5; k++) { await page.waitForTimeout(2500); res = await page.evaluate(measure, i); }
          checked++;
          const tag = `${size} ${r} ${res.name}`;
          log(`${tag}: lens ${box(res.lens)} in stage ${box(res.stage)}${res.hits.length ? ' TEXT ' + res.hits.join(' / ') : ''}`);
          if (!res.lens) { errors.push(`${tag}: no lens found in the stage (${res.why})`); continue; }
          const L = res.lens, S = res.stage, t = 1;
          if (L.x0 < S.x0 - t || L.y0 < S.y0 - t || L.x1 > S.x1 + t || L.y1 > S.y1 + t) errors.push(`${tag}: the lens ${box(L)} leaves its stage ${box(S)}`);
          if (S.y1 - S.y0 > 0.7 * h + 1) errors.push(`${tag}: the stage is ${Math.round(S.y1 - S.y0)} px tall, more than 70% of ${h}`);
          if (res.hits.length) errors.push(`${tag}: text touches the lens: ${res.hits.join(' / ')}`);
        }
      }
      if (pageErrors.length) errors.push(`${size}: page errors: ${[...new Set(pageErrors)].join('; ')}`);
      await ctx.close();
  };
  try {
    const queue = sizes.slice();
    await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await one(queue.shift()); }));
  } finally {
    await browser.close();
  }
  return { errors, checked };
}

const box = (b) => (b ? `[${Math.round(b.x0)},${Math.round(b.y0)} ${Math.round(b.x1)},${Math.round(b.y1)}]` : '-');

// In the page: the stage, the lens's box and the text over it.
async function measure(i) {
  const stage = document.querySelectorAll(`#${document.documentElement.dataset.route || (document.querySelector('.route:target, .route:has(:target)') || document.getElementById('home')).id} [data-lstage]`)[i];
  const name = (stage.id || stage.className.split(' ')[0]);
  const R = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
  const sb = R(stage.getBoundingClientRect());
  const shown = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && +getComputedStyle(el).opacity > 0.5;
  // Opaque pixels of an image or canvas, in its own pixels (cached by src).
  const cache = (window.__lstageCache = window.__lstageCache || new Map());
  const alphaBox = (src, w, h, draw) => {
    if (src && cache.has(src)) return cache.get(src);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); draw(g);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const b = x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
    if (src) cache.set(src, b);
    return b;
  };
  // Where an image's pixels land on screen: object-fit and object-position.
  const placed = (img) => {
    const r = img.getBoundingClientRect(), cs = getComputedStyle(img);
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const bl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), bt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    const cw = img.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ch = img.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let sx = cw / nw, sy = ch / nh;
    const fit = cs.objectFit;
    if (fit === 'contain' || (fit === 'scale-down' && Math.min(sx, sy) < 1)) sx = sy = Math.min(sx, sy);
    else if (fit === 'cover') sx = sy = Math.max(sx, sy);
    else if (fit === 'none' || fit === 'scale-down') sx = sy = 1;
    const [px, py] = cs.objectPosition.split(' ').map((v, k) => (v.endsWith('%') ? (parseFloat(v) / 100) * ((k ? ch : cw) - (k ? nh * sy : nw * sx)) : parseFloat(v)));
    return { x: r.left + bl + px, y: r.top + bt + py, sx, sy };
  };
  let lens = null, why = '';
  // A live 3D viewer, or the live 3D film, measures itself.
  if (stage.__lensBox) {
    const b = stage.__lensBox();
    if (b && isFinite(b.x0)) lens = b;
  }
  // The 2D film draws the Home hero on its own canvas.
  if (!lens && stage.matches('.hero__stage') && document.documentElement.classList.contains('live')) {
    const cv = [...document.querySelectorAll('canvas')].find((c) => c.getContext && c.offsetWidth >= innerWidth * 0.9 && shown(c));
    if (cv && cv.getContext('2d')) {
      const cr = cv.getBoundingClientRect();
      const b = alphaBox(null, cv.width, cv.height, (g) => g.drawImage(cv, 0, 0));
      if (b) { const kx = cr.width / cv.width, ky = cr.height / cv.height; lens = { x0: cr.left + b.x0 * kx, y0: cr.top + b.y0 * ky, x1: cr.left + b.x1 * kx, y1: cr.top + b.y1 * ky }; }
    } else why = 'live film without a 2D canvas';
  }
  // Otherwise the stills shown in the stage.
  if (!lens) {
    for (const img of stage.querySelectorAll('img')) {
      if (!shown(img) || !img.naturalWidth) continue;
      const b = alphaBox(img.currentSrc || img.src, img.naturalWidth, img.naturalHeight, (g) => g.drawImage(img, 0, 0));
      if (!b) continue;
      const p = placed(img);
      const q = { x0: p.x + b.x0 * p.sx, y0: p.y + b.y0 * p.sy, x1: p.x + b.x1 * p.sx, y1: p.y + b.y1 * p.sy };
      lens = lens ? { x0: Math.min(lens.x0, q.x0), y0: Math.min(lens.y0, q.y0), x1: Math.max(lens.x1, q.x1), y1: Math.max(lens.y1, q.y1) } : q;
    }
    if (!lens) why = why || 'no visible still';
  }
  // Text: every visible text node's line boxes.
  const hits = [];
  if (lens) {
    const k = 2, L = { x0: lens.x0 + k, y0: lens.y0 + k, x1: lens.x1 - k, y1: lens.y1 - k };
    const roots = [document.getElementById(document.documentElement.dataset.route || (document.querySelector('.route:target, .route:has(:target)') || document.getElementById('home')).id), document.querySelector('.masthead'), document.getElementById('tier'), document.querySelector('.tried')].filter(Boolean);
    for (const root of roots) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || !shown(el) || el.closest('[hidden]')) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) {
          if (r.width < 2 || r.height < 2) continue;
          if (r.left < L.x1 && r.right > L.x0 && r.top < L.y1 && r.bottom > L.y0) {
            hits.push(`"${n.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}" (${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]})`);
            break;
          }
        }
      }
    }
  }
  return { name, stage: sb, lens, hits: [...new Set(hits)].slice(0, 6), why };
}

// By hand (QA): the same check with other options.
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const file = process.argv[2];
  const opts = {};
  if (arg('query')) opts.query = arg('query');
  if (arg('sizes')) opts.sizes = arg('sizes').split(',');
  if (arg('routes')) opts.routes = arg('routes').split(',');
  if (process.argv.includes('-v')) opts.log = (s) => console.log(s);
  if (process.argv.includes('--reduce')) opts.reduce = true;
  if (process.argv.includes('--nojs')) opts.js = false;
  if (arg('jobs')) opts.jobs = +arg('jobs');
  const { errors, checked } = await verifyStage(file, opts);
  if (errors.length) { console.error(`lens stage check FAILED (${errors.length} of ${checked} stages):\n  ` + errors.join('\n  ')); process.exit(1); }
  console.log(`lens stage check: ${checked} stages, every lens inside its stage, no taller than 70% of the screen, clear of text`);
}
