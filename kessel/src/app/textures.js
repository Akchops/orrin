// Engraving textures, drawn at boot. Nothing is downloaded.

// The three lenses: one focus throw (160 degrees), each lens
// with its own distance scale, from infinity down to its close focus
// (0.25, 0.45 and 1 m; sample figures). Real focus throws are close to
// linear in dioptres (1/distance), which is why the marks bunch up toward
// infinity; a mark at m metres sits at throw position close / m.
export const SCALES = [
  { close: 0.25, m: [Infinity, 3, 1.5, 1, 0.7, 0.5, 0.4, 0.3, 0.25], ft: [Infinity, 10, 5, 3, 2, 1.5, 1] },
  { close: 0.45, m: [Infinity, 10, 5, 3, 2, 1.5, 1, 0.7, 0.5, 0.45], ft: [Infinity, 30, 15, 8, 5, 3, 2, 1.5] },
  { close: 1, m: [Infinity, 20, 10, 6, 4, 3, 2.5, 2, 1.5, 1.2, 1], ft: [Infinity, 50, 20, 12, 8, 6, 5, 4] },
];
export const THROW_DEG = 160;
export const markLabel = (v) => (v === Infinity ? '\u221e' : String(v));
export const throwPos = (m, k = 1) => (m === Infinity ? 0 : SCALES[k].close / m);
export const throwPosFt = (ft, k = 1) => throwPos(ft === Infinity ? Infinity : ft * 0.3048, k);
// Inverse of throwPos: f in 0..1 -> metres.
export function distanceAt(f, k = 1) {
  return f < 1e-3 ? Infinity : SCALES[k].close / f;
}
// Each lens's name, sample focal length and aperture, as engraved.
export const LENS_MARKS = [['SHANIWAR', '24 mm'], ['PARVATI', '50 mm'], ['SINHAGAD', '100 mm']];
export const SET_APERTURE = 'T2.1';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function tex(T, c, { color = true, repeat = false } = {}) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

// Distance scale wrapped round the focus ring. u runs once round the ring
// (lathe phi 0..2pi, phi = 90deg on the +X side). The index mark is on the
// +X side, so at infinity the infinity mark sits at u = 0.25. Seen from that
// side, u runs up the screen and v along the axis, so every numeral is
// stamped turned a quarter, which leaves it upright to the viewer.
// The texture is 16 px per mm in both directions so glyphs keep their shape.
export function scaleTexture(T, font, k = 1) {
  const W = 4096, H = 168;
  const c = canvas(W, H), g = c.getContext('2d');
  const uOf = (p) => ((((90 - p * THROW_DEG) / 360) % 1) + 1) % 1;
  const stamp = (text, x, y, size, colour) => {
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI / 2);
    g.fillStyle = colour;
    g.font = `500 ${size}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 0, 0);
    g.restore();
  };
  const sc = SCALES[k];
  // Metres, nearer the front of the ring (canvas top = front).
  for (const m of sc.m) stamp(markLabel(m), uOf(throwPos(m, k)) * W, 46, 50, '#f1efe9');
  stamp('m', uOf(1.13) * W, 46, 34, '#f1efe9');
  // One set of ticks, all the way round so the band reads as one ring from
  // any side and visibly turns as a whole: a short tick every 4 degrees,
  // and a long one exactly at each numeral. Short ticks that would sit
  // beside a long one are left out, so no tick ever looks doubled.
  const marks = sc.m.map((m) => throwPos(m, k));
  g.fillStyle = 'rgba(241,239,233,0.85)';
  for (let k = 0; k < 90; k++) {
    const p = k * (4 / THROW_DEG);
    if (marks.some((q) => Math.abs(p - q) * THROW_DEG < 1.6)) continue;
    g.fillRect(uOf(p) * W - 2, 78, 4, 11);
  }
  for (const p of marks) g.fillRect(uOf(p) * W - 2, 78, 4, 20);
  // Feet, behind.
  for (const ft of sc.ft) stamp(markLabel(ft), uOf(throwPosFt(ft, k)) * W, 128, 34, '#f0a64a');
  stamp('ft', uOf(1.13) * W, 128, 26, '#f0a64a');
  return tex(T, c);
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
