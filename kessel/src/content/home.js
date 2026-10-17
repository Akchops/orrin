// Home page after the film. The film itself already covers the three
// lenses, the workshop and contact, so Home below it stays short: the
// hero, the craft band, and links on to the lens pages.
export const home = {
  hero: {
    // Numbered like the film's stages: the hero is the frame after 07.
    eyebrow: '08 · The studio · Pune, since 2017',
    // One line per entry: the hero sets them as fixed display lines.
    title: ['Built by one', 'pair of hands.', 'Signed by them.'],
    lead: 'Cinema and photography lenses, each assembled by a single optician from the first element to the signature on the barrel.',
    primary: { label: 'See the lenses', route: 'lenses' },
    secondary: { label: 'How they are made', route: 'craft' },
    image: 'hero-lens',
  },
  craft: {
    eyebrow: 'Craft',
    title: 'Five stages, one optician',
    link: 'How a Kessel lens is made',
    image: 'd-knurl',
  },
  range: {
    eyebrow: 'The lenses',
    link: 'Compare all three',
  },
};
