// Inspect the lens: where the camera stands for the whole lens and for its
// five details, on each of the three lenses. Shared by the live viewer
// (src/app/viewer.js, data-pose="inspect"), which glides between them as
// the page scrolls, and by the stills (src/app/stills.js i-<k>-<key>),
// which are the same views for the 2D and stills tiers and without JS.
//
// A pose: the camera's angle round the lens (az, el, degrees; az 0 looks
// at the front, 90 at the side the engraving faces, 180 at the back), the
// point it looks at (t, lens space, mm), the half-height of the view there
// (frame, mm), and the lens's own state (iris, focus). Poses are written
// for the standard lens and scaled to each lens by its proportions
// (src/app/shape.js), as the model is.
import { LEN_K, FRONT_K } from './shape.js';
import { MODEL_SPHERE, sphereFrame } from './fit.js';

export const INSPECT_KEYS = ['whole', 'glass', 'iris', 'scale', 'mount', 'sign'];

export function inspectPoses(k) {
  const fr = FRONT_K[k], lz = LEN_K[k], sph = MODEL_SPHERE[k];
  const at = (x, y, z) => [x * fr, y * fr, z * lz];
  return [
    // The whole lens, three-quarters, its bounding sphere in the view.
    { key: 'whole', az: 38, el: 11, t: sph.c.slice(), frame: sphereFrame(sph.r), r: sph.r, iris: 0.4, focus: 0.3 },
    // The coated front element and the front label, nearly face on.
    { key: 'glass', az: 5, el: 7, t: at(0, 0, -4), frame: 43 * fr, iris: 0.45, focus: 0.3 },
    // Straight down the axis at the iris, stopped down evenly.
    { key: 'iris', az: 0, el: 0, t: at(0, 0, -30), frame: 24 * fr, iris: 0.32, focus: 0.3 },
    // The distance scale against the index mark, at the closest mark.
    { key: 'scale', az: 86, el: 2, t: at(38, 0, -27), frame: 21 * fr, iris: 0.4, focus: 1 },
    // The back: the stainless mount and the rear element.
    { key: 'mount', az: 162, el: 14, t: at(0, 0, -86), frame: 40 * fr, iris: 0.45, focus: 0.6 },
    // The signature under the maker's mark on the rear barrel.
    { key: 'sign', az: 90, el: 2, t: at(39, 0, -68), frame: 15 * fr, iris: 0.4, focus: 0.3 },
  ];
}

// Between two poses at q (0 at the whole lens, 5 at the signature): the
// angles the short way round, the distance in proportion (so the zoom
// feels even), the look-at point and the lens state in a line. dist(p)
// gives a pose's camera distance for the view being drawn.
const lerp = (a, b, f) => a + (b - a) * f;
export function poseAt(poses, q, dist) {
  const n = poses.length - 1, x = Math.max(0, Math.min(n, q)), i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const a = poses[i], b = poses[i + 1];
  let daz = b.az - a.az;
  if (daz > 180) daz -= 360; else if (daz < -180) daz += 360;
  return {
    az: a.az + daz * f, el: lerp(a.el, b.el, f),
    t: [0, 1, 2].map((j) => lerp(a.t[j], b.t[j], f)),
    dist: Math.exp(lerp(Math.log(dist(a)), Math.log(dist(b)), f)),
    iris: lerp(a.iris, b.iris, f), focus: lerp(a.focus, b.focus, f),
    stop: f < 0.5 ? i : i + 1,
  };
}

// The map beside the stage: the lens from above, front to the left, at one
// scale for all three (so each keeps its own length), the five details on
// it, and the camera (where it stands and the view it takes). Map units.
export const MAP = { w: 280, h: 184, s: 0.95, y0: 58 };
const PROFILE = [[0, 40], [-8, 40], [-8, 41.2], [-40, 41.2], [-40, 38.6], [-86, 38.6], [-86, 31], [-99, 31]];
export function mapOf(k) {
  const fr = FRONT_K[k], lz = LEN_K[k], L = 99 * lz, s = MAP.s;
  const X = (z) => MAP.w / 2 + (-z - L / 2) * s, Y = (x) => MAP.y0 + x * s;
  const r = (v) => Math.round(v * 10) / 10;
  const top = PROFILE.map(([z, rr]) => [X(z * lz), Y(-rr * fr)]), bot = PROFILE.slice().reverse().map(([z, rr]) => [X(z * lz), Y(rr * fr)]);
  const body = 'M' + top.concat(bot).map(([x, y]) => `${r(x)} ${r(y)}`).join('L') + 'Z';
  const poses = inspectPoses(k);
  const spots = poses.slice(1).map((p) => ({ key: p.key, x: r(X(p.t[2])), y: r(Y(p.t[0])) }));
  // The camera at q: back from the point it looks at along its angle,
  // farther for the whole lens; the view a wedge as wide as it takes in.
  const cam = (q) => {
    const p = poseAt(poses, q, (ps) => (ps.r ? 3.2 * ps.r : 3 * ps.frame));
    const tx = X(p.t[2]), ty = Y(p.t[0]), a = p.az * Math.PI / 180;
    const D = 46 + Math.min(1, Math.max(0, (p.dist - 60) / 260)) * 30;
    const dx = -Math.cos(a), dy = Math.sin(a), cx = tx + dx * D, cy = ty + dy * D;
    const half = Math.min(34, (p.dist / 3) * s * 0.9), px = -dy * half, py = dx * half;
    return {
      x: r(cx), y: r(cy), deg: r(Math.atan2(-dy, -dx) * 180 / Math.PI), stop: p.stop,
      cone: `M${r(cx)} ${r(cy)}L${r(tx + px)} ${r(ty + py)}L${r(tx - px)} ${r(ty - py)}Z`, tx: r(tx), ty: r(ty),
    };
  };
  return { body, axis: `M${r(X(14))} ${MAP.y0}H${r(X(-L - 14))}`, spots, cam };
}
