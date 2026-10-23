// Build time: the Company page's drawings, in the same hand as the street
// in "See the difference" (kessel/src/app/fov.js). Flat layered shapes in
// world units, soft glows, a few linear gradients, nothing else.
//
//   benchSVG(pre, title)   the workshop bench at dusk (the page's opening)
//   checksSVG(pre)         one lens of the set, its parts keyed to the checks
//   iconSVG(kind)          the small drawings that stand on the timeline
//
// Colours are never written here. Every fill names a key, and the key is a
// custom property --cb-<key> in kessel/src/styles/company.css, mixed from
// the site's tokens, so the drawings follow the page's palette. Nothing
// here ships as script: the page gets the SVG markup only, and
// kessel/src/site/company.js adds the interactions.
import { esc } from './parts.js';
import { someMarks } from '../app/textures.js';

// The bench is 1600 x 900 units. The page shows all of it on wide screens
// and a centred crop on narrow ones (company.css), so everything that
// matters sits between x 360 and 1240: the four tools, left to right.
export const BENCH = { w: 1600, h: 900 };
// The hotspots: where each marker sits on the drawing, in world units.
export const SPOTS = [
  { id: 'loupe', x: 470, y: 618, side: 'r' },
  { id: 'iris', x: 700, y: 680, side: 'l' },
  { id: 'pen', x: 878, y: 598, side: 'l' },
  { id: 'tray', x: 1125, y: 612, side: 'r' },
];

// --------------------------------------------------------------- the pen
const n = (v) => Math.round(v * 10) / 10;
// An affine pen: shapes drawn in local units, stretched by sx and sy,
// moved to ox oy, scaled by s and turned by rot degrees. Every closed shape runs clockwise, so shapes
// merged into one path never cut holes in each other.
function pen(ox = 0, oy = 0, s = 1, rot = 0, sx = 1, sy = 1) {
  const r = rot * Math.PI / 180, c = Math.cos(r), si = Math.sin(r);
  const at = (x0, y0) => { const x = x0 * sx, y = y0 * sy; return [ox + s * (x * c - y * si), oy + s * (x * si + y * c)]; };
  const p = (x, y) => at(x, y).map(n).join(' ');
  const t = {
    s, rot, at,
    M: (x, y) => `M${p(x, y)}`,
    L: (x, y) => `L${p(x, y)}`,
    C: (a, b, cx, cy, x, y) => `C${p(a, b)} ${p(cx, cy)} ${p(x, y)}`,
    A: (rx, ry, large, sweep, x, y) => `A${n(rx * s * sx)} ${n(ry * s * sy)} ${n(rot)} ${large} ${sweep} ${p(x, y)}`,
  };
  t.R = (x, y, w, h) => t.M(x, y) + t.L(x + w, y) + t.L(x + w, y + h) + t.L(x, y + h) + 'Z';
  t.E = (cx, cy, rx, ry = rx) => t.M(cx - rx, cy) + t.A(rx, ry, 1, 1, cx + rx, cy) + t.A(rx, ry, 1, 1, cx - rx, cy) + 'Z';
  t.P = (pts) => pts.map(([x, y], i) => (i ? t.L(x, y) : t.M(x, y))).join('') + 'Z';
  // A band of an upright cylinder seen from a little above: axis x = 0,
  // from y0 down to y1, radius rx (rx1 at the bottom, for a cone); k is the
  // ellipse's height over its width, i.e. how far above we stand.
  t.band = (y0, y1, rx, k, rx1 = rx) => t.M(-rx, y0) + t.A(rx, rx * k, 0, 0, rx, y0) + t.L(rx1, y1) + t.A(rx1, rx1 * k, 0, 1, -rx1, y1) + 'Z';
  // A strip of that band from x0 to x1, following its curve.
  t.strip = (y0, y1, rx, k, x0, x1) => {
    const d = (x) => rx * k * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
    return t.P([[x0, y0 + d(x0)], [x1, y0 + d(x1)], [x1, y1 + d(x1)], [x0, y1 + d(x0)]]);
  };
  return t;
}
// A small deterministic hash, so lit windows are the same every build.
const hash = (a, b) => ((a * 73 + b * 151) % 11);

// Item list helpers. { d, f } a fill, { d, s, lw } a stroke, { g: [cx, cy,
// rx, ry], f } a soft glow, { t, x, y, z, f } lettering. `a` is an alpha.
function list() {
  const out = [];
  out.fill = (d, f, o) => out.push({ d, f, ...o });
  out.line = (d, s, lw, o) => out.push({ d, s, lw, ...o });
  out.glow = (cx, cy, rx, ry, f, a, o) => out.push({ g: [cx, cy, rx, ry], f, a, ...o });
  out.text = (t, x, y, z, f, o) => out.push({ t, x, y, z, f, ...o });
  return out;
}

// ---------------------------------------------------------- the lens set
// The three lenses: black anodised barrel, knurled focus ring, engraved
// distance scale, bare machined edges, stainless PL mount; each its own
// shape (fr: front width, lz: length, as src/app/lens.js FRONT_K and
// LEN_K), engraving, scale numerals, ring colour and front label. Names
// are proposals; focal lengths sample figures.
// Five of each lens's own marks (textures.js SCALES), close focus first.
const nums = (k) => someMarks(k).map((v) => (v === Infinity ? '\u221e' : String(v).replace(/^0\./, '.')));
export const SET = [
  { id: 'shaniwar', name: 'SHANIWAR', mm: 24, ring: 'ringB', fr: 1.2, lz: 0.72, nums: nums(0) },
  { id: 'parvati', name: 'PARVATI', mm: 50, ring: 'ringA', fr: 1, lz: 1, nums: nums(1) },
  { id: 'sinhagad', name: 'SINHAGAD', mm: 100, ring: 'ringG', fr: 0.86, lz: 1.45, nums: nums(2) },
];
export const setById = (id) => SET.find((l) => l.id === id);
// The body, upright, mount face at y 0 and the front up: [top, bottom, radius].
const BODY = {
  throat: [-12, 0, 29], flange: [-17, -12, 34], rear: [-56, -17, 38], scale: [-74, -56, 40],
  knurl: [-110, -74, 42], ring: [-116, -110, 42], front: [-148, -116, 41], edge: [-153, -148, 41],
};
const TOP = -153;

// One lens of the set as items, drawn with pen t. sheen: which side the
// lamp lights (-1 left, 1 right). sign: 0..1, how much of the signature
// is on the rear barrel.
function lens(out, t, l, { k = 0.32, sheen = -1, sign = 0, text = true } = {}) {
  const d = (rx, x = 0) => rx * k * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  const band = (key, f, o) => { const [y0, y1, rx] = BODY[key]; out.fill(t.band(y0, y1, rx, k), f, o); };
  band('throat', 'steelLo');
  band('flange', 'steel');
  out.fill(t.band(-17, -15.6, 34, k), 'steelHi');
  band('rear', 'anod');
  band('scale', 'anod2');
  band('knurl', 'knurl');
  // The knurl: fine valleys round the ring, closer together at the edges.
  const kv = [], [ky0, ky1, krx] = BODY.knurl;
  for (let i = 0; i < 30; i++) {
    const th = -90 + (i + 0.5) * 6, x0 = krx * Math.sin((th - 1.5) * Math.PI / 180), x1 = krx * Math.sin((th + 1.5) * Math.PI / 180);
    kv.push(t.strip(ky0 + 1.6, ky1 - 1.2, krx, k, x0, x1));
  }
  out.fill(kv.join(''), 'knurlLo');
  band('ring', l.ring);
  band('front', 'anod');
  band('edge', 'edge');
  // Light and shade down the barrel, so it reads round.
  const lit = [], dark = [];
  for (const key of ['rear', 'scale', 'knurl', 'front']) {
    const [y0, y1, rx] = BODY[key];
    lit.push(t.strip(y0, y1, rx, k, sheen < 0 ? -0.62 * rx : 0.36 * rx, sheen < 0 ? -0.36 * rx : 0.62 * rx));
    dark.push(t.strip(y0, y1, rx, k, sheen < 0 ? 0.7 * rx : -rx, sheen < 0 ? rx : -0.7 * rx));
  }
  out.fill(lit.join(''), 'sheen', { a: 0.16 });
  out.fill(dark.join(''), 'void', { a: 0.32 });
  // The distance scale: ticks along its top edge, numerals under them.
  const [sy0, sy1, srx] = BODY.scale, ticks = [];
  for (let th = -72; th <= 72; th += 9) {
    const x = srx * Math.sin(th * Math.PI / 180), long = th % 18 === 0;
    ticks.push(t.strip(sy0 + 0.8, sy0 + (long ? 5.2 : 3.4), srx, k, x - 0.4, x + 0.4));
  }
  out.fill(ticks.join(''), 'engrave', { a: 0.85 });
  // The index line on the rear barrel, under the scale.
  out.fill(t.strip(-56, -51.5, 38, k, -0.55, 0.55), 'engrave');
  if (text) {
    l.nums.forEach((v, i) => {
      const th = (-56 + i * 28) * Math.PI / 180, x = srx * Math.sin(th);
      const [X, Y] = t.at(x, sy0 + 11.6 + d(srx, x));
      out.text(v, X, Y, 4.8 * t.s, 'engrave', { r: t.rot, sx: Math.max(0.45, Math.cos(th)) });
    });
    // The rear barrel: the lens's name and focal length.
    const [ry0] = BODY.rear;
    const [nx, ny] = t.at(0, ry0 + 9.5 + d(38));
    out.text(l.name, nx, ny, 4.6 * t.s, 'engrave', { r: t.rot, ls: 1.1 * t.s });
    const [mx, my] = t.at(0, ry0 + 20 + d(38));
    out.text(`${l.mm}`, mx, my, 11.5 * t.s, 'engrave', { r: t.rot, w: 500, ls: 0.6 * t.s });
    // The front label.
    const [fy0] = BODY.front;
    const [lx, ly] = t.at(0, fy0 + 7.5 + d(41));
    out.text(`KESSEL · 1:2 ${l.mm}`, lx, ly, 4.2 * t.s, 'engrave', { r: t.rot, ls: 1 * t.s, a: 0.85 });
  }
  // The signature, under the focal length.
  if (sign) {
    const pts = [], N = Math.round(90 * sign);
    for (let i = 0; i <= N; i++) {
      const u = i / 90, x = -22 + 44 * u + Math.sin(u * 29) * 2.2 + Math.sin(u * 7.3) * 1.3;
      pts.push([x, -56 + 32 + Math.sin(u * 21 + 1.2) * 3.2 * (1 - u * 0.5) + Math.cos(u * 9.1) * 0.8 - 1.4 * u + d(38, x)]);
    }
    out.line(pts.map(([x, y], i) => (i ? t.L(x, y) : t.M(x, y))).join(''), 'engrave', 0.75 * t.s, { cap: 1 });
    out.sigEnd = t.at(...pts[pts.length - 1]);
  }
  // The front: machined face, front ring, coated glass.
  out.fill(t.E(0, TOP, 41, 41 * k), 'edge');
  out.fill(t.E(0, TOP, 37.6, 37.6 * k), 'anod');
  out.fill(t.E(0, TOP, 31, 31 * k), 'glass');
  out.fill(t.E(-6, TOP - 1.4 * (k / 0.32), 18, 18 * k * 0.72), 'glassC', { a: 0.55 });
  out.fill(t.E(9, TOP + 1.2 * (k / 0.32), 9, 9 * k * 0.7), 'glassG', { a: 0.45 });
  out.fill(t.E(-14, TOP - 2.6 * (k / 0.32), 3.2, 1.5 * (k / 0.32)), 'spec', { a: 0.9 });
  return out;
}

// -------------------------------------------------------------- gradients
// Linear gradients in world units: [x1, y1, x2, y2] and [offset, key, alpha].
const GRADS = {
  wall: { x: [0, 0, 0, 560], stops: [[0, 'wall0'], [1, 'wall1']] },
  sky: { x: [0, 110, 0, 456], stops: [[0, 'sky0'], [0.52, 'sky1'], [1, 'sky2']] },
  haze: { x: [0, 300, 0, 456], stops: [[0, 'sky2', 0], [1, 'sky2', 0.7]] },
  top: { x: [0, 556, 0, 810], stops: [[0, 'top0'], [1, 'top1']] },
  cone: { x: [0, 300, 0, 742], stops: [[0, 'lit', 0.2], [1, 'lit', 0]] },
};
const WIN = { x: 654, y: 110, w: 572, h: 346 };

// -------------------------------------------------------------- the bench
// Layers: back (the wall, the pegboard, the chart, the shelf), view (Pune
// at dusk through the window, clipped to it), room (the window frame and
// the lamp) and bench (the bench, the mat and the tools on it).
function bench() {
  const L = { back: list(), view: list(), room: list(), bench: list() };

  // Back: the workshop wall, warmer low down where the lamp reaches.
  let o = L.back;
  o.fill(pen().R(-10, -10, 1620, 580), 'g:wall');
  o.glow(940, 290, 470, 280, 'dusk', 0.2);
  o.glow(880, 300, 430, 250, 'lit', 0.13);
  // The pegboard, left, with the hand tools hung on it.
  const P0 = pen();
  o.fill(P0.R(40, 128, 540, 352), 'peg');
  o.fill(P0.R(40, 128, 540, 3), 'pegHi', { a: 0.6 });
  const holes = [];
  for (let y = 146; y < 470; y += 22) for (let x = 58; x < 570; x += 22) holes.push(P0.E(x, y, 1.7));
  o.fill(holes.join(''), 'pegHole');
  const tools = [];
  // Callipers.
  tools.push(P0.R(104, 160, 9, 236), P0.P([[113, 164], [150, 164], [150, 171], [120, 176], [113, 176]]), P0.P([[113, 196], [140, 196], [134, 206], [113, 206]]), P0.R(106, 396, 4, 34));
  // Three spanners, small to large.
  for (const [x, len, r] of [[196, 150, 11], [244, 178, 13], [298, 206, 15]]) {
    tools.push(P0.R(x - 4, 182, 8, len), P0.E(x, 176, r), P0.E(x, 182 + len, r * 0.75));
  }
  // Tweezers, a hex key set, a steel rule.
  tools.push(P0.P([[364, 168], [372, 168], [384, 318], [378, 320]]), P0.P([[372, 168], [380, 168], [392, 316], [386, 318]]));
  for (let i = 0; i < 4; i++) tools.push(P0.P([[424 + i * 13, 170], [430 + i * 13, 170], [430 + i * 13, 268 - i * 14], [446 + i * 13, 268 - i * 14], [446 + i * 13, 274 - i * 14], [424 + i * 13, 274 - i * 14]]));
  tools.push(P0.R(520, 156, 18, 300));
  o.fill(tools.join(''), 'tool');
  // The spanners' open jaws and rings, punched back to the board colour.
  const jaws = [];
  for (const [x, len, r] of [[196, 150, 11], [244, 178, 13], [298, 206, 15]]) jaws.push(P0.R(x - r * 0.42, 164, r * 0.84, r * 1.1), P0.E(x, 182 + len, r * 0.42));
  o.fill(jaws.join(''), 'peg');
  const rule = [];
  for (let y = 164; y < 452; y += 9) rule.push(P0.R(520, y, y % 45 < 9 ? 9 : 5, 1.2));
  o.fill(rule.join(''), 'peg', { a: 0.8 });
  const pegs = [];
  for (const x of [108, 196, 244, 298, 378, 450, 529]) pegs.push(P0.R(x - 1.6, 142, 3.2, 12));
  o.fill(pegs.join(''), 'pegHole');

  // The test chart, right, pinned to the wall: a star and bar groups.
  o.fill(P0.R(1296, 138, 196, 196), 'void', { a: 0.35 });
  o.fill(P0.R(1290, 132, 196, 196), 'paper');
  const cx = 1388, cy = 222, R = 64, wedges = [];
  for (let i = 0; i < 36; i += 2) {
    const a0 = i * 10 * Math.PI / 180, a1 = (i + 1) * 10 * Math.PI / 180;
    wedges.push(`M${cx} ${cy}L${n(cx + R * Math.cos(a0))} ${n(cy + R * Math.sin(a0))}A${R} ${R} 0 0 1 ${n(cx + R * Math.cos(a1))} ${n(cy + R * Math.sin(a1))}Z`);
  }
  const bars = [];
  for (const [bx, by] of [[1300, 142], [1446, 142], [1300, 288], [1446, 288]]) for (let j = 0; j < 4; j++) bars.push(P0.R(bx + j * 9, by, 4.5, 30));
  o.fill(wedges.join('') + bars.join(''), 'chartInk');
  o.fill(P0.E(cx, cy, 7), 'paper');
  o.line(P0.R(1296, 138, 184, 184), 'chartInk', 1, { a: 0.45 });
  o.fill(P0.E(1300, 140, 4.6) + P0.E(1476, 140, 4.6), 'amber');

  // The shelf, right, with three lens boxes in the set's colours and a plant.
  o.fill(P0.R(1286, 420, 300, 9), 'shelf');
  o.fill(P0.P([[1306, 429], [1318, 429], [1306, 452]]) + P0.P([[1552, 429], [1564, 429], [1564, 452]]), 'shelfLo');
  o.glow(1400, 426, 140, 10, 'void', 0.45);
  const boxes = [], stripes = { ringB: [], ringA: [], ringG: [] };
  SET.forEach((l, i) => { const x = 1302 + i * 54; boxes.push(P0.R(x, 362, 46, 58)); stripes[l.ring].push(P0.R(x, 378, 46, 6)); });
  o.fill(boxes.join(''), 'box');
  for (const [k, ds] of Object.entries(stripes)) o.fill(ds.join(''), k);
  o.fill(P0.R(1302, 362, 154, 2.4), 'boxHi', { a: 0.7 });
  o.fill(P0.P([[1490, 384], [1530, 384], [1524, 420], [1496, 420]]), 'pot');
  o.fill(P0.E(1500, 372, 10, 16) + P0.E(1520, 366, 10, 19) + P0.E(1510, 356, 8, 14) + P0.E(1532, 378, 8, 11) + P0.E(1488, 380, 8, 10), 'leaf');

  // View: Pune at dusk through the window. The sky warms at the horizon;
  // a hill with a fort, a ridge behind it, the city lit for the evening.
  o = L.view;
  const V = pen();
  o.fill(V.R(WIN.x, WIN.y, WIN.w, WIN.h), 'g:sky');
  o.glow(920, 448, 460, 130, 'glow', 0.38);
  const stars = [[700, 138, 1.2], [742, 196, 0.9], [808, 132, 1], [990, 150, 1.1], [1032, 128, 0.8], [1070, 192, 0.9], [1196, 206, 1], [860, 176, 0.8], [1000, 210, 0.7], [690, 214, 0.8]];
  o.fill(stars.map(([x, y, r]) => V.E(x, y, r)).join(''), 'star', { a: 0.65 });
  o.glow(1160, 164, 44, 44, 'moon', 0.16);
  o.fill('M1172.7 169.8A14 14 0 1 1 1157.1 150.3A12.5 12.5 0 0 0 1172.7 169.8Z', 'moon');
  o.fill('M630 366C690 352 740 344 800 348S900 336 960 340 1060 330 1120 338 1200 344 1250 350L1250 470L630 470Z', 'ridge');
  o.fill('M630 396C680 386 720 360 752 314C768 290 778 272 790 262L800 258C830 254 870 254 896 258L904 262C926 284 950 316 990 338C1030 360 1090 372 1250 380L1250 470L630 470Z', 'hill');
  // The fort on the plateau: a crenellated wall, two bastions, a gate
  // tower, walls stepping down both slopes.
  const fort = [V.R(800, 249, 98, 11), V.R(792, 243, 14, 18), V.R(892, 244, 14, 17), V.R(840, 238, 20, 22),
    V.P([[768, 286], [792, 258], [792, 264], [768, 292]]), V.P([[906, 258], [940, 290], [940, 296], [906, 264]])];
  for (let x = 808; x < 890; x += 6) fort.push(V.R(x, 246, 3.4, 3.4));
  for (const [x0, top, w] of [[792, 243, 14], [892, 244, 14], [840, 238, 20]]) for (let x = x0; x < x0 + w - 2; x += 5.5) fort.push(V.R(x, top - 3.4, 3.2, 3.4));
  o.fill(fort.join(''), 'fort');
  o.fill(V.P([[846, 260], [854, 260], [854, 250], [850, 247], [846, 250]]), 'hill');
  o.fill(V.R(800, 249, 98, 1.4) + V.R(840, 238, 20, 1.4), 'fortHi');
  o.fill(V.R(WIN.x, 296, WIN.w, 160), 'g:haze');
  // The city: a far row in haze, a near row with lit windows, water tanks
  // on the roofs, a temple's spire and a tree.
  const far = [];
  for (let x = 640, i = 0; x < 1250; i++) { const w = 24 + (i * 17) % 30, h = 36 + (i * 23) % 34; far.push(V.R(x, 456 - h - 22, w, h + 30)); x += w - 2; }
  o.fill(far.join(''), 'cityB');
  const near = [], on = [], tanks = [];
  for (let x = 646, i = 0; x < 1250; i++) {
    const w = 34 + (i * 29) % 34, h = 22 + (i * 13) % 26, top = 456 - h;
    if (!(x > 1060 && x < 1146)) {
      near.push(V.R(x, top, w, h + 4));
      for (let r = 0; r < 3; r++) for (let c = 0; c < Math.floor((w - 8) / 9); c++) if (top + 6 + r * 9 < 452 && hash(i * 5 + c, r + i) < 3) on.push(V.R(x + 5 + c * 9, top + 6 + r * 9, 4, 4.6));
      if (i % 3 === 1) tanks.push(V.R(x + 6, top - 9, 13, 9), V.E(x + 12.5, top - 9, 6.5, 2));
    }
    x += w + 3;
  }
  o.fill(near.join('') + tanks.join(''), 'city');
  // The temple: a curved shikhara over its hall, two smaller spires at its
  // shoulders, the ribbed amalaka and the finial on top, a flag.
  const spire = (cx, base, w, h) => V.M(cx - w, base) + V.C(cx - w, base - h * 0.55, cx - w * 0.45, base - h * 0.9, cx, base - h) + V.C(cx + w * 0.45, base - h * 0.9, cx + w, base - h * 0.55, cx + w, base) + 'Z';
  o.fill(V.R(1082, 418, 62, 38) + spire(1096, 420, 9, 34) + spire(1130, 420, 9, 34) + spire(1113, 420, 18, 72) + V.E(1113, 347, 8, 3) + V.E(1113, 341, 2.6, 3.4) + V.R(1112.3, 324, 1.4, 16), 'city');
  o.line(V.M(1098, 404) + V.L(1128, 404) + V.M(1101, 388) + V.L(1125, 388) + V.M(1104, 372) + V.L(1122, 372), 'cityB', 1, { a: 0.6 });
  o.fill(V.P([[1113.7, 324], [1124, 327.5], [1113.7, 331]]), 'amber');
  o.fill(V.E(760, 432, 16) + V.E(746, 444, 12) + V.E(776, 442, 13), 'tree');
  o.fill(on.join('') + V.R(1104, 430, 6, 8) + V.R(1116, 430, 6, 8), 'litWin');
  for (const [x, y] of [[700, 446], [812, 448], [968, 444], [1046, 450], [1180, 446]]) o.glow(x, y, 26, 10, 'lit', 0.32);
  // The glass: two faint diagonal reflections.
  o.fill(V.P([[700, 456], [760, 456], [880, 110], [820, 110]]) + V.P([[1010, 456], [1036, 456], [1156, 110], [1130, 110]]), 'glassHi', { a: 0.05 });

  // Room: the window frame and sill, then the lamp hung over the bench.
  o = L.room;
  const F = pen();
  o.fill(F.R(640, 96, 600, 14) + F.R(640, 456, 600, 14) + F.R(640, 96, 14, 374) + F.R(1226, 96, 14, 374) + F.R(935, 110, 10, 346) + F.R(654, 226, 572, 8), 'frame');
  o.fill(F.R(654, 110, 572, 2) + F.R(654, 234, 572, 1.6) + F.R(945, 110, 1.6, 346), 'void', { a: 0.4 });
  o.fill(F.R(626, 470, 628, 12), 'sill');
  o.fill(F.R(626, 470, 628, 2.2), 'sillHi');
  o.glow(940, 488, 330, 10, 'void', 0.5);
  // The lamp: a cord from above, an enamel shade, warm light falling in a
  // cone to a pool on the bench.
  o.line('M880 -10L880 216', 'cord', 2.4);
  const S = pen(880, 228);
  o.fill(S.R(-9, -14, 18, 16), 'shade');
  o.fill(S.M(-12, 0) + S.L(12, 0) + S.L(16, 10) + S.C(46, 16, 72, 40, 78, 74) + S.L(-78, 74) + S.C(-72, 40, -46, 16, -16, 10) + 'Z', 'shade');
  o.fill(S.M(-15, 11) + S.C(-42, 18, -62, 40, -69, 70) + S.L(-58, 70) + S.C(-52, 44, -36, 22, -11, 13) + 'Z', 'shadeHi', { a: 0.5 });
  o.fill(S.R(-80, 70, 160, 5), 'shadeHi', { a: 0.6 });
  o.fill(S.P([[-74, 77], [74, 77], [280, 514], [-280, 514]]), 'g:cone');
  o.glow(880, 304, 190, 74, 'lit', 0.6);
  o.fill(S.E(0, 76, 76, 11), 'lampIn');
  o.fill(S.E(0, 74, 20, 7), 'bulb');

  // Bench: the top, a work mat, the tools, the front edge.
  o = L.bench;
  const B = pen();
  o.fill(B.R(-10, 536, 1620, 22), 'benchBack');
  o.fill(B.R(-10, 556, 1620, 256), 'g:top');
  o.fill(B.R(-10, 556, 1620, 4), 'void', { a: 0.45 });
  o.fill(B.P([[352, 572], [1248, 572], [1282, 798], [318, 798]]), 'mat');
  const grid = [];
  for (let i = 1; i < 8; i++) { const u = i / 8, y = 572 + 226 * u, x0 = 352 - 34 * u, x1 = 1248 + 34 * u; grid.push(`M${n(x0)} ${n(y)}L${n(x1)} ${n(y)}`); }
  for (let j = 1; j < 14; j++) { const u = j / 14; grid.push(`M${n(352 + 896 * u)} 572L${n(318 + 964 * u)} 798`); }
  o.line(grid.join(''), 'matLine', 0.8, { a: 0.6 });
  o.line(B.P([[352, 572], [1248, 572], [1282, 798], [318, 798]]), 'matEdge', 1.4);
  // The pool of lamp light on the mat.
  o.glow(880, 706, 430, 96, 'lit', 0.5);
  o.glow(880, 712, 230, 52, 'lit', 0.32);

  // A blower and a fine screwdriver, far left.
  o.glow(392, 674, 26, 6, 'void', 0.55);
  o.fill(B.P([[383, 630], [393, 630], [391, 606], [385, 606]]), 'rubberLo');
  o.fill(B.E(388, 652, 17, 22), 'rubber');
  o.fill(B.E(381, 645, 5, 9), 'rubberHi', { a: 0.5 });
  const SD = pen(372, 784, 1, -5);
  o.glow(420, 792, 56, 5, 'void', 0.5);
  o.fill(SD.R(0, -5, 46, 10), 'tool2');
  o.fill([0, 1, 2, 3, 4, 5].map((i) => SD.R(6 + i * 6, -5, 2, 10)).join(''), 'void', { a: 0.35 });
  o.fill(SD.R(46, -1.4, 50, 2.8), 'steel');

  // 1. The loupe, on a cloth beside a lens element it has just checked.
  const CL = pen(452, 744, 1, -7);
  o.fill(CL.P([[-66, -34], [64, -34], [66, 34], [-62, 36]]), 'cloth');
  o.fill(CL.P([[40, 36], [66, 34], [64, 10]]), 'clothHi');
  o.line(CL.M(-60, 6) + CL.L(60, 2), 'clothLo', 1, { a: 0.6 });
  o.glow(528, 760, 32, 8, 'void', 0.45);
  const EL = pen(526, 758);
  o.fill(EL.band(-5, 0, 25, 0.3), 'edge');
  o.fill(EL.E(0, -5, 25, 7.5), 'glass2');
  o.fill(EL.E(-6, -5.6, 12, 3), 'glassC', { a: 0.5 });
  o.fill(EL.E(-12, -6.6, 2.6, 1), 'spec', { a: 0.9 });
  o.glow(462, 738, 44, 11, 'void', 0.6);
  const LP = pen(460, 734, 1.15);
  o.fill(LP.band(-6, 0, 30, 0.32), 'anod2');
  o.fill(LP.band(-50, -6, 21, 0.32, 30), 'anod');
  o.fill(LP.strip(-50, -6, 26, 0.32, -17, -9), 'sheen', { a: 0.2 });
  o.fill(LP.band(-54, -50, 21, 0.32), 'edge');
  o.fill(LP.E(0, -54, 21, 6.7), 'edge');
  o.fill(LP.E(0, -54, 17, 5.4), 'glass');
  o.fill(LP.E(-4, -55, 9, 2.6), 'glassC', { a: 0.6 });
  o.fill(LP.E(-9, -55.6, 2.4, 1), 'spec', { a: 0.9 });

  // 2. The iris ring, and the fine pin spanner that seats it.
  o.glow(716, 748, 58, 14, 'void', 0.55);
  const IR = pen(716, 744), k = 0.32;
  o.fill(IR.band(-12, 0, 48, k), 'anod');
  o.fill(IR.strip(-12, 0, 48, k, -30, -18), 'sheen', { a: 0.18 });
  o.fill(IR.E(0, -12, 48, 48 * k), 'anod2');
  o.fill(IR.E(0, -12, 41, 41 * k), 'steelLo');
  o.fill(IR.E(0, -12, 38, 38 * k), 'blade');
  const hole = [], edges = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2, b = a + 1.15;
    hole.push([15 * Math.cos(a), -12 + 15 * k * Math.sin(a)]);
    edges.push(IR.M(15 * Math.cos(a), -12 + 15 * k * Math.sin(a)) + IR.L(37 * Math.cos(b), -12 + 37 * k * Math.sin(b)));
  }
  o.line(edges.join(''), 'bladeHi', 0.9, { a: 0.8 });
  o.fill(IR.P(hole), 'hole');
  o.fill(IR.R(-46, -13.5, 5, 3) + IR.R(41, -13.5, 5, 3), 'void');
  const SP = pen(588, 798, 1, -34);
  o.glow(650, 770, 76, 8, 'void', 0.45);
  o.fill(SP.R(0, -3.2, 158, 6.4) + SP.P([[-4, -3.2], [6, -3.2], [6, 12], [1, 17], [-4, 12]]) + SP.P([[150, -3.2], [160, -3.2], [160, 12], [155, 17], [150, 12]]), 'steel');
  o.fill(SP.R(4, -3.2, 150, 1.6), 'steelHi');
  o.fill(SP.R(64, -7, 28, 14), 'knurl');
  o.fill([0, 1, 2, 3, 4, 5].map((i) => SP.R(66.5 + i * 4.3, -7, 1.6, 14)).join(''), 'knurlLo');

  // 3. A lens on V-blocks, being signed: the pen's tip on the rear barrel.
  const LX = 970, LY = 690;
  o.glow(LX - 70, LY + 58, 110, 12, 'void', 0.6);
  const vb = [];
  for (const x of [LX - 122, LX - 40]) vb.push(B.P([[x - 22, LY + 34], [x - 9, LY + 34], [x, LY + 45], [x + 9, LY + 34], [x + 22, LY + 34], [x + 22, LY + 62], [x - 22, LY + 62]]));
  o.fill(vb.join(''), 'steel');
  o.fill(B.R(LX - 144, LY + 54, 44, 8) + B.R(LX - 62, LY + 54, 44, 8), 'steelLo');
  const signed = list();
  lens(signed, pen(LX, LY, 1, -90), setById('parvati'), { sheen: 1, sign: 0.82 });
  o.push(...signed);
  const [tx, ty] = signed.sigEnd;
  const PN = pen(tx, ty, 1, -50);
  o.glow(tx + 80, LY + 40, 70, 7, 'void', 0.35);
  o.fill(PN.P([[0, 0], [14, -3], [14, 3]]), 'steelHi');
  o.fill(PN.R(14, -4, 10, 8), 'steel');
  o.fill(PN.R(24, -4.8, 46, 9.6), 'penGrip');
  o.fill(PN.R(70, -5, 92, 10), 'penBody');
  o.fill(PN.M(162, -5) + PN.L(172, -5) + PN.A(5, 5, 0, 1, 172, 5) + PN.L(162, 5) + 'Z', 'penCap');
  o.fill(PN.R(26, -3.8, 140, 1.6), 'penHi', { a: 0.6 });
  o.fill(PN.R(108, -7.6, 52, 2.4), 'steelHi');
  o.glow(tx, ty, 9, 9, 'lit', 0.8);

  // 4. The finished lens tray: the three lenses, short, medium and long,
  // capped and ready.
  o.glow(1125, 792, 140, 12, 'void', 0.6);
  o.fill(B.P([[1020, 698], [1230, 698], [1240, 760], [1010, 760]]), 'trayHi');
  o.fill(B.P([[1027, 704], [1223, 704], [1232, 760], [1018, 760]]), 'foam');
  const X = [1067, 1133, 1190];
  o.fill(X.map((x, i) => B.E(x, 757, 28 * SET[i].fr, 9)).join(''), 'void', { a: 0.5 });
  SET.forEach((l, i) => lens(o, pen(X[i], 766, 0.62, 0, l.fr, l.lz), l, { text: true }));
  o.fill(B.R(1010, 760, 230, 30), 'tray');
  o.fill(B.R(1010, 760, 230, 2.6), 'trayHi');
  o.fill(B.R(1098, 770, 54, 10), 'trayLo');

  // The front edge of the bench and its drawers.
  o.fill(B.R(-10, 806, 1620, 26), 'benchEdge');
  o.fill(B.R(-10, 806, 1620, 2.4), 'benchHi');
  o.fill(B.R(-10, 832, 1620, 80), 'benchFront');
  o.fill(B.R(380, 846, 360, 44) + B.R(860, 846, 360, 44), 'drawer');
  o.fill(B.R(380, 846, 360, 1.6) + B.R(860, 846, 360, 1.6), 'benchHi', { a: 0.5 });
  o.fill(B.R(540, 864, 40, 6) + B.R(1020, 864, 40, 6), 'steel');
  return L;
}

// --------------------------------------------------------------- render
const v = (k) => `var(--cb-${k})`;
const al = (a, attr) => (a == null ? '' : ` ${attr}="${a}"`);

// Items as SVG: neighbouring paths of the same style become one <path>.
function render(items, pre, glows) {
  const out = [];
  let run = null;
  const flush = () => {
    if (!run) return;
    const fill = run.f && run.f.startsWith('g:') ? `url(#${pre}-${run.f.slice(2)})` : v(run.f);
    out.push(run.s
      ? `<path d="${run.d}" style="fill:none;stroke:${v(run.s)};stroke-width:${run.lw}${run.cap ? ';stroke-linecap:round;stroke-linejoin:round' : ''}"${al(run.a, 'opacity')}/>`
      : `<path d="${run.d}" style="fill:${fill}"${al(run.a, 'fill-opacity')}/>`);
    run = null;
  };
  for (const it of items) {
    if (it.d) {
      if (run && run.f === it.f && run.s === it.s && run.lw === it.lw && run.a === it.a && run.cap === it.cap) run.d += it.d;
      else { flush(); run = { ...it }; }
      continue;
    }
    flush();
    if (it.g) {
      const [cx, cy, rx, ry] = it.g;
      glows.add(it.f);
      out.push(`<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${rx}" ry="${ry}" fill="url(#${pre}-gl-${it.f})"${al(it.a, 'opacity')}/>`);
    } else if (it.t) {
      const x = n(it.x), y = n(it.y);
      const tf = [it.r ? `rotate(${n(it.r)} ${x} ${y})` : '', it.sx && it.sx < 0.98 ? `translate(${x} ${y}) scale(${n(it.sx * 100) / 100} 1) translate(${-x} ${-y})` : ''].filter(Boolean).join(' ');
      out.push(`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"${tf ? ` transform="${tf}"` : ''} style="font:${it.w || 600} ${n(it.z * 10) / 10}px var(--display);letter-spacing:${n((it.ls || 0) * 10) / 10}px;fill:${v(it.f)}"${al(it.a, 'fill-opacity')}>${esc(it.t)}</text>`);
    }
  }
  flush();
  return out.join('');
}
const stop = (o, k, a) => `<stop offset="${o}" style="stop-color:${v(k)}"${al(a, 'stop-opacity')}/>`;
const defs = (pre, glows, grads = {}) =>
  Object.entries(grads).map(([name, g]) => `<linearGradient id="${pre}-${name}" gradientUnits="userSpaceOnUse" x1="${g.x[0]}" y1="${g.x[1]}" x2="${g.x[2]}" y2="${g.x[3]}">${g.stops.map((s) => stop(...s)).join('')}</linearGradient>`).join('') +
  [...glows].map((k) => `<radialGradient id="${pre}-gl-${k}">${stop(0, k)}${stop(0.4, k, 0.45)}${stop(1, k, 0)}</radialGradient>`).join('');

export function benchSVG(pre, title) {
  const L = bench(), glows = new Set();
  const body = ['back', 'view', 'room', 'bench'].map((k) => `<g${k === 'view' ? ` clip-path="url(#${pre}-win)"` : ''}>${render(L[k], pre, glows)}</g>`).join('');
  return `<svg class="bn__svg" viewBox="0 0 ${BENCH.w} ${BENCH.h}" role="img" aria-labelledby="${pre}-t" focusable="false"><title id="${pre}-t">${esc(title)}</title><defs><clipPath id="${pre}-win"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}"/></clipPath>${defs(pre, glows, GRADS)}</defs>${body}</svg>`;
}

// ------------------------------------------------------------ the checks
// One lens of the set, large and upright, and over it a mark for each of
// the six checks: the axis (centring), the scale, the iris through the
// glass, the knurled ring, a test chart beside it, a glint on the clean
// glass. company.css lights each mark as its check is ticked and draws the
// signature on the rear barrel once all six have passed.
export const CHECK_MARKS = 6;
export function checksSVG(pre, l = setById('parvati')) {
  const ox = 196, oy = 420, s = 1.9, k = 0.4, t = pen(ox, oy, s);
  const glows = new Set();
  const base = list();
  base.glow(ox, oy + 30, 150, 18, 'void', 0.7);
  lens(base, t, l, { k });
  // The iris, seen through the glass, half open.
  const iris = list(), hole = [], blades = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2, b = a + 1.1;
    hole.push([11 * Math.cos(a), TOP + 11 * k * Math.sin(a)]);
    blades.push(t.M(11 * Math.cos(a), TOP + 11 * k * Math.sin(a)) + t.L(28 * Math.cos(b), TOP + 28 * k * Math.sin(b)));
  }
  const g = (cls, n2, items) => `<g class="ck-mark ck-mark--${cls}" data-n="${n2}">${render(items, pre, glows)}</g>`;
  iris.line(blades.join(''), 'bladeHi', 1, { a: 0.9 });
  iris.fill(t.P(hole), 'hole');
  // Centring: the optical axis through the lens, a cross on the glass.
  const axis = list();
  axis.line(`M${ox} 60V470`, 'mark', 1.4, { a: 0.9 });
  axis.line(t.E(0, TOP, 6, 6 * k) + t.M(-12, TOP) + t.L(12, TOP), 'mark', 1.4);
  // The scale and the ring: a band of light over each.
  const band = (key) => { const [y0, y1, rx] = BODY[key], it = list(); it.fill(t.band(y0, y1, rx + 0.6, k), 'mark', { a: 0.22 }); it.line(t.band(y0, y1, rx + 0.6, k), 'mark', 1.2); return it; };
  // The test chart, beside the lens.
  const chart = list(), cx = 350, cy = 104, R = 34, w = [];
  chart.fill(pen().R(cx - 44, cy - 44, 88, 88), 'paper');
  for (let i = 0; i < 24; i += 2) {
    const a0 = i * 15 * Math.PI / 180, a1 = (i + 1) * 15 * Math.PI / 180;
    w.push(`M${cx} ${cy}L${n(cx + R * Math.cos(a0))} ${n(cy + R * Math.sin(a0))}A${R} ${R} 0 0 1 ${n(cx + R * Math.cos(a1))} ${n(cy + R * Math.sin(a1))}Z`);
  }
  chart.fill(w.join(''), 'chartInk');
  chart.line(pen().R(cx - 40, cy - 40, 80, 80), 'mark', 1.4);
  // Cleaning: glints on the glass.
  const glint = list(), star = (x, y, r) => `M${x} ${y - r}L${x + r * 0.22} ${y - r * 0.22}L${x + r} ${y}L${x + r * 0.22} ${y + r * 0.22}L${x} ${y + r}L${x - r * 0.22} ${y + r * 0.22}L${x - r} ${y}L${x - r * 0.22} ${y - r * 0.22}Z`;
  const [g1x, g1y] = t.at(-16, TOP - 3), [g2x, g2y] = t.at(19, TOP + 4);
  glint.fill(star(n(g1x), n(g1y), 11) + star(n(g2x), n(g2y), 7), 'spec');
  // The signature, drawn once every check has passed.
  const sig = list();
  lens(sig, t, l, { k, sign: 1, text: false });
  const sigLine = sig.find((it) => it.s);
  // Numbered keys beside the marks, matching the tiles.
  const keys = [[1, 196, 44], [2, 52, 326], [3, 52, 130], [4, 340, 262], [5, 350, 172], [6, 340, 200]];
  const leads = { 1: null, 2: [70, 326, 116, 326], 3: [70, 130, 148, 136], 4: [322, 262, 280, 262], 5: null, 6: [322, 200, 240, 156] };
  const key = keys.map(([no, x, y]) => {
    const l2 = leads[no];
    return `<g class="ck-key" data-n="${no}">${l2 ? `<path class="ck-key__lead" d="M${l2[0]} ${l2[1]}L${l2[2]} ${l2[3]}"/>` : ''}<circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${no}</text></g>`;
  }).join('');
  const marks = g('axis', 1, axis) + g('scale', 2, band('scale')) + g('iris', 3, iris) + g('ring', 4, band('knurl')) + g('chart', 5, chart) + g('clean', 6, glint);
  const bodySvg = render(base, pre, glows);
  return `<svg class="ck__svg" viewBox="0 0 420 480" aria-hidden="true" focusable="false"><defs>${defs(pre, glows)}</defs>${bodySvg}${marks}<path class="ck-sign" d="${sigLine.d}" pathLength="1"/>${key}</svg>`;
}

// -------------------------------------------------------------- icons
// The drawings that stand on the timeline: the first bench, each lens of
// the set as it arrived, the larger workshop. All share one box.
export function iconSVG(kind) {
  const pre = `co-ic-${kind}`, glows = new Set(), o = list();
  const l = setById(kind);
  if (l) {
    o.glow(0, 10, 50, 7, 'void', 0.6);
    lens(o, pen(0, 0, 1), l, { text: false });
  } else if (kind === 'bench') {
    const B = pen();
    o.glow(4, -36, 46, 10, 'lit', 0.6);
    o.fill(B.R(-46, -42, 92, 8), 'benchEdge');
    o.fill(B.R(-46, -42, 92, 2), 'benchHi');
    o.fill(B.R(-42, -34, 7, 46) + B.R(35, -34, 7, 46), 'benchFront');
    o.line('M-30 -42L-20 -96L12 -118', 'lampArm', 3.2, { cap: 1 });
    o.fill(B.E(-30, -43, 10, 3), 'lampArm');
    const S = pen(12, -118, 1, 32);
    o.fill(S.M(-4, -6) + S.L(4, -6) + S.L(16, 14) + S.L(-16, 14) + 'Z', 'shade');
    o.glow(18, -100, 26, 14, 'lit', 0.8);
    o.fill(B.E(-4, -46, 12, 3.6), 'glass2');
  } else if (kind === 'workshop') {
    const B = pen();
    o.glow(0, 10, 50, 7, 'void', 0.6);
    o.fill(B.P([[-44, -70], [-22, -92], [-22, -70], [0, -92], [0, -70], [22, -92], [22, -70], [44, -92], [44, 10], [-44, 10]]), 'cityB');
    o.fill(B.R(-44, -70, 88, 3), 'benchHi', { a: 0.6 });
    const win = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (!(r === 2 && (c === 1 || c === 2))) win.push(B.R(-36 + c * 19, -58 + r * 20, 12, 13));
    o.fill(win.join(''), 'litWin');
    o.fill(B.R(-12, -18, 24, 28), 'city');
    o.glow(0, -30, 44, 30, 'lit', 0.25);
  }
  return `<svg class="tl__ic" viewBox="-48 -172 96 190" aria-hidden="true" focusable="false"><defs>${defs(pre, glows)}</defs>${render(o, pre, glows)}</svg>`;
}
