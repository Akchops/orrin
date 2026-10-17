// The three lenses. Names and roles are proposals; every figure in `specs`
// is a sample for the concept (the page says so under each table). The
// figures are kept consistent with each other: longer focal length, longer
// and heavier barrel, longer close focus.
export const lenses = [
  {
    slug: 'shaniwar',
    name: 'Shaniwar',
    role: 'Wide',
    line: 'For rooms, streets and landscapes, where everything in front of you belongs in the frame.',
    image: 'model-1-lg',
    thumb: 'model-1',
    band: 'violet',
    specs: [
      ['Focal length', '28 mm'],
      ['Maximum aperture', 'f/2'],
      ['Mount', 'PL'],
      ['Elements', '10 elements in 8 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.30 m'],
      ['Front diameter', '80 mm'],
      ['Weight', '1.25 kg'],
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
      ['Maximum aperture', 'f/1.8'],
      ['Mount', 'PL'],
      ['Elements', '7 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.45 m'],
      ['Front diameter', '80 mm'],
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
      ['Focal length', '85 mm'],
      ['Maximum aperture', 'f/2'],
      ['Mount', 'PL'],
      ['Elements', '8 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.80 m'],
      ['Front diameter', '80 mm'],
      ['Weight', '1.35 kg'],
    ],
  },
];
