// Tier 2: Canvas 2D. Same story state, same camera maths as the WebGL tier
// (stage3d.js), drawn as solid, lit parts: every barrel section is a closed
// lathe profile (tier2-model.js) swept into quads, back faces culled, the
// rest depth-sorted and shaded per vertex by a key light, the studio
// reflection and a rim (tier2-shade.js). The glass is tinted coated discs,
// the iris eleven steel blades. It traces the same move: the iris opens
// blade by blade, the camera dives through the barrel, turns at the back,
// the focus scale rolls, and the lens comes apart and goes back together.
import { IRIS_Z, SPREAD } from './lens.js';
import { DISTANCES, throwPos, THROW_DEG } from './textures.js';
import { TEAR_PARTS, TEAR_ANCHORS, tearProgress, tearOffset, bladeOffset } from './teardown.js';
import { PARTS, THROAT, GLASS, BLADE, EMPH, SECTION_MID, SEG } from './tier2-model.js';
import { createShading, MATS, COAT, css, cssa, len2, len3 } from './tier2-shade.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const NEAR = 1;        // mm: geometry nearer the camera than this is clipped
const GROW = 0.45;     // px: every facet is grown so neighbours overlap and no seam shows
const FINE = 300;      // px: a part whose radius on screen is larger gets twice the facets
// What an item draws.
const FACET = 0, POLY = 1, TEXT = 2, GLASSD = 3, IRIS = 4, LIGHT = 5, BLOOM = 6, SENSOR = 7, SIGN = 8;
// Distance scale (as textures.js lays it out): rows along the band, in z.
const SC_R = 40.42, SC_M = -29.65, SC_FT = -34.73;
const FEET = [[Infinity, '∞'], [30, '30'], [15, '15'], [10, '10'], [6, '6'], [4, '4'], [3, '3']];
// Ridges round the knurled grip and the aperture ring, and the shading
// across one ridge as [fraction, brightness] (the knurl's lit and shaded
// flanks are filled in per facet from the key light).
const KNURL_RIDGES = 132, AP_RIDGES = 36;
const AP_PATTERN = [[0, 0.5], [0.2, 0.5], [0.24, 1.3], [0.76, 1], [0.8, 0.5]];
// Sensor: its 46 x 34 mm frame, then the 36 x 24 mm chip.
const SENSOR_PTS = [[-23, -17, -0.3], [23, -17, -0.3], [23, 17, -0.3], [-23, 17, -0.3], [-18, -12, 0], [18, -12, 0], [18, 12, 0], [-18, 12, 0]];

export function mount2D(container, { font }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();
  const sh = createShading();
  const signature = signaturePaths();
  const FONT_M = `500 31px ${font}`, FONT_U = `500 21px ${font}`, FONT_FL = `500 16px ${font}`;

  // ------------------------------------------------------------ geometry
  // Each part gets ring buffers (world, view and screen position of every
  // profile point at every angle) at two levels of detail.
  const parts = PARTS.map(prep);
  const throat = prep(THROAT);
  function prep(src) {
    const P = { ...src, segs: src.seg.map((c) => ({ m: MATS[c[0]], code: c[0], flag: c[1] || '' })) };
    let z0 = Infinity, z1 = -Infinity, r1 = 0;
    for (const [r, z] of P.pts) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); r1 = Math.max(r1, r); }
    P.bz = (z0 + z1) / 2; P.br = len2(r1, (z1 - z0) / 2) * 1.3; P.rmax = r1;
    P.lv = [level(P, 1), level(P, 2)];
    return P;
  }
  function level(P, k) {
    const n = P.n * k, full = P.span >= 360, cnt = full ? n : n + 1;
    const step = P.span / n, np = P.pts.length;
    const L = {
      n, cnt, full, cos: new Float64Array(cnt), sin: new Float64Array(cnt), ccos: new Float64Array(n), csin: new Float64Array(n),
      W: new Float64Array(np * cnt * 3), V: new Float64Array(np * cnt * 3), X: new Float32Array(np * cnt * 2), ok: new Uint8Array(np * cnt),
      ridges: (P.segs.some((s) => s.code === 'R') ? AP_RIDGES : KNURL_RIDGES) / n,
    };
    for (let i = 0; i < cnt; i++) { const a = (P.a0 + i * step) * DEG; L.cos[i] = Math.cos(a); L.sin[i] = Math.sin(a); }
    for (let i = 0; i < n; i++) { const a = (P.a0 + (i + 0.5) * step) * DEG; L.ccos[i] = Math.cos(a); L.csin[i] = Math.sin(a); }
    if (P.id === 'scale') {
      // A tick every 4 degrees, on the facet that holds it (2 degrees clear
      // of its edges). Throw position k/40 sits at -4k degrees: k <= 40 is
      // the throw arc, every fifth longer; the rest of the ring fine ticks.
      L.ticks = Array.from({ length: n }, () => []);
      for (let m = 0; m < 90; m++) {
        const a = m * 4, i = Math.floor((((a - P.a0) % 360) + 360) % 360 / step);
        const kq = (90 - m) % 90;
        L.ticks[i].push({ c: Math.cos(a * DEG), s: Math.sin(a * DEG), kind: kq <= 40 ? (kq % 5 === 0 ? 2 : 1) : 0 });
      }
    }
    return L;
  }
  const circle = (n) => {
    const o = { n, c: new Float64Array(n), s: new Float64Array(n), cc: new Float64Array(n), cs: new Float64Array(n) };
    for (let i = 0; i < n; i++) {
      o.c[i] = Math.cos((i / n) * TAU); o.s[i] = Math.sin((i / n) * TAU);
      o.cc[i] = Math.cos(((i + 0.5) / n) * TAU); o.cs[i] = Math.sin(((i + 0.5) / n) * TAU);
    }
    return o;
  };
  const CIRC = [circle(SEG), circle(SEG * 2)];

  // ------------------------------------------------------------ camera
  // An orbit around a target, blended (S.inside) into a camera on the
  // optical axis, exactly as stage3d.js.
  const cam = { pos: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1], tan: 0.2, sx: 0, sy: 0, tgt: [0, 0, 0] };
  function setCamera(S) {
    const tan = Math.tan((S.fov * DEG) / 2), fit = Math.min(tan, tan * (W / H));
    const dist = S.frame / fit;
    const op = [S.tx + dist * Math.sin(S.az * DEG) * Math.cos(S.el * DEG), S.ty + dist * Math.sin(S.el * DEG), S.tz + dist * Math.cos(S.az * DEG) * Math.cos(S.el * DEG)];
    const ot = [S.tx, S.ty, S.tz];
    const ap = [0, 0, S.cz], at = [Math.sin(S.yaw * DEG) * -60, 0, S.cz - Math.cos(S.yaw * DEG) * 60];
    const k = S.inside;
    const pos = op.map((v, i) => v + (ap[i] - v) * k), tgt = ot.map((v, i) => v + (at[i] - v) * k);
    const f = norm(sub(tgt, pos));
    let up = [Math.sin(S.roll * DEG), Math.cos(S.roll * DEG), 0];
    // Orbit roll (teardown on phones), as on the WebGL tier.
    if (S.oroll) up = rotAbout(up, f, -S.oroll * DEG);
    const r = norm(cross(f, up)), u = cross(r, f);
    Object.assign(cam, { pos, f, r, u, tan, sx: S.sx, sy: S.sy, tgt });
  }
  // World point -> [x, y, view depth, px per mm], or null behind the camera.
  function proj(p) {
    const d = sub(p, cam.pos), z = dot(d, cam.f);
    if (z < 2) return null;
    const k = (H / 2) / (z * cam.tan);
    return [W / 2 + dot(d, cam.r) * k + cam.sx * W, H / 2 - dot(d, cam.u) * k - cam.sy * H, z, k];
  }

  // Lens space -> world: model scale, pose (S.rx, S.ry) and pointer tilt,
  // the same chain as the WebGL tier's root and lens groups. NM transforms
  // normals (inverse scale).
  const M = new Float64Array(9), NM = new Float64Array(9);
  function setPose(S, pointer, fr, lz) {
    const tl = (1 - S.inside) * (pointer.tilt ?? 1);   // fades out in a teardown close-up
    const tiltX = pointer.y * 0.12 * tl, tiltY = (pointer.x * 0.18 + pointer.spin) * tl;
    const R = mul3(mul3(rotX(tiltX), rotY(tiltY)), mul3(rotX(S.rx), rotY(S.ry)));
    for (let r = 0; r < 3; r++) {
      M[r * 3] = R[r * 3] * fr; M[r * 3 + 1] = R[r * 3 + 1] * fr; M[r * 3 + 2] = R[r * 3 + 2] * lz;
      NM[r * 3] = R[r * 3] / fr; NM[r * 3 + 1] = R[r * 3 + 1] / fr; NM[r * 3 + 2] = R[r * 3 + 2] / lz;
    }
  }
  const xf = (p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];

  // The current part's transform: local point q -> world A q + T, the part
  // turned by `a` about the axis and moved by (ox, oy, oz) in lens space.
  const A = new Float64Array(9), NA = new Float64Array(9), T3 = new Float64Array(3);
  function setPart(a, ox, oy, oz) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let r = 0; r < 3; r++) {
      const m0 = M[r * 3], m1 = M[r * 3 + 1], n0 = NM[r * 3], n1 = NM[r * 3 + 1];
      A[r * 3] = m0 * c + m1 * s; A[r * 3 + 1] = m1 * c - m0 * s; A[r * 3 + 2] = M[r * 3 + 2];
      NA[r * 3] = n0 * c + n1 * s; NA[r * 3 + 1] = n1 * c - n0 * s; NA[r * 3 + 2] = NM[r * 3 + 2];
      T3[r] = M[r * 3] * ox + M[r * 3 + 1] * oy + M[r * 3 + 2] * oz;
    }
  }
  // Per-frame camera constants for the hot loops.
  let cpx = 0, cpy = 0, cpz = 0, rx = 1, ry = 0, rz = 0, ux = 0, uy = 1, uz = 0, fx = 0, fy = 0, fz = -1, kk = 1, ox0 = 0, oy0 = 0;
  // Local point -> world (WP) and screen (SP[o], SP[o + 1]); returns the
  // view depth (below NEAR the screen position is not set).
  const SP = new Float64Array(8), WP = new Float64Array(3);
  function local(lx, ly, lz, o) {
    const wx = A[0] * lx + A[1] * ly + A[2] * lz + T3[0], wy = A[3] * lx + A[4] * ly + A[5] * lz + T3[1], wz = A[6] * lx + A[7] * ly + A[8] * lz + T3[2];
    WP[0] = wx; WP[1] = wy; WP[2] = wz;
    const dx = wx - cpx, dy = wy - cpy, dz = wz - cpz;
    const vz = dx * fx + dy * fy + dz * fz;
    if (vz < NEAR) return vz;
    const k = kk / vz;
    SP[o] = ox0 + (dx * rx + dy * ry + dz * rz) * k; SP[o + 1] = oy0 - (dx * ux + dy * uy + dz * uz) * k;
    return vz;
  }
  // Local normal -> unit world normal (NV), and how squarely it faces the
  // camera from the point local() last computed.
  const NV = new Float64Array(3);
  function facing(lx, ly, lz) {
    let nx = NA[0] * lx + NA[1] * ly + NA[2] * lz, ny = NA[3] * lx + NA[4] * ly + NA[5] * lz, nz = NA[6] * lx + NA[7] * ly + NA[8] * lz;
    const l = len3(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    NV[0] = nx; NV[1] = ny; NV[2] = nz;
    const vx = cpx - WP[0], vy = cpy - WP[1], vz = cpz - WP[2], d = len3(vx, vy, vz) || 1;
    return (nx * vx + ny * vy + nz * vz) / d;
  }
  const depthOf = (x, y, z) => (x - cpx) * fx + (y - cpy) * fy + (z - cpz) * fz;

  // ------------------------------------------------------------ items
  // Everything drawn is an item with a depth (its distance from the camera),
  // pooled across frames; items are sorted far to near and painted.
  const pool = [], order = [];
  let ni = 0, drawnN = 0;
  function take(kind, d, part) {
    let it = pool[ni];
    if (!it) {
      it = pool[ni] = {
        kind: 0, d: 0, part: '', n: 0, x: new Float32Array(8), y: new Float32Array(8), mode: 0, c0: '', c1: '', cm: '',
        gx0: 0, gy0: 0, gx1: 0, gy1: 0, r: 0, g: 0, b: 0, s: 0, a: 1, tn: 0, tk: new Float32Array(8), ta: new Float32Array(2),
        tw: new Float32Array(2), tc: '', lip: 0, lx0: 0, ly0: 0, lx1: 0, ly1: 0, lw: 1, lc: '',
        m: new Float64Array(6), m2: new Float64Array(6), txt: '', font: '', ref: null, k: 0, bh: 0,
      };
    }
    ni++;
    it.kind = kind; it.d = d; it.part = part || ''; it.a = 1; it.tn = 0; it.lip = 0; it.mode = 0; it.ref = null; it.bh = 0;
    return it;
  }
  // Polygon (PX, PY) into the item, grown by GROW px about its centre.
  const PX = new Float64Array(8), PY = new Float64Array(8);
  function setPoly(it, n) {
    let cx = 0, cy = 0;
    for (let k = 0; k < n; k++) { cx += PX[k]; cy += PY[k]; }
    cx /= n; cy /= n;
    for (let k = 0; k < n; k++) {
      const dx = PX[k] - cx, dy = PY[k] - cy, l = len2(dx, dy) || 1;
      it.x[k] = PX[k] + (dx / l) * GROW; it.y[k] = PY[k] + (dy / l) * GROW;
    }
    it.n = n;
  }
  function offscreen(n) {
    let a = true, b = true, c = true, d = true;
    for (let k = 0; k < n; k++) {
      if (PX[k] > -2) a = false;
      if (PX[k] < W + 2) b = false;
      if (PY[k] > -2) c = false;
      if (PY[k] < H + 2) d = false;
    }
    return a || b || c || d;
  }
  // Clip a view-space polygon (CX, CY, CZ) against the near plane and
  // project it into PX, PY. Returns the vertex count (0 if all clipped).
  const CX = new Float64Array(8), CY = new Float64Array(8), CZ = new Float64Array(8);
  function clipNear(n) {
    let m = 0;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n, za = CZ[k], zb = CZ[j];
      if (za >= NEAR) { const q = kk / za; PX[m] = ox0 + CX[k] * q; PY[m] = oy0 - CY[k] * q; m++; }
      if ((za >= NEAR) !== (zb >= NEAR)) {
        const t = (NEAR - za) / (zb - za), x = CX[k] + (CX[j] - CX[k]) * t, y = CY[k] + (CY[j] - CY[k]) * t;
        const q = kk / NEAR; PX[m] = ox0 + x * q; PY[m] = oy0 - y * q; m++;
      }
    }
    return m >= 3 ? m : 0;
  }

  // ------------------------------------------------------------ parts
  const COL = new Float64Array(96 * 3), STAMP = new Int32Array(96);
  let stampId = 1;
  const TMP = new Float64Array(3);
  // Colour of a band (rings b0 -> b1, profile normal (nr, nz)) at vertex i,
  // computed once per band and vertex.
  function vcol(L, i, b0, b1, nr, nz, m, part) {
    if (STAMP[i] === stampId) return;
    STAMP[i] = stampId;
    const lx = nr * L.cos[i], ly = nr * L.sin[i];
    const nx = NA[0] * lx + NA[1] * ly + NA[2] * nz, ny = NA[3] * lx + NA[4] * ly + NA[5] * nz, nzw = NA[6] * lx + NA[7] * ly + NA[8] * nz;
    const l = len3(nx, ny, nzw) || 1, Wb = L.W;
    const qa = (b0 + i) * 3, qb = (b1 + i) * 3;
    sh.shade(COL, i * 3, m, nx / l, ny / l, nzw / l, (Wb[qa] + Wb[qb]) * 0.5, (Wb[qa + 1] + Wb[qb + 1]) * 0.5, (Wb[qa + 2] + Wb[qb + 2]) * 0.5, part);
  }

  // Sweep a part's profile into lit quads. showC / showS: draw the faces
  // flagged c / s (tier2-model.js). alpha < 1 for the fading throat.
  // Returns false when the part is entirely off screen.
  function emitPart(P, a, ox, oy, oz, showC, showS, part, alpha) {
    setPart(a, ox, oy, oz);
    const cvz = local(0, 0, P.bz, 0);
    if (cvz < -P.br) return false;
    let L = P.lv[0];
    if (cvz - P.br > NEAR) {
      const rp = (P.br * kk) / (cvz - P.br);
      if (SP[0] + rp < 0 || SP[0] - rp > W || SP[1] + rp < 0 || SP[1] - rp > H) return false;
      // Large on screen: twice the facets, so its silhouette stays round.
      if ((P.rmax * kk) / cvz > FINE) L = P.lv[1];
    }
    const cnt = L.cnt, n = L.n, np = P.pts.length, Wb = L.W, Vb = L.V, Xb = L.X, OK = L.ok;
    for (let j = 0, q = 0; j < np; j++) {
      const r = P.pts[j][0], z = P.pts[j][1];
      for (let i = 0; i < cnt; i++, q++) {
        const lx = r * L.cos[i], ly = r * L.sin[i];
        const wx = A[0] * lx + A[1] * ly + A[2] * z + T3[0], wy = A[3] * lx + A[4] * ly + A[5] * z + T3[1], wz = A[6] * lx + A[7] * ly + A[8] * z + T3[2];
        Wb[q * 3] = wx; Wb[q * 3 + 1] = wy; Wb[q * 3 + 2] = wz;
        const dx = wx - cpx, dy = wy - cpy, dz = wz - cpz;
        const vx = dx * rx + dy * ry + dz * rz, vy = dx * ux + dy * uy + dz * uz, vz = dx * fx + dy * fy + dz * fz;
        Vb[q * 3] = vx; Vb[q * 3 + 1] = vy; Vb[q * 3 + 2] = vz;
        if (vz >= NEAR) { const k = kk / vz; Xb[q * 2] = ox0 + vx * k; Xb[q * 2 + 1] = oy0 - vy * k; OK[q] = 1; } else OK[q] = 0;
      }
    }
    const key = sh.key;
    for (let s = 0; s < np - 1; s++) {
      const sg = P.segs[s];
      if (sg.flag === 'c' && !showC) continue;
      if (sg.flag === 's' && !showS) continue;
      const dr = P.pts[s + 1][0] - P.pts[s][0], dzz = P.pts[s + 1][1] - P.pts[s][1], len = len2(dr, dzz) || 1;
      const nr = dzz / len, nz = -dr / len;
      const b0 = s * cnt, b1 = (s + 1) * cnt;
      const m = sg.m, code = sg.code;
      // Bore walls, the camera throat and section ends behind the iris: seen
      // only through the aperture.
      const bore = maskAll || code === 'F' || code === 'H' || sg.flag === 's';
      const bh = bore && maskZ !== null && (P.pts[s][1] + P.pts[s + 1][1]) / 2 + oz < maskZ ? 1 : 0;
      stampId++;
      for (let i = 0; i < n; i++) {
        const i1 = L.full && i === n - 1 ? 0 : i + 1;
        const q00 = b0 + i, q01 = b0 + i1, q11 = b1 + i1, q10 = b1 + i;
        // Facet centre, its normal, and whether it faces the camera.
        const pcx = (Wb[q00 * 3] + Wb[q01 * 3] + Wb[q11 * 3] + Wb[q10 * 3]) * 0.25;
        const pcy = (Wb[q00 * 3 + 1] + Wb[q01 * 3 + 1] + Wb[q11 * 3 + 1] + Wb[q10 * 3 + 1]) * 0.25;
        const pcz = (Wb[q00 * 3 + 2] + Wb[q01 * 3 + 2] + Wb[q11 * 3 + 2] + Wb[q10 * 3 + 2]) * 0.25;
        const lx = nr * L.ccos[i], ly = nr * L.csin[i];
        const nx = NA[0] * lx + NA[1] * ly + NA[2] * nz, ny = NA[3] * lx + NA[4] * ly + NA[5] * nz, nzw = NA[6] * lx + NA[7] * ly + NA[8] * nz;
        const vx = cpx - pcx, vy = cpy - pcy, vz = cpz - pcz;
        const dist = len3(vx, vy, vz) || 1, nl = len3(nx, ny, nzw) || 1;
        const ndv = (nx * vx + ny * vy + nzw * vz) / (dist * nl);
        if (ndv <= 0.002) continue;
        let pn = 4, clipped = false;
        if (OK[q00] & OK[q01] & OK[q11] & OK[q10]) {
          PX[0] = Xb[q00 * 2]; PY[0] = Xb[q00 * 2 + 1]; PX[1] = Xb[q01 * 2]; PY[1] = Xb[q01 * 2 + 1];
          PX[2] = Xb[q11 * 2]; PY[2] = Xb[q11 * 2 + 1]; PX[3] = Xb[q10 * 2]; PY[3] = Xb[q10 * 2 + 1];
        } else {
          CX[0] = Vb[q00 * 3]; CY[0] = Vb[q00 * 3 + 1]; CZ[0] = Vb[q00 * 3 + 2];
          CX[1] = Vb[q01 * 3]; CY[1] = Vb[q01 * 3 + 1]; CZ[1] = Vb[q01 * 3 + 2];
          CX[2] = Vb[q11 * 3]; CY[2] = Vb[q11 * 3 + 1]; CZ[2] = Vb[q11 * 3 + 2];
          CX[3] = Vb[q10 * 3]; CY[3] = Vb[q10 * 3 + 1]; CZ[3] = Vb[q10 * 3 + 2];
          pn = clipNear(4); clipped = true;
          if (!pn) continue;
        }
        if (offscreen(pn)) continue;
        vcol(L, i, b0, b1, nr, nz, m, part); vcol(L, i1, b0, b1, nr, nz, m, part);
        const it = take(FACET, dist, part);
        it.a = alpha; it.bh = bh;
        const ca = i * 3, cb = i1 * 3;
        const r = (COL[ca] + COL[cb]) * 0.5, g = (COL[ca + 1] + COL[cb + 1]) * 0.5, b = (COL[ca + 2] + COL[cb + 2]) * 0.5;
        if (!clipped) {
          it.gx0 = (PX[0] + PX[3]) * 0.5; it.gy0 = (PY[0] + PY[3]) * 0.5; it.gx1 = (PX[1] + PX[2]) * 0.5; it.gy1 = (PY[1] + PY[2]) * 0.5;
          if (code === 'F') {
            // A baffle: a lighter lip along the facet's front edge.
            const ex = PX[1] - PX[0], ey = PY[1] - PY[0];
            if (ex * ex + ey * ey > 12) {
              it.lip = 1; it.lx0 = PX[0]; it.ly0 = PY[0]; it.lx1 = PX[1]; it.ly1 = PY[1];
              it.lc = css(r * 2 + 0.025, g * 2 + 0.025, b * 2 + 0.03);
              it.lw = Math.min(2.2, Math.max(0.7, (kk / Math.max(NEAR, Vb[q00 * 3 + 2])) * 0.35));
            }
          }
        }
        setPoly(it, pn);
        const diff = Math.max(Math.abs(COL[ca] - COL[cb]), Math.abs(COL[ca + 1] - COL[cb + 1]), Math.abs(COL[ca + 2] - COL[cb + 2]));
        if (window.__t2stat) { const st = window.__t2stat; st.dn = (st.dn || 0) + 1; if (diff > 0.012) st.dg = (st.dg || 0) + 1; st.dmax = Math.max(st.dmax || 0, diff); st.clip = (st.clip || 0) + (clipped ? 1 : 0); } // DEBUG
        if ((code === 'K' || code === 'R') && !clipped) {
          // Ridges, continuous across facets: m[0] is where this facet starts
          // in the ridge pattern. The knurl's flanks are lit by the key.
          it.mode = code === 'K' ? 2 : 3; it.r = r; it.g = g; it.b = b;
          it.m[0] = i * L.ridges; it.m[1] = L.ridges;
          if (code === 'K') {
            const tx = -L.csin[i], ty = L.ccos[i];
            it.s = Math.max(-1, Math.min(1, ((A[0] * tx + A[1] * ty) * key[0] + (A[3] * tx + A[4] * ty) * key[1] + (A[6] * tx + A[7] * ty) * key[2]) * 1.6));
          }
        } else if (diff > 0.012 && !clipped) {
          // Gouraud across the facet, with the centre shaded too so a
          // narrow highlight is not lost between two vertices.
          sh.shade(TMP, 0, m, nx / nl, ny / nl, nzw / nl, pcx, pcy, pcz, part);
          it.mode = 1; it.c0 = css(COL[ca], COL[ca + 1], COL[ca + 2]); it.c1 = css(COL[cb], COL[cb + 1], COL[cb + 2]); it.cm = css(TMP[0], TMP[1], TMP[2]);
        } else {
          it.c0 = css(r, g, b);
        }
        if (code === 'S') scaleTicks(L, it, i, ndv);
      }
    }
    // Ends of an arc (the plate, the lugs): the profile as a flat polygon.
    const endBh = maskAll && maskZ !== null && P.bz + oz < maskZ ? 1 : 0;
    if (!L.full) for (const end of [0, cnt - 1]) {
      const sgn = end === 0 ? -1 : 1;
      const tx = -L.sin[end] * sgn, ty = L.cos[end] * sgn;
      let pn = 0, ok = true, cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < np - 1; j++) {
        const q = j * cnt + end;
        if (!OK[q]) { ok = false; break; }
        PX[pn] = Xb[q * 2]; PY[pn] = Xb[q * 2 + 1]; pn++;
        cx += Wb[q * 3]; cy += Wb[q * 3 + 1]; cz += Wb[q * 3 + 2];
      }
      if (!ok || pn < 3 || offscreen(pn)) continue;
      cx /= pn; cy /= pn; cz /= pn;
      let nx = NA[0] * tx + NA[1] * ty, ny = NA[3] * tx + NA[4] * ty, nzw = NA[6] * tx + NA[7] * ty;
      const l = len3(nx, ny, nzw) || 1; nx /= l; ny /= l; nzw /= l;
      const vx = cpx - cx, vy = cpy - cy, vz = cpz - cz, dist = len3(vx, vy, vz) || 1;
      if ((nx * vx + ny * vy + nzw * vz) / dist <= 0.002) continue;
      sh.shade(TMP, 0, P.segs[0].code === 'T' ? MATS.T : MATS.B, nx, ny, nzw, cx, cy, cz, part);
      const it = take(FACET, dist, part);
      setPoly(it, pn);
      it.a = alpha; it.c0 = css(TMP[0], TMP[1], TMP[2]); it.bh = endBh;
    }
    return true;
  }

  // Distance-scale ticks on a facet of the band: fine all round, longer on
  // the 160-degree throw, longest every fifth. Drawn after the facet's fill,
  // so a neighbouring facet can never cut one.
  function scaleTicks(L, it, i, ndv) {
    const vis = smooth(0.06, 0.32, ndv);
    if (vis <= 0.01) return;
    let n = 0;
    for (const tk of L.ticks[i]) {
      const z1 = tk.kind === 2 ? -33.1 : tk.kind === 1 ? -32.5 : -32.25;
      const z0 = -31.63;
      const va = local(SC_R * tk.c, SC_R * tk.s, z0, 0), vb = local(SC_R * tk.c, SC_R * tk.s, z1, 2);
      if (va < NEAR || vb < NEAR) continue;
      it.tk[n * 4] = SP[0]; it.tk[n * 4 + 1] = SP[1]; it.tk[n * 4 + 2] = SP[2]; it.tk[n * 4 + 3] = SP[3];
      it.ta[n] = vis * (tk.kind === 0 ? 0.6 : 1);
      it.tw[n] = Math.min(2.4, Math.max(tk.kind === 0 ? 0.7 : 0.9, (kk / va) * (tk.kind === 0 ? 0.2 : 0.28)));
      n++;
    }
    if (!n) return;
    it.tn = n;
    TMP[0] = 0.95; TMP[1] = 0.94; TMP[2] = 0.91;
    const k = sh.emph(TMP, 0, 'scale');
    it.tc = css(TMP[0], TMP[1], TMP[2]);
    if (k < 1) { it.ta[0] *= k; it.ta[1] *= k; }
  }

  // Numerals on the scale band, upright to a viewer at the side (as the
  // texture in textures.js): metres white in front, feet amber behind.
  const WHITE = [0.95, 0.94, 0.91], AMBER = [0.94, 0.65, 0.29];
  function putNumeral(label, p, z, fontStr, colour) {
    const th = -p * THROW_DEG * DEG, c = Math.cos(th), s = Math.sin(th);
    if (local(SC_R * c, SC_R * s, z, 0) < NEAR) return;
    const nd = facing(c, s, 0);
    if (nd < 0.14) return;
    const d = len3(WP[0] - cpx, WP[1] - cpy, WP[2] - cpz) - 1.2;
    // Text right runs along -z, text down against the turn of the ring.
    if (local(SC_R * c, SC_R * s, z - 1, 2) < NEAR || local(SC_R * c + s, SC_R * s - c, z, 4) < NEAR) return;
    const it = take(TEXT, d, 'scale');
    it.m[0] = (SP[2] - SP[0]) / 10; it.m[1] = (SP[3] - SP[1]) / 10; it.m[2] = (SP[4] - SP[0]) / 10; it.m[3] = (SP[5] - SP[1]) / 10;
    it.m[4] = SP[0]; it.m[5] = SP[1];
    TMP[0] = colour[0]; TMP[1] = colour[1]; TMP[2] = colour[2];
    const k = sh.emph(TMP, 0, 'scale');
    it.c0 = css(TMP[0], TMP[1], TMP[2]); it.a = smooth(0.14, 0.42, nd) * Math.min(1, k); it.txt = label; it.font = fontStr;
  }
  function scaleText() {
    for (const d of DISTANCES) putNumeral(d.label, throwPos(d.m), SC_M, FONT_M, WHITE);
    putNumeral('m', 1.13, SC_M, FONT_U, WHITE);
    for (const [ft, label] of FEET) putNumeral(label, throwPos(ft === Infinity ? Infinity : ft * 0.3048), SC_FT, FONT_U, AMBER);
    putNumeral('ft', 1.13, SC_FT, FONT_FL, AMBER);
  }

  // The fixed index mark on the iris barrel, on the +X side: a line along
  // the axis and a small pointer toward the scale.
  function indexMark() {
    const poly = (pts) => {
      let n = 0, cx = 0, cy = 0, cz = 0;
      for (const p of pts) {
        if (local(p[0], p[1], p[2], 0) < NEAR) return;
        PX[n] = SP[0]; PY[n] = SP[1]; n++; cx += WP[0]; cy += WP[1]; cz += WP[2];
      }
      if (offscreen(n)) return;
      local(39.66, 0, pts[0][2], 0);
      const nd = facing(1, 0, 0);
      if (nd < 0.05) return;
      const it = take(POLY, len3(cx / n - cpx, cy / n - cpy, cz / n - cpz) - 0.8, 'barrel');
      setPoly(it, n);
      TMP[0] = 0.95; TMP[1] = 0.94; TMP[2] = 0.91;
      sh.emph(TMP, 0, 'barrel');
      it.c0 = css(TMP[0], TMP[1], TMP[2]); it.a = smooth(0.05, 0.25, nd);
    };
    poly([[39.66, -0.35, -43.2], [39.66, 0.35, -43.2], [39.66, 0.35, -39.7], [39.66, -0.35, -39.7]]);
    poly([[39.66, -0.9, -39.5], [39.66, 0.9, -39.5], [39.66, 0, -38.5]]);
  }

  // The maker's mark and signature on the plate, laid out as the rear
  // barrel texture (textures.js): label pixels (lx, ly) -> barrel angle and z.
  function signatureText() {
    const at = (lx, ly, o) => {
      const th = ((1312.8 - ly) * 0.087890625 - 90) * DEG;
      return local(38.97 * Math.cos(th), 38.97 * Math.sin(th), -58.8 - (lx + 10) / 16.84, o);
    };
    // Affine frame of the label near (cx, cy): label px -> screen.
    const frame = (cx, cy, m) => {
      if (at(cx, cy, 0) < NEAR || at(cx + 10, cy, 2) < NEAR || at(cx, cy + 10, 4) < NEAR) return false;
      m[0] = (SP[2] - SP[0]) / 10; m[1] = (SP[3] - SP[1]) / 10; m[2] = (SP[4] - SP[0]) / 10; m[3] = (SP[5] - SP[1]) / 10;
      m[4] = SP[0] - cx * m[0] - cy * m[2]; m[5] = SP[1] - cx * m[1] - cy * m[3];
      return true;
    };
    const th = ((1312.8 - 200) * 0.087890625 - 90) * DEG;
    if (at(150, 200, 0) < NEAR) return;
    const d = len3(WP[0] - cpx, WP[1] - cpy, WP[2] - cpz) - 1;
    const nd = facing(Math.cos(th), Math.sin(th), 0);
    if (nd < 0.12) return;
    const it = take(SIGN, d, 'signature');
    if (!frame(150, 100, it.m) || !frame(150, 320, it.m2)) { ni--; return; }
    TMP[0] = 0.95; TMP[1] = 0.94; TMP[2] = 0.91;
    const k = sh.emph(TMP, 0, 'signature');
    it.c0 = css(TMP[0], TMP[1], TMP[2]); it.a = smooth(0.12, 0.4, nd) * Math.min(1, k);
  }

  // ------------------------------------------------------------ glass
  const GB = GLASS.map(() => ({
    fx: new Float32Array(SEG * 2), fy: new Float32Array(SEG * 2), bx: new Float32Array(SEG * 2), by: new Float32Array(SEG * 2),
    edge: new Uint8Array(SEG * 2), n: SEG, en: 0, face: 0, m: new Float64Array(6), det: 0, edgeC: '', alpha: 1, glow: 1, hi: 0, big: false,
  }));
  function emitGlass(gi, ox, oy, oz, part) {
    const e = GLASS[gi], B = GB[gi];
    setPart(0, ox, oy, oz);
    // Which face is toward the camera; none while the camera is in the glass.
    local(0, 0, e.fz, 0);
    const front = facing(0, 0, 1) > 0;
    local(0, 0, e.bz, 0);
    const back = facing(0, 0, 1) < 0;
    if (!front && !back) return;
    const czf = front ? e.fz : e.bz;
    const cvz = local(0, 0, czf, 0);
    if (cvz < NEAR) return;
    const d = len3(WP[0] - cpx, WP[1] - cpy, WP[2] - cpz), sx0 = SP[0], sy0 = SP[1];
    const rpx = (e.r * kk) / cvz;
    const C = CIRC[rpx > FINE ? 1 : 0], n = C.n;
    // Far larger than the screen (the camera passing through it): a tint.
    B.big = rpx > 1.5 * Math.max(W, H);
    for (let i = 0; i < n; i++) {
      const lx = e.r * C.c[i], ly = e.r * C.s[i];
      if (local(lx, ly, e.fz, 0) < NEAR) return;
      B.fx[i] = SP[0]; B.fy[i] = SP[1];
      if (local(lx, ly, e.bz, 0) < NEAR) return;
      B.bx[i] = SP[0]; B.by[i] = SP[1];
    }
    B.n = n;
    // The face's affine frame: the unit disc -> its ellipse on screen.
    local(e.r, 0, czf, 2); local(0, e.r, czf, 4);
    B.m[0] = SP[2] - sx0; B.m[1] = SP[3] - sy0; B.m[2] = SP[4] - sx0; B.m[3] = SP[5] - sy0; B.m[4] = sx0; B.m[5] = sy0;
    B.det = B.m[0] * B.m[3] - B.m[1] * B.m[2];
    B.face = front ? 0 : 1;
    // Glass close to the camera fades rather than snapping off.
    B.alpha = smooth(6, 22, cvz);
    // The blackened edge: the facets of its outer wall facing the camera.
    let en = 0;
    const zm = (e.fz + e.bz) / 2;
    for (let i = 0; i < n; i++) {
      local(e.r * C.cc[i], e.r * C.cs[i], zm, 0);
      const vis = facing(C.cc[i], C.cs[i], 0) > 0.01;
      B.edge[i] = vis ? 1 : 0;
      if (vis) en++;
    }
    B.en = en;
    if (en) {
      // One colour for the edge, lit as its side toward the key is.
      const key = sh.key, ka = Math.atan2(key[1], key[0]);
      local(e.r * Math.cos(ka), e.r * Math.sin(ka), zm, 0);
      facing(Math.cos(ka), Math.sin(ka), 0);
      sh.shade(TMP, 0, MATS.G, NV[0], NV[1], NV[2], WP[0], WP[1], WP[2], part);
      B.edgeC = css(TMP[0], TMP[1], TMP[2]);
    }
    // Emphasis: dimmed glass loses its reflections; the glass being
    // explained gains a coat-coloured edge.
    TMP[0] = 1; TMP[1] = 1; TMP[2] = 1;
    B.glow = sh.emph(TMP, 0, part);
    B.hi = sh.hl && sh.hl === part ? 1 : 0;
    const it = take(GLASSD, d, part);
    it.ref = B; it.k = gi; it.bh = maskZ !== null && czf + oz < maskZ ? 1 : 0;
  }

  // ------------------------------------------------------------ iris
  const NB = BLADE.length;
  const IB = {
    po: new Float32Array(SEG * 4), pi: new Float32Array(SEG * 4), co: new Float32Array(SEG * 4), ci: new Float32Array(SEG * 4), n: SEG,
    bl: new Float32Array(11 * NB * 2), g: new Float32Array(11 * 4), sheen: new Float32Array(11),
    front: true, plateC: '', coverC: '', coverIn: '', lipC: '', lipW: 1, steel: new Float64Array(6), edgeC: '', hi: 0, m: new Float64Array(6), ok: false, open: false,
  };
  const tv = [0, 0, 0];
  function emitIris(S, offZ, bladePart, bladeE, ks, part) {
    // The housing leaves along the axis (as the WebGL tier's iris group).
    const hz = bladePart ? bladeOffset(bladePart, bladeE, 0, tv)[2] * ks : 0;
    setPart(0, 0, 0, offZ + hz);
    IB.ok = false;
    const cvz = local(0, 0, IRIS_Z, 0);
    if (cvz < NEAR) return;
    const ccx = WP[0], ccy = WP[1], ccz = WP[2], sx0 = SP[0], sy0 = SP[1];
    const nd = facing(0, 0, 1);
    IB.front = nd > 0;
    const C = CIRC[(37.2 * kk) / cvz > FINE ? 1 : 0], n = C.n;
    IB.n = n;
    const rings = [[IB.po, 37.2, IRIS_Z - 0.6], [IB.pi, 21.6, IRIS_Z - 0.6], [IB.co, 37.2, IRIS_Z + 0.9], [IB.ci, 21.8, IRIS_Z + 0.9]];
    for (const [buf, r, z] of rings) {
      for (let i = 0; i < n; i++) {
        if (local(r * C.c[i], r * C.s[i], z, 0) < NEAR) return;
        buf[i * 2] = SP[0]; buf[i * 2 + 1] = SP[1];
      }
    }
    // Affine frame of the housing (unit disc of 37.2 mm), for its shading.
    local(37.2, 0, IRIS_Z + 0.9, 2); local(0, 37.2, IRIS_Z + 0.9, 4);
    IB.m[0] = SP[2] - sx0; IB.m[1] = SP[3] - sy0; IB.m[2] = SP[4] - sx0; IB.m[3] = SP[5] - sy0; IB.m[4] = sx0; IB.m[5] = sy0;
    // Housing: flat black, lit as its face is; a bare lip round the aperture.
    local(0, 0, IRIS_Z, 0);
    const s = IB.front ? 1 : -1;
    facing(0, 0, s);
    sh.shade(TMP, 0, MATS.I, NV[0], NV[1], NV[2], WP[0], WP[1], WP[2], part);
    IB.plateC = css(TMP[0] * 0.75, TMP[1] * 0.75, TMP[2] * 0.75);
    IB.coverC = css(TMP[0] * 0.8, TMP[1] * 0.8, TMP[2] * 0.8);
    IB.coverIn = css(TMP[0] * 1.15, TMP[1] * 1.15, TMP[2] * 1.15);
    sh.shade(TMP, 0, MATS.B, NV[0], NV[1], NV[2], WP[0], WP[1], WP[2], part);
    IB.lipC = css(TMP[0], TMP[1], TMP[2]);
    IB.lipW = Math.min(3, Math.max(0.8, (kk / depthOf(ccx, ccy, ccz)) * 0.6));
    // Blades: each turns about its pivot (opening one at a time, as the
    // WebGL tier), and in the teardown fans out along its own angle.
    const key = sh.key, keyAz = Math.atan2(key[1], key[0]);
    for (let b = 0; b < 11; b++) {
      const phi = (b / 11) * TAU;
      const st = (b / 11) * 0.55, e = smooth(st, st + 0.45, S.iris);
      const turn = phi + 0.35 * bladeE + 0.7 * (1 - e);
      const c = Math.cos(turn), sn = Math.sin(turn);
      let bx = 0, by = 0;
      if (bladePart) { bladeOffset(bladePart, bladeE, phi, tv); bx = tv[0] * ks; by = tv[1] * ks; }
      const hx = 30 * Math.cos(phi) + bx, hy = 30 * Math.sin(phi) + by, z = IRIS_Z + b * 0.035;
      for (let k = 0; k < NB; k++) {
        const [px, py] = BLADE[k];
        if (local(hx + px * c - py * sn, hy + px * sn + py * c, z, 0) < NEAR) return;
        IB.bl[(b * NB + k) * 2] = SP[0]; IB.bl[(b * NB + k) * 2 + 1] = SP[1];
      }
      // Sheen runs along the blade from the pivot end to the tip; where it
      // peaks depends on how the blade lies to the key light.
      const o = b * NB * 2, h = NB >> 1;
      IB.g[b * 4] = (IB.bl[o] + IB.bl[o + (NB - 1) * 2]) / 2; IB.g[b * 4 + 1] = (IB.bl[o + 1] + IB.bl[o + (NB - 1) * 2 + 1]) / 2;
      IB.g[b * 4 + 2] = (IB.bl[o + (h - 1) * 2] + IB.bl[o + h * 2]) / 2; IB.g[b * 4 + 3] = (IB.bl[o + (h - 1) * 2 + 1] + IB.bl[o + h * 2 + 1]) / 2;
      IB.sheen[b] = 0.5 + 0.5 * Math.cos(turn + 0.7 - keyAz);
    }
    // Dark steel and its sheen, lifted by the key and the teardown light.
    const lift = key[3] * (0.8 + 0.4 * Math.max(0, nd * s));
    TMP[0] = 0.065; TMP[1] = 0.07; TMP[2] = 0.08;
    const k = sh.emph(TMP, 0, part);
    IB.steel[0] = TMP[0]; IB.steel[1] = TMP[1]; IB.steel[2] = TMP[2];
    IB.steel[3] = 0.36 * lift * k; IB.steel[4] = 0.38 * lift * k; IB.steel[5] = 0.43 * lift * k;
    IB.edgeC = cssa(0.72, 0.75, 0.82, 0.38 * k);
    IB.hi = sh.hl && sh.hl === part ? 1 : 0;
    IB.open = S.iris > 0.999 && bladeE < 0.001;
    const it = take(IRIS, len3(ccx - cpx, ccy - cpy, ccz - cpz), part);
    it.ref = IB; IB.ok = true;
  }

  // ------------------------------------------------------------ drawing
  // A ridge pattern ([fraction, brightness] over one ridge) laid along a
  // facet from u0 = m[0] for du = m[1] ridges, as gradient stops.
  function ridges(g, it, pat) {
    const u0 = it.m[0], du = it.m[1], r = it.r, gg = it.g, b = it.b;
    const at = (u) => {
      const f = u - Math.floor(u);
      for (let k = 0; k < pat.length; k++) {
        const f0 = pat[k][0], v0 = pat[k][1];
        const f1 = k + 1 < pat.length ? pat[k + 1][0] : 1 + pat[0][0], v1 = k + 1 < pat.length ? pat[k + 1][1] : pat[0][1];
        if (f >= f0 && f < f1) return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
      }
      return pat[0][1];
    };
    const stop = (t, v) => g.addColorStop(Math.min(1, Math.max(0, t)), css(r * v, gg * v, b * v));
    stop(0, at(u0));
    for (let kq = Math.floor(u0); kq < u0 + du; kq++) {
      for (const [f, v] of pat) { const u = kq + f; if (u > u0 && u < u0 + du) stop((u - u0) / du, v); }
    }
    stop(1, at(u0 + du - 1e-6));
  }
  const knurlPat = (s) => [[0, 0.35], [0.27, 0.95 + 0.5 * s], [0.5, 1.4], [0.75, 0.95 - 0.5 * s]];

  function drawFacet(it) {
    const x = it.x, y = it.y;
    ctx.beginPath(); ctx.moveTo(x[0], y[0]);
    for (let k = 1; k < it.n; k++) ctx.lineTo(x[k], y[k]);
    ctx.closePath();
    if (it.a < 1) ctx.globalAlpha = it.a;
    if (it.mode === 0) ctx.fillStyle = it.c0;
    else {
      const g = ctx.createLinearGradient(it.gx0, it.gy0, it.gx1, it.gy1);
      if (it.mode === 1) { g.addColorStop(0, it.c0); g.addColorStop(0.5, it.cm); g.addColorStop(1, it.c1); }
      else ridges(g, it, it.mode === 2 ? knurlPat(it.s) : AP_PATTERN);
      ctx.fillStyle = g;
    }
    ctx.fill();
    if (it.lip) {
      ctx.beginPath(); ctx.moveTo(it.lx0, it.ly0); ctx.lineTo(it.lx1, it.ly1);
      ctx.strokeStyle = it.lc; ctx.lineWidth = it.lw; ctx.stroke();
    }
    if (it.tn) {
      ctx.strokeStyle = it.tc;
      for (let k = 0; k < it.tn; k++) {
        ctx.globalAlpha = it.a * it.ta[k]; ctx.lineWidth = it.tw[k];
        ctx.beginPath(); ctx.moveTo(it.tk[k * 4], it.tk[k * 4 + 1]); ctx.lineTo(it.tk[k * 4 + 2], it.tk[k * 4 + 3]); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  const setM = (m) => ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
  const resetM = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function drawText(it) {
    setM(it.m);
    ctx.globalAlpha = it.a; ctx.fillStyle = it.c0; ctx.font = it.font;
    ctx.fillText(it.txt, 0, 0);
    ctx.globalAlpha = 1;
    resetM();
  }

  function drawSign(it) {
    const ls = 'letterSpacing' in ctx;
    ctx.globalAlpha = it.a; ctx.fillStyle = it.c0; ctx.strokeStyle = it.c0;
    setM(it.m);
    ctx.font = `600 58px ${font}`; if (ls) ctx.letterSpacing = '6px';
    ctx.fillText('KESSEL', 150, 60);
    ctx.font = `500 22px ${font}`; if (ls) ctx.letterSpacing = '3px';
    ctx.fillText('HAND ASSEMBLED', 150, 110); ctx.fillText('PUNE', 150, 138);
    if (ls) ctx.letterSpacing = '0px';
    setM(it.m2);
    ctx.lineCap = 'round';
    for (const [w, p] of signature) { ctx.lineWidth = w; ctx.stroke(p); }
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
    resetM();
  }

  function ringPath(xs, ys, n) {
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.closePath();
  }
  function ring2(buf, n) {
    ctx.moveTo(buf[0], buf[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(buf[i * 2], buf[i * 2 + 1]);
    ctx.closePath();
  }

  let ptr = { x: 0, y: 0, spin: 0 };
  function drawGlass(it) {
    const B = it.ref, c = GLASS[it.k].coat, a = B.alpha, n = B.n;
    if (a <= 0.01) return;
    const xs = B.face ? B.bx : B.fx, ys = B.face ? B.by : B.fy;
    ctx.globalAlpha = a;
    // Blackened edge.
    if (B.en) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (!B.edge[i]) continue;
        const j = i + 1 === n ? 0 : i + 1;
        ctx.moveTo(B.fx[i], B.fy[i]); ctx.lineTo(B.fx[j], B.fy[j]); ctx.lineTo(B.bx[j], B.by[j]); ctx.lineTo(B.bx[i], B.by[i]); ctx.closePath();
      }
      ctx.fillStyle = B.edgeC; ctx.fill();
    }
    ctx.beginPath(); ringPath(xs, ys, n);
    const k = B.glow, first = it.k === 0;
    if (B.big) {
      // The camera is about to pass through it: only its faint tint.
      ctx.fillStyle = cssa(c[0] * 0.16, c[1] * 0.2, c[2] * 0.24, first ? 0.24 : 0.09); ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (!first && Math.abs(B.det) > 4) {
      // Inner elements: body and coating in one fill, a faint glint.
      setM(B.m);
      let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, cssa(c[0] * 0.3, c[1] * 0.32, c[2] * 0.36, 0.1));
      g.addColorStop(0.7, cssa(c[0] * 0.55, c[1] * 0.55, c[2] * 0.6, 0.12 + 0.14 * k));
      g.addColorStop(0.9, cssa(c[0] * 0.18, c[1] * 0.18, c[2] * 0.22, 0.6));
      g.addColorStop(1, cssa(0.008, 0.01, 0.016, 0.85));
      ctx.fillStyle = g; ctx.fill();
      const hx = 0.4 + ptr.x * 0.3, hy = 0.44 - ptr.y * 0.3;
      g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.045);
      g.addColorStop(0, cssa(1, 1, 1, 0.3 * k)); g.addColorStop(1, cssa(1, 1, 1, 0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 0.045, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      resetM();
    } else if (Math.abs(B.det) > 4) {
      // Front element: deep glass and its thin-film coating, teal into
      // violet, in one fill; the coating's bright side drifts with the
      // pointer, the body darkens to the blackened rim. What lies behind
      // (the iris, the light through it) still shows.
      setM(B.m);
      const px = ptr.x, py = ptr.y;
      let g = ctx.createRadialGradient(-0.24 - px * 0.25, 0.2 + py * 0.25, 0, 0, 0, 1);
      g.addColorStop(0, cssa(0.04, 0.1, 0.13, 0.24));
      g.addColorStop(0.5, cssa(0.07 + 0.08 * k, 0.2 + 0.2 * k, 0.24 + 0.2 * k, 0.34));
      g.addColorStop(0.8, cssa(0.18 + 0.12 * k, 0.17 + 0.1 * k, 0.36 + 0.24 * k, 0.42));
      g.addColorStop(0.93, cssa(0.02, 0.02, 0.04, 0.74));
      g.addColorStop(1, cssa(0.008, 0.01, 0.016, 0.86));
      ctx.fillStyle = g; ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      // The long reflection of the strip light across the dome.
      const a0 = 2.35 + px * 0.2, a1 = 3.45 + px * 0.2;
      ctx.beginPath(); ctx.arc(0, 0, 0.84, a0, a1);
      ctx.lineWidth = 0.07; ctx.strokeStyle = cssa(0.55, 0.68, 0.88, 0.07 * k); ctx.stroke();
      ctx.lineWidth = 0.022; ctx.strokeStyle = cssa(0.8, 0.88, 1, 0.2 * k); ctx.stroke();
      // Specular highlight: the studio's pinpoint and a smaller glint,
      // sliding with the pointer.
      const hx = 0.4 + px * 0.3, hy = 0.44 - py * 0.3;
      g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.075);
      g.addColorStop(0, cssa(1, 1, 1, 0.95 * k)); g.addColorStop(0.18, cssa(1, 0.99, 0.97, 0.52 * k));
      g.addColorStop(0.5, cssa(1, 0.98, 0.95, 0.1 * k)); g.addColorStop(1, cssa(1, 1, 1, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 0.075, 0, TAU); ctx.fill();
      const gx = hx + 0.12, gy = hy - 0.1;
      g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 0.035);
      g.addColorStop(0, cssa(1, 1, 1, 0.7 * k)); g.addColorStop(0.3, cssa(1, 1, 1, 0.25 * k)); g.addColorStop(1, cssa(1, 1, 1, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 0.035, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      resetM();
    } else {
      ctx.fillStyle = 'rgba(8,12,18,0.4)'; ctx.fill();
    }
    // A thin bright edge where the polished face meets the rim.
    ctx.beginPath(); ringPath(xs, ys, n);
    if (B.hi) { ctx.strokeStyle = cssa(COAT[0], COAT[1], COAT[2], 0.95); ctx.lineWidth = 2; }
    else { ctx.strokeStyle = cssa(0.55 + c[0] * 0.4, 0.55 + c[1] * 0.4, 0.6 + c[2] * 0.4, (first ? 0.6 : 0.42) * k); ctx.lineWidth = first ? 1.4 : 1.1; }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawIris(it) {
    const B = it.ref, n = B.n;
    const plate = () => {
      ctx.beginPath(); ring2(B.po, n); ring2(B.pi, n); ctx.fillStyle = B.plateC; ctx.fill('evenodd');
      if (B.hi) { ctx.beginPath(); ring2(B.po, n); ctx.strokeStyle = cssa(COAT[0], COAT[1], COAT[2], 0.9); ctx.lineWidth = 1.6; ctx.stroke(); }
    };
    const cover = () => {
      // Brighter toward the aperture, where the lip catches the light.
      ctx.beginPath(); ring2(B.co, n); ring2(B.ci, n);
      if (Math.abs(B.m[0] * B.m[3] - B.m[1] * B.m[2]) > 4) {
        setM(B.m);
        const g = ctx.createRadialGradient(0, 0, 0.58, 0, 0, 1);
        g.addColorStop(0, B.coverIn); g.addColorStop(1, B.coverC);
        ctx.fillStyle = g;
      } else ctx.fillStyle = B.coverC;
      ctx.fill('evenodd');
      resetM();
      ctx.beginPath(); ring2(B.ci, n); ctx.strokeStyle = B.lipC; ctx.lineWidth = B.lipW; ctx.stroke();
      if (B.hi) { ctx.beginPath(); ring2(B.co, n); ctx.strokeStyle = cssa(COAT[0], COAT[1], COAT[2], 0.9); ctx.lineWidth = 1.6; ctx.stroke(); }
    };
    const blade = (b) => {
      const o = b * NB * 2;
      ctx.beginPath(); ctx.moveTo(B.bl[o], B.bl[o + 1]);
      for (let k = 1; k < NB; k++) ctx.lineTo(B.bl[o + k * 2], B.bl[o + k * 2 + 1]);
      ctx.closePath();
      const s = B.sheen[b], st = B.steel, sp = 0.2 + 0.6 * s, v = 0.5 + 0.5 * s;
      const g = ctx.createLinearGradient(B.g[b * 4], B.g[b * 4 + 1], B.g[b * 4 + 2], B.g[b * 4 + 3]);
      const dark = css(st[0], st[1], st[2]);
      const mid = css(st[0] + st[3] * 0.28, st[1] + st[4] * 0.28, st[2] + st[5] * 0.28);
      const hi = css(st[0] + st[3] * v, st[1] + st[4] * v, st[2] + st[5] * v);
      g.addColorStop(0, dark); g.addColorStop(Math.max(0.01, sp - 0.2), mid); g.addColorStop(sp, hi);
      g.addColorStop(Math.min(0.99, sp + 0.22), mid); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = B.hi ? cssa(COAT[0], COAT[1], COAT[2], 0.75) : B.edgeC; ctx.lineWidth = 0.8; ctx.stroke();
    };
    // The cover hides the plate from the front (and the plate the cover from
    // behind); blades fully open lie under them both.
    if (B.front) { if (!B.open) for (let b = 0; b < 11; b++) blade(b); cover(); }
    else { if (!B.open) for (let b = 10; b >= 0; b--) blade(b); plate(); }
  }

  function drawLight(it) {
    const a = it.a, x = it.gx0, y = it.gy0, rad = it.r;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,248,236,${a})`); g.addColorStop(0.45, `rgba(255,244,228,${0.85 * a})`); g.addColorStop(0.75, `rgba(255,236,214,${0.4 * a})`); g.addColorStop(1, 'rgba(255,236,214,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  function drawBloom(it) {
    const x = it.gx0, y = it.gy0;
    ctx.globalCompositeOperation = 'lighter';
    if (it.a > 0.01) {
      const a = it.a, rad = it.r;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,244,228,${a})`); g.addColorStop(0.35, `rgba(255,236,214,${a * 0.45})`); g.addColorStop(1, 'rgba(255,236,214,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    if (it.s > 0.01) {
      // The pinhole: a point of light while the iris is all but closed.
      const rad = it.k, a = it.s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,250,240,${a})`); g.addColorStop(0.25, `rgba(255,244,228,${a * 0.7})`); g.addColorStop(1, 'rgba(255,236,214,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawSensor(it) {
    const x = it.x, y = it.y;
    // The frame round the chip, then the chip with the image circle on it.
    ctx.beginPath(); ctx.moveTo(x[0], y[0]); ctx.lineTo(x[1], y[1]); ctx.lineTo(x[2], y[2]); ctx.lineTo(x[3], y[3]); ctx.closePath();
    ctx.fillStyle = '#121318'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x[4], y[4]); ctx.lineTo(x[5], y[5]); ctx.lineTo(x[6], y[6]); ctx.lineTo(x[7], y[7]); ctx.closePath();
    ctx.fillStyle = '#16131f'; ctx.fill();
    const cx = (x[4] + x[5] + x[6] + x[7]) / 4, cy = (y[4] + y[5] + y[6] + y[7]) / 4;
    const rad = len2(x[4] - cx, y[4] - cy), a = it.a;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, `rgba(255,238,214,${0.95 * a})`); g.addColorStop(0.5, `rgba(214,190,255,${0.45 * a})`); g.addColorStop(1, 'rgba(40,30,80,0)');
    ctx.save(); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); ctx.restore();
  }

  // ------------------------------------------------------------ picking
  function inPoly(xs, ys, n, x, y) {
    let c = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = xs[i], yi = ys[i], xj = xs[j], yj = ys[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // The same on an interleaved x, y buffer from offset o, n points.
  function inBuf(buf, o, n, x, y) {
    let c = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = buf[o + i * 2], yi = buf[o + i * 2 + 1], xj = buf[o + j * 2], yj = buf[o + j * 2 + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const QX = [0, 0, 0, 0], QY = [0, 0, 0, 0];
  function hit(it, x, y) {
    if (it.kind === FACET || it.kind === POLY) return inPoly(it.x, it.y, it.n, x, y);
    if (it.kind === GLASSD) {
      const B = it.ref, n = B.n;
      if (inPoly(B.face ? B.bx : B.fx, B.face ? B.by : B.fy, n, x, y)) return true;
      if (B.en) for (let i = 0; i < n; i++) {
        if (!B.edge[i]) continue;
        const j = i + 1 === n ? 0 : i + 1;
        QX[0] = B.fx[i]; QX[1] = B.fx[j]; QX[2] = B.bx[j]; QX[3] = B.bx[i];
        QY[0] = B.fy[i]; QY[1] = B.fy[j]; QY[2] = B.by[j]; QY[3] = B.by[i];
        if (inPoly(QX, QY, 4, x, y)) return true;
      }
      return false;
    }
    if (it.kind === IRIS) {
      const B = it.ref;
      if (inBuf(B.po, 0, B.n, x, y) && !inBuf(B.pi, 0, B.n, x, y)) return true;
      for (let b = 0; b < 11; b++) if (inBuf(B.bl, b * NB * 2, NB, x, y)) return true;
    }
    return false;
  }

  // ------------------------------------------------------------ render
  const anchorsLocal = { front: [0, 0, 0], ringEdge: [43, 0, 0], focusRing: [41.5, 0, -18], signature: [39, 0, -68], iris: [0, 0, IRIS_Z] };
  const SECTION_OF = { 'front-element': 0, 'glass-1': 1, 'glass-2': 2, 'glass-3': 3, 'glass-4': 4, blades: 2, 'focus-ring': 1, scale: 1, barrel: 3, mount: 4, signature: 3 };
  const TO = {};
  let maskZ = null, maskAll = false;
  const byDepth = (a, b) => b.d - a.d;

  function render(S, tSec, pointer) {
    const __t0 = performance.now(); // DEBUG
    ptr = pointer;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    setCamera(S);
    const i0 = Math.min(1, Math.floor(S.model)), mf = S.model - i0;
    const lz = [0.82, 1, 1.22][i0] + ([0.82, 1, 1.22][i0 + 1] - [0.82, 1, 1.22][i0]) * mf;
    const fr = [1.08, 1, 0.94][i0] + ([1.08, 1, 0.94][i0 + 1] - [1.08, 1, 0.94][i0]) * mf;
    setPose(S, pointer, fr, lz);
    // Is the camera inside the barrel (or the camera throat behind it)?
    const zf = -6.25 * S.spread, zb = (S.throat > 0.01 ? -144.5 : -98) - 115 * S.spread;
    const enclosed = S.inside * smooth(0, 14, zf - cam.pos[2]) * smooth(0, 14, cam.pos[2] - zb);
    sh.frame(S, pointer, cam.pos, enclosed);
    [cpx, cpy, cpz] = cam.pos; [rx, ry, rz] = cam.r; [ux, uy, uz] = cam.u; [fx, fy, fz] = cam.f;
    kk = (H / 2) / cam.tan; ox0 = W / 2 + cam.sx * W; oy0 = H / 2 - cam.sy * H;
    ni = 0;
    const off = (g) => SECTION_MID[g] * SPREAD * S.spread;

    // Teardown: the same part paths as the WebGL tier (teardown.js).
    const tear = S.tear || 0, ks = S.tspread || 1;
    let bladePart = null, bladeE = 0;
    for (const p of TEAR_PARTS) {
      const e = tearProgress(tear, p.order);
      const t = TO[p.id] || (TO[p.id] = { o: [0, 0, 0], spin: 0 });
      if (p.id === 'blades') {
        // The housing leaves along the axis; the blades fan out from it.
        bladeOffset(p, e, 0, tv);
        t.o[0] = 0; t.o[1] = 0; t.o[2] = tv[2] * ks; t.spin = 0;
        bladePart = p; bladeE = e;
      } else {
        tearOffset(p, e, tv);
        t.o[0] = tv[0] * ks; t.o[1] = tv[1] * ks; t.o[2] = tv[2] * ks; t.spin = (p.spin || 0) * TAU * e;
      }
    }
    for (const [id, a] of Object.entries(TEAR_ANCHORS)) {
      const o = TO[id] ? TO[id].o : [0, 0, 0];
      anchorsLocal['td-' + id] = [a[0] + o[0], a[1] + o[1], a[2] + o[2] + off(SECTION_OF[id])];
      // The bottom edge, for labels set below the line on wide screens.
      anchorsLocal['td-' + id + '-b'] = [a[0] + o[0], -a[1] + o[1], a[2] + o[2] + off(SECTION_OF[id])];
    }
    const showC = tear > 0.002, showS = showC || S.spread > 0.002;
    // With the lens assembled and the camera in front of the iris, all that
    // lies inside the bore behind it shows only through the aperture: those
    // items are drawn first, clipped to it (or not at all while it is shut).
    {
      const iw0 = xf([0, 0, IRIS_Z + off(2)]), ax = xf([0, 0, 1]);
      maskZ = !showC && dot(sub(cam.pos, iw0), ax) > 0 ? IRIS_Z + off(2) - 0.5 : null;
      // From the camera on the axis, everything behind the iris is.
      maskAll = S.inside > 0.5;
    }

    // Light far behind the lens: only ever seen through the glass, so only
    // near the axis and in front of the iris (as the WebGL tier).
    const izz = IRIS_Z + off(2);
    if (S.light > 0) {
      const lw = xf([0, 0, -700]), lc = proj(lw);
      if (lc) {
        const tc = norm(sub(cam.pos, lw));
        const onAxis = Math.min(1, Math.max(0, (tc[2] - 0.9985) / 0.001));
        const before = Math.min(1, Math.max(0, (cam.pos[2] - xf([0, 0, izz])[2]) / 12));
        const a = S.light * onAxis * before;
        if (a > 0.002) { const it = take(LIGHT, 1e9, ''); it.gx0 = lc[0]; it.gy0 = lc[1]; it.r = 80 * lc[3]; it.a = a; it.bh = maskZ !== null ? 1 : 0; }
      }
    }

    // Barrel, rings, mount: solid parts.
    for (const P of parts) {
      const t = TO[P.id];
      let a = t ? t.spin : 0;
      if (P.rot === 'focus') a += S.focus * THROW_DEG * DEG;
      else if (P.rot === 'ap') a -= S.iris * 0.9;
      const part = EMPH[P.id] || '';
      if (!emitPart(P, a, t ? t.o[0] : 0, t ? t.o[1] : 0, (t ? t.o[2] : 0) + off(P.g), showC, showS, part, 1)) continue;
      if (P.id === 'scale') scaleText();
      else if (P.id === 'signature') signatureText();
      else if (P.mark === 'index') indexMark();
    }
    // Glass, then the iris.
    GLASS.forEach((e, gi) => {
      const t = TO[e.part];
      emitGlass(gi, t ? t.o[0] : 0, t ? t.o[1] : 0, (t ? t.o[2] : 0) + off(e.g), EMPH[e.part]);
    });
    emitIris(S, off(2), bladePart, bladeE, ks, 'blades');

    // Bloom at the aperture when looking into the front, and the pinhole's
    // point of light while the iris is closed.
    const iw = xf([0, 0, izz]), ic = proj(iw);
    if (ic) {
      const fcg = Math.max(0, dot(norm(sub(cam.pos, iw)), [0, 0, 1])), f3 = Math.pow(fcg, 3);
      const open = 0.015 + 0.985 * S.iris * S.iris, far = Math.min(1, Math.max(0, (ic[2] - 20) / 120));
      const a = Math.min(0.6, open * 0.7) * f3 * S.light * far;
      const pin = (1 - smooth(0.05, 0.35, S.iris)) * f3 * S.light * far * (1 - S.inside);
      if (a > 0.01 || pin > 0.01) {
        const it = take(BLOOM, -1e9, '');
        it.gx0 = ic[0]; it.gy0 = ic[1]; it.r = (40 + open * 70) * ic[3] * 0.6; it.a = a;
        it.s = pin; it.k = Math.max(3, 2.2 * ic[3]);
      }
    }

    // The sensor at the far end, in its throat: small and distant first,
    // close only at the exit. The image circle lights the throat walls.
    const zs = -98 - 46.5 + off(4);
    if ((S.throat || 0) > 0.01) {
      const gw = xf([0, 0, zs + 8]);
      sh.setGlow(gw[0], gw[1], gw[2], 1.1 * S.sensor);
      emitPart(throat, 0, 0, 0, zs, true, true, '', S.throat);
      sh.setGlow(0, 0, 0, 0);
    }
    if (S.sensor > 0.01) {
      setPart(0, 0, 0, zs);
      let ok = true;
      for (let k = 0; k < 8; k++) {
        const p = SENSOR_PTS[k];
        if (local(p[0], p[1], p[2], 0) < NEAR) { ok = false; break; }
        PX[k] = SP[0]; PY[k] = SP[1];
      }
      local(0, 0, 0, 0);
      if (ok && facing(0, 0, 1) > 0) {
        const it = take(SENSOR, len3(WP[0] - cpx, WP[1] - cpy, WP[2] - cpz) + 0.5, '');
        for (let k = 0; k < 8; k++) { it.x[k] = PX[k]; it.y[k] = PY[k]; }
        it.a = S.sensor; it.bh = maskZ !== null ? 1 : 0;
      }
    }

    const __t1 = performance.now(); // DEBUG
    // Paint far to near.
    order.length = ni;
    for (let k = 0; k < ni; k++) order[k] = pool[k];
    order.sort(byDepth);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (maskZ !== null && IB.ok) {
      if (S.iris > 0.02) {
        ctx.save(); ctx.beginPath(); ring2(IB.ci, IB.n); ctx.clip();
        for (let k = 0; k < ni; k++) if (order[k].bh) paint(order[k]);
        ctx.restore();
      }
      for (let k = 0; k < ni; k++) if (!order[k].bh) paint(order[k]);
    } else for (let k = 0; k < ni; k++) paint(order[k]);
    drawnN = ni;
    if (window.__t2stat) { const st = window.__t2stat; st.n = (st.n || 0) + 1; st.items = (st.items || 0) + ni; st.js = (st.js || 0) + (__t1 - __t0); st.paint = (st.paint || 0) + (performance.now() - __t1); const kinds = st.kinds || (st.kinds = {}); for (let k = 0; k < ni; k++) { const it = order[k]; const key = it.kind + ':' + it.mode; kinds[key] = (kinds[key] || 0) + 1; } } // DEBUG
  }

  const __skip = (location.hash.match(/skip=([\d.]+)/) || [, ''])[1].split('.').filter(Boolean).map(Number); // DEBUG
  function paint(it) {
    if (__skip.includes(it.kind)) return; // DEBUG
    switch (it.kind) {
      case FACET: case POLY: drawFacet(it); break;
      case TEXT: drawText(it); break;
      case SIGN: drawSign(it); break;
      case GLASSD: drawGlass(it); break;
      case IRIS: drawIris(it); break;
      case LIGHT: drawLight(it); break;
      case BLOOM: drawBloom(it); break;
      case SENSOR: drawSensor(it); break;
    }
  }

  function project(name) {
    const a = anchorsLocal[name];
    if (!a && name !== '__target') return null;
    const s = name === '__target' ? proj(cam.tgt) : proj(xf(a));
    return s ? { x: s[0], y: s[1], visible: true } : null;
  }

  // The part under a point (CSS px, the space project() uses): the topmost
  // drawn item that belongs to a part, or null.
  function pick(x, y) {
    for (let k = drawnN - 1; k >= 0; k--) {
      const it = order[k];
      if (!it.part || it.kind === TEXT || it.kind === SIGN) continue;
      if (hit(it, x, y)) return it.part;
    }
    return null;
  }

  const __view = { // DEBUG
    canvas, kind: '2d', render, resize, project, pick,
    setDPR: (d) => { dpr = Math.min(d, 1.5); resize(); return dpr; }, getDPR: () => dpr,
    destroy: () => canvas.remove(),
  };
  window.__t2view = __view; // DEBUG
  return __view; // DEBUG
}

// The optician's signature as three stroke widths (the pen pressure of the
// texture's stroke in textures.js), in the label's pixel space.
function signaturePaths() {
  const buckets = [[2.3, new Path2D()], [3.3, new Path2D()], [4.3, new Path2D()]];
  let px = 30, py = 300;
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const nx = 30 + t * 240 + Math.sin(t * 29) * 12 + Math.sin(t * 7.3) * 7;
    const ny = 300 + Math.sin(t * 21 + 1.2) * 34 * (1 - t * 0.5) + Math.cos(t * 9.1) * 9 - t * 14;
    const w = 1.8 + 3 * Math.abs(Math.sin(t * 17));
    const p = buckets[w < 2.8 ? 0 : w < 3.8 ? 1 : 2][1];
    p.moveTo(px, py); p.lineTo(nx, ny);
    px = nx; py = ny;
  }
  const u = new Path2D();
  u.moveTo(24, 362); u.bezierCurveTo(100, 374, 190, 352, 276, 360);
  buckets.push([2.4, u]);
  return buckets;
}

// Rodrigues: rotate v about the unit axis k by angle a.
function rotAbout(v, k, a) {
  const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), d = dot(k, v);
  return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)];
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// Row-major 3x3 rotations; Rx * Ry is the WebGL tier's Euler XYZ order.
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
function mul3(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = len3(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
