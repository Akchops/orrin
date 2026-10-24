// The teardown's stops, shared by the page that steps through them by
// scroll (src/site/td-steps.js), the live camera that glides to each one
// (src/app/live.js) and the stills of the same views (src/app/stills.js).
//
//   0      the lens taken apart, the whole line in the stage
//   1 - 8  one part each, close: the part bright and large, the others
//          dimmed and drawn back from it
//   9      back together, the whole lens; then "Your turn"
//
// A stop is the lens's state and the camera's angle (stopState); the
// framing, how far the camera stands and where the picture sits, is fitted
// to the stage box on the screen (fitStop), so every stop fills the same
// box and nothing ever sits under the caption beside it.
import { RAIL, TEAR_CLOSE, partCentre } from './teardown.js';
import { MODEL_SPHERE, sphereDistance } from './fit.js';

const DEG = Math.PI / 180;
export const TD_STOPS = ['apart', ...RAIL, 'whole'];
export const TD_LAST = TD_STOPS.length - 1;

// Each rail part's bounds round its centre, fanned out as it is in the
// teardown: the radius across the axis and half its length along it (mm,
// measured on the model). The close-up fits a sphere round the part; the
// exploded line is fitted by these rings.
export const PART_BOUNDS = {
  'front-element': [33, 7],
  'glass-1': [30, 38],
  blades: [47, 8],
  'focus-ring': [42, 13],
  scale: [41, 9],
  barrel: [41, 40],
  mount: [35, 8],
  signature: [40, 8],
};

// Each close-up: the part's size for the depth of field (r, mm) and the
// camera's angle (az, el; teardown.js TEAR_CLOSE unless set here). The
// framing itself is fitted to the part's outline (fitStop).
export const CLOSE = {
  'front-element': { r: 35 },
  'glass-1': { r: 36.5 },
  blades: { r: 51.5 },
  'focus-ring': { r: 45.5 },
  // From just behind the ring, where no other part stands in the way, with
  // the focus turned part-way so the engraved distances face the camera.
  scale: { r: 44, az: 112, el: 14, focus: 0.55 },
  barrel: { r: 52 },
  mount: { r: 37.5 },
  signature: { r: 42.5 },
};

// The lens's state and the camera's angle at stop i. The others' dimming,
// the drift back from the picked part and the depth of field are channels
// of the scene state (story.js createState).
export function stopState(i) {
  const id = TD_STOPS[Math.max(0, Math.min(TD_LAST, i))];
  const base = { tear: 1, tlight: 1, light: 0, iris: 1, focus: 0, hl: '', pick: '', dim: 0, pe: 0, dof: 0, dofR: 40, oroll: 0 };
  if (id === 'apart') return { ...base, az: 62, el: 14 };
  // Back together, the iris left open and no light behind it, so there is
  // no bright dot and no ragged half-closed shape in the glass.
  if (id === 'whole') return { ...base, tear: 0, az: 36, el: 12 };
  const c = { ...TEAR_CLOSE[id], ...CLOSE[id] };
  return { ...base, az: c.az, el: c.el, focus: c.focus || 0, hl: id, pick: id, dim: 0.72, pe: 1, dof: 1, dofR: c.r };
}



// Box helpers: a DOMRect-like box in a W x H viewport.
function sphereInBox(P, c, r, box, W, H, fov) {
  const tan = Math.tan((fov * DEG) / 2), aspect = W / H;
  const dist = sphereDistance(r, tan * (box.height / H), tan * aspect * (box.width / W), 1.04);
  P.frame = dist * Math.min(tan, tan * aspect);
  P.sx = (box.left + box.width / 2 - W / 2) / W;
  P.sy = -(box.top + box.height / 2 - H / 2) / H;
  P.tx = c[0]; P.ty = c[1]; P.tz = c[2];
  return P;
}

// The camera's axes at az/el, rolled by oroll about the view (as stage3d.js
// and tier2.js place it): z from the target to the camera, x to the right
// of the picture, y up it.
function axes(az, el, roll) {
  const a = az * DEG, e = el * DEG, t = roll * DEG;
  const z = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
  const x0 = [Math.cos(a), 0, -Math.sin(a)];
  const y0 = [z[1] * x0[2] - z[2] * x0[1], z[2] * x0[0] - z[0] * x0[2], z[0] * x0[1] - z[1] * x0[0]];
  const c = Math.cos(t), s = Math.sin(t);
  return { z, x: x0.map((v, k) => v * c + y0[k] * s), y: y0.map((v, k) => v * c - x0[k] * s) };
}

// A part as points: a ring round each end of it, at teardown progress 1
// with axis offsets scaled by ks; the exploded line is all of them.
const ptCache = new Map();
function ringPoints(ids, ks, n) {
  const key = ids.join() + ks.toFixed(3) + n;
  if (ptCache.has(key)) return ptCache.get(key);
  const pts = [], c = [0, 0, 0];
  for (const id of ids) {
    partCentre(id, 1, ks, c);
    const [r, h] = PART_BOUNDS[id];
    for (const dz of [-h, h]) for (let k = 0; k < n; k++) {
      const p = (k / n) * Math.PI * 2;
      pts.push([c[0] + Math.cos(p) * r, c[1] + Math.sin(p) * r, c[2] + dz]);
    }
  }
  ptCache.set(key, pts);
  return pts;
}
const linePoints = (ks) => ringPoints(RAIL, ks, 8);

// Fit points into the box at a given angle and roll: the camera distance
// that makes their outline fill `fill` of the box by its tighter side, and
// the offsets that centre the outline there. Projected as the camera
// projects them (perspective included), refined a few times.
function fitPoints(az, el, roll, fov, pts, box, W, H, fill) {
  const { x, y, z } = axes(az, el, roll);
  const tan = Math.tan((fov * DEG) / 2), aspect = W / H;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const t = lo.map((v, k) => (v + hi[k]) / 2);
  let dist = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 2;
  let ext = null;
  for (let it = 0; it < 6; it++) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) {
      const d = [p[0] - t[0] - z[0] * dist, p[1] - t[1] - z[1] * dist, p[2] - t[2] - z[2] * dist];
      const depth = -(d[0] * z[0] + d[1] * z[1] + d[2] * z[2]);
      const nx = (d[0] * x[0] + d[1] * x[1] + d[2] * x[2]) / (depth * tan * aspect);
      const ny = (d[0] * y[0] + d[1] * y[1] + d[2] * y[2]) / (depth * tan);
      x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y0 = Math.min(y0, ny); y1 = Math.max(y1, ny);
    }
    ext = { x0, x1, y0, y1 };
    const s = Math.max(((x1 - x0) / 2) * W / (box.width * fill), ((y1 - y0) / 2) * H / (box.height * fill));
    if (Math.abs(s - 1) < 1e-3) break;
    dist *= s;
  }
  const cx = (((ext.x0 + ext.x1) / 2) * 0.5 + 0.5) * W, cy = (0.5 - ((ext.y0 + ext.y1) / 2) * 0.5) * H;
  return {
    dist, t,
    frame: dist * Math.min(tan, tan * aspect),
    sx: (box.left + box.width / 2 - cx) / W,
    sy: (cy - (box.top + box.height / 2)) / H,
  };
}

// The exploded line in the box. A wide box takes it level; a tall or
// square one may roll the picture so the line runs corner to corner (front
// at the top left, reading down), when that shows the parts bigger.
const fits = new Map();
function lineInBox(P, box, W, H, fov, ks) {
  const key = [P.az, P.el, fov, ks, W, H, box.width | 0, box.height | 0].join(',');
  let f = fits.get(key);
  if (!f) {
    const pts = linePoints(ks);
    const rolls = box.width / box.height >= 1.3 ? [0] : [0, 18, 28, 38, 48];
    for (const roll of rolls) {
      const g = fitPoints(P.az, P.el, roll, fov, pts, box, W, H, 0.9);
      g.roll = roll;
      // Smaller distance means bigger parts; a level line wins unless a
      // rolled one is clearly bigger.
      g.score = g.dist * (roll ? 1.1 : 1);
      if (!f || g.score < f.score) f = g;
    }
    if (fits.size > 64) fits.clear();
    fits.set(key, f);
  }
  // The box moves (it scrolls in with the page): only the offsets follow.
  const dx = box.left - (f.left ?? box.left), dy = box.top - (f.top ?? box.top);
  if (f.left === undefined) { f.left = box.left; f.top = box.top; }
  P.frame = f.frame; P.oroll = f.roll;
  P.sx = f.sx + dx / W; P.sy = f.sy - dy / H;
  P.tx = f.t[0]; P.ty = f.t[1]; P.tz = f.t[2];
  return P;
}

// Fit stop i's camera to the box: frame, sx, sy, tx, ty, tz (and oroll for
// the exploded line). P carries az, el and fov; ks is the axis spread.
export function fitStop(P, i, box, W, H, ks = 1, model = 1) {
  const id = TD_STOPS[Math.max(0, Math.min(TD_LAST, i))];
  const fov = P.fov || 26;
  if (id === 'apart') return lineInBox(P, box, W, H, fov, ks);
  if (id === 'whole') { const s = MODEL_SPHERE[Math.round(model)] || MODEL_SPHERE[1]; return sphereInBox(P, s.c, s.r, box, W, H, fov); }
  // A part: its outline, as the camera sees it from this angle, fills the
  // box by its tighter side, centred, whatever the box's shape.
  const f = fitPoints(P.az, P.el, 0, fov, ringPoints([id], ks, 16), box, W, H, 0.86);
  P.frame = f.frame; P.sx = f.sx; P.sy = f.sy;
  P.tx = f.t[0]; P.ty = f.t[1]; P.tz = f.t[2];
  return P;
}

// The map beside the stage: the whole lens from above, front to the left,
// each part numbered where it sits in the assembled lens, and the camera:
// where it stands and the view it takes in. Map units.
export const TD_MAP = { w: 260, h: 200, s: 1.45, y0: 100 };
const PROFILE = [[0, 40], [-8, 40], [-8, 41.2], [-40, 41.2], [-40, 38.6], [-86, 38.6], [-86, 31], [-99, 31]];
// Where each part's number sits on the map: [z along the lens, x across it]
// (mm, lens space): the glass and the iris on the axis, the rings on the
// barrel's edge, the plate on the side it faces.
const SPOTS = {
  'front-element': [-4, 0], 'glass-1': [-26, 0], blades: [-50, 0], 'focus-ring': [-20, -41],
  scale: [-32, 41], barrel: [-62, -38.6], mount: [-95, 0], signature: [-70, 38.6],
};
export function tdMap() {
  const M = TD_MAP, L = 99, s = M.s;
  const X = (z) => M.w / 2 + (-z - L / 2) * s, Y = (x) => M.y0 + x * s;
  const r = (v) => Math.round(v * 10) / 10;
  const top = PROFILE.map(([z, rr]) => [X(z), Y(-rr)]), bot = PROFILE.slice().reverse().map(([z, rr]) => [X(z), Y(rr)]);
  const body = 'M' + top.concat(bot).map(([x, y]) => `${r(x)} ${r(y)}`).join('L') + 'Z';
  const spots = RAIL.map((id) => ({ id, x: r(X(SPOTS[id][0])), y: r(Y(SPOTS[id][1])) }));
  // The camera at stop i: back from what it looks at along its angle, far
  // off for the whole lens and the line, close for a part.
  const cam = (i) => {
    const id = TD_STOPS[Math.max(0, Math.min(TD_LAST, i))], st = stopState(i);
    const near = id !== 'apart' && id !== 'whole';
    const [tz, tx] = near ? SPOTS[id] : [-50, 0];
    return { x: X(tz), y: Y(tx), az: st.az, D: near ? 36 : 62, half: near ? 16 : 58 };
  };
  return { body, axis: `M${r(X(14))} ${M.y0}H${r(X(-L - 14))}`, spots, cam };
}
// The camera marker and its view as SVG attributes, from a map camera
// (tdMap().cam, or one between two of them).
export function camShape(c) {
  const r = (v) => Math.round(v * 10) / 10;
  const a = c.az * DEG, dx = -Math.cos(a), dy = Math.sin(a);
  const cx = c.x + dx * c.D, cy = c.y + dy * c.D, px = -dy * c.half, py = dx * c.half;
  return {
    transform: `translate(${r(cx)} ${r(cy)}) rotate(${r(Math.atan2(-dy, -dx) / DEG)})`,
    cone: `M${r(cx)} ${r(cy)}L${r(c.x + px)} ${r(c.y + py)}L${r(c.x - px)} ${r(c.y - py)}Z`,
    aim: [r(c.x), r(c.y)],
  };
}
