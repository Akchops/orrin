// The teardown after the film (the About section): the same lens comes
// apart under scroll, each part labelled, then goes back together. Only
// parts that exist in the lens model; no specifications, prices, awards or
// names. Part ids match src/app/teardown.js.
export const teardown = {
  num: '08 · Teardown',
  title: 'The same lens, taken apart',
  lead: 'Keep scrolling and it comes apart, part by part, then goes back together.',
  outro: {
    title: 'Back together',
    body: 'Every part returns to its place, the way one optician assembles it on the bench.',
  },
  parts: [
    { id: 'front-element', label: 'Front element',
      body: 'The first glass the light meets, and the largest. Its coating gives the front of the lens its violet and green reflections. It is the last piece fitted and the first taken out.' },
    { id: 'glass-1', label: 'Coated glass groups',
      body: 'Behind it, the remaining elements sit in small groups, each at its own distance from the next. Every surface is coated, so each group throws back a slightly different colour.' },
    { id: 'blades', label: 'Iris blades',
      body: 'Eleven thin blades, each turning on its own pivot. Together they close to a pinhole or open to the full aperture, and the film opened them one at a time.' },
    { id: 'focus-ring', label: 'Focus ring',
      body: 'The knurled grip a focus puller turns, take after take. It carries the engraved scale round with it.' },
    { id: 'scale', label: 'Distance scale',
      body: 'Distances engraved around the ring, metres in white and feet in amber, read against a fixed index mark. The marks bunch up towards infinity, as they do on a real lens.' },
    { id: 'barrel', label: 'Barrel',
      body: 'The black anodised body that holds every part at its distance. Inside it is ribbed and dark, so stray light dies before it reaches the glass.' },
    { id: 'mount', label: 'Mount',
      body: 'The stainless mount at the back, with its four lugs. It is the only part of the lens that touches the camera.' },
    { id: 'signature', label: 'Signature plate',
      body: "The rear band carries the maker's mark and the signature of the optician who built this lens. It is the last thing added before the lens leaves the bench." },
  ],
};
