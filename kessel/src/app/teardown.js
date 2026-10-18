// The teardown after the film: the same lens comes apart under scroll and
// goes back together. Shared by the WebGL and Canvas 2D tiers so both draw
// the same move. Units are millimetres in lens space (axis Z, front at 0).
//
// Each part leaves on its own path, in its own order (the technique from
// the Orrin watch): parts that have to clear the barrel first slide along
// the axis (`ax`), then move to their final offset `ex`. Outer rings leave
// first, then the glass through whichever end is open, then the blades
// come out of the front and fan out, and the barrel moves least.

export const TEAR_PARTS = [
  { id: 'focus-ring', order: 0, ax: 95, ex: [0, 32, 95], spin: 0.18 },
  { id: 'mount', order: 0, ex: [0, 0, -120], spin: -0.12 },
  { id: 'scale', order: 0.5, ax: 70, ex: [0, -30, 70], spin: -0.1 },
  { id: 'signature', order: 0.5, ax: -70, ex: [0, 34, -70], spin: 0.08 },
  { id: 'front-element', order: 1, ex: [0, 22, 150] },
  { id: 'glass-1', order: 2, ax: 110, ex: [0, -24, 118] },
  { id: 'glass-4', order: 2, ax: -60, ex: [0, -26, -78] },
  { id: 'barrel-front', order: 2.5, ex: [0, -78, 26] },
  { id: 'glass-3', order: 3, ax: -40, ex: [0, 24, -46] },
  { id: 'blades', order: 3.5, ax: 40, fan: 26 },
  { id: 'glass-2', order: 4, ax: 62, ex: [0, 0, 62] },
  { id: 'barrel', order: 4.5, ex: [0, -6, -14] },
];
export const TEAR_MAX_ORDER = 4.5;

// Where each part's label points, in the part's own (rest) coordinates.
export const TEAR_ANCHORS = {
  'front-element': [0, 33, -5],
  'glass-1': [0, 30, -20],
  blades: [0, 64, -48],
  'focus-ring': [0, 41.5, -18],
  scale: [0, 40.6, -32],
  barrel: [0, 39.6, -70],
  mount: [0, 34, -92],
  signature: [0, 38.8, -68],
};

export function sstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Per-part progress inside the shared channel: lower orders leave first.
export function tearProgress(u, order, spread = 0.5) {
  const start = (order / TEAR_MAX_ORDER) * spread;
  return sstep(start, start + (1 - spread), u);
}

// Offset of a part at progress e (0 at rest, 1 fully apart), written to out.
export function tearOffset(part, e, out) {
  const [x, y, z] = part.ex || [0, 0, 0];
  if (part.ax) {
    // Out along the axis first, then across to the final place.
    const e1 = sstep(0, 0.55, e), e2 = sstep(0.4, 1, e);
    out[0] = x * e2; out[1] = y * e2; out[2] = part.ax * e1 + (z - part.ax) * e2;
  } else {
    // A gentle arc: the part rises a little as it travels, so nothing
    // moves in a dead straight line.
    const lift = Math.sin(Math.PI * e) * 0.12 * Math.hypot(x, z);
    out[0] = x * e; out[1] = y * e + lift; out[2] = z * e;
  }
  return out;
}

// Blades: out of the front of the barrel, then each one fans outward along
// its own angle phi, turning a little as it goes.
export function bladeOffset(part, e, phi, out) {
  const e1 = sstep(0, 0.5, e), e2 = sstep(0.45, 1, e);
  out[0] = Math.cos(phi) * part.fan * e2;
  out[1] = Math.sin(phi) * part.fan * e2;
  out[2] = part.ax * e1;
  return out;
}
