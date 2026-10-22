// The company page. Fixed facts: Pune, founded 2017, one optician builds
// and signs each lens, three models, each its own shape (names are
// proposals). Everything else is sample content for this concept, and the
// page says so in every section that has any: no names, awards, customers
// or prices, roles only, and every year after 2017 is a sample date.
export const company = {
  sample: 'Sample content for this concept',

  // The opening: the workshop bench at dusk, drawn in code
  // (src/site/bench-svg.js), with four tools on it to tap.
  hero: {
    eyebrow: 'The company · Pune · since 2017',
    title: ['Lenses made', 'one at a time'],
    lead: 'A small lens maker in Pune. One optician builds each lens from the first element to the last screw, checks it and signs the barrel.',
    hintJs: 'Tap a number on the bench to see who does what.',
    hintNoJs: 'The numbers on the bench are explained under the drawing.',
    // Read by screen readers in place of the drawing.
    alt: 'A workshop bench at dusk. Through the window behind it, Pune: a hill with a fort, the city lit for the evening. A lamp hangs over the bench and pools warm light on a work mat. On the mat, left to right: a loupe on a cloth beside a lens element, an iris ring with a fine pin spanner, a lens lying on V-blocks with a pen signing its rear barrel, and a tray holding the three finished lenses, short, medium and long, with blue, amber and green rings.',
    // One note per hotspot, in the order of the markers. Roles only.
    notes: [
      { title: 'The loupe', role: 'Glass and coatings',
        body: 'Each element is ground, polished and coated, then looked at under the loupe before it goes anywhere near a barrel. A speck in the coating or a mark on the edge sends it back.' },
      { title: 'The iris tool', role: 'The machinist and the optician',
        body: 'The machinist turns the iris ring and the pins its blades pivot on. The optician seats it with a fine pin spanner, a blade at a time, until it runs from a pinhole to fully open without catching.' },
      { title: 'The signing pen', role: 'The optician',
        body: 'One optician builds each lens, start to finish. When every check has passed they sign the rear barrel: the last thing that happens at the bench, and the name to ask for if the lens ever comes back.' },
      { title: 'The finished lens tray', role: 'The inspector',
        body: 'A second pair of eyes reads the test chart and can send any lens back to the bench. What passes waits here, capped: the short wide lens, the plain standard and the long one, each with its own engraving, distance scale and ring.' },
    ],
  },

  timeline: {
    id: 'company-timeline', no: '01', kicker: 'Timeline',
    title: 'From one bench, 2017 onward',
    note: 'Sample dates: only the founding in 2017 is fixed. Lens names are proposals.',
    help: 'Drag along the scale, or use the arrow keys.',
    // Two years apart, so the scale from 2017 to 2025 places them evenly.
    // `icon` is the drawing that stands at that year on the scale.
    entries: [
      { year: 2017, short: 'Founded', icon: 'bench', title: 'Founded in Pune',
        line: 'Kessel Optics starts in Pune with one bench and a plan for a single lens, built by one person.' },
      { year: 2019, short: 'First lens', icon: 'parvati', title: 'The first lens, signed',
        line: 'The standard model, proposed as Parvati, is finished and its optician signs the barrel.' },
      { year: 2021, short: 'Workshop', icon: 'workshop', title: 'A larger workshop',
        line: 'The work moves to a larger workshop in Pune, with a clean bench for the glass and room for a test chart.' },
      { year: 2023, short: 'Wide', icon: 'shaniwar', title: 'The wide model joins',
        line: 'The wide model, proposed as Shaniwar, joins: short and stubby, with a big curved front and a small petal hood.' },
      { year: 2025, short: 'Long', icon: 'sinhagad', title: 'Three lenses',
        line: 'The long model, proposed as Sinhagad, makes three, with a long hood and a tripod collar, and no plans for a fourth.' },
    ],
  },

  // Fixed facts, set large like engraving.
  facts: [
    { label: 'Workshop', value: 'Pune' },
    { label: 'Since', value: '2017' },
    { label: 'Models', value: 'Three' },
  ],

  checks: {
    id: 'company-checks', no: '02', kicker: 'Before a lens leaves',
    title: 'Six checks, then the signature',
    help: 'Tick them off one by one, or run them in order. Each lights its part of the lens.',
    list: [
      { name: 'Centring', line: 'Every element sits on one axis. The lens turns on a stage and the image is watched for any wobble.' },
      { name: 'Focus scale', line: 'Each engraved distance is checked against a target set at that distance.' },
      { name: 'Iris travel', line: 'The iris runs from a pinhole to fully open and back, with no blade catching.' },
      { name: 'Focus ring', line: 'The ring turns with the same weight from the closest mark to infinity.' },
      { name: 'Test chart', line: 'A chart is photographed at every marked stop and read from the centre to the corners.' },
      { name: 'Cleaning', line: 'Front and rear glass are cleaned, inspected under a lamp and capped.' },
    ],
    run: 'Run the checks',
    busy: 'Checking…',
    again: 'Start again',
    waiting: 'Signed once every check has passed',
    signed: 'Signed. Ready to leave the workshop.',
  },

  faq: {
    id: 'company-faq', no: '03', kicker: 'Questions',
    title: 'Plain answers',
    items: [
      { q: 'How long does one lens take?',
        a: 'About three weeks from the first element to the signature. Most of that is waiting: cement and coatings need time to settle, and some checks are repeated the next day.' },
      { q: 'Can a lens be serviced?',
        a: 'Yes. Every lens is built to be opened again. It comes back to the workshop in Pune and, where possible, to the optician who signed it.' },
      { q: 'What does the signature mean?',
        a: 'It says who built the lens and who answers for it. It goes on only after the lens has passed every check, so it is also a record that the checks were done.' },
      { q: 'Why only three models?',
        a: 'Wide, standard and long cover most of what one camera needs, and each is shaped for its job: the wide short with a petal hood, the standard plain, the long with a hood and a tripod collar. A short range means each lens is built the same careful way every time.' },
      { q: 'Is every lens really built by one person?',
        a: 'Yes. Others grind the glass, machine the barrel and check the work, but one optician assembles each lens from start to finish.' },
      { q: 'How do I ask about a lens?',
        a: 'Write to the studio or call. It helps to say which lens you are asking about and what you shoot.', link: { route: 'contact', label: 'Contact the studio' } },
    ],
  },

  next: {
    contact: { route: 'contact', label: 'Contact', text: 'Write to the studio' },
    more: [
      { route: 'craft', label: 'Craft', text: 'How a lens is made' },
      { route: 'lenses', label: 'Lenses', text: 'The three lenses' },
    ],
  },
};
