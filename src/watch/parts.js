// Shared part data for both render tiers. Units are millimetres.
// Watch frame: +X = 3 o'clock (crown side), +Y = 12 o'clock, +Z = out of the
// dial toward the wearer's eye. The movement sits behind the dial at -Z.

export const CASE = {
  r: 20,              // 40 mm case
  dialR: 16.6,
  crystalR: 17.3,
  backZ: -5.6,        // inner face of the caseback
  frontZ: 1.2,        // top of the case middle, under the bezel
  crownZ: -2.1,       // height of the crown axis
  lugInner: 10.1,     // 20 mm between the lugs
  lugWidth: 2.6,
  springBarY: 21.4,
  springBarZ: -3.1,
};

// Seconds sub-dial at 6 o'clock, carried by the fourth wheel.
export const SUBDIAL = { x: 0, y: -8.2, r: 4.0 };

// Going train, front-view coordinates. z is the wheel's mid-plane, t its
// thickness. Layers are staggered so wheels that overlap in plan never
// intersect. `ex` is the exploded offset in movement space, `spin` the extra
// turns a part makes while it travels, `order` the departure order (0 first).
export const WHEELS = [
  { id: 'barrel', x: 5.0, y: 5.0, r: 5.2, teeth: 84, z: -3.0, t: 1.7, kind: 'barrel',
    ex: [4.05, 3.15, -13.0], spin: 0.35, order: 7 },
  { id: 'center', x: 0, y: 0, r: 3.9, teeth: 64, z: -1.85, t: 0.24, spokes: 4,
    ex: [0.45, 0.9, -6.0], spin: 1.2, order: 6 },
  { id: 'third', x: -3.6, y: -4.2, r: 3.2, teeth: 60, z: -2.45, t: 0.22, spokes: 4,
    ex: [-2.7, -0.9, -9.0], spin: 1.5, order: 6 },
  { id: 'fourth', x: 0, y: -8.2, r: 3.4, teeth: 70, z: -2.85, t: 0.22, spokes: 4,
    ex: [0.9, -3.6, -11.0], spin: 1.1, order: 5 },
  { id: 'escape', x: -5.4, y: -9.8, r: 2.3, teeth: 15, z: -2.4, t: 0.2, spokes: 4, kind: 'escape',
    ex: [-3.15, -4.05, -14.0], spin: 1.8, order: 5 },
  { id: 'balance', x: -8.6, y: -1.6, r: 4.4, z: -3.45, t: 0.5, kind: 'balance',
    ex: [-5.85, 1.35, -19.0], spin: 0.25, order: 3 },
  { id: 'ratchet', x: 5.0, y: 5.0, r: 4.4, teeth: 60, z: -5.29, t: 0.42, kind: 'ratchet',
    ex: [4.5, 4.05, -30.0], spin: 0.6, order: 1 },
  { id: 'crownwheel', x: 10.0, y: 1.6, r: 1.7, teeth: 22, z: -5.26, t: 0.36, kind: 'ratchet',
    ex: [7.65, 1.8, -27.0], spin: 2.0, order: 1 },
];

export const PALLET = { x: -8.2, y: -7.6, z: -2.65, ex: [-5.4, -4.5, -16.0], spin: 0.15, order: 4 };

// Bridges as smooth unions of circles and capsules, clipped to the plate.
// The outline is traced by marching rays from `o`, so each must be
// star-shaped about that point.
export const BRIDGES = [
  { id: 'barrel-bridge', o: [3.4, 3.4], z: -4.5, t: 1.15,
    circles: [[5.0, 5.0, 6.1], [0, 0, 2.7], [11.6, 7.4, 1.9]],
    capsules: [[5.0, 5.0, 0, 0, 2.5], [5.0, 5.0, 11.6, 7.4, 1.7]],
    ex: [2.25, 2.7, -23.0], order: 2 },
  { id: 'train-bridge', o: [-3.0, -7.4], z: -4.5, t: 1.15,
    circles: [[-3.6, -4.2, 2.3], [0, -8.2, 2.5], [-5.4, -9.8, 2.2], [3.6, -11.6, 1.8]],
    capsules: [[-3.6, -4.2, 0, -8.2, 1.9], [0, -8.2, -5.4, -9.8, 1.9], [-5.4, -9.8, -3.6, -4.2, 1.6], [0, -8.2, 3.6, -11.6, 1.5]],
    ex: [-0.45, -3.15, -25.0], order: 2 },
  { id: 'balance-cock', o: [-10.8, 1.2], z: -4.6, t: 1.0,
    circles: [[-8.6, -1.6, 2.7], [-12.6, 4.6, 2.6]],
    capsules: [[-8.6, -1.6, -12.6, 4.6, 1.8]],
    ex: [-6.3, 2.7, -28.0], order: 2 },
  { id: 'pallet-bridge', o: [-9.6, -9.0], z: -4.3, t: 0.8,
    circles: [[-8.2, -7.6, 1.5], [-11.0, -10.3, 1.5]],
    capsules: [[-8.2, -7.6, -11.0, -10.3, 1.05]],
    ex: [-5.85, -5.4, -21.0], order: 2 },
];

// Jewels sit on the bridges at the pivots they carry.
export const JEWELS = [
  { bridge: 'barrel-bridge', x: 0, y: 0 },
  { bridge: 'train-bridge', x: -3.6, y: -4.2 },
  { bridge: 'train-bridge', x: 0, y: -8.2 },
  { bridge: 'train-bridge', x: -5.4, y: -9.8 },
  { bridge: 'balance-cock', x: -8.6, y: -1.6, big: true },
  { bridge: 'pallet-bridge', x: -8.2, y: -7.6 },
];

// Blued screws. `on` is the bridge they hold; they leave before it does.
export const SCREWS = [
  { on: 'barrel-bridge', x: 11.6, y: 7.4 },
  { on: 'barrel-bridge', x: 1.6, y: 3.3 },
  { on: 'train-bridge', x: 3.6, y: -11.6 },
  { on: 'train-bridge', x: -2.0, y: -7.1 },
  { on: 'balance-cock', x: -12.6, y: 4.6 },
  { on: 'pallet-bridge', x: -11.0, y: -10.3 },
  { on: 'ratchet', x: 5.0, y: 5.0, big: true },
  { on: 'crownwheel', x: 10.0, y: 1.6 },
];

export const PLATE = { r: 14.8, t: 1.6 };

// Dial-side parts. Offsets are applied by the "dial falls away" channel.
export const DIAL_FALL = { pos: [0, -15, 13], rot: [0.95, 0, 0.18] };
export const HANDS_FLOAT = [
  { id: 'hour', pos: [-2, 3, 17], rot: 0.0 },
  { id: 'minute', pos: [2, 5, 22], rot: 0.0 },
  { id: 'seconds', pos: [0, -4, 15], rot: 0.0 },
];

// Five models. Dial finishes and colours are proposals for the client to
// replace; nothing here is a published specification.
export const MODELS = [
  { no: '01', dial: '#e09a84', dialMetal: 0.35, aniso: 0.92, print: '#2b1a14', hands: '#d7dade', strap: '#3a2117', subdial: '#c97c60' },
  { no: '02', dial: '#164a54', dialMetal: 0.6, aniso: 0.92, print: '#e9e4da', hands: '#d7dade', strap: '#151515', subdial: '#123f48' },
  { no: '03', dial: '#e6dfcd', dialMetal: 0.15, aniso: 0.22, print: '#1e2433', hands: '#2c4796', strap: '#99602f', subdial: '#dcd4bf' },
  { no: '04', dial: '#2f3237', dialMetal: 0.6, aniso: 0.92, print: '#e6dccb', hands: '#dcb46e', strap: '#4a4542', subdial: '#2a2c31' },
  { no: '05', dial: '#5a1520', dialMetal: 0.55, aniso: 0.92, print: '#efe6da', hands: '#d7dade', strap: '#24160f', subdial: '#4e1119' },
];

// Mumbai time (IST has no daylight saving, so a fixed +5:30 offset is exact).
export function mumbaiSeconds(nowMs = Date.now()) {
  const s = (nowMs / 1000 + 5.5 * 3600) % 86400;
  return s < 0 ? s + 86400 : s;
}

// Smoothstep with clamping. Used for every staggered part so no part starts
// or stops with a velocity jump.
export function sstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Per-part progress inside a shared channel. Parts with a lower order leave
// first; SPREAD is how much of the channel is used for the stagger.
export function staggered(u, order, maxOrder = 7, spread = 0.45) {
  const start = (order / maxOrder) * spread;
  return sstep(start, start + (1 - spread), u);
}
