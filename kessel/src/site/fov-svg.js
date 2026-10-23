// Build time: the static markup of the "See the difference" viewer. The
// street is an inline SVG drawn from the same scene data as the live view
// (kessel/src/app/fov.js), without its finest details, with the three
// frames nested on it. Each lens in the legend shows its own crop of that
// SVG (a <use> of the layers, the ones behind the person blurred for the
// longer lenses), so the idea reads without JavaScript. With JavaScript
// the legend becomes the lens switcher, the SVG the overview, and the
// screen above them the live view.
//
//   fovHTML({ id: 'lenses-fov', lens: 'parvati' })
// id must be unique on the site (it prefixes every id inside); lens is the
// one shown first. head: false leaves out the eyebrow, title and lead.
import { esc } from './parts.js';
import { LENSES, FRAMES, WORLD, GRADS, BLUR, lensById, scene, fanPath } from '../app/fov.js';

const ORDER = ['far', 'mid', 'subj', 'near'];
const v = (k) => `var(--fk-${k})`;
const pct = (x, of) => +(x / of * 100).toFixed(2);
const r1 = (x) => +x.toFixed(1);
const alpha = (a, attr) => (a == null ? '' : ` ${attr}="${a}"`);
const box = (f) => `${r1(f.x)} ${r1(f.y)} ${r1(f.w)} ${r1(f.h)}`;

// One layer's items as SVG: neighbouring paths of the same style become
// one <path>, as they become one Path2D in the canvas.
function layer(items, pre, glows) {
  const out = [];
  let run = null;
  const flush = () => {
    if (!run) return;
    const fill = run.f && run.f.startsWith('g:') ? `url(#${pre}-${run.f.slice(2)})` : v(run.f);
    out.push(run.s
      ? `<path d="${run.d}" style="fill:none;stroke:${v(run.s)};stroke-width:${run.lw}"${alpha(run.a, 'opacity')}/>`
      : `<path d="${run.d}" style="fill:${fill}"${alpha(run.a, 'fill-opacity')}/>`);
    run = null;
  };
  for (const it of items) {
    if (it.fine) continue;
    if (it.d) {
      if (run && run.f === it.f && run.s === it.s && run.lw === it.lw && run.a === it.a) run.d += it.d;
      else { flush(); run = { ...it }; }
      continue;
    }
    flush();
    if (it.g) {
      const [cx, cy, rx, ry] = it.g;
      glows.add(it.f);
      out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${pre}-gl-${it.f})"${alpha(it.a, 'opacity')}/>`);
    } else if (it.t) {
      out.push(`<text x="${it.x}" y="${it.y}" text-anchor="middle" dominant-baseline="central" style="font:600 ${it.z}px var(--display);letter-spacing:${it.ls || 0}px;fill:${v(it.f)}">${esc(it.t)}</text>`);
    }
  }
  flush();
  return out.join('');
}

// A crop of the street as one lens sees it: the overview's layers by
// reference, the ones behind the person blurred as that lens blurs them.
export function cropSVG(pre, lens, cls = 'fov__crop') {
  const i = LENSES.findIndex((l) => l.id === lens);
  const use = (k) => `<use href="#${pre}-${k}"${BLUR[k] && BLUR[k][i] ? ` filter="url(#${pre}-b${k}${i})"` : ''}/>`;
  return `<svg class="${cls}" viewBox="${box(FRAMES[lens])}" data-lens="${lens}" aria-hidden="true" focusable="false">${ORDER.map(use).join('')}</svg>`;
}

// The street's layers and every gradient and filter, once, in a hidden
// block: the overview, the screen, the crops and the lens pages' beats all
// draw from it by reference, so the overview can sit in a closed toggle.
export function fovDefs(pre) {
  const L = scene(), glows = new Set();
  const body = ORDER.map((k) => `<g id="${pre}-${k}">${layer(L[k], pre, glows)}</g>`).join('');
  const stop = (o, k, a) => `<stop offset="${o}" style="stop-color:${v(k)}"${alpha(a, 'stop-opacity')}/>`;
  const lin = Object.entries(GRADS).map(([name, g]) => `<linearGradient id="${pre}-${name}" gradientUnits="userSpaceOnUse" x1="${g.x[0]}" y1="${g.x[1]}" x2="${g.x[2]}" y2="${g.x[3]}">${g.stops.map((s) => stop(...s)).join('')}</linearGradient>`);
  const rad = [...glows].map((k) => `<radialGradient id="${pre}-gl-${k}">${stop(0, k)}${stop(0.4, k, 0.45)}${stop(1, k, 0)}</radialGradient>`);
  const blur = Object.entries(BLUR).flatMap(([k, list]) => list.map((sd, i) => (sd ? `<filter id="${pre}-b${k}${i}"><feGaussianBlur stdDeviation="${sd}"/></filter>` : '')));
  // The live view's own blurs, set as the lens changes (fov-live.js).
  const live = Object.keys(BLUR).map((k) => `<filter id="${pre}-l${k}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0"/></filter>`);
  return `<svg class="fov__defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${lin.join('')}${rad.join('')}${blur.join('')}${live.join('')}${body}</defs></svg>`;
}

export function fovSVG(pre, title) {
  const rects = LENSES.map((l) => `<rect class="fov__r" data-lens="${l.id}" x="${r1(FRAMES[l.id].x)}" y="${r1(FRAMES[l.id].y)}" width="${r1(FRAMES[l.id].w)}" height="${r1(FRAMES[l.id].h)}" vector-effect="non-scaling-stroke"/>`).join('');
  const uses = ORDER.map((k) => `<use href="#${pre}-${k}"/>`).join('');
  return `<svg class="fov__svg" viewBox="0 0 ${WORLD.w} ${WORLD.h}" role="img" aria-labelledby="${pre}-svgt" focusable="false"><title id="${pre}-svgt">${esc(title)}</title>${uses}<path class="fov__veil" d=""/><g class="fov__rects">${rects}</g></svg>`;
}

// cue: the beat's "Try it" line, set in the side column under what the
// lens sees.
export function fovHTML({ id = 'fov', lens = 'shaniwar', head = true, cue = '' } = {}) {
  const first = lensById(lens);
  const [w, s, t] = LENSES;
  const title = `A street at dusk: a fort on a hill, a row of shops, a parked scooter, two street lamps and one person standing in the road. Three frames are drawn on it: ${w.name}'s wide frame around the whole street, ${s.name}'s standard frame around the person and the shops behind, and ${t.name}'s long frame tight around the person.`;
  const tags = LENSES.map((l) => { const f = FRAMES[l.id]; return `<span class="fov__tag" data-lens="${l.id}" style="left:${pct(f.x, WORLD.w)}%;top:${pct(f.y, WORLD.h)}%" aria-hidden="true">${l.mm} mm</span>`; }).join('');
  const items = LENSES.map((l) => `
        <li class="fov__lens" data-lens="${l.id}">
          ${cropSVG(id, l.id)}
          <span class="fov__txt"><span class="fov__role">${esc(l.role)}</span> <span class="fov__name">${esc(l.name)}</span> <span class="fov__nums"><span class="fov__mm">${l.mm}<small> mm</small></span> <span class="fov__deg">${l.deg}&deg;</span></span> <span class="fov__sees">${esc(l.sees)}</span></span>
        </li>`).join('');
  return `<section class="fov" id="${id}" data-fov="${first.id}" data-lens="${first.id}" ${head ? `aria-labelledby="${id}-title"` : 'aria-label="See the difference"'}>
  ${fovDefs(id)}
  ${head ? `<div class="fov__head">
    <p class="eyebrow">See the difference</p>
    <h2 id="${id}-title">One street, three lenses</h2>
    <p class="fov__lead">Stand in one spot and change only the lens. The wide takes in the whole street, the standard crops in, the long crops tight on the person.</p>
  </div>` : ''}
  <div class="fov__body">
    <div class="fov__screen">
      ${cropSVG(id, first.id, 'fov__still')}
      <div class="fov__hud" aria-hidden="true">
        <span class="fov__corners"></span>
        <p class="fov__hud-who"><span class="fov__hud-name">${esc(first.name)}</span> <span class="fov__hud-role">${esc(first.role)}</span></p>
        <div class="fov__aov">
          <svg class="fov__fan" viewBox="-50 -48 100 52" focusable="false"><path class="fov__fan-ref" d="${fanPath(84)}"/><path class="fov__fan-wedge" d="${fanPath(first.deg)}"/></svg>
          <p class="fov__aov-t"><span class="fov__aov-deg">${first.deg}&deg;</span><small>angle of view</small></p>
        </div>
        <p class="fov__hud-read"><span class="fov__hud-mm">${first.mm}</span><small>mm</small> <span class="fov__hud-deg">${first.deg}&deg;</span></p>
      </div>
    </div>
    <div class="fov__dial" hidden>
      <label class="fov__dial-l" for="${id}-mm">Focal length <span>&middot; drag between the three</span></label>
      <input class="fov__mm-in" id="${id}-mm" type="range" min="0" max="1000" step="1" value="0">
      <div class="fov__ticks" aria-hidden="true">${LENSES.map((l) => `<span data-lens="${l.id}">${l.mm}</span>`).join('')}</div>
    </div>
    <div class="fov__side">
      <div class="fov__pick">
        <p class="fov__lt">Lens <span>&middot; sample figures, full frame</span></p>
        <ol class="fov__legend" aria-label="The three lenses">${items}
        </ol>
      </div>
      <p class="fov__say"><span class="fov__say-name">${esc(first.name)}</span> <span class="fov__say-text">${esc(first.sees)}</span></p>
      <p class="sr-only fov__live" aria-live="polite"></p>
      ${cue}
      <details class="fov__more">
        <summary class="fov__more-s">Show the whole street</summary>
        <figure class="fov__map">
          <div class="fov__plate">${fovSVG(id, title)}${tags}</div>
          <figcaption class="fov__cap">The whole street from one spot, and the frame each lens takes from it.</figcaption>
        </figure>
        <p class="note fov__note">Sample content for this concept: the street is an illustration, and the focal lengths and angles of view are sample figures.</p>
      </details>
    </div>
  </div>
</section>`;
}
