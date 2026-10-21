// Captions for the scroll film on the home page. The film itself (the lens
// scene and its camera move) lives in src/app; this is only its words.
export const film = {
  // The hero is the film's first frame: the lens cropped by the screen
  // edges, iris closed to a pinhole. The text fades as the camera moves.
  hero: {
    brand: 'Kessel Optics',
    title: 'Lenses built by one pair of hands, and signed by them.',
    primary: { label: 'See the teardown', href: '#teardown' },
    secondary: { label: 'Contact', href: '#film-contact' },
    cue: 'Scroll',
    alt: 'A Kessel lens seen straight on and close: the black front ring cropped by the edges of the screen, the coated glass, the iris closed to a pinhole of light.',
  },
  // `short` is the one-line version phones read in the live film (the
  // full `body` stays for desktop and the stills).
  stages: [
    { id: 'aperture', num: '01 · Iris', title: 'Light waits for the blades', still: 'aperture', caption: 'Still frame · the iris open',
      short: 'Scroll and the iris opens, one blade at a time.',
      body: 'The iris sits in the middle of the lens. Scroll and it opens one blade at a time until light floods the glass.' },
    { id: 'through', num: '02 · Glass', title: 'Through the glass', still: 'through', caption: 'Still frame · inside the barrel',
      short: 'The elements slide apart so the camera can pass between them.',
      body: 'Each element sits at its own distance from the next. Here they slide apart so the camera can pass between them, through the iris and out at the back.' },
    { id: 'exit', num: '03 · Back together', title: 'Out the back, closed up', still: 'exit', caption: 'Still frame · the lens closed up again',
      short: 'Past the mount, the lens closes up again behind the camera.',
      body: 'Past the mount the camera turns round and the lens closes up behind it, element by element, until it is whole again.' },
    { id: 'focus', num: '04 · Focus', title: 'Focus by hand', still: 'focus', caption: 'Still frame · focus ring and distance scale',
      short: 'The ring turns and the distance scale rolls past the index mark.',
      body: 'The knurled ring turns and the engraved distance scale rolls past the index mark, from infinity down to the closest mark.' },
  ],
  // The film's last three stages, as in the single-page demo.
  models: {
    num: '05 · Lenses', title: 'Three lenses', note: 'The names and roles below are proposals for this concept.',
    list: [
      { name: 'Shaniwar', still: 'model-1', alt: 'The wide lens of the matched set, with a blue ring.',
        short: 'The wide one, for rooms, streets and landscapes.',
        body: 'The wide one. For rooms, streets and landscapes, where everything in front of you belongs in the frame.' },
      { name: 'Parvati', still: 'model-2', alt: 'The standard lens of the matched set, with an amber ring.',
        short: 'The standard one, close to the way your eye frames a scene.',
        body: 'The standard one. Frames a scene close to the way your eye does.' },
      { name: 'Sinhagad', still: 'model-3', alt: 'The long lens of the matched set, with a green ring.',
        short: 'The long one, for faces and details, the background let go.',
        body: 'The long one. For faces and details at a distance, with the background let go.' },
    ],
  },
  workshop: {
    num: '06 · The workshop', title: 'One optician, one lens', still: 'signed', caption: 'Still frame · the signed barrel',
    body: [
      'Kessel Optics was founded in Pune in 2017 as an independent lens maker.',
      'Every lens is assembled by hand by one optician from start to finish, and that optician signs the barrel.',
    ],
    facts: [['Founded', '2017, Pune'], ['Makes', 'Cinema and photography lenses'], ['Models', 'Three'], ['Each lens', 'One optician, signed']],
  },
  contact: { num: '07 · Contact', title: 'Write to the studio' },
  skip: 'Skip film',
};
