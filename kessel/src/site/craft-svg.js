// Build time: the Craft drawing as an inline SVG, from the parts in
// kessel/src/app/craft-lens.js. Every part carries the stage it arrives
// at (data-st); the stylesheet shows, hides and highlights the parts from
// the stage on the figure (data-stage on .ckx), so the drawing works
// without JavaScript: the markup is set to the last stage, the finished
// lens. Colours are custom properties (--ck-*), set in craft.css.
//
//   craftSVG({ id: 'craft', title, desc })
// id prefixes every id inside (gradients, filters, title).
import { esc } from './parts.js';
import { WORLD, GRADS, LT, scene } from '../app/craft-lens.js';

const v = (k) => `var(--ck-${k})`;
const at = (a, attr) => (a == null ? '' : ` ${attr}="${a}"`);

// A part's items as SVG: neighbouring paths of the same style become one
// <path>; items with a hook for the page script stay on their own.
function items(list, pre, glows) {
  const out = [];
  let run = null;
  const paint = (k) => (k.startsWith('g:') ? `url(#${pre}-${k.slice(2)})` : v(k));
  const path = (it) => {
    const hook = `${it.cls ? ` class="${it.cls}"` : ''}${it.data != null ? ` data-h="${it.data}"` : ''}`;
    return it.s
      ? `<path${hook} d="${it.d}" style="fill:none;stroke:${paint(it.s)};stroke-width:${it.lw}${it.dash ? `;stroke-dasharray:${it.dash}` : ''}"${at(it.a, 'opacity')}/>`
      : `<path${hook} d="${it.d}" style="fill:${paint(it.f)}${it.o ? `;stroke:${v(it.o)};stroke-width:1;vector-effect:non-scaling-stroke` : ''}"${at(it.a, 'fill-opacity')}/>`;
  };
  const flush = () => { if (run) out.push(path(run)); run = null; };
  for (const it of list) {
    if (it.d) {
      const same = run && !it.cls && !run.cls && !it.dash && !run.dash && run.f === it.f && run.s === it.s && run.o === it.o && run.lw === it.lw && run.a === it.a;
      if (same) run.d += it.d;
      else { flush(); run = { ...it }; }
      continue;
    }
    flush();
    if (it.g) {
      const [cx, cy, rx, ry] = it.g;
      glows.add(it.f);
      out.push(`<ellipse${it.cls ? ` class="${it.cls}"` : ''} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${pre}-gl-${it.f})"${at(it.a, 'opacity')}/>`);
    } else if (it.t) {
      const tf = [`translate(${it.x} ${it.y})`, it.rot ? `rotate(${it.rot})` : '', it.sy ? `scale(1 ${+it.sy.toFixed(3)})` : ''].filter(Boolean).join(' ');
      out.push(`<text transform="${tf}" text-anchor="${it.anchor || 'middle'}" dominant-baseline="central" style="font:${it.w || 400} ${it.z}px var(--display);letter-spacing:${it.ls || 0}px;fill:${v(it.f)}"${at(it.a, 'fill-opacity')}>${esc(it.t)}</text>`);
    }
  }
  flush();
  return out.join('');
}

export function craftSVG({ id, title, desc }) {
  const S = scene(), glows = new Set();
  // The lens parts are drawn in lens units, in one frame that sets the
  // lens on the bench.
  const frame = `<g class="ck-lens" transform="matrix(${LT.s} 0 0 ${LT.s} ${LT.tx} ${LT.ty})">`;
  let inLens = false;
  const body = S.parts.map((p) => {
    const open = p.lens && !inLens ? frame : !p.lens && inLens ? '</g>' : '';
    inLens = !!p.lens;
    return open + partSVG(p);
  }).join('') + (inLens ? '</g>' : '');
  function partSVG(p) {
    let inner = items(p.items, id, glows);
    if (p.at) inner = `<g transform="translate(${p.at[0]} ${p.at[1]})">${inner}</g>`;
    if (!p.st) return `<g class="ck-room">${inner}</g>`;
    // The outline: a soft glow and a line while the stage is current, a
    // dashed ghost before the part arrives.
    const ghost = p.hl && !p.hlStroke ? `<path class="ck-ghost" data-st="${p.st}" d="${p.hl}"/>` : '';
    const glow = p.hl ? `<path class="ck-hl-glow${p.hlStroke ? ' ck-hl-glow--line' : ''}" d="${p.hl}" filter="url(#${id}-soft)"/>` : '';
    const line = p.hl && !p.hlStroke ? `<path class="ck-hl" d="${p.hl}"/>` : '';
    const from = p.from ? ` style="--dx:${p.from[0]}px;--dy:${p.from[1]}px"` : '';
    return `${ghost}<g class="ck-p ck-p--${p.key}" data-st="${p.st}"${from}>${glow}${inner}${line}</g>`;
  }
  const labels = S.labels.map((l) => {
    const x = l.x, sub = l.sub ? `<text class="ck-lab__sub" x="${x}" y="${l.y + 21}" text-anchor="${l.anchor}">${esc(l.sub.toUpperCase())}</text>` : '';
    return `<g class="ck-lab${l.side ? ' ck-lab--side' : ''}" data-st="${l.st}">${l.lead ? `<path d="${l.lead}"/>` : ''}<text x="${x}" y="${l.y}" text-anchor="${l.anchor}">${esc(l.t.toUpperCase())}</text>${sub}</g>`;
  }).join('');

  const stop = (o, k, a) => `<stop offset="${o}" style="stop-color:${v(k)}"${at(a, 'stop-opacity')}/>`;
  const grads = Object.entries(GRADS).map(([name, g]) => (g.r
    ? `<radialGradient id="${id}-${name}" gradientUnits="userSpaceOnUse" cx="${g.r[0]}" cy="${g.r[1]}" r="${g.r[2]}">${g.stops.map((s) => stop(...s)).join('')}</radialGradient>`
    : `<linearGradient id="${id}-${name}" gradientUnits="userSpaceOnUse" x1="${g.x[0]}" y1="${g.x[1]}" x2="${g.x[2]}" y2="${g.x[3]}">${g.stops.map((s) => stop(...s)).join('')}</linearGradient>`)).join('');
  const rad = [...glows].map((k) => `<radialGradient id="${id}-gl-${k}">${stop(0, k)}${stop(0.4, k, 0.45)}${stop(1, k, 0)}</radialGradient>`).join('');
  const soft = `<filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>`;
  return `<svg class="ck" viewBox="0 0 ${WORLD.w} ${WORLD.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="${id}-svgt ${id}-svgd" focusable="false"><title id="${id}-svgt">${esc(title)}</title><desc id="${id}-svgd">${esc(desc)}</desc><defs>${grads}${rad}${soft}</defs>${body}<g class="ck-labs" aria-hidden="true">${labels}</g></svg>`;
}
