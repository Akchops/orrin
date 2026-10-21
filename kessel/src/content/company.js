// The company page. Fixed facts: Pune, founded 2017, one optician builds
// and signs each lens, three models (names are proposals). Everything else
// is sample content for this concept, and the page says so in every
// section: no names, awards, customers or prices, and every year after
// 2017 is a sample date.
export const company = {
  sample: 'Sample content for this concept',
  hero: {
    eyebrow: 'The company · Pune · since 2017',
    // The headline is set in two lines beside the lens.
    title: ['Lenses made', 'one at a time'],
    lead: 'Kessel Optics is a small lens maker, founded in Pune in 2017. Each lens is built by one optician, checked, and signed on the barrel before it leaves the workshop.',
    image: 'hero-lens',
    // Engraved round the lens, like the ring on the home page.
    ring: 'KESSEL OPTICS · PUNE · EST. 2017 · ONE OPTICIAN PER LENS · SIGNED ON THE BARREL · ',
  },

  story: {
    id: 'company-story', no: '01', short: 'Why', kicker: 'Why Kessel exists',
    title: 'One person, start to finish',
    line: 'We wanted the person who seats the first element to be the one who closes the barrel.',
    body: [
      'Kessel Optics started in Pune in 2017 with one bench and one idea: a lens should be built by one person, from the first element to the last screw.',
      'Most lenses pass down a line. Each pair of hands does one step and never sees the finished lens, so a small fault can travel a long way before anyone notices.',
      'Building the whole lens is slower. It takes weeks, not hours, and it is why there are only three models. But the person who built it knows how it should feel, and notices when it does not.',
      'When the lens is done, they sign it. The signature is not decoration: it says who built the lens, and who to ask if it ever needs looking at.',
    ],
  },

  timeline: {
    id: 'company-timeline', no: '02', short: 'Timeline', kicker: 'Timeline',
    title: 'From one bench, 2017 onward',
    note: 'Sample years: only the founding in 2017 is fixed. Lens names are proposals for this concept.',
    // Five entries, two years apart, so the scrubber's ruler from 2017 to
    // 2025 places them evenly. `short` labels the year on the scrubber.
    entries: [
      { year: 2017, short: 'Founded', title: 'Founded in Pune', image: 'beauty',
        body: 'Kessel Optics starts in Pune with one bench and a plan for a single lens, built by one person from start to finish.' },
      { year: 2019, short: 'First lens', title: 'The first lens, signed', image: 'signed',
        body: 'After two years of prototypes the first lens is finished: the standard model, proposed as Parvati. Its optician signs the barrel, as every optician has since.' },
      { year: 2021, short: 'New workshop', title: 'A larger workshop', image: 'exploded-wide',
        body: 'The work moves to a larger workshop in Pune, with a separate clean bench for the glass and room to set a test chart at a proper distance.' },
      { year: 2023, short: 'Second model', title: 'The wide model', image: 'lens-1',
        body: 'The wide model, proposed as Shaniwar, joins the range: a shorter barrel and a larger front, built by the same hands and put through the same checks.' },
      { year: 2025, short: 'Third model', title: 'The long model', image: 'lineup',
        body: 'The long model, proposed as Sinhagad, makes three. Wide, standard and long, and no plans for a fourth.' },
    ],
  },

  work: {
    id: 'company-work', no: '03', short: 'Checks', kicker: 'How we work',
    title: 'Before a lens leaves the bench',
    points: [
      { title: 'One optician per lens', body: 'A lens is assembled by one optician, from the first element to the last screw. Others make parts and check the work, but the lens itself never changes hands.' },
      { title: 'The signing', body: 'When every check has passed, the optician signs the rear barrel. It is the last thing that happens at the bench, and it stays on the lens for good.' },
    ],
    checksTitle: 'The checks',
    checksHelp: 'Tick them off one by one, or run them in order.',
    checks: [
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

  workshop: {
    id: 'company-workshop', no: '04', short: 'Workshop', kicker: 'The workshop',
    title: 'A small workshop in Pune',
    // Read out like the film's focus readout: a label, a value, a note.
    facts: [
      { label: 'Workshop', value: 'Pune', note: 'one workshop, India' },
      { label: 'Since', value: '2017', note: 'independent from the start' },
      { label: 'Models', value: '3', note: 'wide, standard and long' },
      { label: 'Each lens', value: '1', note: 'optician, start to finish' },
    ],
    values: [
      { title: 'A small range', body: 'Three models and no catalogue. A short list means every lens is built the same careful way, every time.' },
      { title: 'One pair of hands', body: 'The optician who seats the first element closes the barrel. Nothing is handed down a line for someone else to finish.' },
      { title: 'Built to come back', body: 'Every lens can be opened again. For service it returns to the workshop where it was made, and the signature says whose bench it came from.' },
    ],
  },

  faq: {
    id: 'company-faq', no: '05', short: 'Questions', kicker: 'Questions',
    title: 'Plain answers',
    answerTag: 'Sample answer',
    items: [
      { q: 'How long does one lens take?',
        a: 'About three weeks from the first element to the signature. Most of that is waiting: cement and coatings need time to settle, and some checks are repeated the next day.' },
      { q: 'Can a lens be serviced?',
        a: 'Yes. Every lens is built to be opened again. It comes back to the workshop in Pune and, where possible, to the optician who signed it.' },
      { q: 'What does the signature mean?',
        a: 'It says who built the lens and who answers for it. It goes on only after the lens has passed every check, so it is also a record that the checks were done.' },
      { q: 'Why only three models?',
        a: 'Wide, standard and long cover most of what one camera needs. A short range means each lens can be built the same careful way every time.' },
      { q: 'Is every lens really built by one person?',
        a: 'Yes. Others grind the glass, machine the barrel and check the work, but one optician assembles each lens from start to finish.' },
      { q: 'How do I ask about a lens?',
        a: 'Write to the studio or call. It helps to say which lens you are asking about and what you shoot.', link: { route: 'contact', label: 'Contact the studio' } },
    ],
  },

  roles: {
    id: 'company-people', no: '06', short: 'People', kicker: 'The people',
    title: 'Who builds your lens',
    note: 'Roles only. The people are not named.',
    list: [
      { name: 'The optician', does: 'builds and signs it', image: 'd-sign',
        body: 'Assembles the lens from the first element to the last screw, runs it through the checks and signs the barrel. One optician per lens.' },
      { name: 'Glass and coatings', does: 'grinds and coats the glass', image: 'd-glass',
        body: 'Grinds, polishes and coats each element, then hands them over in the order the light will meet them.' },
      { name: 'The machinist', does: 'machines the barrel', image: 'd-knurl',
        body: 'Turns the barrel, the focus ring and the mount, and cuts the engraved distance scale.' },
      { name: 'The inspector', does: 'checks it', image: 'd-iris',
        body: 'A second pair of eyes. Reads the test chart, checks the centring and the scale, and can send a lens back to the bench.' },
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
