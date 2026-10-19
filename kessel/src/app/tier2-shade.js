// Light for the Canvas 2D tier: what the WebGL tier gets from its studio
// environment and lights, in a few lines per vertex (world space).
//   key   the pointer-following key light: half-Lambert diffuse plus a
//         Blinn highlight, stronger in the teardown light
//   env   the studio of env.js as a function of the reflected ray: a dim
//         floor-to-ceiling shell, the long strips and two soft boxes,
//         turned with the pointer as the WebGL environment is
//   lamp  the lamp that travels with the camera inside the barrel
//   glow  the image circle lighting its own throat at the exit
//   rim   a Fresnel rim on silhouettes, cool and strong in the teardown
//         light, so no dark part sinks into the page
// Colours are 0..1 floats; css() and cssa() turn them into cached strings.

// Vector lengths (Math.hypot is several times slower in the hot loops).
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export const len2 = (x, y) => Math.sqrt(x * x + y * y);

export const BG = [21 / 255, 23 / 255, 28 / 255];        // the page (#15171c)
export const COAT = [0xab / 255, 0x9b / 255, 0xff / 255]; // emphasis glow
const KEY = [1, 0.96, 0.91], RIM = [0.86, 0.9, 1];
const AMB = 0.3;

// d: diffuse albedo; env, t: reflection strength and tint; sp, sh: key
// highlight strength and sharpness; fl: a floor, so bare metal always reads
// as a bright edge.
const anod = { d: [0.13, 0.137, 0.155], env: 0.75, t: [1, 1, 1.05], sp: 0.8, sh: 36, fl: 0 };
export const MATS = {
  A: anod, K: anod, S: anod, R: anod,
  B: { d: [0.4, 0.42, 0.45], env: 1.2, t: [1, 1, 1], sp: 1, sh: 60, fl: 0.24 },
  F: { d: [0.085, 0.09, 0.1], env: 0.16, t: [1, 1, 1.05], sp: 0.16, sh: 14, fl: 0 },
  T: { d: [0.3, 0.31, 0.33], env: 1.35, t: [0.98, 1, 1.03], sp: 1.1, sh: 70, fl: 0.1 },
  P: { d: [0.07, 0.072, 0.08], env: 0.42, t: [1, 1, 1], sp: 0.5, sh: 24, fl: 0.012 },
  C: { d: [0.5, 0.45, 0.8], env: 0.25, t: [1, 1, 1], sp: 0.4, sh: 30, fl: 0.05 },
  H: { d: [0.14, 0.15, 0.17], env: 0.3, t: [1, 1, 1.05], sp: 0.2, sh: 20, fl: 0 },
  G: { d: [0.05, 0.055, 0.065], env: 0.3, t: [1, 1, 1], sp: 0.3, sh: 20, fl: 0 },
  // Steel blades and the black iris housing, lit flat.
  I: { d: [0.075, 0.08, 0.09], env: 0.25, t: [1, 1, 1.05], sp: 0.3, sh: 16, fl: 0 },
};
const BAND = [[0xab, 0x9b, 0xff], [0xf0, 0xa6, 0x4a], [0x62, 0xdc, 0xc0]].map((c) => c.map((v) => v / 255));

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Studio directions (world space, from env.js), unit vectors.
const nrm = (v) => { const l = len3(v[0], v[1], v[2]); return v.map((x) => x / l); };
const STRIP_R = nrm([16, 0, 8]), STRIP_L = nrm([-17, 0, 6]);
const TOP = nrm([0, 15, -6]), OVER = nrm([-4, 16, 10]), FRONT = nrm([0, 4, 26]), BACK = nrm([-4, 0, -26]);

export function createShading() {
  // Per-frame state.
  let kx = 0, ky = 0, kz = 1, ki = 1, rlx = 0, rly = 1, rlz = 0, ri = 0;
  let cx = 0, cy = 0, cz = 0, ec = 1, es = 0, lamp = 0, lit = 1;
  let gx = 0, gy = 0, gz = 0, gi = 0;
  let hl = '', dim = 0;

  // enclosed: 0..1, how far the camera is inside the barrel (or the camera
  // throat), where the key light and the studio do not reach.
  function frame(S, pointer, camPos, enclosed) {
    // Key: where the WebGL tier puts it, following the pointer.
    const k = nrm([40 + pointer.x * 90, 70 - pointer.y * 60, 120]);
    [kx, ky, kz] = k;
    const tl = S.tlight || 0;
    ki = 1 + 0.95 * tl;
    // Rim: from behind and above (the teardown light), a little always.
    const r = nrm([-140, 120, -160]);
    [rlx, rly, rlz] = r;
    ri = (0.16 + 1.15 * tl) * (1 - S.inside);
    [cx, cy, cz] = camPos;
    const ea = pointer.x * 0.7 + pointer.spin * 0.5;
    ec = Math.cos(ea); es = Math.sin(ea);
    lamp = 1.6 * S.inside;
    lit = 1 - 0.85 * enclosed;
    hl = S.hl || '';
    dim = hl ? Math.min(1, Math.max(0, S.dim || 0)) : 0;
    // The model's colour band.
    const i = Math.min(1, Math.floor(S.model)), f = S.model - i;
    for (let c = 0; c < 3; c++) MATS.C.d[c] = (BAND[i][c] + (BAND[i + 1][c] - BAND[i][c]) * f) * 0.62;
  }

  // The studio seen along the ray (x, y, z).
  function env(x, y, z) {
    // Turned with the pointer, as scene.environmentRotation is.
    const xr = x * ec - z * es, zr = x * es + z * ec;
    const h = y * 0.5 + 0.5;
    let e = 0.012 + 0.045 * ss(0.3, 0.75, h) + 0.06 * ss(0.75, 1, h);
    const hz = len2(xr, zr) + 1e-6, ax = xr / hz, az = zr / hz;
    const tall = 1 - ss(0.55, 0.9, Math.abs(y));
    let a = ax * STRIP_R[0] + az * STRIP_R[2];
    if (a > 0.9) { const t = (a - 0.9) / 0.1; e += 1.15 * t * t * tall; }
    a = ax * STRIP_L[0] + az * STRIP_L[2];
    if (a > 0.9) { const t = (a - 0.9) / 0.1; e += 0.38 * t * t * tall; }
    a = xr * TOP[0] + y * TOP[1] + zr * TOP[2];
    if (a > 0.86) { const t = (a - 0.86) / 0.14; e += 0.7 * t * t; }
    a = xr * OVER[0] + y * OVER[1] + zr * OVER[2];
    if (a > 0.8) { const t = (a - 0.8) / 0.2; e += 0.5 * t * t; }
    a = xr * FRONT[0] + y * FRONT[1] + zr * FRONT[2];
    if (a > 0.55) { const t = (a - 0.55) / 0.45; e += 0.13 * t * t; }
    a = xr * BACK[0] + y * BACK[1] + zr * BACK[2];
    if (a > 0.55) { const t = (a - 0.55) / 0.45; e += 0.1 * t * t; }
    return e;
  }

  // Colour of material m at world point p with unit normal n, into out[o..o+2].
  // Returns n . v (how squarely the surface faces the camera).
  function shade(out, o, m, nx, ny, nz, px, py, pz, part) {
    let vx = cx - px, vy = cy - py, vz = cz - pz;
    const dist = len3(vx, vy, vz) || 1;
    vx /= dist; vy /= dist; vz /= dist;
    const ndv = nx * vx + ny * vy + nz * vz, nv = ndv > 0 ? ndv : 0;
    const ndl = nx * kx + ny * ky + nz * kz;
    const w = 0.5 + 0.5 * ndl;
    const diff = ((ndl > 0 ? ndl : 0) * 0.6 + w * w * 0.4) * ki * lit;
    let hx = kx + vx, hy = ky + vy, hz = kz + vz;
    const hlen = len3(hx, hy, hz) || 1;
    const ndh = (nx * hx + ny * hy + nz * hz) / hlen;
    const spec = ndh > 0 ? m.sp * ki * lit * Math.pow(ndh, m.sh) : 0;
    const e = env(2 * nv * nx - vx, 2 * nv * ny - vy, 2 * nv * nz - vz) * m.env * (0.4 + 0.6 * lit);
    let li = 0;
    if (lamp > 0) li += lamp * nv / (1 + dist * dist * (1 / 2600));
    if (gi > 0) {
      let qx = gx - px, qy = gy - py, qz = gz - pz;
      const gd = len3(qx, qy, qz) || 1;
      const gn = (nx * qx + ny * qy + nz * qz) / gd;
      if (gn > 0) li += gi * gn / (1 + gd * gd * (1 / 900));
    }
    const f = 1 - nv, f3 = f * f * f;
    const rd = nx * rlx + ny * rly + nz * rlz;
    const rim = ri > 0 ? f3 * ri * (0.5 + 0.5 * (rd > 0 ? rd : 0)) : 0;
    const d = m.d, t = m.t;
    const amb = AMB * (0.5 + 0.5 * lit);
    let r = d[0] * (amb + diff * KEY[0] + li * 3.4) + e * t[0] + spec * KEY[0] + rim * RIM[0] + m.fl;
    let g = d[1] * (amb + diff * KEY[1] + li * 3.4) + e * t[1] + spec * KEY[1] + rim * RIM[1] + m.fl;
    let b = d[2] * (amb + diff * KEY[2] + li * 3.4) + e * t[2] + spec * KEY[2] + rim * RIM[2] + m.fl;
    if (hl) {
      if (part === hl) {
        // The part being explained: lifted, with a thin coat-coloured glow
        // where it turns away (its silhouette).
        const glow = 0.25 + 0.75 * f3;
        r = r * 1.18 + 0.014 + COAT[0] * glow * 0.5; g = g * 1.18 + 0.014 + COAT[1] * glow * 0.5; b = b * 1.18 + 0.02 + COAT[2] * glow * 0.5;
      } else if (dim > 0) {
        const k = dim * 0.82;
        r += (BG[0] - r) * k; g += (BG[1] - g) * k; b += (BG[2] - b) * k;
      }
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
    return ndv;
  }

  // Emphasis applied to an already computed colour (glass, blades, text).
  function emph(out, o, part) {
    if (!hl) return 1;
    if (part === hl) { out[o] = out[o] * 1.18 + 0.014; out[o + 1] = out[o + 1] * 1.18 + 0.014; out[o + 2] = out[o + 2] * 1.18 + 0.02; return 1.25; }
    const k = dim * 0.82;
    out[o] += (BG[0] - out[o]) * k; out[o + 1] += (BG[1] - out[o + 1]) * k; out[o + 2] += (BG[2] - out[o + 2]) * k;
    return 1 - k;
  }

  return {
    frame, shade, emph,
    setGlow(x, y, z, i) { gx = x; gy = y; gz = z; gi = i; },
    get key() { return [kx, ky, kz, ki]; },
    get hl() { return hl; }, get dim() { return dim; },
  };
}

// Cached colour strings: the same few hundred colours recur every frame.
const cache = new Map();
const q8 = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0);
export function css(r, g, b) {
  const key = (q8(r) << 16) | (q8(g) << 8) | q8(b);
  let s = cache.get(key);
  if (s === undefined) {
    if (cache.size > 12000) cache.clear();
    s = `rgb(${key >> 16},${(key >> 8) & 255},${key & 255})`;
    cache.set(key, s);
  }
  return s;
}
export function cssa(r, g, b, a) {
  const A = a <= 0 ? 0 : a >= 1 ? 100 : Math.round(a * 100);
  // Keys above 2^24 never collide with css()'s opaque colours.
  const key = ((q8(r) << 16) | (q8(g) << 8) | q8(b)) + (A + 1) * 16777216;
  let s = cache.get(key);
  if (s === undefined) {
    if (cache.size > 12000) cache.clear();
    s = `rgba(${q8(r)},${q8(g)},${q8(b)},${A / 100})`;
    cache.set(key, s);
  }
  return s;
}
