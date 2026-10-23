// Engraving textures, drawn at boot. Nothing is downloaded.

import { LEN_K, FRONT_K } from './shape.js';

// The three lenses: one focus throw (160 degrees), each lens with its own
// distance scale, from infinity down to its close focus (0.25, 0.45 and
// 1 m; sample figures). Real focus throws are close to linear in dioptres
// (1/distance): a mark at m metres sits at throw position close / m. The
// marks are chosen so they fall at nearly even steps along the throw.
export const SCALES = [
  { close: 0.25, m: [Infinity, 2.5, 1.2, 0.8, 0.6, 0.5, 0.4, 0.35, 0.3, 0.25], ft: [Infinity, 8, 4, 2.5, 2, 1.5, 1.2, 1] },
  { close: 0.45, m: [Infinity, 4, 2, 1.2, 0.9, 0.75, 0.6, 0.5, 0.45], ft: [Infinity, 12, 6, 4, 3, 2.5, 2, 1.5] },
  { close: 1, m: [Infinity, 8, 4, 2.5, 2, 1.6, 1.3, 1.1, 1], ft: [Infinity, 25, 12, 8, 6, 5, 4] },
];
// The film and the teardown show the standard lens, Parvati, and only its
// scale (closest mark 0.45 m) whichever shape it morphs through; each
// lens's own scale is on its own pages and in the lineup.
export const FILM_SCALE = 1;
export const THROW_DEG = 160;
export const markLabel = (v) => (v === Infinity ? '\u221e' : String(v));
export const throwPos = (m, k = 1) => (m === Infinity ? 0 : SCALES[k].close / m);
export const throwPosFt = (ft, k = 1) => throwPos(ft === Infinity ? Infinity : ft * 0.3048, k);
// Inverse of throwPos: f in 0..1 -> metres.
export function distanceAt(f, k = 1) {
  return f < 1e-3 ? Infinity : SCALES[k].close / f;
}
// What a readout says for throw position f: the engraved mark when the
// index is within a degree of one, otherwise the distance (two places
// under 1 m, one under 10 m), so it never disagrees with the engraving.
export function distanceLabel(f, k = 1) {
  const sc = SCALES[k];
  for (const m of sc.m) if (Math.abs(throwPos(m, k) - f) * THROW_DEG < 1) return m === Infinity ? '\u221e' : `${m} m`;
  const d = distanceAt(f, k);
  if (d === Infinity) return '\u221e';
  return `${d < 1 ? d.toFixed(2) : d < 10 ? d.toFixed(1) : d.toFixed(0)} m`;
}
// A few marks for small drawings (the Craft lens, the Company bench):
// n of the lens's own marks, close focus first, evenly picked.
export function someMarks(k, n = 5) {
  const list = SCALES[k].m.slice().reverse();
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]);
}

// --------------------------------------------------------- scale layout
// The engraved band on the focus ring (src/app/lens.js: radius 40.47 mm,
// 10.4 mm along the axis on the standard lens; the model is stretched by
// LEN_K along the axis and FRONT_K round it). Everything is laid out in
// millimetres on the lens itself, so the numerals keep their shape on
// every lens. Along the axis, front to rear:
//   margin | metres (end at the gutter) | gutter | ticks | gutter | feet | margin
// Each numeral lives in its own gutter, clear of every tick: the metre
// ticks start after the gutter behind the metres, the feet ticks end
// before the gutter in front of the feet. Round the ring, two labels closer
// than about one numeral height keep only the more important one (the
// ends of the scale first, then the shorter label).
export const BAND = { r: 40.47, len: 10.4 };
// Width of a label in ems: Saira weight 500's advances, measured in the
// browser (canvas measureText at 100 px); the cap height is 0.7 em.
const ADV = { 0: 0.668, 1: 0.383, 2: 0.611, 3: 0.604, 4: 0.645, 5: 0.621, 6: 0.661, 7: 0.566, 8: 0.683, 9: 0.661, '.': 0.248, '\u221e': 0.713, m: 0.876, f: 0.388, t: 0.374 };
export const emWidth = (t) => [...String(t)].reduce((w, ch) => w + (ADV[ch] ?? 0.62), 0);
export function scaleLayout(k = 1, measure = emWidth) {
  const lk = LEN_K[k], fk = FRONT_K[k], sc = SCALES[k];
  const len = BAND.len * lk, circ = 2 * Math.PI * BAND.r * fk, arc = (circ * THROW_DEG) / 360;
  const MARGIN = 0.6, GUT = 0.5, TICKS = 1.5;
  const rows = [
    { list: sc.m.map((m) => ({ p: throwPos(m, k), t: markLabel(m) })), unit: 'm' },
    { list: sc.ft.map((f) => ({ p: throwPosFt(f, k), t: markLabel(f) })), unit: 'ft' },
  ];
  const wm = Math.max(...rows[0].list.map((x) => measure(x.t)), measure('m'));
  const wf = Math.max(...rows[1].list.map((x) => measure(x.t)), measure('ft'));
  // Numeral heights: as large as the band allows, feet a little smaller.
  const room = len - 2 * MARGIN - 2 * GUT - TICKS;
  const hm = Math.min(1.9, room / (wm + 0.8 * wf)), hf = 0.8 * hm;
  const zm = hm * wm, zf = hf * wf;
  const v0 = MARGIN + (room - zm - zf) / 2;          // the block, centred
  const mEnd = v0 + zm, t0 = mEnd + GUT, t1 = t0 + TICKS, fStart = t1 + GUT;
  // Round the ring: keep the ends, then drop the less important of any
  // two labels closer than 1.3 numeral heights (centre to centre).
  const thin = (list, h) => {
    const kept = [];
    const rank = (x, i) => (i === 0 || i === list.length - 1 ? 0 : 1) * 10 + x.t.length;
    list.forEach((x, i) => {
      const prev = kept[kept.length - 1];
      if (!prev || (x.p - prev.x.p) * arc >= 1.3 * h) { kept.push({ x, i }); return; }
      if (rank(x, i) < rank(prev.x, prev.i)) kept[kept.length - 1] = { x, i };
    });
    return kept.map((o) => o.x);
  };
  const metres = thin(rows[0].list, hm), feet = thin(rows[1].list, hf);
  return { k, lk, fk, len, circ, arc, hm, hf, mEnd, t0, t1, fStart, metres, feet, unitP: 1.13 };
}

// Distance scale wrapped round the focus ring. u runs once round the ring
// (lathe phi 0..2pi, phi = 90deg on the +X side). The index mark is on the
// +X side, so at infinity the infinity mark sits at u = 0.25. Seen from that
// side, u runs up the screen and v along the axis (canvas top = the front),
// so every numeral is stamped turned a quarter, which leaves it upright to
// the viewer. res 1: 16 px per mm along the axis, 4096 px round; res 2
// doubles both, for sharp close-ups where the GPU allows it.
export function scaleTexture(T, font, k = 1, { res = 1 } = {}) {
  const L = scaleLayout(k);
  const W = Math.round(4096 * res), pu = W / L.circ, pv = 16 * res, H = Math.ceil(L.len * pv);
  const c = canvas(W, H), g = c.getContext('2d');
  const uOf = (p) => ((((90 - p * THROW_DEG) / 360) % 1) + 1) % 1;
  // A label in millimetres: anchored at v (its end for metres, its start
  // for feet), h tall round the ring, true to shape on this lens.
  const stamp = (text, p, v, h, align, colour) => {
    g.save();
    g.translate(uOf(p) * W, v * pv);
    g.rotate(Math.PI / 2);
    g.scale(pv / pu, 1);
    g.fillStyle = colour;
    g.font = `500 ${(h * pu).toFixed(2)}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillText(text, 0, 0);
    g.restore();
  };
  const WHITE = '#f1efe9', AMBER = '#f0a64a';
  for (const x of L.metres) stamp(x.t, x.p, L.mEnd, L.hm, 'right', WHITE);
  stamp('m', L.unitP, L.mEnd, L.hm * 0.8, 'right', WHITE);
  for (const x of L.feet) stamp(x.t, x.p, L.fStart, L.hf, 'left', AMBER);
  stamp('ft', L.unitP, L.fStart, L.hf * 0.85, 'left', AMBER);
  // Ticks: a short one every 4 degrees all the way round (so the band
  // reads as one ring from any side and visibly turns as a whole), a
  // longer one at each metre mark reaching forward and one at each feet
  // mark reaching back; no short tick beside a long one.
  const tw = 0.22 * pu, marks = [...L.metres, ...L.feet].map((x) => x.p);
  const tick = (p, va, vb) => g.fillRect(uOf(p) * W - tw / 2, va * pv, tw, (vb - va) * pv);
  const mid = (L.t0 + L.t1) / 2, span = L.t1 - L.t0;
  g.fillStyle = 'rgba(241,239,233,0.85)';
  for (let i = 0; i < 90; i++) {
    const p = i * (4 / THROW_DEG);
    if (marks.some((q) => Math.abs(p - q) * THROW_DEG < 1.6)) continue;
    tick(p, mid - span * 0.18, mid + span * 0.18);
  }
  for (const x of L.metres) tick(x.p, L.t0, mid + span * 0.12);
  for (const x of L.feet) tick(x.p, mid - span * 0.12, L.t1);
  return tex(T, c);
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Each lens's name, sample focal length and aperture, as engraved.
export const LENS_MARKS = [['SHANIWAR', '24 mm'], ['PARVATI', '50 mm'], ['SINHAGAD', '100 mm']];
export const SET_APERTURE = 'T2.1';

function tex(T, c, { color = true, repeat = false } = {}) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

// Front ring: the lens's own label set round the annulus face: its name,
// focal length and aperture, then the maker's line.
// size: 2048 px on desktop; phones get 1024 (a quarter of the memory).
export function frontRingTexture(T, font, S = 2048, k = 1) {
  const c = canvas(S, S), g = c.getContext('2d');
  const s = S / 80;                    // px per mm across an 80 mm square
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#f1efe9';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `500 ${1.55 * s}px ${font}`;
  const [name, fl] = LENS_MARKS[k];
  const text = `${name}  ${fl}  ${SET_APERTURE}  ·  KESSEL OPTICS  ·  PUNE`;
  const chars = [...text];
  const R = 36.8 * s;
  // Text runs across the top half only, like real front-ring engraving.
  const span = Math.PI * 1.05;
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 - span / 2 + (i / (chars.length - 1)) * span;
    g.save();
    g.translate(S / 2 + Math.cos(a) * R, S / 2 + Math.sin(a) * R);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
  });
  return tex(T, c);
}

// Rear barrel: maker's mark and the optician's signature on the +X side.
// The signature is an abstract hand-drawn stroke, deliberately not a name.
// The label is drawn upright in its own canvas, then stamped onto the
// barrel texture turned a quarter, for the same reason as the scale.
// 16.9 px per mm both ways: 4096 px round 243 mm, 320 px along 19 mm.
export function rearBarrelTexture(T, font) {
  const W = 4096, H = 320, c = canvas(W, H), g = c.getContext('2d');
  const lw = 300, lh = 760, label = canvas(lw, lh), l = label.getContext('2d');
  l.fillStyle = '#f1efe9';
  l.textAlign = 'center';
  l.textBaseline = 'middle';
  l.font = `600 58px ${font}`;
  if ('letterSpacing' in l) l.letterSpacing = '6px';
  l.fillText('KESSEL', lw / 2, 60);
  l.font = `500 22px ${font}`;
  if ('letterSpacing' in l) l.letterSpacing = '3px';
  l.fillText('HAND ASSEMBLED', lw / 2, 110);
  l.fillText('PUNE', lw / 2, 138);
  // Signature: a deterministic pen stroke with pressure.
  l.strokeStyle = '#f1efe9';
  l.lineCap = 'round';
  l.lineJoin = 'round';
  let px = 30, py = 300;
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const nx = 30 + t * 240 + Math.sin(t * 29) * 12 + Math.sin(t * 7.3) * 7;
    const ny = 300 + Math.sin(t * 21 + 1.2) * 34 * (1 - t * 0.5) + Math.cos(t * 9.1) * 9 - t * 14;
    l.lineWidth = 1.8 + 3 * Math.abs(Math.sin(t * 17));
    l.beginPath(); l.moveTo(px, py); l.lineTo(nx, ny); l.stroke();
    px = nx; py = ny;
  }
  l.lineWidth = 2.4;
  l.beginPath(); l.moveTo(24, 362); l.bezierCurveTo(100, 374, 190, 352, 276, 360); l.stroke();
  g.save();
  g.translate(0.25 * W - lh * 0.12, H / 2);
  g.rotate(Math.PI / 2);
  g.drawImage(label, -lw / 2, -lh / 2);
  g.restore();
  return tex(T, c);
}
