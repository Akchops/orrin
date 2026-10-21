// Overflow audit: node kessel/scripts/audit.mjs <abs path to index.html> <outdir> [route,route...] [--shots]
// Every route at 390, 768, 900, 1024, 1280, 1440, 1728 and inside a 900 px
// framed pane, with classic scrollbars shown (headless hides them by
// default, which hides 100vw bugs). Flags: horizontal page scroll; text or
// controls past the viewport edge; text or controls cut off by an ancestor
// that clips (overflow hidden/clip), which reads as "content runs out".
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [file, out, routesArg] = process.argv.slice(2);
const shots = process.argv.includes('--shots');
const ROUTES = (routesArg && !routesArg.startsWith('--') ? routesArg : 'top,lenses,lens-shaniwar,lens-parvati,lens-sinhagad,craft,company,contact').split(',');
const WIDTHS = [390, 768, 900, 1024, 1280, 1440, 1728];
mkdirSync(out, { recursive: true });

const probe = () => {
  const vw = document.documentElement.clientWidth;
  const res = { vw, sw: document.documentElement.scrollWidth, bodySw: document.body.scrollWidth, off: [], clipped: [], media: [] };
  const route = document.documentElement.dataset.route;
  const sec = document.getElementById(route) || document.body;
  const scope = [sec, ...document.querySelectorAll('.masthead, .foot')];
  const SEL = 'h1,h2,h3,h4,p,li,dt,dd,td,th,a,button,input,label,summary,figcaption,small,strong,em,span';
  const seen = new Set();
  const visible = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      if (e.getAttribute('aria-hidden') === 'true' && e.closest('.td-tags, .tier')) return false;
    }
    return true;
  };
  const name = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    const t = (el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return s + (t ? ` "${t}"` : '');
  };
  for (const root of scope) for (const el of root.querySelectorAll(SEL)) {
    if (seen.has(el)) continue; seen.add(el);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(A|BUTTON|INPUT|SUMMARY)$/.test(el.tagName);
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (el.closest('.sr-only, details:not([open]) > :not(summary)')) continue;
    if (!visible(el)) continue;
    if (r.right > vw + 1 || r.left < -1) { res.off.push(`${name(el)} [${Math.round(r.left)}..${Math.round(r.right)} of ${vw}]`); continue; }
    // Cut off by a clipping ancestor (not a scroll container)?
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const clipX = /hidden|clip/.test(cs.overflowX), clipY = /hidden|clip/.test(cs.overflowY);
      if (!clipX && !clipY) continue;
      const q = e.getBoundingClientRect();
      if (q.width < 4 || q.height < 4) continue;
      const cutX = clipX && (r.left < q.left - 1 || r.right > q.right + 1);
      const cutY = clipY && (r.top < q.top - 1 || r.bottom > q.bottom + 1) && r.top < q.bottom && r.bottom > q.top;
      if (cutX || cutY) { res.clipped.push(`${name(el)} cut by ${name(e).split(' ')[0]} [${cutX ? 'x' : ''}${cutY ? 'y' : ''}]`); break; }
    }
  }
  // Pictures (stills, canvases, drawings) cut by the viewport edge or by a
  // clipping box: by how much of their width.
  for (const root of scope) for (const el of root.querySelectorAll('img, canvas, svg:not(svg svg)')) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40 || !visible(el)) continue;
    if (el.closest('.masthead, .tier, [data-crop]')) continue;
    let L = 0, R = vw;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/hidden|clip/.test(cs.overflowX)) { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); R = Math.min(R, q.right); }
    }
    const cut = Math.max(0, L - r.left) + Math.max(0, r.right - R);
    if (cut > r.width * 0.02 + 2) res.media.push(`${name(el)} ${Math.round((cut / r.width) * 100)}% of its width cut [${Math.round(r.left)}..${Math.round(r.right)}, box ${Math.round(L)}..${Math.round(R)}]`);
  }
  res.off = res.off.slice(0, 25); res.clipped = res.clipped.slice(0, 25); res.media = res.media.slice(0, 25);
  return res;
};

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const report = [];
async function run(label, w, mk) {
  const ctx = await b.newContext({ viewport: { width: mk ? 1280 : w, height: 900 }, isMobile: w < 800 && !mk, hasTouch: w < 800 && !mk });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  for (const route of ROUTES) {
    const url = 'file://' + file + '?tier=2#' + route;
    let frame = p.mainFrame();
    if (mk) {
      const wrap = `${out}/frame-${route}.html`;
      writeFileSync(wrap, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#333"><iframe id="f" src="${url}" style="width:${w}px;height:860px;border:0;margin:20px"></iframe>`);
      await p.goto('file://' + wrap, { timeout: 120000 });
      frame = await (await p.$('#f')).contentFrame();
      await frame.waitForFunction(() => document.readyState === 'complete' && document.documentElement.dataset.route, null, { timeout: 120000 });
    } else {
      await p.goto(url, { timeout: 120000 });
    }
    await p.waitForTimeout(1200);
    // Scroll through the page so lazy images and scroll-placed things settle.
    const H = await frame.evaluate(() => document.documentElement.scrollHeight);
    const r = await frame.evaluate(probe);
    let deep = { off: [], clipped: [] };
    if (route !== 'top') {
      for (let y = 900; y < H; y += 900) { await frame.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(120); }
      await frame.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
    }
    const bad = r.sw > r.vw || r.off.length || r.clipped.length || r.media.length;
    report.push({ label, w, route, vw: r.vw, sw: r.sw, off: r.off, clipped: r.clipped, media: r.media, errs: errs.splice(0) });
    console.log(`${bad ? 'FAIL' : 'ok  '} ${label} ${route} vw=${r.vw} sw=${r.sw} off=${r.off.length} clipped=${r.clipped.length} media=${r.media.length}${errs.length ? ' ERR' : ''}`);
    if (shots && (bad || route !== 'top')) {
      if (mk) await p.screenshot({ path: `${out}/${label}-${route}.png`, fullPage: false });
      else await p.screenshot({ path: `${out}/${label}-${route}.png`, fullPage: true, timeout: 120000 }).catch(() => {});
    }
  }
  await ctx.close();
}
if (!process.argv.includes("--frame-only")) for (const w of WIDTHS) await run(`w${w}`, w, false);
await run('frame900', 900, true);
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
const fails = report.filter((r) => r.sw > r.vw || r.off.length || r.clipped.length || r.media.length || r.errs.length);
console.log(`\n${fails.length} failing of ${report.length}`);
for (const f of fails) {
  console.log(`\n# ${f.label} ${f.route} (vw ${f.vw}, scroll ${f.sw})`);
  for (const o of f.off) console.log('  OFF  ' + o);
  for (const c of f.clipped) console.log('  CLIP ' + c);
  for (const m of f.media) console.log('  PIC  ' + m);
  for (const e of f.errs) console.log('  ERR  ' + e);
}
await b.close();
