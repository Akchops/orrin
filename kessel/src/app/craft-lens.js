// Craft: the lens on the bench, drawn in code. One drawing that builds up
// in five stages: the coated glass, the iris, the barrel and focus ring,
// the assembly with the mount, and the signature. Drawn like the street in
// "See the difference" (kessel/src/app/fov.js): flat shapes, soft glows,
// dusk light, and colours that are never literals. Every fill names a key;
// the key is a custom property in kessel/src/styles/craft.css
// (--ck-wall0, --ck-glass, ...) mixed from the site's tokens.
//
// This file is data only, shared by the build and the page. The build
// (kessel/src/site/craft-svg.js) draws the parts as an inline SVG, so the
// finished lens reads without JavaScript; kessel/src/site/craft.js then
// steps through the stages and moves the iris, the light and the pen.
//
// The lens is the matched body all three Kessel lenses share (black
// anodised barrel, knurled focus ring, engraved distance scale, bare
// machined edges, stainless PL mount), drawn as Parvati, the standard:
// amber ring, 50 mm. It lies on its side, front to the left, the top half
// cut away to show the glass and the iris, the bottom half seen from
// outside.

export const WORLD = { w: 1600, h: 800 };
export const LENS = { name: 'PARVATI', mm: 50 };

// The lens is drawn in its own units (axis at y 490, front at x 540, the
// mount's back at x 1000) and set on the bench by LT: scaled by s about
// its middle, which lands at x, y in the world.
export const AX = 490;
export const LT = { s: 1.25, cx: 770, x: 780, y: 476 };
LT.tx = LT.x - LT.cx * LT.s;
LT.ty = LT.y - AX * LT.s;
export const W = (x, y = AX) => [LT.tx + x * LT.s, LT.ty + y * LT.s];

// ---------------------------------------------------------- path helpers
const n = (v) => Math.round(v * 10) / 10;
const R = (x, y, w, h) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;
const E = (cx, cy, rx, ry = rx) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 1 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 1 ${n(-2 * rx)} 0z`;
const P = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'z';
const L = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
// Points in a local frame, turned by deg and moved to ox, oy.
const turn = (pts, ox, oy, deg) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [ox + x * c - y * s, oy + x * s + y * c]);
};
// A shape in the lens's cut (top) half from radius profile points: [x, r].
const cut = (pts) => P(pts.map(([x, r]) => [x, AX - r]));
// A band of the outside (bottom) half between radii r0 < r1.
const low = (x0, x1, r0, r1) => R(x0, AX + r0, x1 - x0, r1 - r0);
// A path moved by ox, oy (absolute commands only).
function moveD(d, ox, oy) {
  let j = 0;
  return d.replace(/[A-Za-z]|-?\d*\.?\d+/g, (t) => {
    if (/[A-Za-z]/.test(t)) { j = 0; return t; }
    return (j++ % 2 ? n(oy + +t) : n(ox + +t)) + ' ';
  }).replace(/ ([A-Za-z]|$)/g, '$1');
}

// ------------------------------------------------------------- the body
// Outer radius along the axis, front to back, with the part it belongs to.
export const OUT = [
  [540, 546, 160, 'front'], [546, 594, 166, 'front'],
  [594, 604, 170, 'focus'], [604, 692, 176, 'focus'], [692, 704, 170, 'focus'], [704, 766, 168, 'focus'],
  [766, 778, 160, 'index'], [778, 786, 161, 'ring'], [786, 900, 152, 'rear'],
  [900, 924, 132, 'mount'], [924, 950, 124, 'mount'], [950, 1000, 100, 'mount'],
];
// The bore: the inner radius, cell by cell.
export const BORE = [[540, 552, 140], [552, 612, 150], [612, 736, 132], [736, 752, 128], [752, 836, 124], [836, 900, 116], [900, 958, 108], [958, 1000, 86]];
const boreAt = (x) => (BORE.find(([a, b]) => x >= a && x < b) || BORE[BORE.length - 1])[2];

// -------------------------------------------------------------- the glass
// Seven elements in five groups, a double-Gauss layout: v is the front
// vertex, R1 and R2 the surface radii (positive: centre behind), t the
// centre thickness, h the half height, g the group.
export const GLASS = [
  { g: 1, v: 552, R1: 300, t: 38, R2: 760, h: 146 },
  { g: 2, v: 614, R1: 240, t: 30, R2: 520, h: 124 },
  { g: 3, v: 660, R1: 190, t: 34, R2: 420, h: 110 },
  { g: 3, v: 694, R1: 420, t: 12, R2: 220, h: 110, cem: true },
  { g: 4, v: 780, R1: -220, t: 12, R2: -420, h: 108 },
  { g: 4, v: 792, R1: -420, t: 36, R2: -190, h: 108, cem: true },
  { g: 5, v: 852, R1: 600, t: 38, R2: -300, h: 104 },
];
const sag = (Rr, y) => Rr - Math.sign(Rr) * Math.sqrt(Rr * Rr - y * y);
// The element's outline, with its two surfaces as arcs.
function element(e) {
  const x1 = e.v + sag(e.R1, e.h), v2 = e.v + e.t, x2 = v2 + sag(e.R2, e.h);
  const s1 = e.R1 > 0 ? 0 : 1, s2 = e.R2 > 0 ? 1 : 0, r1 = Math.abs(e.R1), r2 = Math.abs(e.R2);
  const front = `M${n(x1)} ${AX - e.h}A${r1} ${r1} 0 0 ${s1} ${n(x1)} ${AX + e.h}`;
  const back = `M${n(x2)} ${AX + e.h}A${r2} ${r2} 0 0 ${s2} ${n(x2)} ${AX - e.h}`;
  const d = `M${n(x1)} ${AX - e.h}A${r1} ${r1} 0 0 ${s1} ${n(x1)} ${AX + e.h}L${n(x2)} ${AX + e.h}A${r2} ${r2} 0 0 ${s2} ${n(x2)} ${AX - e.h}Z`;
  return { d, front, back, x1, x2, v2 };
}

// --------------------------------------------------------------- the iris
// Eleven blades. The page redraws them as the iris closes; a is how far it
// is open, 0 to 1, and the build draws it half closed. Side on (x, house,
// reach) in lens units; face on (cx, cy, r, field, ap) in world units.
const iw = W(744, 0);
export const IRIS = { n: 11, x: 744, house: [112, 128], reach: 116, open: 0.55, cx: n(iw[0]), cy: 140, r: 92, field: 79, ap: 73 };
const TAU = Math.PI * 2;
// Face on: the blade field (the housing's opening less the aperture) and
// the straight edge of each blade, which runs on past the corner of the
// opening, so the blades overlap in a ring.
export function irisFace(a) {
  const { n: N, cx, cy, field } = IRIS, A = IRIS.ap * a, k = Math.tan(Math.PI / N), rot = -Math.PI / 2;
  const poly = [];
  for (let i = 0; i < N; i++) { const t = rot + i * TAU / N + Math.PI / N, rr = A / Math.cos(Math.PI / N); poly.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); }
  // The field runs clockwise round the ring and the opening the other way,
  // so the opening stays a hole with any fill rule.
  const fieldD = `M${n(cx - field)} ${cy}a${field} ${field} 0 1 1 ${2 * field} 0a${field} ${field} 0 1 1 ${-2 * field} 0z` + P(poly.slice().reverse());
  let edges = '';
  const far = Math.sqrt(Math.max(0, field * field - A * A));
  for (let i = 0; i < N; i++) {
    const t = rot + i * TAU / N, c = Math.cos(t), s = Math.sin(t);
    const tx = cx + A * c, ty = cy + A * s, dx = -s, dy = c;
    edges += `M${n(tx - dx * A * k)} ${n(ty - dy * A * k)}L${n(tx + dx * far)} ${n(ty + dy * far)}`;
  }
  return { field: fieldD, edges };
}
// Side on, in the cut half: the blades as one thin plate reaching from the
// housing to the edge of the opening.
export const irisSide = (a) => R(IRIS.x - 3, AX - IRIS.reach, 6, IRIS.reach * (1 - 0.9 * a));

// --------------------------------------------------------------- the light
// A few rays from the street, bent at each group and brought to a point
// behind the mount. The iris stops the outer ones as it closes.
export const RAYS = { h: [-120, -80, -40, 40, 80, 120], xs: [300, 575, 636, 700, 744, 805, 872, 1060], k: [1, 1, 0.93, 0.86, 0.82, 0.78, 0.66, 0] };
const ray = (h, from, to) => L(RAYS.xs.slice(from, to + 1).map((x, i) => [x, AX + h * RAYS.k[from + i]]));
// Whether a ray clears the iris when it is open by a.
export const rayClears = (h, a) => Math.abs(h * RAYS.k[4]) < IRIS.reach * 0.9 * a;

// ------------------------------------------------------- the signature
// One unbroken line and a stroke under it, on the rear barrel (lens units).
const SIGN = 'M0 28C3 16 6 4 11 6C16 8 12 30 18 30C24 30 25 4 31 6C37 8 33 28 39 26C45 24 47 10 53 12C59 14 55 28 61 26C68 24 72 8 80 10';
const UNDER = 'M-6 38C24 35 56 36 88 33';
const SIGN_AT = [804, AX + 78];
export const PEN_ANGLE = 36;

// ------------------------------------------------------------ the lamp
// The desk lamp's head, pointing at the rear barrel (world units).
const HEAD = [1150, 236];
const AIM = W(850, 585);
const LAMP_A = Math.atan2(AIM[1] - HEAD[1], AIM[0] - HEAD[0]) * 180 / Math.PI;
const BENCH = 720;

// ------------------------------------------------------------ gradients
// Linear gradients: [x1, y1, x2, y2] and [offset, key, alpha]; radial
// ones: [cx, cy, r]. World units, except ray, which the lens draws.
const coneA = turn([[74, 0]], HEAD[0], HEAD[1], LAMP_A)[0], coneB = turn([[460, 0]], HEAD[0], HEAD[1], LAMP_A)[0];
export const GRADS = {
  wall: { x: [0, 0, 0, BENCH], stops: [[0, 'wall0'], [0.6, 'wall1'], [1, 'wall2']] },
  sky: { x: [0, 58, 0, 496], stops: [[0, 'sky0'], [0.5, 'sky1'], [1, 'sky2']] },
  dusk: { x: [0, 456, 0, 496], stops: [[0, 'sky2', 0], [1, 'sky2', 0.7]] },
  ray: { x: [300, 0, 530, 0], stops: [[0, 'ray', 0], [1, 'ray']] },
  cone: { x: [n(coneA[0]), n(coneA[1]), n(coneB[0]), n(coneB[1])], stops: [[0, 'lampBulb', 0.5], [1, 'lampBulb', 0]] },
  irisLight: { r: [IRIS.cx, IRIS.cy, IRIS.field], stops: [[0, 'irisLight0'], [0.55, 'irisLight1'], [1, 'irisLight2']] },
};

// -------------------------------------------------------------- the scene
// Parts, back to front. Each has the stage it arrives at (0: the bench,
// always there) and its items; lens parts are drawn in lens units. For the
// stages an outline (hl): the build draws it as a highlight while that
// stage is current and as a faint ghost before the part arrives. from: the
// way it slides in (lens units). Items: { d, f } a filled path (o: an
// outline key), { d, s, lw } a stroke, { t, x, y, z, f } lettering,
// { g: [cx, cy, rx, ry], f } a soft glow; `a` is an alpha, `cls` a hook
// for the page script.
export function scene() {
  const parts = [];
  let cur;
  const part = (key, st, o = {}) => { cur = []; parts.push({ key, st, items: cur, ...o }); };
  const fill = (d, f, o) => cur.push({ d, f, ...o });
  const line = (d, s, lw, o) => cur.push({ d, s, lw, ...o });
  const glow = (cx, cy, rx, ry, f, a, o) => cur.push({ g: [cx, cy, rx, ry], f, a, ...o });
  const text = (t, x, y, z, f, o) => cur.push({ t, x, y, z, f, ...o });

  // ------------------------------------------------ the bench at dusk
  part('room', 0);
  fill(R(-100, -100, 1800, 1000), 'g:wall');
  glow(1330, 600, 420, 210, 'winGlow', 0.3);
  glow(560, 780, 640, 140, 'wallLow', 0.42);
  // The window: dusk over the hills and the fort, as in the street.
  const WX = 1190, WY = 58, WW = 316, WH = 438;
  fill(R(WX - 14, WY - 14, WW + 28, WH + 28), 'frame');
  fill(R(WX, WY, WW, WH), 'g:sky');
  glow(1300, 430, 260, 110, 'skyGlow', 0.5);
  for (const [x, y, r] of [[1222, 96, 1.4], [1268, 140, 1], [1418, 88, 1.2], [1472, 150, 1], [1240, 214, 0.9], [1392, 196, 0.9], [1488, 236, 1.1]]) fill(E(x, y, r), 'star', { a: 0.7 });
  glow(1446, 124, 40, 40, 'moon', 0.16);
  fill('M1458 128A13 13 0 1 1 1443.6 109.8A11.5 11.5 0 0 0 1458 128Z', 'moon');
  fill(`M${WX} 392C1240 380 1290 372 1330 376S1420 360 1460 366 1500 372 ${WX + WW} 368V${WY + WH}H${WX}Z`, 'ridge');
  fill(`M${WX} 432C1230 426 1262 414 1290 396C1306 386 1318 368 1334 356L1340 352C1364 349 1402 349 1426 352L1432 356C1446 372 1462 388 1484 398C1494 402 1500 404 ${WX + WW} 406V${WY + WH}H${WX}Z`, 'hill');
  const fort = [R(1338, 344, 92, 8), R(1334, 339, 8, 13), R(1424, 340, 8, 12), R(1376, 334, 12, 18)];
  for (let x = 1344; x < 1422; x += 5) fort.push(R(x, 341.5, 2.6, 2.6));
  fill(fort.join(''), 'fort');
  fill(R(WX, 456, WW, 40), 'g:dusk');
  const town = [];
  for (const [x, y] of [[1214, 470], [1236, 476], [1262, 466], [1300, 474], [1336, 468], [1352, 478], [1398, 470], [1440, 476], [1470, 466], [1492, 474]]) town.push(R(x, y, 4, 4));
  fill(town.join(''), 'lit', { a: 0.85 });
  fill(R(WX + WW / 2 - 5, WY, 10, WH) + R(WX, WY + 196, WW, 9), 'frame');
  fill(R(WX - 22, WY + WH + 14, WW + 44, 12), 'sill');
  fill(R(WX - 22, WY + WH + 26, WW + 44, 4), 'shade', { a: 0.6 });

  // The lamp, switched off until the signing: base, two arms, the shade.
  const ELBOW = [1352, 430], FOOT = [1300, 706];
  fill(P([[1246, BENCH - 6], [1354, BENCH - 6], [1344, BENCH - 20], [1256, BENCH - 20]]), 'lamp');
  fill(R(1246, BENCH - 8, 108, 2), 'lampHi', { a: 0.6 });
  line(L([FOOT, ELBOW]), 'lamp', 9);
  line(L([[FOOT[0] + 8, FOOT[1] - 4], [ELBOW[0] + 7, ELBOW[1] + 6]]), 'lampHi', 1.2, { a: 0.45 });
  line(L([ELBOW, HEAD]), 'lamp', 8);
  line(L([[ELBOW[0] - 4, ELBOW[1] - 8], [HEAD[0] + 2, HEAD[1] - 8]]), 'lampHi', 1.2, { a: 0.45 });
  fill(E(...FOOT, 9) + E(...ELBOW, 11) + E(...HEAD, 10), 'lamp');
  fill(E(...ELBOW, 4) + E(...HEAD, 3.6), 'lampHi');
  fill(P(turn([[-8, -18], [72, -50], [72, 50], [-8, 18]], ...HEAD, LAMP_A)), 'lamp');
  fill(P(turn([[-8, -18], [72, -50], [72, -42], [-8, -12]], ...HEAD, LAMP_A)), 'lampHi', { a: 0.5 });
  const mouth = turn([[72, -50], [72, 50]], ...HEAD, LAMP_A);
  const MC = turn([[74, 0]], ...HEAD, LAMP_A)[0];
  const lampIn = P(turn([[70, -46], [76, -46], [76, 46], [70, 46]], ...HEAD, LAMP_A));
  fill(lampIn, 'lampIn');

  // The bench, a mat with a rule along its edge, a tray of glass blanks,
  // a blower, and two stands for the lens, felt on top.
  fill(R(-100, BENCH, 1800, 16), 'benchTop');
  fill(R(-100, BENCH, 1800, 2), 'benchHi', { a: 0.7 });
  fill(R(-100, BENCH + 16, 1800, 200), 'bench');
  fill(R(-100, BENCH + 16, 1800, 10), 'shade', { a: 0.45 });
  fill(R(150, BENCH - 7, 1090, 7), 'mat');
  const ticks = [];
  for (let x = 160, i = 0; x < 1232; x += 10, i++) ticks.push(R(x, BENCH - 7, 1, i % 5 ? 3 : 6));
  fill(ticks.join(''), 'matTick', { a: 0.6 });
  const by = BENCH - 7;
  fill(E(232, by - 28, 21, 25) + P([[226, by - 52], [238, by - 52], [236, by - 76], [228, by - 76]]), 'tray');
  fill(E(224, by - 36, 6, 9), 'lampHi', { a: 0.25 });
  fill(E(338, by - 9, 16, 5) + E(374, by - 11, 13, 4.4) + E(406, by - 8, 15, 4.8) + E(438, by - 10, 12, 4), 'blank');
  fill(E(334, by - 11, 6, 1.4) + E(404, by - 10, 5, 1.3), 'coatV', { a: 0.8 });
  fill(E(372, by - 12, 5, 1.3) + E(436, by - 11, 4, 1.2), 'coatG', { a: 0.8 });
  fill(P([[306, by], [470, by], [462, by - 11], [314, by - 11]]), 'tray');
  fill(R(314, by - 11, 148, 1.6), 'lampHi', { a: 0.4 });
  const sA = [W(606)[0], W(690)[0], W(0, AX + 176)[1]], sB = [W(806)[0], W(880)[0], W(0, AX + 152)[1]];
  fill(P([[sA[0] - 4, BENCH], [sA[1] + 4, BENCH], [sA[1] - 4, sA[2] + 3], [sA[0] + 4, sA[2] + 3]]) + P([[sB[0] - 4, BENCH], [sB[1] + 4, BENCH], [sB[1] - 4, sB[2] + 3], [sB[0] + 4, sB[2] + 3]]), 'stand');
  fill(R(sA[0] + 2, sA[2] - 1, sA[1] - sA[0] - 4, 4) + R(sB[0] + 2, sB[2] - 1, sB[1] - sB[0] - 4, 4), 'pad');
  fill(R(sA[0] + 6, sA[2] + 3, 1.6, BENCH - sA[2] - 3) + R(sB[0] + 6, sB[2] + 3, 1.6, BENCH - sB[2] - 3), 'lampHi', { a: 0.25 });

  // ------------------------------------------------ 3 · inside the barrel
  // The bore behind the glass: the far wall, seen through the cut.
  const lens = (key, st, o) => part(key, st, { ...o, lens: true });
  lens('bore', 3);
  fill(L(BORE.flatMap(([a, b, r]) => [[a, AX - r], [b, AX - r]]).concat([[1000, AX], [540, AX]])) + 'z', 'bore');
  const baffles = [];
  for (let x = 620; x < 730; x += 9) baffles.push(R(x, AX - 132, 1.2, 132));
  for (let x = 760; x < 832; x += 9) baffles.push(R(x, AX - 124, 1.2, 124));
  fill(baffles.join(''), 'boreLine', { a: 0.45 });

  // ------------------------------------------------------ 1 · the glass
  const els = GLASS.map(element);
  const glassOutline = els.map((e) => e.d).join('');
  lens('glass', 1, { hl: glassOutline, from: [-24, 0] });
  glow(582, AX - 30, 110, 170, 'coatV', 0.22);
  glow(842, AX + 10, 100, 140, 'coatG', 0.16);
  glow(700, AX, 220, 120, 'glassGlow', 0.16);
  fill(glassOutline, 'glass', { a: 0.6 });
  // A lighter body inside each element, and the blackened edges.
  fill(GLASS.map((e) => element({ ...e, h: e.h * 0.62 }).d).join(''), 'glassHi', { a: 0.14 });
  fill(GLASS.map((e, i) => R(els[i].x1 - 0.5, AX - e.h, els[i].x2 - els[i].x1 + 1, 2.4) + R(els[i].x1 - 0.5, AX + e.h - 2.4, els[i].x2 - els[i].x1 + 1, 2.4)).join(''), 'glassEdge');
  // The coatings: violet on the front faces, green on the back.
  line(els.filter((e, i) => !GLASS[i].cem).map((e) => e.front).join(''), 'coatV', 2.4, { a: 0.95 });
  line(els.filter((e, i) => !(GLASS[i + 1] && GLASS[i + 1].cem)).map((e) => e.back).join(''), 'coatG', 1.8, { a: 0.85 });
  line(els.filter((e, i) => GLASS[i].cem).map((e) => e.front).join(''), 'glassHi', 1, { a: 0.7 });
  fill(GLASS.filter((e) => !e.cem).map((e) => { const y = -e.h * 0.56; return E(e.v + sag(e.R1, y) + 4, AX + y, 2.2, 10); }).join(''), 'glint', { a: 0.75 });
  fill(GLASS.filter((e) => !e.cem).map((e) => { const y = e.h * 0.4; return E(e.v + sag(e.R1, y) + 3, AX + y, 1.4, 5); }).join(''), 'glint', { a: 0.4 });

  // The light: over the glass, under the barrel.
  lens('rays', 1);
  line(`M300 ${AX}H1080`, 'axis', 1, { a: 0.5, dash: '14 6 3 6' });
  for (const h of RAYS.h) {
    line(ray(h, 0, 4), 'g:ray', 1.4, { a: 0.75 });
    line(ray(h, 4, 7), 'ray', 1.4, { a: rayClears(h, IRIS.open) ? 0.6 : 0, cls: 'ck-ray-b', data: h });
  }

  // ------------------------------------------------------- 2 · the iris
  const H0 = IRIS.house[0], H1 = IRIS.house[1], ix = IRIS.x;
  lens('iris', 2, { hl: R(ix - 8, AX - H1, 16, 2 * H1), from: [0, -16] });
  glow(ix, AX, 44, 160, 'hlGlow', 0, { cls: 'ck-cur-glow' });
  fill(cut([[ix - 8, H0], [ix - 8, H1], [ix + 8, H1], [ix + 8, H0], [ix + 4, H0], [ix + 4, H1 - 6], [ix - 4, H1 - 6], [ix - 4, H0]]), 'cut', { o: 'cutEdge' });
  fill(R(ix - 8, AX, 16, H1), 'anod');
  fill(R(ix - 8, AX + 6, 16, H1 * 0.16), 'anodHi', { a: 0.5 });
  fill(R(ix - 8, AX + H1 * 0.62, 16, H1 * 0.38), 'anodLo', { a: 0.75 });
  fill(R(ix - 8.7, AX, 1.4, H1) + R(ix + 7.3, AX, 1.4, H1), 'edge', { a: 0.5 });
  fill(irisSide(IRIS.open), 'blade', { cls: 'ck-iris-side', o: 'bladeEdge' });

  // --------------------------------------- 3 · barrel and focus ring
  const profile = (from, to) => {
    const segs = OUT.filter(([a, b]) => a >= from && b <= to);
    return P(segs.flatMap(([a, b, r]) => [[a, AX - r], [b, AX - r]]).concat(segs.slice().reverse().flatMap(([a, b, r]) => [[b, AX + r], [a, AX + r]])));
  };
  lens('barrel', 3, { hl: profile(540, 900), from: [0, 20] });
  // The cut (top half): bare metal under the black skin, part by part.
  const front = cut([[540, 140], [540, 160], [546, 166], [594, 166], [594, 150], [552, 150], [552, 140]]);
  const sleeve = cut([[594, 162], [594, 170], [604, 170], [604, 176], [692, 176], [692, 170], [704, 170], [704, 168], [766, 168], [766, 162]]);
  const tube = cut([[594, 150], [594, 154], [766, 154], [766, 150], [786, 150], [786, 124], [752, 124], [752, 128], [736, 128], [736, 132], [612, 132], [612, 150]]);
  const index = cut([[766, 150], [766, 160], [778, 160], [778, 150]]);
  const shell = cut([[786, 144], [786, 152], [900, 152], [900, 144]]);
  const cell = cut([[786, 124], [786, 144], [900, 144], [900, 116], [836, 116], [836, 124]]);
  fill(front + sleeve + index + shell, 'cut', { o: 'cutEdge' });
  fill(tube + cell, 'cut2', { o: 'cutEdge' });
  fill(cut([[778, 150], [778, 161], [786, 161], [786, 150]]), 'ring', { o: 'cutEdge' });
  // The focus helicoid: two threads in mesh between the sleeve and the tube.
  fill(cut([[598, 154], [598, 162], [764, 162], [764, 154]]), 'threadGap');
  const tIn = [[598, 154]], tOut = [[598, 162]];
  for (let x = 598; x < 762; x += 6) { tIn.push([x + 3, 159.5], [x + 6, 154]); tOut.push([x + 3, 156.5], [x + 6, 162]); }
  tIn.push([764, 154]); tOut.push([764, 162]);
  fill(cut(tIn) + cut(tOut), 'thread');
  // The skin: the thin black anodised layer on every outer face.
  fill(OUT.filter(([, b]) => b <= 900).map(([a, b, r]) => R(a, AX - r, b - a, 2.6)).join(''), 'anod');
  // The outside (bottom half): black anodised, the light along it.
  const segs = OUT.filter(([, b]) => b <= 900);
  fill(segs.filter((s) => s[3] !== 'ring').map(([a, b, r]) => low(a, b, 0, r)).join(''), 'anod');
  fill(segs.filter((s) => s[3] === 'ring').map(([a, b, r]) => low(a, b, 0, r)).join(''), 'ring');
  fill(segs.map(([a, b, r]) => low(a, b, r * 0.1, r * 0.28)).join(''), 'anodHi', { a: 0.42 });
  fill(segs.map(([a, b, r]) => low(a, b, r * 0.56, r * 0.8)).join(''), 'anodLo', { a: 0.45 });
  fill(segs.map(([a, b, r]) => low(a, b, r * 0.8, r)).join(''), 'anodLo', { a: 0.8 });
  fill(segs.map(([a, b, r]) => low(a, b, r * 0.955, r * 0.97)).join(''), 'edge', { a: 0.3 });
  fill(segs.filter((s) => s[3] === 'ring').map(([a, b, r]) => low(a, b, r * 0.1, r * 0.28)).join(''), 'ringHi', { a: 0.6 });
  // The knurl: ridges along the grip, closer together towards the edge.
  const ridge = [], ridgeHi = [];
  for (let k = 1; k < 15; k++) {
    const th = k * 6 * Math.PI / 180, y = AX + 176 * Math.sin(th), w = Math.max(0.7, 2.6 * Math.cos(th));
    ridge.push(R(606, y, 84, w));
    ridgeHi.push(R(606, y - Math.max(0.5, 1.2 * Math.cos(th)), 84, Math.max(0.4, 0.9 * Math.cos(th))));
  }
  fill(ridge.join(''), 'anodLo', { a: 0.9 });
  fill(ridgeHi.join(''), 'anodHi', { a: 0.4 });
  // Bare machined edges at each step and part, and the cut line.
  const edges = [];
  for (let i = 1; i < segs.length; i++) {
    const [a, , r] = segs[i], rp = segs[i - 1][2];
    edges.push(R(a - 0.7, AX, 1.4, Math.max(r, rp)));
  }
  fill(edges.join(''), 'edge', { a: 0.45 });
  fill(R(540, AX - 1, 360, 2), 'edge', { a: 0.75 });
  fill(R(539.3, AX - 160, 1.4, 320), 'edge', { a: 0.5 });
  // The distance scale: metres in white, feet in amber, squeezed as the
  // ring turns away; the index mark on the fixed ring.
  const SCALE = [['∞', '∞', 10], ['5', '15', 20], ['3', '10', 28], ['2', '6', 36], ['1.5', '5', 44], ['1', '3', 53], ['.7', '2', 62], ['.45', '1.5', 72]];
  const stTicks = [];
  for (const [m, ft, deg] of SCALE) {
    const th = deg * Math.PI / 180, y = AX + 168 * Math.sin(th), sy = Math.cos(th);
    text(m, 730, y, 12.5, 'engrave', { sy, w: 500 });
    text(ft, 755, y, 9.5, 'feet', { sy, w: 500 });
    stTicks.push(R(706, y - 0.5 * sy, 9, Math.max(0.5, 1.2 * sy)));
  }
  fill(stTicks.join(''), 'engrave', { a: 0.85 });
  const iy = AX + 168 * Math.sin(10 * Math.PI / 180);
  fill(P([[778, iy - 4], [778, iy + 4], [769, iy]]), 'feet');
  // The front ring's name, and the maker's mark on the rear barrel.
  text(`${LENS.name}  ${LENS.mm}`, 570, AX + 80, 13, 'engrave', { rot: 90, ls: 2.6, w: 500 });
  text('KESSEL', 843, AX + 40, 18, 'engrave', { ls: 4.4, w: 600 });
  text('HAND ASSEMBLED', 843, AX + 56, 7.4, 'engrave', { ls: 1.5, w: 500, a: 0.8 });
  text('PUNE', 843, AX + 66, 7.4, 'engrave', { ls: 1.5, w: 500, a: 0.8 });

  // ------------------------------------------------------ 4 · assembly
  // The retaining rings that seat each group in its cell, then the mount.
  lens('rings', 4, { from: [0, -8] });
  const rr = [];
  for (const e of GLASS) {
    if (e.cem) continue;
    const x1 = e.v + sag(e.R1, e.h), ri = boreAt(x1 + 1);
    if (ri - e.h < 3) continue;
    rr.push(cut([[x1 - 6, e.h - 4], [x1 - 6, ri], [x1, ri], [x1, e.h - 4]]));
  }
  fill(rr.join(''), 'ringSteel', { o: 'cutEdge' });
  lens('mount', 4, { hl: profile(900, 1000), from: [30, 0] });
  // The stainless PL mount: flange, locking ring, rear, bare steel.
  fill(cut([[900, 108], [900, 132], [924, 132], [924, 124], [950, 124], [950, 100], [1000, 100], [1000, 86], [958, 86], [958, 108]]), 'steelCut', { o: 'cutEdge' });
  const mo = [[900, 924, 132], [924, 950, 124], [950, 1000, 100]];
  fill(mo.map(([a, b, r]) => low(a, b, 0, r)).join(''), 'steel');
  fill(mo.map(([a, b, r]) => low(a, b, r * 0.1, r * 0.26)).join(''), 'steelHi', { a: 0.75 });
  fill(mo.map(([a, b, r]) => low(a, b, r * 0.6, r)).join(''), 'steelLo', { a: 0.75 });
  const grooves = [];
  for (const x of [906, 912, 918]) grooves.push(low(x, x + 1, 0, 132));
  for (let k = 1; k < 9; k++) { const y = 124 * Math.sin(k * 10 * Math.PI / 180); grooves.push(low(927, 947, y - 2, y + 2)); }
  fill(grooves.join(''), 'steelLo', { a: 0.6 });
  fill(low(928, 946, 124, 129), 'steel');
  fill(R(900 - 0.7, AX, 1.4, 152) + R(924 - 0.7, AX, 1.4, 132) + R(950 - 0.7, AX, 1.4, 124) + R(1000 - 1.4, AX - 100, 1.4, 200), 'edge', { a: 0.85 });
  fill(R(900, AX - 1, 100, 2), 'edge', { a: 0.75 });
  // The image the lens makes: the light comes to a point.
  lens('focus', 4);
  glow(RAYS.xs[7], AX, 26, 26, 'lit', 0.8);
  fill(E(RAYS.xs[7], AX, 2.6), 'glint');
  line(`M${RAYS.xs[7]} ${AX - 60}V${AX + 60}`, 'axis', 1, { a: 0.5, dash: '4 5' });

  // ------------------------------------------------------- 5 · signing
  // The signature, then the pen, its nib at the end of the line.
  const sig = moveD(SIGN, ...SIGN_AT), under = moveD(UNDER, ...SIGN_AT);
  lens('sign', 5, { hl: sig, hlStroke: true });
  line(sig, 'sign', 1.8, { cls: 'ck-sig' });
  line(under, 'sign', 1.2, { cls: 'ck-sig', a: 0.9 });
  const PEN = { nib: [[0, 0], [16, -4.6], [26, -6.6], [26, 6.6], [16, 4.6]], grip: [[26, -7.4], [50, -8.4], [50, 8.4], [26, 7.4]], body: [[50, -9.4], [214, -9.4], [222, -6], [222, 6], [214, 9.4], [50, 9.4]], band: [[50, -9.4], [58, -9.4], [58, 9.4], [50, 9.4]], hi: [[60, -7], [212, -7], [212, -4], [60, -4]] };
  lens('pen', 5, { from: [36, 26], at: [SIGN_AT[0] + 88, SIGN_AT[1] + 33] });
  const pen = (pts) => P(turn(pts, 0, 0, PEN_ANGLE));
  fill(pen(PEN.body), 'pen');
  fill(pen(PEN.hi), 'penHi', { a: 0.5 });
  fill(pen(PEN.grip), 'penGrip');
  fill(pen(PEN.band), 'penBand');
  fill(pen(PEN.nib), 'nib');
  line(L(turn([[1.5, 0], [17, 0]], 0, 0, PEN_ANGLE)), 'penGrip', 0.9);
  fill(E(...turn([[17.5, 0]], 0, 0, PEN_ANGLE)[0], 1.5), 'penGrip');
  // The lamp on: its light pooled on the rear barrel.
  part('lamp', 5);
  const far = turn([[460, -210], [460, 210]], ...HEAD, LAMP_A);
  fill(P([mouth[0], far[0], far[1], mouth[1]]), 'g:cone', { a: 0.45 });
  glow(...W(850, 560), 210, 140, 'lampGlow', 0.4);
  glow(MC[0], MC[1], 70, 70, 'lampBulb', 0.8);
  fill(lampIn, 'lampBulb');

  // ------------------------------------------- 2 · the iris, face on
  // A detail over the lens: the eleven blades in their housing, the light
  // through the opening; a leader runs down to the iris in the cut.
  const [cx, cy] = [IRIS.cx, IRIS.cy], r = IRIS.r, fr = IRIS.field;
  const leadEnd = W(0, AX - H1 - 2)[1];
  part('callout', 2, { hl: E(cx, cy, r + 3), from: [0, -14] });
  glow(cx, cy, 150, 150, 'hlGlow', 0, { cls: 'ck-cur-glow' });
  line(`M${cx} ${cy + r + 2}V${leadEnd}`, 'leader', 1.2, { a: 0.8 });
  fill(E(cx, leadEnd, 3.4), 'leader');
  fill(E(cx, cy, fr), 'g:irisLight');
  glow(cx, cy, 44, 44, 'lit', 0.5);
  const face = irisFace(IRIS.open);
  fill(face.field, 'blade', { cls: 'ck-iris-field' });
  line(face.edges, 'bladeEdge', 1.1, { cls: 'ck-iris-edges', a: 0.9 });
  fill(`M${n(cx - r)} ${cy}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0z` + `M${n(cx - fr)} ${cy}a${fr} ${fr} 0 1 0 ${2 * fr} 0a${fr} ${fr} 0 1 0 ${-2 * fr} 0z`, 'anod');
  line(E(cx, cy, r - 0.8) + E(cx, cy, fr + 0.6), 'edge', 1.2, { a: 0.8 });
  fill(Array.from({ length: IRIS.n }, (_, i) => { const t = -Math.PI / 2 + i * TAU / IRIS.n; return E(cx + (fr + r) / 2 * Math.cos(t), cy + (fr + r) / 2 * Math.sin(t), 2.1); }).join(''), 'steel');

  // --------------------------------------------------------- labels
  // One short label per stage, shown while that stage is current; world
  // units. The ones at the sides only show where the frame is wide.
  const g1 = W(560, AX - 70), grip = W(620, AX + 110), mount = W(1000, AX + 70);
  const labels = [
    { st: 1, t: '7 elements · 5 groups', x: 470, y: 330, anchor: 'end', lead: L([[474, 340], g1]), side: true },
    { st: 2, t: '11 blades', x: cx + r + 22, y: cy - 6, anchor: 'start', sub: 'Face on' },
    { st: 3, t: 'Knurled focus ring', x: 470, y: 600, anchor: 'end', sub: 'Engraved scale', lead: L([[474, 596], grip]), side: true },
    { st: 4, t: 'PL mount', x: mount[0] + 30, y: mount[1] + 4, anchor: 'start', sub: 'Stainless', lead: L([[mount[0] + 24, mount[1]], mount]) },
  ];

  return { parts, labels };
}

// Every colour key the drawing uses, for the stylesheet to define.
export function sceneKeys(S = scene()) {
  const keys = new Set();
  for (const p of S.parts) for (const it of p.items) for (const k of [it.f, it.s, it.o]) if (k && !k.startsWith('g:')) keys.add(k);
  for (const g of Object.values(GRADS)) for (const s of g.stops) keys.add(s[1]);
  return [...keys];
}
