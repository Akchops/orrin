// The workshop page. Facts used: Pune, founded 2017, independent, three
// lenses for cinema and photography, one optician per lens, signed barrel.
// No names: the optician is never named.
export const workshop = {
  eyebrow: 'The workshop · Pune',
  // The headline is set in two lines over the signature.
  title: ['One optician,', 'one lens'],
  lead: 'An independent lens maker, founded in Pune in 2017. Lenses for cinema and photography, every one assembled by hand.',
  // Read out like the film's focus readout: a label, a value, a short note.
  facts: [
    { label: 'Founded', value: '2017', note: 'and still independent' },
    { label: 'Workshop', value: 'Pune', note: 'one workshop, India' },
    { label: 'Range', value: '3', note: 'lenses, cinema and photography' },
    { label: 'Each lens', value: '1', note: 'optician, start to finish' },
  ],
  // Each section has a `line`: one sentence of its story, set large.
  sections: [
    {
      no: '01',
      tag: 'A small range',
      title: 'Independent since 2017',
      line: 'Three lenses, each with a clear job.',
      body: [
        'Kessel Optics was founded in Pune in 2017. It is still an independent maker, and its range is deliberately small.',
        'A small range means each lens can be built the same careful way every time, by hand, in one workshop.',
      ],
    },
    {
      no: '02',
      tag: 'Start to finish',
      title: 'The same pair of hands',
      line: 'The person who seats the first element is the person who closes the barrel.',
      body: [
        'Each lens is assembled from start to finish by one optician. The glass, the iris, the barrel and the focus ring all pass through the same pair of hands.',
        'Nobody hands a half-finished lens down a line.',
      ],
    },
    {
      no: '03',
      tag: 'The last thing',
      title: 'Signed on the barrel',
      line: 'It says who answers for that lens.',
      body: [
        'When a lens is finished, the optician who built it signs the barrel. It is the last thing that happens before the lens leaves the bench.',
        'The signature is a record as much as a mark.',
      ],
    },
  ],
  next: [
    { route: 'contact', label: 'Contact', text: 'Write to the studio' },
    { route: 'craft', label: 'Craft', text: 'How a lens is made' },
  ],
};
