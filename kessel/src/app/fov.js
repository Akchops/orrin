// See the difference: the field-of-view viewer. One street drawn in code,
// and the frame each of the three lenses sees from the same spot. The wide
// takes in the whole street, the standard crops in, the long crops tight
// on the person and lets the shops behind go soft.
//
// This file is data only, shared by the build and the page. The lens
// figures, the frames and the scene (a list of path, text and glow items
// in world units, layer by layer) are drawn by kessel/src/site/fov-svg.js
// as an inline SVG at build time, so the viewer reads without JavaScript;
// kessel/src/site/fov-live.js then turns each one into a live viewer that
// crops that SVG as the lens changes. Changing the lens from one spot is a
// pure crop (the perspective stays), so nothing moves but the frame and
// the blur behind the person.
//
// Colours are never written here. Every fill names a key, and the key is a
// custom property in kessel/src/styles/fov.css (--fk-sky0, --fk-hill, ...)
// mixed from the site's tokens, so the street follows the page's palette.

// --------------------------------------------------------------- lenses
// Names and roles are proposals. Focal lengths are sample figures on full
// frame (36 x 24 mm); everything else follows from them: the horizontal
// angle of view is 2 * atan(18 / f) and each frame's width goes as 1 / f.
export const LENSES = [
  { id: 'shaniwar', name: 'Shaniwar', role: 'Wide', mm: 24,
    sees: 'Takes in the whole street: the fort on the hill, every shop, the parked scooter and both lamps.' },
  { id: 'parvati', name: 'Parvati', role: 'Standard', mm: 50,
    sees: 'Crops in to the person and the shops behind them, close to the way your eye frames a scene.' },
  { id: 'sinhagad', name: 'Sinhagad', role: 'Long', mm: 100,
    sees: 'Crops tight on the person. The shops behind fall out of focus into soft light.' },
];
export const angle = (mm) => 2 * Math.atan(18 / mm) * 180 / Math.PI;
for (const l of LENSES) l.deg = Math.round(angle(l.mm));
export const lensById = (id) => LENSES.find((l) => l.id === id) || LENSES[0];

// -------------------------------------------------------------- geometry
// The world is 1000 x 640 units. Each frame is 3:2. The wide is centred on
// the street; the standard and the long are aimed at the person, the long
// cut below the knee like a portrait.
export const WORLD = { w: 1000, h: 640 };
export const WIDE_W = 860;
export const AIM = { shaniwar: [500, 330], parvati: [578, 432], sinhagad: [640, 466] };
export const FRAMES = Object.fromEntries(LENSES.map((l) => {
  const w = WIDE_W * LENSES[0].mm / l.mm, [cx, cy] = AIM[l.id];
  return [l.id, { x: cx - w / 2, y: cy - w / 3, w, h: w / 1.5 }];
}));
// The person: feet at x, y, h tall.
export const SUBJECT = { x: 610, y: 548, h: 106 };
// How much each lens blurs the layers behind the person (a standard
// deviation in world units, wide to long): at one aperture a longer lens
// has less depth of field, so the shops go soft and the fort softer.
export const BLUR = { far: [0, 1.6, 5.5], mid: [0, 0.9, 3.4] };

// ---------------------------------------------------------- path helpers
// Every closed shape runs clockwise, so shapes merged into one path never
// cut holes in each other.
const n = (v) => Math.round(v * 10) / 10;
const R = (x, y, w, h) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`;
const E = (cx, cy, rx, ry = rx) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 1 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 1 ${n(-2 * rx)} 0z`;
const P = (pts) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'z';
// A window with a round head.
const A = (x, y, w, h) => { const r = w / 2; return `M${n(x)} ${n(y + h)}v${n(r - h)}a${n(r)} ${n(r)} 0 0 1 ${n(w)} 0v${n(h - r)}z`; };
// A shape drawn in local units (absolute commands only), moved to ox, oy,
// scaled by s and mirrored when fx is -1.
function place(d, ox, oy, s = 1, fx = 1) {
  const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
  let out = '', cmd = '', i = 0;
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; out += cmd; if (!ARGS[cmd]) continue; }
    const k = ARGS[cmd], a = tok.slice(i, i + k).map(Number); i += k;
    const X = (v) => n(ox + v * s * fx), Y = (v) => n(oy + v * s);
    if (cmd === 'A') out += `${n(a[0] * s)} ${n(a[1] * s)} ${a[2]} ${a[3]} ${fx < 0 ? 1 - a[4] : a[4]} ${X(a[5])} ${Y(a[6])} `;
    else if (cmd === 'H') out += X(a[0]) + ' ';
    else if (cmd === 'V') out += Y(a[0]) + ' ';
    else for (let j = 0; j < k; j += 2) out += `${X(a[j])} ${Y(a[j + 1])} `;
  }
  return out.trim();
}
// A slack wire between two points.
const wire = (x0, y0, x1, y1, sag) => `M${x0} ${y0}Q${n((x0 + x1) / 2)} ${n((y0 + y1) / 2 + sag * 2)} ${x1} ${y1}`;
// A small deterministic hash, so the lit windows are the same every time.
const lit = (a, b) => ((a * 73 + b * 151) % 11) < 4;

// ------------------------------------------------------------- gradients
// Linear gradients in world units: [x1, y1, x2, y2] and [offset, key, alpha].
export const GRADS = {
  sky: { x: [0, 0, 0, 300], stops: [[0, 'sky0'], [0.48, 'sky1'], [1, 'sky2']] },
  haze: { x: [0, 150, 0, 300], stops: [[0, 'sky2', 0], [1, 'sky2', 0.75]] },
  shade: { x: [0, 150, 0, 400], stops: [[0, 'shade', 0.55], [1, 'shade', 0]] },
  shop: { x: [0, 388, 0, 466], stops: [[0, 'shop0'], [1, 'shop1']] },
  road: { x: [0, 487, 0, 640], stops: [[0, 'road0'], [1, 'road1']] },
};

// The far ridge, the fort's hill and the scooter, drawn by hand.
const RIDGE = 'M-200 246C-130 232 -60 218 20 222S150 206 230 212 360 200 440 206 600 196 690 202 840 210 900 200 1060 206 1200 228L1200 700L-200 700Z';
const HILL = 'M-200 298C-80 288 40 268 140 236C200 214 240 168 286 132L300 124C360 116 480 114 546 120L560 126C596 152 636 192 700 218C780 248 880 262 1200 272L1200 700L-200 700Z';
const STARS = [[80, 58, 1], [152, 30, 0.8], [236, 76, 0.9], [520, 42, 1.1], [612, 84, 0.8], [700, 28, 0.9], [770, 64, 1], [938, 40, 0.8], [990, 112, 0.9], [36, 124, 0.7], [410, 66, 0.7]];
// The person, feet at 0 0, 118 tall: a long kurta, a bag across the body.
const FIG = [
  'M-8 -108A8 9.6 0 1 1 8 -108A8 9.6 0 1 1 -8 -108Z',
  'M-3 -100L3 -100L3 -93L-3 -93Z',
  'M-15 -95C-8 -98 8 -98 15 -95C18 -94 19 -90 19 -86L16 -60L19 -38L-19 -38L-16 -60L-19 -86C-19 -90 -18 -94 -15 -95Z',
  'M-19 -88L-15 -84C-18 -76 -19 -64 -19 -52L-23 -52C-24 -64 -22 -78 -19 -88Z',
  'M15 -84L19 -88C22 -78 24 -64 23 -52L19 -52C19 -64 18 -76 15 -84Z',
  'M-24 -49A2.6 3.4 0 1 1 -18.8 -49A2.6 3.4 0 1 1 -24 -49Z',
  'M18.4 -49A2.6 3.4 0 1 1 23.6 -49A2.6 3.4 0 1 1 18.4 -49Z',
  'M-13 -38L-2 -38L-5 -3L-12 -3Z',
  'M2 -38L13 -38L12 -3L5 -3Z',
  'M-14 -1.6A5 2 0 1 1 -4 -1.6A5 2 0 1 1 -14 -1.6Z',
  'M4 -1.6A5 2 0 1 1 14 -1.6A5 2 0 1 1 4 -1.6Z',
  'M14 -66L26 -66L26 -48L14 -48Z',
].join('');
const SCOOTER = {
  tyre: 'M18 -12A12 12 0 1 1 42 -12A12 12 0 1 1 18 -12ZM106 -12A12 12 0 1 1 130 -12A12 12 0 1 1 106 -12Z',
  hub: 'M25 -12A5 5 0 1 1 35 -12A5 5 0 1 1 25 -12ZM113 -12A5 5 0 1 1 123 -12A5 5 0 1 1 113 -12Z',
  body: 'M6 -28C6 -48 26 -58 52 -56L74 -54L76 -30L50 -26C46 -36 16 -36 12 -26ZM70 -32L104 -32L104 -24L70 -24ZM98 -26C100 -44 100 -64 98 -80L108 -82C116 -66 118 -44 112 -24ZM104 -20C106 -32 130 -32 134 -20L130 -18C126 -26 110 -26 108 -18Z',
  shine: 'M14 -46C22 -54 44 -57 62 -55L62 -52C44 -53 24 -51 16 -44ZM101 -74C103 -60 103 -44 101 -30L103 -30C106 -44 106 -60 103 -76Z',
  dark: 'M20 -58C24 -64 60 -64 66 -58L64 -54L22 -54ZM100 -94L105 -94L105 -80L100 -80ZM92 -96L124 -98L124 -92L92 -91Z',
  lamp: 'M120 -94A4.2 4.2 0 1 1 128.4 -94A4.2 4.2 0 1 1 120 -94Z',
  tail: 'M4 -42L9 -42L9 -35L4 -35Z',
  mirror: 'M93 -110A4 2.6 0 1 1 101 -110A4 2.6 0 1 1 93 -110Z',
};
// A street lamp, base at 0 0, arm reaching to +x.
const LAMP = {
  post: 'M-9 0L-9 -10L-6 -14L-6 -36L-4 -40L-3 -40L-2 -452L2 -452L3 -40L4 -40L6 -36L6 -14L9 -10L9 0ZM-3.5 -456A3.5 3.5 0 1 1 3.5 -456A3.5 3.5 0 1 1 -3.5 -456ZM40 -448L56 -448L52 -444L44 -444ZM45 -432L51 -432L51 -430L45 -430Z',
  arm: 'M0 -440C14 -452 34 -457 48 -450',
  curl: 'M2 -428C10 -430 17 -438 14 -446',
  glass: 'M44 -444L52 -444L51 -432L45 -432Z',
};

// -------------------------------------------------------------- the scene
// Items: { d, f } a filled path, { d, s, lw } a stroke, { t, x, y, z, f }
// a sign's lettering, { g: [cx, cy, rx, ry], f } a soft glow. `a` is an
// alpha, `fine` marks detail the small SVG leaves out.
export function scene() {
  const L = { far: [], mid: [], subj: [], near: [] };
  let cur;
  const fill = (d, f, o) => cur.push({ d, f, ...o });
  const line = (d, s, lw, o) => cur.push({ d, s, lw, ...o });
  const glow = (cx, cy, rx, ry, f, a, o) => cur.push({ g: [cx, cy, rx, ry], f, a, ...o });
  const text = (t, x, y, z, f, o) => cur.push({ t, x, y, z, f, ...o });

  // Far: the dusk sky, the far ridge and the fort on its hill.
  cur = L.far;
  fill(R(-200, -200, 1400, 900), 'g:sky');
  glow(400, 250, 560, 300, 'glow', 0.34);
  for (const [x, y, r] of STARS) fill(E(x, y, r), 'star', { a: 0.6, fine: true });
  glow(858, 94, 46, 46, 'moon', 0.14);
  fill('M870.7 99.8A14 14 0 1 1 855.1 80.3A12.5 12.5 0 0 0 870.7 99.8Z', 'moon');
  fill(RIDGE, 'ridge');
  fill(HILL, 'hill');
  // The fort: a crenellated wall along the plateau, two round bastions, a
  // gate tower, and walls stepping down both slopes.
  const fort = [R(300, 111, 248, 14), R(290, 104, 18, 22), R(540, 106, 18, 22), R(410, 99, 28, 26),
    P([[262, 150], [290, 122], [290, 129], [262, 157]]), P([[558, 122], [602, 158], [602, 165], [558, 129]])];
  for (let x = 302; x < 538; x += 7) fort.push(R(x, 107.5, 4, 3.6));
  for (const [x0, top] of [[290, 104], [540, 106], [410, 99]]) for (let x = x0; x < x0 + (x0 === 410 ? 28 : 18) - 2; x += 6) fort.push(R(x, top - 3.6, 3.6, 3.6));
  fill(fort.join(''), 'fort');
  fill(A(420, 111, 8, 14), 'hill');
  fill(R(300, 111, 248, 1.4) + R(410, 99, 28, 1.4), 'fortHi', { fine: true });
  fill(R(-200, 150, 1400, 200), 'g:haze');

  // Mid: the far pavement and the road, a tree, the row of shops.
  cur = L.mid;
  fill(R(-200, 466, 1400, 20), 'pave');
  fill(R(-200, 484, 1400, 3), 'kerb');
  fill(R(-200, 487, 1400, 220), 'g:road');
  // The tree stands in the alley between the third and fourth houses.
  fill(R(366, 236, 7, 232), 'trunk');
  fill(E(370, 214, 24) + E(348, 232, 19) + E(394, 230, 20) + E(370, 244, 21) + E(356, 204, 14) + E(388, 202, 13), 'tree');
  fill(E(362, 206, 9) + E(384, 214, 8) + E(350, 226, 7), 'leaf', { a: 0.55, fine: true });

  const BASE = 466, GF = 120, FL = 84;
  const B = [
    { x: -60, w: 178, n: 3, f: 'b1', cols: 4, balc: [2], shop: { sign: 'CYCLES', board: 'board', ink: 'ink', shutter: true } },
    { x: 118, w: 144, n: 2, f: 'b2', roof: 'tile', cols: 3, balc: [1], shop: { sign: 'CHAI', board: 'boardA', ink: 'inkD', awn: 'awnA', bulbs: 2 } },
    { x: 262, w: 98, n: 3, f: 'b3', cols: 2, win: 'arch', door: true },
    { x: 376, w: 184, n: 2, f: 'b4', par: 24, cols: 3, win: 'arch', jharokha: true, shop: { sign: 'BOOKS', board: 'boardB', ink: 'ink', awn: 'awnV', books: true } },
    { x: 560, w: 140, n: 2, f: 'b5', cols: 2, balc: [1], shop: { sign: 'SWEETS', board: 'boardG', ink: 'ink', awn: 'awnG', jars: true, bulbs: 3 } },
    { x: 700, w: 136, n: 3, f: 'b6', cols: 2, balc: [1, 2], plants: true, shop: { sign: 'TAILOR', board: 'board', ink: 'inkV', bulbs: 1 } },
    { x: 836, w: 224, n: 2, f: 'b7', roof: 'tile', cols: 4, shop: { sign: 'HARDWARE', board: 'boardA', ink: 'inkD', awn: 'awnA', shutter: true } },
  ];
  const shade = [];
  for (const b of B) {
    const top = BASE - GF - FL * (b.n - 1), par = b.roof === 'tile' ? 0 : (b.par ?? 12);
    const face = R(b.x, top - par, b.w, BASE - top + par);
    fill(face, b.f);
    shade.push(face);
    if (b.roof === 'tile') {
      fill(P([[b.x + 12, top - 22], [b.x + b.w - 12, top - 22], [b.x + b.w + 6, top + 2], [b.x - 6, top + 2]]), 'tile');
      fill(R(b.x - 6, top, b.w + 12, 3), 'rail');
    } else {
      fill(R(b.x - 2, top - par, b.w + 4, 4), 'cornice');
      if (b.par) fill(R(b.x + b.w / 2 - 26, top - par - 12, 52, 12), b.f);
    }
    // A water tank on the first roof.
    if (b.x < 0) { fill(R(30, top - par - 26, 30, 26) + E(45, top - par - 26, 15, 4), 'tank'); }
  }
  // Dusk: the facades darken upwards, away from the shop lights.
  fill(shade.join(''), 'g:shade');
  for (const b of B) {
    // Upper floors: windows, balconies, plants.
    for (let i = 1; i < b.n; i++) {
      const fb = BASE - GF - FL * (i - 1), ft = fb - FL;
      const balc = b.balc && b.balc.includes(i);
      fill(R(b.x, fb - 3, b.w, 3), 'band', { fine: true });
      const ww = b.win === 'arch' ? 16 : 18, wh = balc ? FL - 24 : 36, wy = balc ? ft + 18 : ft + 18;
      const gap = (b.w - b.cols * ww) / (b.cols + 1);
      const on = [], off = [], sill = [];
      for (let c = 0; c < b.cols; c++) {
        const wx = b.x + gap + c * (ww + gap);
        if (b.jharokha && c === 1) continue;
        (lit(b.x + 97, i * 5 + c) ? on : off).push((b.win === 'arch' ? A : R)(wx, wy, ww, wh));
        sill.push(R(wx - 2, wy + wh, ww + 4, 2.2));
      }
      if (off.length) fill(off.join(''), 'win');
      if (on.length) fill(on.join(''), 'lit');
      fill(sill.join(''), 'sill', { fine: true });
      if (balc) {
        const bars = [];
        for (let x = b.x + 10; x < b.x + b.w - 8; x += 5) bars.push(R(x, fb - 20, 1.3, 16));
        fill(R(b.x + 4, fb - 5, b.w - 8, 5) + R(b.x + 6, fb - 23, b.w - 12, 2.6), 'rail');
        fill(bars.join(''), 'rail', { fine: true });
        if (b.plants) fill(E(b.x + 22, fb - 26, 7, 6) + E(b.x + 31, fb - 28, 6, 7) + E(b.x + b.w - 26, fb - 26, 7, 6), 'leaf');
      }
    }
    // A covered balcony at the middle of the fourth house.
    if (b.jharokha) {
      const cx = b.x + b.w / 2, ft = BASE - GF - FL;
      fill(P([[cx - 30, ft + 8], [cx + 30, ft + 8], [cx + 26, ft + 16], [cx - 26, ft + 16]]) + R(cx - 24, ft + 16, 48, 46) + R(cx - 28, ft + 62, 56, 6), 'rail');
      fill(A(cx - 18, ft + 22, 16, 34) + A(cx + 2, ft + 22, 16, 34), 'lit');
    }
    // Ground floor.
    if (b.door) {
      const cx = b.x + b.w / 2;
      fill(R(cx - 15, BASE - 82, 30, 82), 'rail');
      fill(R(cx - 12, BASE - 78, 24, 78), 'door');
      fill(A(cx - 12, BASE - 98, 24, 16), 'lit');
      fill(R(b.x + 10, BASE - 72, 14, 24) + R(b.x + b.w - 24, BASE - 72, 14, 24), 'win');
      continue;
    }
    const s = b.shop, ox = b.x + 12, ow = b.w - 24, cx = b.x + b.w / 2;
    fill(R(b.x + 8, BASE - GF + 6, b.w - 16, 18), s.board);
    text(s.sign, cx, BASE - GF + 15.5, 10, s.ink, { ls: 2 });
    fill(R(ox, 388, ow, 78), 'g:shop');
    if (s.books) {
      const k = ['awnV', 'awnA', 'awnG', 'sill'], rows = [];
      for (let r = 0; r < 3; r++) for (let x = ox + 4, j = 0; x < ox + ow - 6; j++) {
        const w = 3 + ((j * 7 + r * 3) % 4), h = 12 + ((j * 5 + r) % 4) * 1.5;
        rows.push([k[(j + r) % 4], R(x, 404 + r * 20 - h + 14, w, h)]); x += w + 1;
      }
      for (const key of k) fill(rows.filter((q) => q[0] === key).map((q) => q[1]).join(''), key, { fine: true });
      fill(R(ox, 417, ow, 2) + R(ox, 437, ow, 2) + R(ox, 457, ow, 2), 'rail', { fine: true });
    }
    if (s.jars) {
      const k = ['jarA', 'jarG', 'jarV'];
      for (let r = 0; r < 2; r++) {
        const ds = [[], [], []];
        for (let x = ox + 8, j = 0; x < ox + ow - 6; x += 11, j++) ds[(j + r) % 3].push(E(x, 412 + r * 16, 4.2, 5));
        ds.forEach((d, j) => fill(d.join(''), k[j]));
      }
      fill(R(ox, 418, ow, 2) + R(ox, 434, ow, 2), 'rail');
    }
    if (s.shutter) {
      const grooves = [];
      for (let y = 392; y < 418; y += 4) grooves.push(R(ox, y, ow, 1));
      fill(R(ox, 388, ow, 32), 'shutter');
      fill(grooves.join(''), 'shade', { a: 0.4, fine: true });
    }
    fill(R(ox, 446, ow, 20), 'counter');
    if (s.awn) {
      fill(P([[b.x + 6, 368], [b.x + b.w - 6, 368], [b.x + b.w - 2, 388], [b.x + 2, 388]]), s.awn);
      const st = [];
      for (let x = b.x + 12; x < b.x + b.w - 10; x += 16) st.push(P([[x, 368], [x + 7, 368], [x + 7.6, 388], [x + 0.4, 388]]));
      fill(st.join(''), 'shade', { a: 0.22, fine: true });
    }
    if (s.bulbs) {
      for (let j = 0; j < s.bulbs; j++) {
        const bx = ox + ow * (j + 1) / (s.bulbs + 1), by = s.jars ? 398 : 404;
        line(`M${n(bx)} 388V${by - 3}`, 'shade', 0.8, { fine: true });
        glow(bx, by, 16, 16, 'lit', 0.5);
        fill(E(bx, by, 2.6), 'bulb');
      }
    }
    glow(cx, 478, b.w * 0.55, 13, 'lit', 0.3);
  }
  for (const b of B) fill(R(b.x - 1, BASE - GF - FL * (b.n - 1) - 10, 2, GF + FL * (b.n - 1) + 10), 'shade', { a: 0.35, fine: true });
  line(wire(-20, 236, 376, 250, 12) + wire(560, 250, 836, 262, 14) + wire(130, 300, 600, 312, 18), 'wire', 0.9);

  // The person and the road at their feet, sharp at every focal length.
  cur = L.subj;
  const dash = [];
  for (let x = -200; x < 1200; x += 60) dash.push(R(x, 549, 34, 3));
  fill(dash.join(''), 'mark', { a: 0.55 });
  fill(E(430, 590, 18, 4), 'shade', { a: 0.4, fine: true });
  const { x: px, y: py } = SUBJECT, ps = SUBJECT.h / 118;
  glow(px, py + 1, 36, 6, 'shade', 0.7);
  fill(place(FIG, px - 1.4, py - 1.2, ps), 'rim');
  fill(place(FIG, px, py, ps), 'body');
  line(place('M-12 -95L18 -64', px, py, ps), 'strap', 1.6);

  // Near: the near kerb, two lamps framing the street, the parked scooter.
  cur = L.near;
  fill(R(-200, 612, 1400, 40), 'paveN');
  fill(R(-200, 610, 1400, 3), 'kerb');
  for (const [x, fx] of [[96, 1], [904, -1]]) {
    glow(x + fx * 30, 606, 120, 16, 'lit', 0.16);
    fill(place(LAMP.post, x, 640, 1, fx), 'pole');
    line(place(LAMP.arm, x, 640, 1, fx), 'pole', 2.6);
    line(place(LAMP.curl, x, 640, 1, fx), 'pole', 1.4, { fine: true });
    glow(x + fx * 48, 202, 56, 56, 'lit', 0.32);
    fill(place(LAMP.glass, x, 640, 1, fx), 'bulb');
  }
  const sx = 165, sy = 600, ss = 0.8;
  glow(sx + 56, sy, 70, 6, 'shade', 0.6);
  fill(place(SCOOTER.tyre, sx, sy, ss), 'tyre');
  fill(place(SCOOTER.hub, sx, sy, ss), 'chrome');
  fill(place(SCOOTER.body, sx, sy, ss), 'scoot');
  fill(place(SCOOTER.shine, sx, sy, ss), 'scootHi', { fine: true });
  fill(place(SCOOTER.dark, sx, sy, ss), 'tyre');
  line(place('M104 -96L98 -108', sx, sy, ss), 'chrome', 1.2);
  fill(place(SCOOTER.mirror, sx, sy, ss), 'chrome');
  fill(place(SCOOTER.lamp, sx, sy, ss), 'bulb');
  fill(place(SCOOTER.tail, sx, sy, ss), 'tail');
  return L;
}

// Every colour key the scene uses, for the viewer to resolve.
export function sceneKeys(L = scene()) {
  const keys = new Set();
  for (const items of Object.values(L)) for (const it of items) for (const k of [it.f, it.s]) if (k && !k.startsWith('g:')) keys.add(k);
  for (const g of Object.values(GRADS)) for (const s of g.stops) keys.add(s[1]);
  return [...keys];
}
