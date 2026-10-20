// The teardown after the film: the same lens comes apart under scroll and
// goes back together. Shared by the WebGL and Canvas 2D tiers so both draw
// the same move. Units are millimetres in lens space (axis Z, front at 0).
//
// Each part leaves on its own path, in its own order (the technique from
// the Orrin watch), and every part lands on the lens axis, so the exploded
// lens reads as one line in the order of the parts rail: front element,
// coated glass groups, iris blades, focus ring, distance scale, barrel,
// mount, signature plate. Seen from the teardown camera (on the +X side)
// the front of the lens is on the left, so that order runs left to right.

// Rest centre of each part along the axis, and where it lands.
const LINE = {
  'front-element': [-5.5, 150],
  'glass-1': [-20, 104],
  'glass-2': [-58, 84],
  'glass-3': [-72, 64],
  'glass-4': [-90, 46],
  blades: [-48, 2],
  'focus-ring': [-18, -48],
  scale: [-32, -88],
  barrel: [-43, -164],
  'barrel-front': [-43, -164],
  mount: [-92, -246],
  signature: [-68, -290],
};
const land = (id) => LINE[id][1] - LINE[id][0];

// order: when the part leaves (lower first). Outer pieces at both ends go
// first, then the glass out of the front, the iris, the rings, and last the
// barrel, which moves least relative to its length.
export const TEAR_PARTS = [
  { id: 'front-element', order: 0, ex: [0, 0, land('front-element')] },
  { id: 'mount', order: 0, ex: [0, 0, land('mount')], spin: -0.12 },
  // The signature plate does not turn as it leaves: its mark stays on the
  // +X side, facing the teardown camera.
  { id: 'signature', order: 0.6, ex: [0, 0, land('signature')] },
  { id: 'glass-1', order: 1, ex: [0, 0, land('glass-1')] },
  { id: 'blades', order: 1.5, ax: land('blades'), fan: 12 },
  { id: 'glass-2', order: 2, ex: [0, 0, land('glass-2')] },
  { id: 'glass-3', order: 2.5, ex: [0, 0, land('glass-3')] },
  { id: 'glass-4', order: 3, ex: [0, 0, land('glass-4')] },
  { id: 'focus-ring', order: 3.5, ex: [0, 0, land('focus-ring')], spin: 0.18 },
  { id: 'scale', order: 3.5, ex: [0, 0, land('scale')], spin: -0.1 },
  { id: 'barrel-front', order: 4.5, ex: [0, 0, land('barrel-front')] },
  { id: 'barrel', order: 4.5, ex: [0, 0, land('barrel')] },
];
export const TEAR_MAX_ORDER = 4.5;

// The parts rail and the captions, in line order. The coated glass groups
// (glass-1 .. glass-4) are one part to the visitor, as is the barrel with
// its front section.
export const RAIL = ['front-element', 'glass-1', 'blades', 'focus-ring', 'scale', 'barrel', 'mount', 'signature'];
export const railId = (id) => (/^glass-/.test(id) ? 'glass-1' : id === 'barrel-front' ? 'barrel' : id);

// Where each part's label points, in the part's own (rest) coordinates: the
// top edge of the part (labels below the line use the bottom edge, y < 0).
export const TEAR_ANCHORS = {
  'front-element': [0, 33, -5],
  'glass-1': [0, 30, -20],
  blades: [0, 30, -48],        // on the housing ring, between the fanned blades' roots
  'focus-ring': [0, 41.5, -18],
  scale: [0, 40.6, -32],
  barrel: [0, 40, -43],
  mount: [0, 34, -92],
  signature: [39.4, 0, -68],   // on the plate, which faces +X
};

// Close-up of one part, chosen from the rail or by tapping it: the camera
// flies to the part's centre from this side. r is the radius that has to
// fit the frame; az/el are the camera's orbit angles there (az 90 is the
// +X side, where the scale's numerals and the signature face).
export const TEAR_CLOSE = {
  'front-element': { r: 40, az: 34, el: 12 },
  'glass-1': { r: 56, az: 58, el: 16 },
  blades: { r: 50, az: 48, el: 22 },
  'focus-ring': { r: 48, az: 52, el: 18 },
  scale: { r: 46, az: 78, el: 10 },
  barrel: { r: 64, az: 62, el: 16 },
  mount: { r: 42, az: 64, el: 20 },
  signature: { r: 46, az: 90, el: 6 },
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
    // A gentle arc: the part rises a little as it travels and lands back on
    // the axis, so nothing moves in a dead straight line or through another.
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

// Centre of a rail part in lens space at teardown progress u (axis offsets
// scaled by ks, as the tiers draw them): the close-up camera aims here.
const byId = Object.fromEntries(TEAR_PARTS.map((p) => [p.id, p]));
const tv = [0, 0, 0];
function centreOf(id, u, ks, out) {
  const p = byId[id];
  const o = p.id === 'blades' ? bladeOffset(p, tearProgress(u, p.order), 0, tv) : tearOffset(p, tearProgress(u, p.order), tv);
  out[0] = o[0] * ks; out[1] = o[1] * ks; out[2] = LINE[id][0] + o[2] * ks;
  return out;
}
export function partCentre(id, u, ks, out = [0, 0, 0]) {
  if (id !== 'glass-1') return centreOf(id, u, ks, out);
  // The glass groups as one: the middle of the four.
  const a = [0, 0, 0];
  out[0] = out[1] = out[2] = 0;
  for (const g of ['glass-1', 'glass-2', 'glass-3', 'glass-4']) {
    centreOf(g, u, ks, a);
    out[0] += a[0] / 4; out[1] += a[1] / 4; out[2] += a[2] / 4;
  }
  return out;
}

// With a part picked, the others drift back from it along the axis (mm),
// by up to 22 mm at full emphasis e, so the close-up has room and the
// neighbours recede rather than vanish.
const pc = [0, 0, 0], qc = [0, 0, 0];
export function pickDrift(id, pick, e, u, ks) {
  if (!pick || e <= 0) return 0;
  const rid = railId(id);
  if (rid === pick) return 0;
  const zp = partCentre(pick, u, ks, pc)[2], zq = partCentre(rid, u, ks, qc)[2];
  return Math.sign(zq - zp || 1) * 22 * e;
}
