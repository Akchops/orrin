// The teardown after the film (the About section): the same lens comes
// apart under scroll, each part labelled, then goes back together. Only
// parts that exist in the lens model; no specifications, prices, awards or
// names. Part ids match src/app/teardown.js.
export const teardown = {
  num: '08 · Teardown',
  title: 'The same lens, taken apart',
  // The first stop: the whole line of parts.
  apart: {
    title: 'Taken apart',
    body: 'Every part on one line, front to back. Keep scrolling: the view stops at each part in turn, then the lens goes back together.',
    short: 'Every part on one line. Keep scrolling: the view stops at each in turn.',
  },
  // Without JavaScript the stills stand in a column: the line, then each
  // part on its own.
  stillLead: 'The lens taken apart, then each part on its own, numbered front to back, and the lens back together.',
  // `short`: the one-line versions phones read (the full text stays for
  // wider screens and the stills).
  outro: {
    title: 'Back together',
    body: 'Every part returns to its place, the way one optician assembles it on the bench.',
    short: "Every part returns to its place, as on the optician's bench.",
  },
  cue: 'Your turn: tap a part on the map, or drag the lens to look around it.',
  cueStill: 'Your turn: tap a part on the map to see it again.',
  map: 'Where the camera is',
  list: 'Parts of the lens',
  parts: [
    { id: 'front-element', label: 'Front element',
      short: 'The first and largest glass; its coating glows violet and green.',
      body: 'The first glass the light meets, and the largest. Its coating gives the front of the lens its violet and green reflections. It is the last piece fitted and the first taken out.' },
    { id: 'glass-1', label: 'Coated glass groups',
      short: 'The other elements, in small coated groups, each at its own distance.',
      body: 'Behind it, the remaining elements sit in small groups, each at its own distance from the next. Every surface is coated, so each group throws back a slightly different colour.' },
    { id: 'blades', label: 'Iris blades',
      short: 'Eleven thin blades that close to a pinhole or open all the way.',
      body: 'Eleven thin blades, each turning on its own pivot. Together they close to a pinhole or open to the full aperture, and the film opened them one at a time.' },
    { id: 'focus-ring', label: 'Focus ring',
      short: 'The knurled grip that turns the focus, carrying the scale with it.',
      body: 'The knurled grip a focus puller turns, take after take. It carries the engraved scale round with it.' },
    { id: 'scale', label: 'Distance scale',
      short: 'Distances engraved round the ring: metres in white, feet in amber.',
      body: 'Distances engraved around the ring, metres in white and feet in amber, read against a fixed index mark. The marks bunch up towards infinity, as they do on a real lens.' },
    { id: 'barrel', label: 'Barrel',
      short: 'The black anodised body that holds every part at its distance.',
      body: 'The black anodised body that holds every part at its distance. Inside it is ribbed and dark, so stray light dies before it reaches the glass.' },
    { id: 'mount', label: 'Mount',
      short: 'The stainless mount, the only part that touches the camera.',
      body: 'The stainless mount at the back, with its four lugs. It is the only part of the lens that touches the camera.' },
    { id: 'signature', label: 'Signature plate',
      short: 'The rear band, signed by the optician who built this lens.',
      body: "The rear band carries the maker's mark and the signature of the optician who built this lens. It is the last thing added before the lens leaves the bench." },
  ],
};
