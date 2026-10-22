// Build time: the markup of each lens page's small experiences, drawn in
// their first state so they read without JavaScript (src/site/lab.js then
// makes them move). Two beats per lens page, after the hero:
//   focus     the street with its layers blurred for one focus distance,
//             and the focus ring unrolled, with its own distance scale
//   aperture  the lens's front with its iris, and the street through it
//             with the lights turned to discs, and the f-stop slider
// Plus, for the Lenses page, the compare strip (three irises, one slider)
// and each lens's bokeh swatch.
//
// The street is not drawn again: each picture is a <use> of the layers the
// page's "See the difference" viewer already holds (#<fov id>-far, ...).
import { esc } from './parts.js';
import { LENSES } from '../app/fov.js';
import { DEPTH, TARGETS, N_MIN, N_MAX, BLADES, coc, discD, discPath, irisPaths, openAt, throwAt, metres, feet, marks, nLabel,
  FOCUS_BOX, bokehBox, frameW, START_M, BOKEH_FOCUS, layerBlurs, discs, RING_W } from './lab-math.js';

const ORDER = ['far', 'mid', 'subj', 'near'];
const r2 = (x) => Math.round(x * 100) / 100;
const box = (f) => `${r2(f.x)} ${r2(f.y)} ${r2(f.w)} ${r2(f.h)}`;

// The street as one <svg>: the viewer's layers by reference, each through
// its own blur filter.
function street(pre, fov, vb, blurs, extra = '', label = '') {
  const filters = ORDER.map((k) => `<filter id="${pre}-b${k}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${r2(blurs[k])}"/></filter>`).join('');
  const uses = ORDER.map((k) => `<use class="lab__layer" data-layer="${k}" href="#${fov}-${k}" filter="url(#${pre}-b${k})"/>`).join('');
  return `<svg class="lab__street" viewBox="${box(vb)}" preserveAspectRatio="xMidYMid slice" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false"><defs>${filters}</defs>${uses}${extra}</svg>`;
}

function discsSVG(l, slug, N) {
  return discs(l, slug, N).map(({ p, r, k, alpha }, j) => `<path class="lab__disc" data-j="${j}" d="${discPath(p.x, p.y, r, k)}" style="opacity:${alpha}"/>`).join('');
}

// The lens front, face on: its rings, engraving, glass and iris. a: the
// opening, 0..1 of wide open. pre: unique id prefix.
export function lensFront(l, pre, a, cls = 'lab__iris-svg') {
  const name = String(l.name).toUpperCase();
  const engr = `KESSEL OPTICS · PUNE · ${name} ${l.mm} mm · T${N_MIN}`;
  const ir = irisPaths(a, { field: 47, ap: 44 });
  return `<svg class="${cls}" viewBox="-64 -64 128 128" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${pre}-gl" cx="40%" cy="36%" r="70%"><stop offset="0" stop-color="#3d6f9e"/><stop offset="0.45" stop-color="#1d3550"/><stop offset="1" stop-color="#0a121c"/></radialGradient>
    <radialGradient id="${pre}-li"><stop offset="0" stop-color="#fff4dc"/><stop offset="0.35" stop-color="#f1c37a" stop-opacity="0.85"/><stop offset="1" stop-color="#7d4a1a" stop-opacity="0"/></radialGradient>
    <path id="${pre}-tp" d="M0 -55.6a55.6 55.6 0 1 1 0 111.2a55.6 55.6 0 1 1 0 -111.2"/>
  </defs>
  <circle r="63" class="lf__body"/>
  <circle r="61.4" class="lf__band"/>
  <circle r="59.6" class="lf__ring"/>
  <text class="lf__engr"><textPath href="#${pre}-tp" startOffset="2%">${esc(engr)}</textPath></text>
  <circle r="51.2" class="lf__bezel"/>
  <circle r="49" fill="url(#${pre}-gl)"/>
  <circle r="46" fill="url(#${pre}-li)" class="lf__light"/>
  <path class="lf__blades" d="${ir.field}"/>
  <path class="lf__edges" d="${ir.edges}"/>
  <path class="lf__coat" d="M-36 -26A44 44 0 0 1 -6 -43" />
  <path class="lf__coat lf__coat--g" d="M26 30A40 40 0 0 1 4 41"/>
  <circle cx="-22" cy="-30" r="2.4" class="lf__spec"/>
</svg>`;
}

// A small bokeh swatch: what this lens does to lights behind a person at
// T2.1, at the same scale for all three.
export function bokehSwatch(l, slug) {
  const pts = [[18, 26], [44, 14], [66, 34], [92, 18], [118, 30], [140, 12], [30, 46], [104, 48]];
  const r = Math.max(2.4, Math.min(22, discD(coc(l.mm, N_MIN, BOKEH_FOCUS, DEPTH.mid), frameW(slug)) * 160 / frameW(slug) / 2 * 6));
  return `<svg class="lx-bokeh__svg" viewBox="0 0 160 60" aria-hidden="true" focusable="false">${pts.map(([x, y], j) => `<path d="${discPath(x, y, r * (0.75 + ((j * 37) % 5) / 10), 0)}" style="opacity:${r2(0.35 + ((j * 53) % 4) / 10)}"/>`).join('')}</svg>`;
}

// The unrolled focus ring: knurl along the top, the distance scale under
// it (metres in white, feet in amber), the index line fixed in the middle.
// The strip slides by the throw position: x = f * RING_W.
function ringSVG(l, i, f0) {
  const S = marks(i), ribs = [], ticks = [], m = [], ft = [];
  for (let x = -40; x <= RING_W + 40; x += 7) ribs.push(`M${x} 4h3.6v20h-3.6z`);
  for (let j = 0; j <= 40; j++) { const x = (j / 40) * RING_W; ticks.push(`M${r2(x)} 30v${j % 5 ? 4 : 7}`); }
  for (const v of S.m) { const x = throwAt(v, i) * RING_W; m.push(`<text x="${r2(x)}" y="47">${v === Infinity ? '∞' : v}</text>`); }
  for (const v of S.ft) { const x = throwAt(v === Infinity ? Infinity : v * 0.3048, i) * RING_W; ft.push(`<text x="${r2(x)}" y="60">${v === Infinity ? '∞' : v}</text>`); }
  return `<svg class="ring__svg" viewBox="-170 0 340 66" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <g class="ring__strip" transform="translate(${r2(-f0 * RING_W)} 0)">
      <path class="ring__ribs" d="${ribs.join('')}"/>
      <path class="ring__ticks" d="${ticks.join('')}"/>
      <g class="ring__m">${m.join('')}</g>
      <g class="ring__ft">${ft.join('')}</g>
    </g>
    <path class="ring__index" d="M0 26v40"/>
  </svg>`;
}

// One control's frame: the cue line, the control, the live readout.
const cue = (label, how) => `<p class="ctl__say"><span class="ctl__cue">${esc(label)}</span> <span class="ctl__how">${esc(how)}</span></p>`;

export function focusBeat(l, i, id, fov) {
  const slug = l.slug, lens = LENSES[i];
  const f0 = throwAt(START_M, i);
  const blurs = layerBlurs(lens, slug, START_M, N_MIN);
  const pins = TARGETS.map((t) => {
    const pos = { near: [252, 560], subj: [610, 436], far: [420, 140] }[t.key];
    return `<g class="lab__mark" data-key="${t.key}" transform="translate(${pos[0]} ${pos[1]})"><circle r="9"/><text x="14" y="4">${esc(t.label)}</text></g>`;
  }).join('');
  return `<section class="beat lab lab--focus" id="${id}-focus" data-beat="focus" data-lens="${i}" data-slug="${slug}" aria-labelledby="${id}-focus-t">
  <div class="beat__pin lab__pin">
    <header class="lab__head">
      <p class="eyebrow lab__eyebrow"><span class="lab__no">01</span> Focus pull</p>
      <h2 class="lab__h" id="${id}-focus-t">Rack focus down the street</h2>
      <p class="lab__lead">Turn ${esc(l.name)}&rsquo;s ring: the scooter, the person and the fort come sharp in turn.</p>
    </header>
    <figure class="lab__stage lab__stage--focus">
      ${street(`${id}-fs`, fov, FOCUS_BOX, blurs, `<g class="lab__marks" aria-hidden="true">${pins}</g>`, `The street focused at ${metres(START_M)}: the person sharp, the scooter and the fort soft.`)}
      <figcaption class="lab__cap">Illustration, sample figures: depth of field for ${lens.mm} mm at T${N_MIN}, on the whole street.</figcaption>
    </figure>
    <div class="lab__ctl ctl" data-ctl="focus">
      ${cue('Turn the ring', 'Drag the ring sideways, or tap a distance.')}
      <div class="ring" role="slider" tabindex="0" aria-label="Focus distance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(f0 * 100)}" aria-valuetext="${metres(START_M)}, ${feet(START_M)}" data-f="${r2(f0)}">
        ${ringSVG(l, i, f0)}
        <span class="ring__handle ctl__handle" aria-hidden="true"></span>
      </div>
      <p class="ctl__read"><output class="lab__m">${metres(START_M)}</output> <output class="lab__ft">${feet(START_M)}</output> <span class="lab__in">Person in focus</span></p>
      <div class="lab__targets" role="group" aria-label="Focus on">${TARGETS.map((t) => `<button type="button" class="chip" data-m="${t.m === Infinity ? 'inf' : t.m}" aria-pressed="${t.key === 'subj'}">${esc(t.label)} <small>${metres(t.m)}</small></button>`).join('')}</div>
    </div>
  </div>
</section>`;
}

export function apertureBeat(l, i, id, fov) {
  const slug = l.slug, lens = LENSES[i];
  const N = N_MIN;
  const blurs = layerBlurs(lens, slug, BOKEH_FOCUS, N);
  const say = {
    shaniwar: 'A wide lens keeps most of the street sharp even wide open; the lamps and windows only just soften.',
    parvati: 'Wide open the shop lights melt into soft discs; close the iris and they shrink back to points.',
    sinhagad: 'Wide open the shop lights turn to large discs behind the person; close down and the street comes back.',
  }[slug];
  return `<section class="beat lab lab--ap" id="${id}-aperture" data-beat="aperture" data-lens="${i}" data-slug="${slug}" aria-labelledby="${id}-ap-t">
  <div class="beat__pin lab__pin">
    <header class="lab__head">
      <p class="eyebrow lab__eyebrow"><span class="lab__no">02</span> Aperture and bokeh</p>
      <h2 class="lab__h" id="${id}-ap-t">Close the iris</h2>
      <p class="lab__lead">${esc(say)}</p>
    </header>
    <div class="lab__pair">
      <figure class="lab__lens">
        <div class="lab__front" id="${id}-front" data-viewer="${i}" data-pose="front">${lensFront(lens, `${id}-lf`, openAt(N))}</div>
        <figcaption class="lab__cap">${esc(l.name)}&rsquo;s iris: ${BLADES} blades, face on.</figcaption>
      </figure>
      <figure class="lab__stage lab__stage--bokeh">
        ${street(`${id}-bs`, fov, bokehBox(slug), blurs, `<g class="lab__bokeh" aria-hidden="true">${discsSVG(lens, slug, N)}</g>`, `The street through ${l.name} wide open, focused on the person: the lights behind turned to soft discs.`)}
        <figcaption class="lab__cap">Illustration, sample figures: ${lens.mm} mm focused on the person at ${metres(BOKEH_FOCUS)}.</figcaption>
      </figure>
    </div>
    <div class="lab__ctl ctl" data-ctl="aperture">
      ${cue('Drag me', 'Slide to close the iris, or use the arrow keys.')}
      <div class="slider" role="slider" tabindex="0" aria-label="Aperture" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="T${N_MIN}, wide open" data-t="0">
        <span class="slider__track"><span class="slider__fill"></span></span>
        <span class="slider__handle ctl__handle" aria-hidden="true"></span>
        <span class="slider__ticks" aria-hidden="true">${[2.1, 2.8, 4, 5.6, 8, 11, 16].map((v) => `<span style="left:${r2(Math.log(v / N_MIN) / Math.log(N_MAX / N_MIN) * 100)}%">${v}</span>`).join('')}</span>
      </div>
      <p class="ctl__read"><output class="lab__n">T${nLabel(N)}</output> <span class="lab__open">Wide open</span> <span class="lab__blades">${BLADES} blades: round discs wide open, eleven-sided as it closes.</span></p>
    </div>
  </div>
</section>`;
}

// The Lenses page's compare strip: the three irises and their discs, one
// slider for all three.
export function compareStrip(lenses) {
  const cells = lenses.map((l, i) => {
    const lens = LENSES[i];
    const d = discD(coc(lens.mm, N_MIN, BOKEH_FOCUS, DEPTH.mid), frameW(l.slug)) / frameW(l.slug) * 100;
    return `<li class="cmp__cell" data-band="${l.band}" data-lens="${i}">
        ${lensFront(lens, `cmp-${l.slug}`, 1, 'cmp__iris')}
        <p class="cmp__name">${esc(l.name)} <span>${lens.mm} mm</span></p>
        <svg class="cmp__disc" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><path d="${discPath(0, 0, Math.min(11, Math.max(0.8, d * 1.2)), 0)}"/></svg>
      </li>`;
  }).join('');
  return `<section class="beat cmp" id="lenses-cmp" data-beat="compare" aria-labelledby="lenses-cmp-t">
  <div class="beat__pin cmp__pin wrap">
    <header class="cmp__head">
      <p class="eyebrow">Compare</p>
      <h2 id="lenses-cmp-t">One aperture, three lenses</h2>
      <p class="cmp__lead">One slider closes all three irises. The disc under each lens is how large a light behind a person turns at that stop: biggest on the long lens.</p>
    </header>
    <ol class="cmp__row">${cells}
    </ol>
    <div class="cmp__ctl ctl" data-ctl="compare">
      ${cue('Drag me', 'Slide to close all three irises together.')}
      <div class="slider" role="slider" tabindex="0" aria-label="Aperture for all three lenses" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="T${N_MIN}, wide open" data-t="0">
        <span class="slider__track"><span class="slider__fill"></span></span>
        <span class="slider__handle ctl__handle" aria-hidden="true"></span>
        <span class="slider__ticks" aria-hidden="true">${[2.1, 2.8, 4, 5.6, 8, 11, 16].map((v) => `<span style="left:${r2(Math.log(v / N_MIN) / Math.log(N_MAX / N_MIN) * 100)}%">${v}</span>`).join('')}</span>
      </div>
      <p class="ctl__read"><output class="cmp__n">T${N_MIN}</output> <span>Sample figures: discs for a light 14 m away, focus on a person at 5 m.</span></p>
    </div>
  </div>
</section>`;
}

