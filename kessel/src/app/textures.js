// Engraving textures, drawn at boot. Nothing is downloaded.

// Distance marks, metres, as a fraction of the focus throw. Real focus
// throws are close to linear in dioptres (1/distance), which is why the
// marks bunch up toward infinity; this spacing follows 1/d.
export const DISTANCES = [
  { m: Infinity, label: '∞' }, { m: 10, label: '10' }, { m: 5, label: '5' }, { m: 3, label: '3' },
  { m: 2, label: '2' }, { m: 1.5, label: '1.5' }, { m: 1.2, label: '1.2' }, { m: 1, label: '1' }, { m: 0.8, label: '0.8' },
];
export const THROW_DEG = 160;
export const throwPos = (m) => (m === Infinity ? 0 : (1 / m) / 1.25);
export function distanceAt(f) {
  // Inverse of throwPos: f in 0..1 -> metres.
  const inv = f * 1.25;
  return inv < 1e-3 ? Infinity : 1 / inv;
}

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
export function scaleTexture(T, font) {
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
  // Metres, nearer the front of the ring (canvas top = front).
  for (const d of DISTANCES) stamp(d.label, uOf(throwPos(d.m)) * W, 46, 50, '#f1efe9');
  stamp('m', uOf(1.13) * W, 46, 34, '#f1efe9');
  // Fine ticks all the way round, so the band reads as one ring from any
  // side and visibly turns as a whole with the focus ring.
  g.fillStyle = 'rgba(241,239,233,0.45)';
  for (let i = 0; i < 144; i++) g.fillRect((i / 144) * W - 1.5, 84, 3, 8);
  // Throw ticks, running along the axis between the two rows.
  g.fillStyle = 'rgba(241,239,233,0.85)';
  for (let i = 0; i <= 40; i++) {
    const x = uOf(i / 40) * W;
    g.fillRect(x - 2, 78, 4, i % 5 === 0 ? 20 : 11);
  }
  // Feet, behind.
  for (const [ft, label] of [[Infinity, '\u221e'], [30, '30'], [15, '15'], [10, '10'], [6, '6'], [4, '4'], [3, '3']]) {
    const m = ft === Infinity ? Infinity : ft * 0.3048;
    stamp(label, uOf(throwPos(m)) * W, 128, 34, '#f0a64a');
  }
  stamp('ft', uOf(1.13) * W, 128, 26, '#f0a64a');
  return tex(T, c);
}

// Front ring: maker's line set round the annulus face.
// size: 2048 px on desktop; phones get 1024 (a quarter of the memory).
export function frontRingTexture(T, font, S = 2048) {
  const c = canvas(S, S), g = c.getContext('2d');
  const s = S / 80;                    // px per mm across an 80 mm square
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#f1efe9';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `500 ${1.55 * s}px ${font}`;
  const text = 'KESSEL OPTICS  ·  HAND ASSEMBLED IN PUNE  ·  ';
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
