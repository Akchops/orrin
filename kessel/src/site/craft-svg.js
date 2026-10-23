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
import { WORLD, GRADS, LT, AX, scene, shell, marks, turnShapes, turnPlace, TURN_SEGS } from '../app/craft-lens.js';
import { lensFront } from './lab-svg.js';
import { LENSES } from '../app/fov.js';

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

// The finale (src/site/craft.js moves it): the sealed lens turning to face
// the viewer, drawn back to front, section by section (craft-lens.js
// turnShapes), with the marks on the near side and the front, face on,
// as on the lens pages. u: how far it has turned, 0 to 1.
const MAT = { mount: 'S', ring: 'R' };
function turnSVG(id, u, glows) {
  const t = turnShapes(u), M = marks();
  const body = TURN_SEGS.map(([a, , , part], i) => {
    let out = `<path class="ck-tb" d="${t.sides[i]}" fill="url(#${id}-tb${MAT[part] || 'A'})"/><path class="ck-tf" d="${t.faces[i]}"/>`;
    if (part === 'rear') out += `<g class="ck-tm ck-tm--rear" transform="matrix(${t.marks.rear.join(' ')})" opacity="${t.marks.a}">${items([...M.rear, ...M.sign], id, glows)}</g>`;
    if (part === 'focus' && a === 604) out += `<path class="ck-tk" d="${t.knurl}"/>`;
    if (part === 'focus' && a === 704) out += `<g class="ck-tm ck-tm--scale" transform="matrix(${t.marks.scale.join(' ')})" opacity="${t.marks.a}">${items(M.scale, id, glows)}</g>`;
    return out;
  }).join('');
  const cap = lensFront(LENSES[1], `${id}-cap`, 0.55, 'ck-cap').replace('<svg class="ck-cap"', '<svg class="ck-cap" x="-162.5" y="-162.5" width="325" height="325" overflow="visible"');
  return `<g class="ck-turn" transform="${turnPlace(u)}" aria-hidden="true"><ellipse class="ck-turn__glow" cx="${LT.tx + 770 * LT.s}" cy="${LT.ty + AX * LT.s}" rx="330" ry="300" fill="url(#${id}-gl-glassGlow)"/><g transform="matrix(${LT.s} 0 0 ${LT.s} ${LT.tx} ${LT.ty})">${body}<g class="ck-tcap" transform="matrix(${t.cap.join(' ')})"${t.capOn ? '' : ' opacity="0"'}>${cap}</g></g></g>`;
}
// The barrel's shading as it turns: dark at the edges, light along the
// middle, in lens units (the paths are drawn in them).
function turnGrads(id) {
  const g = (name, lo, mid, hi) => `<linearGradient id="${id}-tb${name}" gradientUnits="userSpaceOnUse" x1="0" y1="${AX - 180}" x2="0" y2="${AX + 180}">${[[0, lo], [0.2, mid], [0.37, hi], [0.45, hi], [0.5, mid], [0.56, hi], [0.64, hi], [0.8, mid], [1, lo]].map(([o, k]) => `<stop offset="${o}" style="stop-color:${v(k)}"/>`).join('')}</linearGradient>`;
  return g('A', 'anodLo', 'anod', 'anodHi') + g('R', 'ring', 'ring', 'ringHi') + g('S', 'steelLo', 'steel', 'steelHi');
}

// Without the script: the sealed lens, face on, as a second still.
export function sealedSVG({ id, title }) {
  const glows = new Set(['glassGlow']);
  const inner = turnSVG(id, 1, glows);
  const stop = (o, k, a) => `<stop offset="${o}" style="stop-color:${v(k)}"${at(a, 'stop-opacity')}/>`;
  const rad = [...glows].map((k) => `<radialGradient id="${id}-gl-${k}">${stop(0, k)}${stop(0.4, k, 0.45)}${stop(1, k, 0)}</radialGradient>`).join('');
  return `<svg class="ck ck--sealed" viewBox="0 0 ${WORLD.w} ${WORLD.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="${id}-svgt" focusable="false"><title id="${id}-svgt">${esc(title)}</title><defs>${turnGrads(id)}${rad}</defs><rect class="ck-sealed-bg" x="0" y="0" width="${WORLD.w}" height="${WORLD.h}"/>${inner}</svg>`;
}

export function craftSVG({ id, title, desc }) {
  const S = scene(), glows = new Set();
  // The lens parts are drawn in lens units, in one frame that sets the
  // lens on the bench.
  const frame = `<g class="ck-lens" transform="matrix(${LT.s} 0 0 ${LT.s} ${LT.tx} ${LT.ty})">`;
  let inLens = false;
  // The shell (the finale) closes over the cut half before the signature
  // and the pen; a dim layer over the room for the turn.
  const shellSVG = `<g class="ck-shell" clip-path="url(#${id}-shell)">${items(shell(), id, glows)}</g><rect class="ck-shell__edge" x="1000" y="${AX}" width="2.6" height="0"/>`;
  const body = S.parts.map((p) => {
    const open = p.lens && !inLens ? frame : !p.lens && inLens ? '</g>' : '';
    inLens = !!p.lens;
    return open + (p.key === 'sign' ? shellSVG : '') + partSVG(p) + (p.st ? '' : `<rect class="ck-dim" x="-100" y="-100" width="1800" height="1000"/>`);
  }).join('') + (inLens ? '</g>' : '');
  const turn = turnSVG(id, 0, glows);
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
  const clip = `<clipPath id="${id}-shell"><rect class="ck-shell__clip" x="1004" y="${AX - 200}" width="0" height="202"/></clipPath>`;
  return `<svg class="ck" viewBox="0 0 ${WORLD.w} ${WORLD.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="${id}-svgt ${id}-svgd" focusable="false"><title id="${id}-svgt">${esc(title)}</title><desc id="${id}-svgd">${esc(desc)}</desc><defs>${grads}${rad}${soft}${clip}${turnGrads(id)}</defs>${body}${turn}<g class="ck-labs" aria-hidden="true">${labels}</g></svg>`;
}
