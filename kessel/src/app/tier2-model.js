// The lens for the Canvas 2D tier, as lathe profiles in the millimetre space
// of lens.js (axis Z, front of the lens at z = 0, mount at z = -98). Every
// segment of a profile is swept round the axis into a band of quads, so each
// part is a closed, solid object that can be lit, culled and depth-sorted.
//
// Profiles are walked with their visible side on the right: a segment
// (dr, dz) faces (dz, -dr), the same convention as lens.js. Angles are
// standard angles about the axis (0 on +X, 90 on +Y), in degrees.
//
// Segment codes are a material letter and an optional flag:
//   A anodised black   B bare machined edge   F flock (inside walls)
//   T steel            K knurled grip         S distance-scale band
//   R aperture ridges  C colour band (model)  P signature plate
//   c  a face pressed against another part: drawn only in the teardown
//   s  a section end: drawn when the sections slide apart (and in the teardown)

export const SEG = 44;            // quads round a full circle
// Barrel sections slide apart from these centres, as in lens.js.
export const SECTION_MID = [-5, -24, -50, -72, -92];

const part = (id, g, pts, seg, o = {}) => ({ id, g, pts, seg, n: SEG, a0: 0, span: 360, ...o });

export const PARTS = [
  // Front ring: outer wall, bare edge, the engraved face, a bare inner bevel
  // and the flocked bore behind it.
  part('barrel-front', 0,
    [[40, -9.5], [40, -5.4], [40, -1.3], [39.5, -0.4], [38.7, 0], [35.3, 0], [34.8, -0.45], [34.8, -5], [34.8, -9.5], [40, -9.5]],
    ['A', 'A', 'B', 'B', 'A', 'B', 'F', 'F', 'As']),
  // The tube under the focus ring and scale (it leaves with the front ring).
  part('barrel-front', 1,
    [[38.8, -9.8], [38.6, -9.8], [38.6, -16.7], [38.6, -23.6], [38.6, -30.5], [38.6, -37.5], [38.8, -37.5], [38.8, -9.8]],
    ['As', 'F', 'F', 'F', 'F', 'As', 'Ac'], { rot: 'focus' }),
  // Focus ring: a knurled grip between two bare rims.
  part('focus-ring', 1,
    [[38.8, -10], [38.8, -18.2], [38.8, -26.5], [40.6, -26.5], [40.6, -25.6], [41, -25.2], [41.4, -24.8], [41.4, -18.5],
      [41.4, -12.2], [41, -11.6], [40.6, -10.6], [40.6, -10], [38.8, -10]],
    ['Ac', 'Ac', 'Ac', 'B', 'B', 'A', 'K', 'K', 'A', 'B', 'B', 'As'], { rot: 'focus' }),
  // Distance scale: a smooth band, a full ring. 45 facets of 8 degrees
  // starting at 2 degrees, so each holds two of the 4-degree ticks clear of
  // its edges (the ticks are drawn on their facet, never across a seam).
  part('scale', 1,
    [[38.8, -26.6], [38.8, -37.5], [40.4, -37.5], [40.4, -26.6], [38.8, -26.6]],
    ['Ac', 'As', 'S', 'Ac'], { rot: 'focus', n: 45, a0: 2 }),
  // Iris barrel: the bore, the flat carrying the index mark, a bare lip
  // under the scale.
  part('barrel', 2,
    [[37, -37.8], [37, -47.4], [37, -57], [39.2, -57], [39.2, -56.6], [39.2, -46.4], [39.6, -45.6], [39.6, -42], [39.6, -38.4], [40.2, -37.8], [37, -37.8]],
    ['F', 'F', 'As', 'A', 'Ac', 'A', 'A', 'A', 'B', 'As'], { mark: 'index' }),
  // Aperture ring: 36 coarse ridges, turning as the iris opens.
  part('barrel', 2,
    [[39.3, -56.6], [40.1, -56.6], [40.1, -46.4], [39.3, -46.4], [39.3, -56.6]],
    ['A', 'R', 'A', 'Ac'], { rot: 'ap', n: 36 }),
  // Rear barrel: the taper to the mount and the two colour bands. The wall
  // under the signature plate is split at the plate's ends, so the plate
  // and the wall it sits on sort as one.
  part('barrel', 3,
    [[33.6, -57.6], [33.6, -67], [33.6, -76.5], [33.6, -86], [34.2, -86], [36.4, -82], [36.77, -81.4], [37.5, -80.2], [38.6, -78.4],
      [38.6, -77], [38.6, -59.6], [38.6, -58.9], [38.6, -58.4], [38.2, -58], [37.6, -57.6], [33.6, -57.6]],
    ['F', 'F', 'F', 'As', 'A', 'A', 'C', 'A', 'A', 'A', 'A', 'C', 'B', 'B', 'As']),
  // Signature plate on the +X side, on the barrel's own 44-facet grid.
  part('signature', 3,
    [[38.6, -59.6], [38.6, -77], [38.95, -77], [38.95, -59.6], [38.6, -59.6]],
    ['Pc', 'B', 'P', 'B'], { n: 5, a0: (-2 * 360) / SEG, span: (5 * 360) / SEG }),
  // Mount: steel flange, chamfer and wall, flocked bore.
  part('mount', 4,
    [[28.6, -86], [28.6, -92], [28.6, -98], [31.2, -98], [33.6, -97.6], [34, -93.8], [34, -90], [34.2, -86], [28.6, -86]],
    ['F', 'F', 'T', 'T', 'T', 'T', 'T', 'As']),
  // Four bayonet lugs on the flange (lens.js puts the first at 0.4 rad).
  ...[0, 1, 2, 3].map((k) => part('mount', 4,
    [[30, -98.6], [35.6, -98.6], [35.6, -95.6], [30, -95.6], [30, -98.6]],
    ['T', 'T', 'T', 'T'], { n: 2, a0: k * 90 + 22.9 - 9.5, span: 19 })),
];

// The hoods and the tripod collar of the other two models (lens.js):
// drawn only while S.model is near their model and the lens is whole.
// Shaniwar's petal hood is drawn here as a round flared hood.
export const EXTRAS = [
  // Shaniwar (model 0): a short hood flaring out round the big front element.
  part('barrel-front', 0,
    [[41.2, -7], [42.5, 2], [45.5, 9], [50, 15], [49.7, 15.3], [48.8, 15.6], [44.6, 9.4], [41.6, 2.4], [40.3, -6.6], [41.2, -7]],
    ['A', 'A', 'A', 'B', 'A', 'F', 'F', 'F', 'Ac'], { model: 0 }),
  // Sinhagad (model 2): a pull-out tube hood with a bare lip.
  part('barrel-front', 0,
    [[41.9, -6.4], [41.9, 21.4], [41.6, 22], [40.4, 22], [40.4, -6], [41.9, -6.4]],
    ['A', 'B', 'A', 'F', 'Ac'], { model: 2 }),
  // Sinhagad: the tripod collar, its post and the foot below.
  part('barrel', 3,
    [[43.4, -86.4], [43.4, -80.1], [42.8, -79.5], [37.2, -79.5], [37.2, -87], [42.8, -87], [43.4, -86.4]],
    ['A', 'B', 'A', 'Ac', 'A', 'B'], { model: 2 }),
  part('barrel', 3,
    [[43, -86.4], [43, -80], [60.4, -80], [60.4, -86.4], [43, -86.4]],
    ['Ac', 'A', 'Ac', 'A'], { model: 2, n: 2, a0: 270 - 7, span: 14 }),
  part('barrel', 3,
    [[60.4, -98.2], [60.4, -68.2], [63.6, -68.2], [63.6, -98.2], [60.4, -98.2]],
    ['A', 'A', 'B', 'A'], { model: 2, n: 4, a0: 270 - 12, span: 24 }),
];

// The camera body's throat behind the mount: dark walls and four baffles,
// in z measured from the sensor. Seen only from inside, on the axis.
export const THROAT = part(null, 4,
  [[30, 46], [30, 45], [26.5, 45], [30, 45], [30, 33], [26.5, 33], [30, 33], [30, 21], [26.5, 21], [30, 21], [30, 9], [26.5, 9], [30, 9], [30, 0]],
  ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], { n: 32 });

// Glass: lens.js's elements (vertex z, clear radius, surface radii, centre
// thickness), drawn as discs. Each face sits halfway between its vertex
// and its rim, and the blackened edge joins the two faces.
const RAW = [[-2, 33, 95, 260, 7], [-14, 30, 70, 400, 8], [-26, 27, -300, -60, 4], [-55, 21, 55, 55, 7],
  [-66, 23, -80, -200, 4], [-75, 25, 120, 70, 9], [-88, 24, 200, 200, 5]];
const GROUP = [0, 1, 1, 2, 3, 3, 4];
// Coating reflections: violet, green, blue and amber of a multicoated stack.
const COATS = [[143, 125, 255], [95, 214, 184], [192, 139, 255], [121, 184, 255], [240, 166, 74], [111, 224, 160], [165, 147, 255]];
export const GLASS = RAW.map(([z, r, R1, R2, t], i) => {
  const sag = (R) => Math.sign(R) * (Math.abs(R) - Math.sqrt(Math.max(0, R * R - r * r)));
  const s1 = sag(R1), s2 = sag(R2);
  const tt = Math.max(t, s1 + s2 + 1.4);
  return {
    r, fz: z - s1 / 2, bz: z - tt + s2 / 2, g: GROUP[i],
    part: i === 0 ? 'front-element' : `glass-${GROUP[i]}`, coat: COATS[i].map((v) => v / 255),
  };
});

// Iris blade outline in blade space (relative to its pivot), as lens.js.
export const BLADE = [];
{
  const rIn = 21.5, rOut = 38, sw = (80 / 180) * Math.PI, px = 30;
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * sw; BLADE.push([Math.cos(a) * rIn - px, Math.sin(a) * rIn]); }
  for (let i = 16; i >= 0; i--) { const a = (i / 16) * sw; BLADE.push([Math.cos(a) * rOut - px, Math.sin(a) * rOut]); }
}

// Teardown part -> the part the page explains (S.hl, pick): the coated
// glass groups are one part, the two barrel pieces another.
export const EMPH = {
  'front-element': 'front-element', 'glass-1': 'glass-1', 'glass-2': 'glass-1', 'glass-3': 'glass-1', 'glass-4': 'glass-1',
  blades: 'blades', 'focus-ring': 'focus-ring', scale: 'scale', 'barrel-front': 'barrel', barrel: 'barrel',
  mount: 'mount', signature: 'signature',
};
