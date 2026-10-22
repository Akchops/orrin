// The lens pages' small experiences (focus pull, aperture and bokeh): the
// arithmetic, shared by the build (src/site/lab-svg.js draws the first
// frame) and the page (src/site/lab.js moves it). Pure functions only.
//
// Sample figures throughout. The street (src/app/fov.js) is set at fixed
// distances; blur follows the thin-lens circle of confusion, as a share of
// the 36 mm frame, scaled up a little so it reads on a screen.
import { SCALES } from '../app/textures.js';
import { FRAMES, scene } from '../app/fov.js';

// Metres from the camera to each layer of the street.
export const DEPTH = { near: 2.5, subj: 5, mid: 14, far: 1500 };
// What the focus pull racks between, near to far.
export const TARGETS = [
  { key: 'near', label: 'Scooter', m: DEPTH.near },
  { key: 'subj', label: 'Person', m: DEPTH.subj },
  { key: 'far', label: 'Fort', m: Infinity },
];

// Aperture: T2.1 (wide open, as engraved) to T16, in third stops.
export const N_MIN = 2.1, N_MAX = 16;
const THIRDS = [2.1, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16];
export const nAt = (t) => N_MIN * Math.pow(N_MAX / N_MIN, Math.min(1, Math.max(0, t)));
export const tOfN = (N) => Math.log(N / N_MIN) / Math.log(N_MAX / N_MIN);
export const nLabel = (N) => THIRDS.reduce((b, x) => (Math.abs(Math.log(x / N)) < Math.abs(Math.log(b / N)) ? x : b));
// The iris opening, 0..1 of wide open, for the drawing and the 3D model.
export const openAt = (N) => N_MIN / N;
export const BLADES = 11;

// Focus: throw position f (0 at infinity, 1 at close focus) to metres and
// back, linear in dioptres like the engraved scale (src/app/textures.js).
export const metresAt = (f, k) => (f < 1e-3 ? Infinity : SCALES[k].close / f);
export const throwAt = (m, k) => (m === Infinity ? 0 : Math.min(1, SCALES[k].close / m));
export const marks = (k) => SCALES[k];

// The circle of confusion, as a share of the frame's width, for a lens of
// mm focused at s metres, at f-number N, for a point d metres away.
export function coc(mm, N, s, d) {
  const f = mm / 1000;
  if (s === Infinity && d === Infinity) return 0;
  let c;
  if (s === Infinity) c = (f * f) / (N * d);
  else if (d === Infinity) c = (f * f) / (N * (s - f));
  else c = ((f * f) / (N * (s - f))) * (Math.abs(d - s) / d);
  return c / 0.036;
}
// The same as a blur in the street's units, for a frame frameW wide: a
// standard deviation for the layer filters, and a diameter for the discs.
const GAIN = 3, GAIN_DISC = 5;
export const blurSd = (share, frameW) => Math.min(14, (GAIN * share * frameW) / 2.4);
export const discD = (share, frameW) => GAIN_DISC * share * frameW;

// How far the discs have turned from round to the iris's polygon: round
// wide open, eleven-sided by about T8.
export const polyAt = (N) => Math.min(1, Math.max(0, Math.log(N / N_MIN) / Math.log(4))) * 0.85;

const n = (v) => Math.round(v * 100) / 100;
// One out-of-focus highlight: a disc turning into the iris's polygon.
export function discPath(cx, cy, r, k, blades = BLADES, rot = -Math.PI / 2) {
  const seg = Math.PI * 2 / blades, steps = blades * 6, pts = [];
  for (let i = 0; i < steps; i++) {
    const a = rot + (i / steps) * Math.PI * 2;
    const local = ((a - rot) % seg + seg) % seg - seg / 2;
    const rr = r * (1 - k + k * (Math.cos(seg / 2) / Math.cos(local)));
    pts.push(`${n(cx + rr * Math.cos(a))} ${n(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join('L')}Z`;
}

// The iris face on: the blade field (an annulus less the opening) and the
// straight edge of each blade running on past the opening's corner, so the
// blades overlap in a ring. a: opening, 0..1 of the field's radius times
// ap; centred on 0 0.
export function irisPaths(a, { field = 50, ap = 46, blades = BLADES } = {}) {
  const N = blades, A = Math.max(0.6, ap * a), k = Math.tan(Math.PI / N), rot = -Math.PI / 2, TAU = Math.PI * 2;
  const poly = [];
  for (let i = 0; i < N; i++) {
    const t = rot + i * TAU / N + Math.PI / N, rr = A / Math.cos(Math.PI / N);
    poly.push([rr * Math.cos(t), rr * Math.sin(t)]);
  }
  const ring = `M${-field} 0a${field} ${field} 0 1 1 ${2 * field} 0a${field} ${field} 0 1 1 ${-2 * field} 0z`;
  const hole = 'M' + poly.slice().reverse().map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z';
  let edges = '';
  const far = Math.sqrt(Math.max(0, field * field - A * A));
  for (let i = 0; i < N; i++) {
    const t = rot + i * TAU / N, c = Math.cos(t), s = Math.sin(t);
    const tx = A * c, ty = A * s, dx = -s, dy = c;
    edges += `M${n(tx - dx * A * k)} ${n(ty - dy * A * k)}L${n(tx + dx * far)} ${n(ty + dy * far)}`;
  }
  return { field: ring + hole, edges, hole };
}

// Distances as people read them: metres to one place under 10, feet and
// inches under 10 ft.
export function metres(m) {
  if (m === Infinity) return '∞';
  return m < 10 ? `${m.toFixed(m < 1 ? 2 : 1)} m` : `${Math.round(m)} m`;
}
export function feet(m) {
  if (m === Infinity) return '∞';
  const ft = m / 0.3048;
  if (ft >= 10) return `${Math.round(ft)} ft`;
  let whole = Math.floor(ft), inch = Math.round((ft - whole) * 12);
  if (inch === 12) { whole += 1; inch = 0; }
  return `${whole} ft ${inch} in`;
}

// ------------------------------------------------------------ the street
const ORDER = ['far', 'mid', 'subj', 'near'];
let LIGHTS = null;
const lights = () => LIGHTS || (LIGHTS = scene().lights);
// Where the focus pull looks: the whole street, so the scooter, the person
// and the fort are all in view. Where the aperture beat looks: each lens's
// own frame, nudged so the shop lights are inside it.
export const FOCUS_BOX = FRAMES.shaniwar;
const NUDGE = { shaniwar: [0, 0], parvati: [0, -0.07], sinhagad: [0.12, -0.23] };
export function bokehBox(slug) {
  const f = FRAMES[slug], [dx, dy] = NUDGE[slug];
  return { x: f.x + f.w * dx, y: f.y + f.h * dy, w: f.w, h: f.h };
}
// Each lens's own frame width, for blur in the street's units.
export const frameW = (slug) => FRAMES[slug].w;
// The focus pull and the bokeh both focus on the person, as a first frame.
export const START_M = DEPTH.subj;
export const BOKEH_FOCUS = DEPTH.subj;
// The unrolled focus ring: the scale slides RING_W units over the throw.
export const RING_W = 560;

// The layer blurs for one lens, focus distance s and f-number N.
export function layerBlurs(l, slug, s, N) {
  const out = {};
  for (const k of ORDER) out[k] = blurSd(coc(l.mm, N, s, DEPTH[k]), frameW(slug));
  return out;
}

// The out-of-focus lights for one lens at f-number N, focused on the
// person: one disc per light inside the frame, sized by its blur. A disc
// no bigger than its light fades out (the street draws the light itself).
// alpha: its opacity.
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function discs(l, slug, N, vb = bokehBox(slug)) {
  const k = polyAt(N), fw = frameW(slug), pad = vb.w * 0.05;
  return lights().filter((p) => p.x > vb.x - pad && p.x < vb.x + vb.w + pad && p.y > vb.y - pad && p.y < vb.y + vb.h + pad)
    .map((p) => {
      const raw = discD(coc(l.mm, N, BOKEH_FOCUS, DEPTH[p.layer]), fw), d = Math.max(p.r * 1.2, raw), r = d / 2;
      const alpha = (Math.min(0.9, 0.35 + 0.5 * p.a) * Math.min(1, 6 / Math.max(6, r)) + 0.1) * sstep(p.r * 1.3, p.r * 3, raw);
      return { p, r, k, alpha: Math.round(alpha * 100) / 100 };
    });
}
