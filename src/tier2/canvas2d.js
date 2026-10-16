// Tier 2: Canvas 2D. Used when WebGL is unavailable, software-emulated, or
// cannot hold frame rate. It reads the same story state as the WebGL tier and
// traces the same behaviour: scroll takes the watch apart along the same
// paths, the camera orbits the same way, the pointer tilts it. What it loses
// is material (no image-based lighting), not the interaction.
import {
  CASE, SUBDIAL, WHEELS, PALLET, BRIDGES, JEWELS, SCREWS, PLATE, DIAL_FALL, HANDS_FLOAT,
  MODELS, mumbaiSeconds, sstep, staggered,
} from '../watch/parts.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

// --- tiny 3D helpers --------------------------------------------------------
// Euler XYZ as three.js applies it: rotate about Z, then Y, then X.
function rot(p, rx, ry, rz) {
  let [x, y, z] = p;
  let c = Math.cos(rz), s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function circlePts(r, n = 64, cx = 0, cy = 0) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
function gearPts(r, teeth, depth = 0.35) {
  const out = [], n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = (i % 4 === 1 || i % 4 === 2) ? r : r - depth;
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return out;
}
// Smooth-union outline of a bridge, matching the WebGL geometry closely.
function bridgePts(def) {
  const smin = (a, b, k) => { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k)); return b * (1 - h) + a * h - k * h * (1 - h); };
  const capsule = (px, py, ax, ay, bx, by, r) => {
    const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
    const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
    return Math.hypot(pax - bax * h, pay - bay * h) - r;
  };
  const f = (x, y) => {
    let d = 1e9;
    for (const [cx, cy, r] of def.circles) d = smin(d, Math.hypot(x - cx, y - cy) - r, 1.6);
    for (const [ax, ay, bx, by, r] of def.capsules) d = smin(d, capsule(x, y, ax, ay, bx, by, r), 1.6);
    return Math.max(d, Math.hypot(x, y) - (PLATE.r - 0.35));
  };
  const [ox, oy] = def.o, out = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let lo = 0, hi = 0.4;
    while (f(ox + dx * hi, oy + dy * hi) < 0 && hi < 30) { lo = hi; hi += 0.4; }
    for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (f(ox + dx * m, oy + dy * m) < 0) lo = m; else hi = m; }
    out.push([ox + dx * lo, oy + dy * lo]);
  }
  return out;
}

function hexMix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, sh) => (p >> sh) & 255;
  const m = (sh) => Math.round(lerp(ch(pa, sh), ch(pb, sh), t));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}
function shade(rgb, k) {
  const m = rgb.match(/\d+/g).map(Number);
  return `rgb(${m.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
}

export function mount2D(container, { fontFamily = 'sans-serif' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__2d';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const outlines = {
    gear: Object.fromEntries(WHEELS.map((w) => [w.id, w.kind === 'balance' ? circlePts(w.r, 48) : gearPts(w.r, Math.min(w.teeth || 40, 60))])),
    bridge: Object.fromEntries(BRIDGES.map((b) => [b.id, bridgePts(b)])),
  };

  function resize() {
    W = Math.max(1, container.clientWidth);
    H = Math.max(1, container.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  resize();

  // Camera, same parameterisation as the WebGL tier.
  const cam = { C: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1], tan: Math.tan(13 * DEG), sx: 0, sy: 0, scale: 1 };
  function setCamera(S) {
    const tanV = Math.tan(13 * DEG);
    const fit = Math.min(tanV, tanV * (W / H));
    const dist = S.frame / fit;
    const az = S.az * DEG, el = S.el * DEG;
    const T = [S.tx, S.ty, S.tz];
    const C = [T[0] + dist * Math.sin(az) * Math.cos(el), T[1] + dist * Math.sin(el), T[2] + dist * Math.cos(az) * Math.cos(el)];
    const f = norm([T[0] - C[0], T[1] - C[1], T[2] - C[2]]);
    const r = norm(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    Object.assign(cam, { C, f, r, u, tan: tanV, sx: S.sx, sy: S.sy, T });
  }
  function toScreen(p) {
    const d = [p[0] - cam.C[0], p[1] - cam.C[1], p[2] - cam.C[2]];
    const z = dot(d, cam.f);
    const k = (H / 2) / (Math.max(z, 1) * cam.tan);
    return [W / 2 + dot(d, cam.r) * k + cam.sx * W, H / 2 - dot(d, cam.u) * k - cam.sy * H, z];
  }

  // Each frame builds a list of flat polygons in world space, sorts them far
  // to near and fills them with a simple lambert + rim shade.
  let items = [];
  let world = (p) => p;
  const light = norm([0.35, 0.7, 0.6]);
  let layer = 'case';
  function poly(pts2, z, xf, fill, opts = {}) {
    opts.layer = layer;
    const pts = pts2.map(([x, y]) => world(xf([x, y, z])));
    const n = world(xf([0, 0, z + 1]));
    const o = world(xf([0, 0, z]));
    const normal = norm([n[0] - o[0], n[1] - o[1], n[2] - o[2]]);
    const scr = pts.map(toScreen);
    const depth = scr.reduce((a, p) => a + p[2], 0) / scr.length + (opts.bias || 0);
    items.push({ depth, scr, normal, fill, opts });
  }
  function drawItem(it) {
    const facing = -dot(it.normal, cam.f);
    const lam = 0.35 + 0.65 * Math.max(0, dot(it.normal, light));
    const k = (it.opts.flat ? 1 : lam) * (facing < 0 ? 0.55 : 1);
    ctx.beginPath();
    it.scr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (it.opts.metal) {
      // Metal: a linear gradient across the polygon's screen bounds stands in
      // for an environment reflection.
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of it.scr) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, shade(it.fill, k * 0.55));
      g.addColorStop(0.45, shade(it.fill, k * 1.25));
      g.addColorStop(0.6, shade(it.fill, k * 0.8));
      g.addColorStop(1, shade(it.fill, k * 0.45));
      ctx.fillStyle = g;
    } else ctx.fillStyle = shade(it.fill, k);
    ctx.fill();
    if (it.opts.stroke) { ctx.strokeStyle = it.opts.stroke; ctx.lineWidth = 1; ctx.stroke(); }
    if (it.opts.after) it.opts.after(it);
  }

  const anchorsW = {};
  function render(S, tSec, pointer) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    setCamera(S);
    items = [];
    const rx = pointer.y * 0.14, ry = pointer.x * 0.2 + pointer.spin;
    world = (p) => rot(rot(p, S.rx, S.ry, S.rz), rx, ry, 0);

    const iA = Math.min(MODELS.length - 2, Math.floor(S.model)), f = Math.min(1, Math.max(0, S.model - iA));
    const A = MODELS[iA], B = MODELS[iA + 1];
    const dialC = hexMix(A.dial, B.dial, f), strapC = hexMix(A.strap, B.strap, f);
    const handC = hexMix(A.hands, B.hands, f), printC = hexMix(A.print, B.print, f);
    const steel = 'rgb(201,204,208)';

    // Case group transform.
    const ce = S.caseOff;
    const caseT = [lerp(0, -60, ce), lerp(0, -150, ce) - Math.sin(ce * Math.PI) * 6, lerp(0, 60, ce) + Math.sin(ce * Math.PI) * 14];
    const caseX = (p) => add(rot(p, ce * 0.35, -ce * 0.6, ce * 0.2), caseT);
    // Case as stacked rings: reads as a solid turned case from any angle,
    // with the dial in front and the caseback window behind left open.
    for (let z = -5.4; z <= 1.21; z += 0.75) {
      const r = z < -4.5 ? 19.2 : 20;
      poly(circlePts(r, 72).concat(circlePts(17, 72).reverse()), z, caseX, steel, { metal: true });
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const lug = [[sx * 10.1, sy * 15.6], [sx * 12.7, sy * 15.6], [sx * 12.7, sy * 24], [sx * 10.1, sy * 24]];
      poly(lug, -1.6, caseX, steel, { metal: true, bias: 0.2 });
    }
    // Bezel ring.
    const ring = circlePts(19.6, 72).concat(circlePts(17.3, 72).reverse());
    poly(ring, 2.6, caseX, 'rgb(220,222,226)', { metal: true, bias: -0.3 });

    // Movement.
    layer = 'move';
    const moveT = [0, 0, -S.lift * 18];
    const mv = (p) => add(p, moveT);
    poly(circlePts(PLATE.r, 64), -1.6, mv, 'rgb(190,193,197)', { metal: true });
    poly(circlePts(PLATE.r, 64), 0, mv, 'rgb(170,173,177)', { metal: true });
    for (const w of WHEELS) {
      const e = staggered(S.explode, w.order);
      const p = bez([w.x, w.y, w.z], w.ex, e);
      const spin = e * w.spin * TAU + (w.id === 'balance' ? Math.sin(tSec * TAU * 3) * 4.3 : w.id === 'fourth' ? -tSec * TAU / 60 : 0);
      const xf = (q) => mv(add(rot(q, 0, 0, spin), p));
      const col = w.kind === 'ratchet' ? 'rgb(205,208,212)' : 'rgb(224,180,106)';
      if (w.kind === 'balance') {
        const rr = circlePts(w.r, 48).concat(circlePts(w.r - 0.5, 48).reverse());
        poly(rr, 0, xf, col, { metal: true });
      } else poly(outlines.gear[w.id], 0, xf, col, { metal: true });
      anchorsW[w.id] = world(xf([w.r * 0.6, w.r * 0.4, 0]));
      if (w.id === 'third') anchorsW.train = anchorsW.third;
    }
    {
      const e = staggered(S.explode, PALLET.order);
      const p = bez([PALLET.x, PALLET.y, PALLET.z], PALLET.ex, e);
      const xf = (q) => mv(add(rot(q, 0, 0, 0.45), p));
      poly([[-0.3, -0.5], [0.3, -0.5], [0.3, 4.2], [-0.3, 4.2]], 0, xf, 'rgb(220,222,226)', { metal: true });
      anchorsW.pallet = world(xf([0, 3.8, 0]));
    }
    const bridgeOff = {};
    for (const b of BRIDGES) {
      const e = staggered(S.explode, b.order);
      const off = bez([0, 0, 0], b.ex, e);
      bridgeOff[b.id] = off;
      const xf = (q) => mv(add(q, off));
      poly(outlines.bridge[b.id], b.z + b.t / 2, xf, 'rgb(150,154,160)', { metal: true });
      poly(outlines.bridge[b.id], b.z - b.t / 2, xf, 'rgb(205,209,213)', { metal: true, after: (it) => cotes(it) });
    }
    anchorsW.bridges = world(mv(add([-1.5, -10.5, BRIDGES[1].z - 0.6], bridgeOff['train-bridge'])));
    JEWELS.forEach((j, i) => {
      const b = BRIDGES.find((q) => q.id === j.bridge), off = bridgeOff[j.bridge];
      const xf = (q) => mv(add(q, off));
      poly(circlePts(j.big ? 0.75 : 0.6, 12, j.x, j.y), b.z - b.t / 2 - 0.1, xf, 'rgb(170,16,36)', { flat: true, bias: -0.05 });
      if (i === 1) anchorsW.jewel = world(xf([j.x, j.y, b.z - b.t / 2 - 0.1]));
    });
    SCREWS.forEach((s) => {
      const b = BRIDGES.find((q) => q.id === s.on);
      const off = b ? bridgeOff[s.on] : [0, 0, 0];
      const e = staggered(S.explode, 0);
      const z = (b ? b.z - b.t / 2 : -5.5) - e * 7;
      poly(circlePts(s.big ? 1 : 0.7, 12, s.x, s.y), z, (q) => mv(add(q, off)), 'rgb(52,78,170)', { metal: true, bias: -0.1 });
    });

    // Dial and hands.
    layer = 'dial';
    const de = S.dialOff, dz = staggered(S.explode, 5) * 3.5;
    const dialX = (q) => mv(add(rot(q, DIAL_FALL.rot[0] * de, DIAL_FALL.rot[1] * de, DIAL_FALL.rot[2] * de), [DIAL_FALL.pos[0] * de, DIAL_FALL.pos[1] * de, DIAL_FALL.pos[2] * de + dz]));
    poly(circlePts(CASE.dialR, 72), 0.35, dialX, dialC, {
      after: (it) => sunburst(it, dialC, printC),
    });
    for (let h = 0; h < 12; h++) {
      if (h === 6) continue;
      const a = (h / 12) * TAU, c = Math.cos(a), s = Math.sin(a);
      const pts = [[-0.5, 10.9], [0.5, 10.9], [0.5, 14.3], [-0.5, 14.3]].map(([x, y]) => [x * c + y * s, -x * s + y * c]);
      poly(pts, 0.6, dialX, handC, { metal: true, bias: -0.02 });
    }
    poly(circlePts(SUBDIAL.r, 40, SUBDIAL.x, SUBDIAL.y), 0.37, dialX, shade(dialC, 0.9), { bias: -0.01 });
    anchorsW.dial = world(dialX([-11, -9, 0.4]));
    anchorsW.indices = world(dialX([Math.sin(TAU / 6) * 12.6, Math.cos(TAU / 6) * 12.6, 0.7]));

    const mum = S.clock ?? mumbaiSeconds();
    const secA = -((Math.floor(mum * 6) / 6) % 60) / 60 * TAU;
    const minA = -((mum / 60) % 60) / 60 * TAU;
    const hrA = -((mum / 3600) % 12) / 12 * TAU;
    const he = S.handsOff;
    const handDefs = [
      { a: hrA, L: 9.6, w: 1.75, z: 0.82 },
      { a: minA, L: 14.1, w: 1.4, z: 1.16 },
      { a: secA, L: 3.55, w: 0.3, z: 0.62, c: [SUBDIAL.x, SUBDIAL.y] },
    ];
    handDefs.forEach((h, i) => {
      const e = sstep(i * 0.12, 0.76 + i * 0.12, he), fl = HANDS_FLOAT[i];
      const base = h.c || [0, 0];
      const off = [base[0] + fl.pos[0] * e, base[1] + fl.pos[1] * e, h.z + dz + fl.pos[2] * e];
      const pts = [[0, h.L], [h.w / 2, 1.1], [0.35, -2], [-0.35, -2], [-h.w / 2, 1.1]];
      const xf = (q) => mv(add(rot(q, 0, 0, h.a), off));
      poly(pts, 0, xf, handC, { metal: true, bias: -0.05 });
      if (i === 1) anchorsW.hands = world(xf([0, 9.5, 0.3]));
    });

    // Crown and stem.
    layer = 'case';
    const cx = 21.4 + S.crownTurn * 2.4 + S.crownOut * 17;
    let crownP = [cx, 0, CASE.crownZ];
    if (S.crownPark > 0) crownP = crownP.map((v, i) => lerp(v, [46, 34, -14][i], S.crownPark));
    const crownX = (q) => add(rot(q, -S.crownTurn * TAU * 3, S.crownPark * 0.9, S.crownPark * 0.5), crownP);
    // The crown is a disc in the YZ plane: express its outline in (y, z).
    const knurl = circlePts(3.3, 30).map(([a, b], i) => [a * (i % 2 ? 0.95 : 1), b * (i % 2 ? 0.95 : 1)]);
    for (const x of [0, 1.5, 3.1]) {
      const pts = knurl.map(([y, z]) => world(crownX([x, y, z])));
      pushRaw(pts, steel, { metal: true });
    }
    pushRaw([world(crownX([-16, -0.45, 0])), world(crownX([0, -0.45, 0])), world(crownX([0, 0.45, 0])), world(crownX([-16, 0.45, 0]))], steel, { metal: true });
    anchorsW.crown = world(crownX([3.4, 2.8, 0]));
    anchorsW.stem = world(crownX([-11, 0, 0]));

    // Caseback.
    let backP = [0, 0, -S.backTurn * 3.2], backR = [0, 0, -S.backTurn * 1.9];
    if (S.backOff > 0) {
      const e = S.backOff;
      backP = [lerp(0, -80, e), lerp(0, 46, e), lerp(-3.2, 2, e) - Math.sin(e * Math.PI) * 14];
      backR = [e * 0.9, -e * 0.5, -S.backTurn * 1.9];
    }
    const backX = (q) => add(rot(q, ...backR), backP);
    const bring = circlePts(18.4, 64).concat(circlePts(12.8, 64).reverse());
    poly(bring, -7, backX, steel, { metal: true });

    // Straps: tapered bands from the spring bars. Flat when detached or laid
    // out; when worn they shorten and darken as they curve away.
    const su = S.strapOff, eu = sstep(0, 0.85, su), el2 = sstep(0.15, 1, su);
    const flat = Math.max(eu, S.strapFlat);
    for (const [dir, e, pos, rr] of [
      [1, eu, [lerp(0, -40, eu), lerp(CASE.springBarY, 100, eu), lerp(CASE.springBarZ, 20, eu)], [-eu * 0.5, eu * 0.4, eu * 0.9]],
      [-1, el2, [lerp(0, 40, el2), lerp(-CASE.springBarY, -104, el2), lerp(CASE.springBarZ, 20, el2)], [el2 * 0.5, -el2 * 0.4, el2 * 1.1]],
    ]) {
      const len = lerp(20, 70, Math.max(flat, e));
      const xf = (q) => add(rot(q, ...rr), pos);
      const pts = [[-10, 0], [10, 0], [8, dir * len], [-8, dir * len]];
      const p3 = pts.map(([x, y]) => world(xf([x, y, -lerp(1, 0, flat) * Math.abs(y) * 0.35])));
      pushRaw(p3, strapC, {});
      if (dir === -1) anchorsW.strap = world(xf([8, -14, 2]));
    }

    // A closed watch hides one side completely: the dial from behind, the
    // movement from the front (except through the caseback window, which
    // the case rings leave open). Centroid sorting alone cannot know that.
    const closed = S.lift < 0.04 && S.explode < 0.01 && S.caseOff < 0.04 && S.dialOff < 0.01;
    const zf = world([0, 0, 1]), z0 = world([0, 0, 0]);
    const axis = norm([zf[0] - z0[0], zf[1] - z0[1], zf[2] - z0[2]]);
    const frontFacing = dot(axis, cam.f) < 0;
    items = items.filter((it) => !closed || (frontFacing ? it.opts.layer !== 'move' : it.opts.layer !== 'dial'));
    items.sort((a, b) => b.depth - a.depth);
    for (const it of items) drawItem(it);

    // Crystal glare: a soft arc over the dial when it faces the viewer.
    const front = world([0, 0, 1]), o = world([0, 0, 0]);
    const nrm = norm([front[0] - o[0], front[1] - o[1], front[2] - o[2]]);
    if (-dot(nrm, cam.f) > 0.2 && S.caseOff < 0.5) {
      const c = toScreen(world(caseX([0, 0, 3])));
      const rad = (H / 2) * 17 / (c[2] * cam.tan);
      const g = ctx.createLinearGradient(c[0] - rad, c[1] - rad, c[0] + rad, c[1] + rad);
      g.addColorStop(0.2, 'rgba(255,255,255,0)');
      g.addColorStop(0.42, `rgba(255,255,255,${0.1 + pointer.x * 0.05})`);
      g.addColorStop(0.55, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c[0], c[1], rad, 0, TAU); ctx.fill();
    }
    anchorsW.__target = cam.T;
  }

  function pushRaw(pts, fill, opts) {
    opts.layer = layer;
    const scr = pts.map(toScreen);
    const a = pts[0], b = pts[1], c = pts[2];
    const normal = norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
    items.push({ depth: scr.reduce((s, p) => s + p[2], 0) / scr.length, scr, normal, fill, opts });
  }

  // Cotes de Geneve, suggested by diagonal stripes clipped to the bridge.
  function cotes(it) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of it.scr) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let x = x0 - (y1 - y0); x < x1; x += 6) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); ctx.stroke(); }
    ctx.restore();
  }
  // Sunburst: a conic gradient centred on the dial, plus the printed track.
  function sunburst(it, base, print) {
    let cx = 0, cy = 0;
    for (const [x, y] of it.scr) { cx += x; cy += y; }
    cx /= it.scr.length; cy /= it.scr.length;
    if (ctx.createConicGradient) {
      ctx.save();
      ctx.clip();
      const g = ctx.createConicGradient(0.6, cx, cy);
      g.addColorStop(0, shade(base, 1.25)); g.addColorStop(0.25, shade(base, 0.8));
      g.addColorStop(0.5, shade(base, 1.25)); g.addColorStop(0.75, shade(base, 0.8)); g.addColorStop(1, shade(base, 1.25));
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = print;
    ctx.font = `600 ${Math.max(8, it.scr.length && Math.abs(it.scr[0][0] - cx) * 0.13)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.restore();
  }

  function project(name) {
    const p = anchorsW[name];
    if (!p) return null;
    const s = toScreen(p);
    return { x: s[0], y: s[1], visible: s[2] > 0 };
  }

  function bez(rest, ex, e) {
    const rx = rest[0] + ex[0] * 0.5, ry = rest[1] + ex[1] * 0.5;
    const rl = Math.hypot(rx, ry) || 1, bulge = 0.22 * Math.hypot(...ex);
    const c = [rx + (rx / rl) * bulge, ry + (ry / rl) * bulge, rest[2] + ex[2] * 0.55];
    const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, cc = e * e;
    return [0, 1, 2].map((i) => a * rest[i] + b * c[i] + cc * (rest[i] + ex[i]));
  }

  return {
    canvas, render, resize, project, kind: '2d',
    setDPR: (d) => { dpr = Math.min(d, 1.5); resize(); return dpr; },
    getDPR: () => dpr,
    destroy: () => canvas.remove(),
  };
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
