// The three lenses, three different shapes: the wide short and stubby with
// a big curved front and a small petal hood, the standard plain, the long
// the longest and slimmest with a long hood and a tripod collar. Names and
// roles are proposals; every figure in `specs` is a sample for the concept
// (the page says so under each table). The figures follow the 3D models
// (src/app/lens.js LEN_K and FRONT_K of the standard's 99 mm and 80 mm):
// longer focal length, longer barrel, longer close focus, as the engraved
// scales show.
export const lenses = [
  {
    slug: 'shaniwar',
    name: 'Shaniwar',
    role: 'Wide',
    line: 'For rooms, streets and landscapes, where everything in front of you belongs in the frame.',
    image: 'model-1-lg',
    thumb: 'model-1',
    band: 'blue',
    shape: 'Short and stubby: a wide front with a big curved glass under a small petal hood.',
    specs: [
      ['Focal length', '24 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '11 elements in 9 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.25 m'],
      ['Front diameter', '96 mm'],
      ['Length', '71 mm'],
      ['Hood', 'Small petal, fixed'],
      ['Tripod collar', 'None'],
      ['Weight', '0.85 kg'],
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
    shape: 'Medium and plain: a clean, simple front and no hood.',
    specs: [
      ['Focal length', '50 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '7 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '0.45 m'],
      ['Front diameter', '80 mm'],
      ['Length', '99 mm'],
      ['Hood', 'None'],
      ['Tripod collar', 'None'],
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
    shape: 'The longest: a narrower barrel, a long hood and a tripod collar.',
    specs: [
      ['Focal length', '100 mm'],
      ['Maximum aperture', 'T2.1'],
      ['Mount', 'PL'],
      ['Elements', '8 elements in 6 groups'],
      ['Iris', '11 blades'],
      ['Close focus', '1.0 m'],
      ['Front diameter', '69 mm'],
      ['Length', '144 mm'],
      ['Hood', 'Long tube, fixed'],
      ['Tripod collar', 'Rotating, with foot'],
      ['Weight', '1.60 kg'],
    ],
  },
];

// Said under the table on the Lenses page.
export const shapes = 'Three lenses, three shapes: Shaniwar is short and stubby with a big curved front and a small petal hood; Parvati is plain, with no hood; Sinhagad is the longest and slimmest, with a long hood and a tripod collar for the weight. Each keeps its own engraved name and focal length, colour ring, distance scale and front label.';
