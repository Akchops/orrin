// Procedural geometry for the watch. Every part is generated from numbers;
// nothing is loaded.
import {
  LatheGeometry, Vector2, Vector3, Shape, Path, ExtrudeGeometry, BufferGeometry,
  Float32BufferAttribute, CylinderGeometry,
} from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLATE } from './parts.js';

// Lathe around the watch's Z axis. three.js lathes around Y, so the profile is
// given as (radius, z) and the result is rotated a quarter turn about X.
export function latheZ(profile, segments = 96) {
  const pts = profile.map(([r, z]) => new Vector2(r, z));
  const g = new LatheGeometry(pts, segments);
  g.rotateX(Math.PI / 2);
  return g;
}

// Cylinder whose axis is Z, spanning z0..z1.
export function cylZ(r, z0, z1, seg = 48, open = false) {
  const g = new CylinderGeometry(r, r, z1 - z0, seg, 1, open);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

// Extrude a shape along +Z by depth, centred on z.
export function extrudeZ(shape, depth, z, bevel = 0, curveSegments = 24, bevelSegments = 2) {
  const g = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });
  g.translate(0, 0, z - depth / 2 + bevel);
  // ExtrudeGeometry is non-indexed, so its normals are per-face: on polished
  // metal every curve segment would show as a facet in the reflections.
  // Creased normals smooth across gentle angles and keep real edges sharp.
  const smoothG = toCreasedNormals(g, Math.PI / 5);
  g.dispose();
  return smoothG;
}

// Involute-ish gear outline. A smooth periodic radius function gives teeth
// with flat-topped tips and rounded roots; it is cheaper than true involutes
// and indistinguishable at this scale.
export function gearShape(r, teeth, { depth = null, spokes = 0, hub = 0.26, rim = 0.8, perTooth = 8 } = {}) {
  const td = depth ?? Math.min(0.42, (Math.PI * 2 * r) / teeth * 0.62);
  const shape = new Shape();
  const n = teeth * perTooth;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = ((i % perTooth) / perTooth);                 // 0..1 within a tooth
    // Tooth profile: tip for the middle 40% of the pitch, flanks either side,
    // root for the rest. smooth() keeps the corners round.
    const tooth = smooth(0.12, 0.32, f) * (1 - smooth(0.62, 0.82, f));
    const rr = r - td + td * tooth;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  if (spokes > 0) addSpokeHoles(shape, r - td, spokes, hub, rim);
  return shape;
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Cut-outs between spokes. Each hole is an annular sector with its corners
// rounded, so the spokes read as filed rather than stamped.
export function addSpokeHoles(shape, rRoot, spokes, hub = 0.26, rim = 0.8, spokeW = null) {
  const r1 = rRoot * rim, r0 = Math.max(rRoot * hub, 0.5);
  const sw = spokeW ?? Math.max(0.34, rRoot * 0.13);
  for (let k = 0; k < spokes; k++) {
    const a0 = (k / spokes) * Math.PI * 2;
    const a1 = ((k + 1) / spokes) * Math.PI * 2;
    // Angular inset so the spoke keeps a constant width sw at each radius.
    const in1 = sw / 2 / r1, in0 = sw / 2 / r0;
    const p = new Path();
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + in1 + (a1 - a0 - 2 * in1) * (i / steps);
      const x = Math.cos(a) * r1, y = Math.sin(a) * r1;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = a0 + in0 + (a1 - a0 - 2 * in0) * (i / steps);
      p.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
    }
    p.closePath();
    shape.holes.push(p);
  }
}

// Escape wheel with club teeth: each tooth leans forward and ends in a short
// flat impulse face, the shape of a Swiss lever escape wheel.
export function escapeShape(r, teeth = 15) {
  const shape = new Shape();
  const root = r * 0.7;
  const pitch = (Math.PI * 2) / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * pitch;
    const pts = [
      [root, a],
      [r * 0.94, a + pitch * 0.38],
      [r, a + pitch * 0.47],
      [r * 0.97, a + pitch * 0.6],
      [root * 1.06, a + pitch * 0.66],
      [root, a + pitch * 0.92],
    ];
    pts.forEach(([rr, aa], i) => {
      const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
      if (k === 0 && i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  addSpokeHoles(shape, root, 4, 0.3, 0.78, 0.3);
  return shape;
}

// Ratchet teeth: saw-tooth, steep on one side, for the winding wheels.
export function ratchetShape(r, teeth) {
  const shape = new Shape();
  const td = Math.min(0.32, (Math.PI * 2 * r) / teeth * 0.55);
  const n = teeth * 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = (i % 6) / 6;
    const rr = r - td + td * (f < 0.8 ? f / 0.8 : 1 - (f - 0.8) / 0.2);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  return shape;
}

// Knurled crown: a ring of fine rounded grooves.
export function knurlShape(r, grooves = 34, depth = 0.2) {
  const shape = new Shape();
  const n = grooves * 8;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Raised cosine bumps; squaring keeps the ridges broad and the grooves narrow.
    const c = 0.5 + 0.5 * Math.cos(a * grooves);
    const rr = r - depth * (1 - c * c);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  return shape;
}

export function roundedRect(w, h, rad) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + rad, y);
  s.lineTo(x + w - rad, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rad);
  s.lineTo(x + w, y + h - rad);
  s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  s.lineTo(x + rad, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rad);
  s.lineTo(x, y + rad);
  s.quadraticCurveTo(x, y, x + rad, y);
  return s;
}

export function circleShape(r, seg = 48) {
  const s = new Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
}

// --- Bridges: signed distance fields traced into outlines ------------------

function sdCircle(px, py, cx, cy, r) { return Math.hypot(px - cx, py - cy) - r; }
function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}
// Polynomial smooth minimum: blends shapes with a fillet of width k instead of
// a hard corner, which is what makes the bridges look hand-shaped.
function smin(a, b, k) {
  const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

export function bridgeShape(def) {
  const f = (x, y) => {
    let d = 1e9;
    for (const [cx, cy, r] of def.circles) d = smin(d, sdCircle(x, y, cx, cy, r), 1.6);
    for (const [ax, ay, bx, by, r] of def.capsules) d = smin(d, sdCapsule(x, y, ax, ay, bx, by, r), 1.6);
    // Keep the bridge 0.35 mm inside the plate edge.
    return Math.max(d, Math.hypot(x, y) - (PLATE.r - 0.35));
  };
  const [ox, oy] = def.o;
  const shape = new Shape();
  const N = 220;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    // March out from the origin until outside, then bisect the crossing.
    let lo = 0, hi = 0.25;
    while (f(ox + dx * hi, oy + dy * hi) < 0 && hi < 30) { lo = hi; hi += 0.25; }
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (f(ox + dx * mid, oy + dy * mid) < 0) lo = mid; else hi = mid;
    }
    const x = ox + dx * lo, y = oy + dy * lo;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  return shape;
}

// --- Hands -----------------------------------------------------------------

// Faceted dauphine hand: a long kite with a raised centre ridge, so each half
// is a separate polished facet that catches the light at a different angle.
export function dauphineGeometry(L, w, tail, h = 0.22, base = 0.06) {
  const P = {
    tip: [0, L, base + h * 0.25],
    r: [w / 2, 1.1, base],
    l: [-w / 2, 1.1, base],
    tr: [0.42, -tail, base],
    tl: [-0.42, -tail, base],
    ridge: [0, 1.1, base + h],
    rtail: [0, -tail, base + h * 0.7],
  };
  const tris = [
    // top facets
    ['tip', 'r', 'ridge'], ['tip', 'ridge', 'l'],
    ['r', 'tr', 'rtail'], ['r', 'rtail', 'ridge'],
    ['l', 'ridge', 'rtail'], ['l', 'rtail', 'tl'],
    ['tr', 'tl', 'rtail'],
  ];
  const pos = [];
  const push = (a, b, c) => { pos.push(...P[a], ...P[b], ...P[c]); };
  tris.forEach(([a, b, c]) => push(a, b, c));
  // Side walls down to z = 0, and the flat underside.
  const ring = ['tip', 'r', 'tr', 'tl', 'l'];
  for (let i = 0; i < ring.length; i++) {
    const a = P[ring[i]], b = P[ring[(i + 1) % ring.length]];
    const a0 = [a[0], a[1], 0], b0 = [b[0], b[1], 0];
    pos.push(...a, ...a0, ...b0, ...a, ...b0, ...b);
  }
  pos.push(...[0, L, 0], ...[-w / 2, 1.1, 0], ...[w / 2, 1.1, 0]);
  pos.push(...[w / 2, 1.1, 0], ...[-w / 2, 1.1, 0], ...[0.42, -tail, 0]);
  pos.push(...[0.42, -tail, 0], ...[-w / 2, 1.1, 0], ...[-0.42, -tail, 0]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Thin needle for the small seconds, with a round counterweight.
export function needleShape(L, w, tail) {
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w * 0.18, L);
  s.lineTo(w * 0.18, L);
  s.lineTo(w / 2, 0);
  s.lineTo(w * 0.36, -tail);
  s.lineTo(-w * 0.36, -tail);
  s.closePath();
  return s;
}

// --- Strap -----------------------------------------------------------------

// A strap is a rounded-rectangle section swept along a path in the YZ plane.
// Two paths share one topology: curled around an (invisible) wrist, and laid
// flat. The flat version is a morph target, so the strap can uncurl as it
// detaches and curl back as it returns.
export function strapGeometry({ length, w0 = 20, w1 = 16, t0 = 3.6, t1 = 2.8, dir = 1, y0, z0, outer = 0 }) {
  const NS = 96, NR = 28;
  const curl = strapPathCurled(dir, y0, z0, outer);
  const flat = (s) => ({ p: new Vector3(0, y0 + dir * s, z0 - s * 0.02), t: new Vector3(0, dir, -0.02).normalize() });
  const pos = [], posFlat = [], uv = [], idx = [];
  const tipLen = 9;
  for (let i = 0; i <= NS; i++) {
    const s = (i / NS) * length;
    // Width tapers along the strap, and the last tipLen mm closes into a
    // semicircle so the strap ends in a rounded tip.
    let w = w0 + (w1 - w0) * (s / length);
    let tk = t0 + (t1 - t0) * (s / length);
    const tipStart = length - tipLen;
    if (s > tipStart) {
      const q = (s - tipStart) / tipLen;
      const k = Math.sqrt(Math.max(0, 1 - q * q));
      w *= Math.max(0.02, k);
      tk *= 0.6 + 0.4 * k;
    }
    for (const [which, out] of [[curl(s), pos], [flat(s), posFlat]]) {
      const { p, t } = which;
      const B = new Vector3(1, 0, 0);                 // across the width
      const N = new Vector3().crossVectors(t, B).multiplyScalar(-dir).normalize(); // out of the top face
      for (let j = 0; j < NR; j++) {
        const [u, v] = sectionPoint(j / NR, w, tk);
        out.push(p.x + B.x * u + N.x * v, p.y + B.y * u + N.y * v, p.z + B.z * u + N.z * v);
      }
    }
    for (let j = 0; j < NR; j++) uv.push(s / length, j / NR);
  }
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NR; j++) {
      const a = i * NR + j, b = i * NR + ((j + 1) % NR), c = (i + 1) * NR + j, d = (i + 1) * NR + ((j + 1) % NR);
      if (dir > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const gf = new BufferGeometry();
  gf.setIndex(idx);
  gf.setAttribute('position', new Float32BufferAttribute(posFlat, 3));
  gf.computeVertexNormals();
  g.morphAttributes.position = [gf.getAttribute('position')];
  g.morphAttributes.normal = [gf.getAttribute('normal')];
  gf.dispose();
  return g;
}

// Point on the strap section, j in [0,1). Top face spans [0,0.4], the right
// wall [0.4,0.5], the underside [0.5,0.9], the left wall [0.9,1). The top is
// gently domed (padded), the underside flat.
function sectionPoint(j, w, t) {
  const hw = w / 2;
  if (j < 0.4) {
    const q = j / 0.4;
    const u = -hw + q * w;
    const dome = 1 - Math.pow(2 * q - 1, 2);
    return [u, t * 0.5 + t * 0.12 * dome];
  }
  if (j < 0.5) {
    const q = (j - 0.4) / 0.1;
    const a = q * Math.PI;
    return [hw + Math.sin(a) * t * 0.08, Math.cos(a) * t * 0.5];
  }
  if (j < 0.9) {
    const q = (j - 0.5) / 0.4;
    return [hw - q * w, -t * 0.5];
  }
  const q = (j - 0.9) / 0.1;
  const a = q * Math.PI;
  return [-hw - Math.sin(a) * t * 0.08, -Math.cos(a) * t * 0.5];
}

// Path around a wrist: out from the lugs, round a corner, down the side of the
// wrist, round again and back under it. dir is +1 for the 12 o'clock strap,
// -1 for 6 o'clock; `outer` pushes the longer strap outside the shorter one.
function strapPathCurled(dir, y0, z0, outer) {
  const R = 12.5 + outer, straight1 = 4, side = 13;
  const segs = [];
  let y = y0, z = z0, a = 0; // a: heading angle, 0 = along +Y*dir, PI/2 = -Z
  segs.push({ type: 'L', len: straight1 });
  segs.push({ type: 'A', len: (Math.PI / 2) * R, R });
  segs.push({ type: 'L', len: side });
  segs.push({ type: 'A', len: (Math.PI / 2) * R, R });
  segs.push({ type: 'L', len: 400 });
  return (s) => {
    let rem = s; y = y0; z = z0 + outer * 0.0; a = 0;
    for (const sg of segs) {
      const l = Math.min(rem, sg.len);
      if (sg.type === 'L') {
        y += Math.cos(a) * l * dir; z -= Math.sin(a) * l;
      } else {
        const a2 = a + l / sg.R;
        y += (Math.sin(a2) - Math.sin(a)) * sg.R * dir;
        z -= (Math.cos(a) - Math.cos(a2)) * sg.R;
        a = a2;
      }
      rem -= l;
      if (rem <= 0) break;
    }
    return { p: new Vector3(0, y, z), t: new Vector3(0, Math.cos(a) * dir, -Math.sin(a)).normalize() };
  };
}

// Archimedean spiral for the hairspring, as points in the XY plane.
export function hairspringPoints(r0 = 0.7, r1 = 3.0, turns = 11, n = 900) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    const a = q * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * q;
    pts.push(new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return pts;
}
