// The three lenses, a matched set: one body, so the front diameter,
// length and aperture are shared and the weights close, as cinema sets are
// built to swap on a rig. Names and roles are proposals; every figure in
// `specs` is a sample for the concept (the page says so under each table).
// Longer focal length, longer close focus, as the engraved scales show.
export const lenses = [
  {
    slug: 'shaniwar',
    name: 'Shaniwar',
    role: 'Wide',
    line: 'For rooms, streets and landscapes, where everything in front of you belongs in the frame.',
    image: 'model-1-lg',
    thumb: 'model-1',
    band: 'blue',
    specs: [
      ['Focal length', '24 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '11 elements in 9 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.25 m'],
      ['Front diameter', '80 mm'],
      ['Length', '99 mm'],
      ['Weight', '1.00 kg'],
    ],
  },
  {
    slug: 'parvati',
    name: 'Parvati',
    role: 'Standard',
    line: 'Frames a scene close to the way your eye does.',
    image: 'model-2-lg',
    thumb: 'model-2',
    band: 'amber',
    specs: [
      ['Focal length', '50 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '7 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.45 m'],
      ['Front diameter', '80 mm'],
      ['Length', '99 mm'],
      ['Weight', '1.05 kg'],
    ],
  },
  {
    slug: 'sinhagad',
    name: 'Sinhagad',
    role: 'Long',
    line: 'For faces and details at a distance, with the background let go.',
    image: 'model-3-lg',
    thumb: 'model-3',
    band: 'green',
    specs: [
      ['Focal length', '100 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '8 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '1.0 m'],
      ['Front diameter', '80 mm'],
      ['Length', '99 mm'],
      ['Weight', '1.10 kg'],
    ],
  },
];

// Said on the Lenses page and every lens page.
export const matchedSet = {
  title: 'A matched set',
  line: 'The three share one body: the same length, front diameter and ring positions, so they swap on a rig without moving the matte box or the follow focus.',
  differ: 'What changes from lens to lens is the engraved name and focal length, the colour ring, the distance scale and the label on the front.',
};
